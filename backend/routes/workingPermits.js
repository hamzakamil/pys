const express = require('express');
const router = express.Router();
const WorkingPermit = require('../models/WorkingPermit');
const { auth, requireRole } = require('../middleware/auth');

// Get all working permits (default + company specific)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    const { companyId } = req.query;

    if (req.user.role.name === 'super_admin') {
      // Super admin sees all permits
      if (companyId) {
        query = { company: companyId };
      } else {
        query = {};
      }
    } else if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name)) {
      // Company users see default + their company's permits
      const targetCompanyId = companyId || req.user.company;
      if (targetCompanyId) {
        query = {
          $or: [
            { isDefault: true, company: targetCompanyId },
            { isDefault: false, company: targetCompanyId }
          ]
        };
      } else {
        return res.status(400).json({ message: 'Şirket bilgisi gereklidir' });
      }
    } else if (req.user.role.name === 'bayi_admin') {
      // bayi_admin sees all permits for their companies
      if (companyId) {
        // Verify company belongs to dealer
        const Company = require('../models/Company');
        const company = await Company.findById(companyId);
        if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
          return res.status(403).json({ message: 'Yetkiniz yok' });
        }
        query = { company: companyId };
      } else {
        // Get all companies for this dealer
        const Company = require('../models/Company');
        const companies = await Company.find({ dealer: req.user.dealer });
        const companyIds = companies.map(c => c._id);
        query = { company: { $in: companyIds } };
      }
    } else {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const permits = await WorkingPermit.find(query)
      .populate('parentPermitId', 'name')
      .populate('company', 'name')
      .sort({ isDefault: -1, parentPermitId: 1, createdAt: -1 });
    
    // Eğer izin türü yoksa ve şirket belirtilmişse, varsayılan izin türlerini oluştur
    if (permits.length === 0 && (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) && (companyId || req.user.company))) {
      const targetCompanyId = companyId || req.user.company;
      const Company = require('../models/Company');
      const company = await Company.findById(targetCompanyId);
      if (company) {
        try {
          const { initializeDefaultPermits } = require('../services/permissionInitializer');
          await initializeDefaultPermits(targetCompanyId);
          // İzin türlerini yeniden çek
          const newQuery = {
            $or: [
              { isDefault: true, company: targetCompanyId },
              { isDefault: false, company: targetCompanyId }
            ]
          };
          const newPermits = await WorkingPermit.find(newQuery)
            .populate('parentPermitId', 'name')
            .populate('company', 'name')
            .sort({ isDefault: -1, parentPermitId: 1, createdAt: -1 });
          return res.json({ success: true, data: newPermits });
        } catch (initError) {
          console.error('Varsayılan izin türleri oluşturulurken hata:', initError);
          // Hata olsa bile boş liste dön
        }
      }
    }
    
    res.json({ success: true, data: permits });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Get single working permit
