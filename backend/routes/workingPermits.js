const express = require('express');
const router = express.Router();
const WorkingPermit = require('../models/WorkingPermit');
const { auth, requireRole } = require('../middleware/auth');

// Get all working permits (default + company specific)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role.name === 'super_admin') {
      // Super admin sees all default permits
      query = { isDefault: true };
    } else if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name)) {
      // Company users see default + their company's permits
      if (req.query.companyId) {
        query = {
          $or: [
            { isDefault: true, company: req.query.companyId },
            { isDefault: false, company: req.query.companyId }
          ]
        };
      } else {
        query = {
          $or: [
            { isDefault: true, company: req.user.company },
            { isDefault: false, company: req.user.company }
          ]
        };
      }
    } else {
      // bayi_admin sees all
      if (req.query.companyId) {
        query = { company: req.query.companyId };
      } else {
        query = {};
      }
    }

    const permits = await WorkingPermit.find(query)
      .populate('parentPermitId', 'name')
      .sort({ isDefault: -1, parentPermitId: 1, createdAt: -1 });
    res.json(permits);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
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
router.post('/', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { name, description, parentPermitId } = req.body;

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

    if (req.user.role.name === 'super_admin') {
      permitData.isDefault = true;
      permitData.createdBy = 'super_admin';
    } else {
      permitData.company = req.user.company;
      
      // Parent permit kontrolü - aynı şirkete ait olmalı
      if (parentPermitId) {
        const parentPermit = await WorkingPermit.findById(parentPermitId);
        if (!parentPermit) {
          return res.status(404).json({ success: false, message: 'Üst kategori bulunamadı' });
        }
        if (parentPermit.company && parentPermit.company.toString() !== req.user.company.toString()) {
          return res.status(403).json({ success: false, message: 'Üst kategori bu şirkete ait değil' });
        }
      }
    }

    const permit = new WorkingPermit(permitData);
    await permit.save();

    const populated = await WorkingPermit.findById(permit._id)
      .populate('parentPermitId', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Update working permit
router.put('/:id', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const permit = await WorkingPermit.findById(req.params.id);
    if (!permit) {
      return res.status(404).json({ success: false, message: 'İzin türü bulunamadı' });
    }

    // Varsayılan izinler değiştirilemez (super_admin hariç)
    if (permit.isDefault && req.user.role.name !== 'super_admin') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu izin türü sistem varsayılanıdır ve değiştirilemez.' 
      });
    }

    // Company users can only update their own permits
    if (!permit.isDefault && permit.company && 
        req.user.role.name !== 'super_admin' &&
        req.user.company.toString() !== permit.company.toString()) {
      return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
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
router.delete('/:id', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const permit = await WorkingPermit.findById(req.params.id);
    if (!permit) {
      return res.status(404).json({ success: false, message: 'İzin türü bulunamadı' });
    }

    // Varsayılan izinler silinemez (super_admin hariç)
    if (permit.isDefault && req.user.role.name !== 'super_admin') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu izin türü sistem varsayılanıdır ve değiştirilemez.' 
      });
    }

    // Company users can only delete their own permits
    if (!permit.isDefault && permit.company && 
        req.user.role.name !== 'super_admin' &&
        req.user.company.toString() !== permit.company.toString()) {
      return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
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