router.get('/:id', auth, async (req, res) => {
  try {
    const permit = await WorkingPermit.findById(req.params.id);
    if (!permit) {
      return res.status(404).json({ message: 'İzin türü bulunamadı' });
    }

    // Check access
    if (!permit.isDefault && permit.company && 
        ['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) &&
        req.user.company.toString() !== permit.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(permit);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create working permit
router.post('/', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik', 'bayi_admin'), async (req, res) => {
  try {
    const { name, description, parentPermitId, companyId } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'İzin türü adı gereklidir' });
    }

    let permitData = {
      name: name.trim(),
      description: description?.trim() || null,
      isDefault: false,
      createdBy: 'company',
      company: null,
      parentPermitId: parentPermitId || null
    };

    // Company ID belirleme
    let targetCompanyId = null;
    if (req.user.role.name === 'super_admin') {
      // Super admin için companyId zorunlu değil (varsayılan izin oluşturabilir)
      if (companyId) {
        targetCompanyId = companyId;
      } else {
        permitData.isDefault = true;
        permitData.createdBy = 'super_admin';
      }
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi admin için companyId zorunlu
      if (!companyId) {
        return res.status(400).json({ success: false, message: 'Şirket seçilmelidir' });
      }
      // Verify company belongs to dealer
      const Company = require('../models/Company');
      const company = await Company.findById(companyId);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
      targetCompanyId = companyId;
    } else {
      // Company admin için kendi şirketi
      targetCompanyId = req.user.company;
    }

    if (targetCompanyId) {
      permitData.company = targetCompanyId;
      
      // Parent permit kontrolü - aynı şirkete ait olmalı
      if (parentPermitId) {
        const parentPermit = await WorkingPermit.findById(parentPermitId);
        if (!parentPermit) {
          return res.status(404).json({ success: false, message: 'Üst kategori bulunamadı' });
        }
        if (parentPermit.company && parentPermit.company.toString() !== targetCompanyId.toString()) {
          return res.status(403).json({ success: false, message: 'Üst kategori bu şirkete ait değil' });
        }
      }
    }

    const permit = new WorkingPermit(permitData);
    await permit.save();

    const populated = await WorkingPermit.findById(permit._id)
      .populate('parentPermitId', 'name')
      .populate('company', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Update working permit
router.put('/:id', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik', 'bayi_admin'), async (req, res) => {
  try {
    const permit = await WorkingPermit.findById(req.params.id);
    if (!permit) {
      return res.status(404).json({ success: false, message: 'İzin türü bulunamadı' });
    }

    // Varsayılan izinler değiştirilemez
    if (permit.isDefault) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu izin türü sistem varsayılanıdır ve değiştirilemez.' 
      });
    }

    // Company users can only update their own permits
    if (permit.company) {
      if (req.user.role.name === 'bayi_admin') {
        // Bayi admin için şirket kontrolü
        const Company = require('../models/Company');
        const company = await Company.findById(permit.company);
        if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
          return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
        }
      } else if (req.user.role.name !== 'super_admin' &&
                 req.user.company.toString() !== permit.company.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    // Parent permit kontrolü
    if (req.body.parentPermitId !== undefined) {
      if (req.body.parentPermitId) {
        const parentPermit = await WorkingPermit.findById(req.body.parentPermitId);
        if (!parentPermit) {
          return res.status(404).json({ success: false, message: 'Üst kategori bulunamadı' });
        }
        if (permit.company && parentPermit.company && 
            parentPermit.company.toString() !== permit.company.toString()) {
          return res.status(403).json({ success: false, message: 'Üst kategori bu şirkete ait değil' });
        }
        // Circular reference kontrolü
        if (req.body.parentPermitId === req.params.id) {
          return res.status(400).json({ success: false, message: 'İzin türü kendi üst kategorisi olamaz' });
        }
      }
      permit.parentPermitId = req.body.parentPermitId || null;
    }

    if (req.body.name !== undefined) permit.name = req.body.name.trim();
    if (req.body.description !== undefined) permit.description = req.body.description?.trim() || null;

    await permit.save();

    const populated = await WorkingPermit.findById(permit._id)
      .populate('parentPermitId', 'name');

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Delete working permit
router.delete('/:id', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik', 'bayi_admin'), async (req, res) => {
  try {
    const permit = await WorkingPermit.findById(req.params.id);
    if (!permit) {
      return res.status(404).json({ success: false, message: 'İzin türü bulunamadı' });
    }

    // Varsayılan izinler silinemez
    if (permit.isDefault) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu izin türü sistem varsayılanıdır ve değiştirilemez.' 
      });
    }

    // Company users can only delete their own permits
    if (permit.company) {
      if (req.user.role.name === 'bayi_admin') {
        // Bayi admin için şirket kontrolü
        const Company = require('../models/Company');
        const company = await Company.findById(permit.company);
        if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
          return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
        }
      } else if (req.user.role.name !== 'super_admin' &&
                 req.user.company.toString() !== permit.company.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    // Alt kategori var mı kontrol et
    const childPermits = await WorkingPermit.countDocuments({ parentPermitId: permit._id });
    if (childPermits > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Bu izin türüne bağlı ${childPermits} alt kategori bulunmaktadır. Önce alt kategorileri silin.` 
      });
    }

    await WorkingPermit.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'İzin türü silindi' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

module.exports = router;

