const express = require('express');
const router = express.Router();
const Workplace = require('../models/Workplace');
const WorkplaceSection = require('../models/WorkplaceSection');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');

// Get all workplaces for a company
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role.name === 'super_admin') {
      // Super admin can see all
      if (req.query.company) {
        query.company = req.query.company;
      }
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi admin can see workplaces of their dealer's companies
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
      if (req.query.company) {
        // Verify company belongs to dealer
        const company = companies.find(c => c._id.toString() === req.query.company);
        if (company) {
          query.company = req.query.company;
        } else {
          return res.status(403).json({ message: 'Yetkiniz yok' });
        }
      }
    } else {
      // company_admin, resmi_muhasebe_ik, employee
      query.company = req.user.company;
    }

    const workplaces = await Workplace.find(query)
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    res.json(workplaces);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single workplace
router.get('/:id', auth, async (req, res) => {
  try {
    const workplace = await Workplace.findById(req.params.id)
      .populate('company', 'name');

    if (!workplace) {
      return res.status(404).json({ message: 'İşyeri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) &&
        req.user.company.toString() !== workplace.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(workplace);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create workplace
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { name, sgkRegisterNumber, address, phone, email, company } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'İşyeri adı gereklidir' });
    }

    let companyId = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      if (!company) {
        return res.status(400).json({ message: 'Şirket seçilmelidir' });
      }
      // Verify company belongs to dealer
      const companyDoc = await Company.findById(company);
      if (!companyDoc) {
        return res.status(404).json({ message: 'Şirket bulunamadı' });
      }
      if (companyDoc.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ message: 'Bu şirket için yetkiniz yok' });
      }
      companyId = company;
    } else if (req.user.role.name === 'super_admin') {
      if (!company) {
        return res.status(400).json({ message: 'Şirket seçilmelidir' });
      }
      companyId = company;
    }

    // SGK sicil numarası validasyonu (opsiyonel, format kontrolü)
    let sgkRegisterNumberValue = null;
    let formatWarning = null;
    if (sgkRegisterNumber && sgkRegisterNumber.trim() !== '') {
      const cleanedNumber = sgkRegisterNumber.replace(/\D/g, ''); // Sadece rakamlar
      if (cleanedNumber.length === 26) {
        sgkRegisterNumberValue = cleanedNumber;
      } else {
        // Format uyarısı ama kayıt engellenmez
        formatWarning = 'SGK sicil numarası 26 haneli değil. İsterseniz sonra düzenleyebilirsiniz.';
        sgkRegisterNumberValue = cleanedNumber; // Yine de kaydedilir
      }
    }

    const workplace = new Workplace({
      name: name.trim(),
      company: companyId,
      sgkRegisterNumber: sgkRegisterNumberValue,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      isDefault: false,
      isActive: true
    });

    await workplace.save();

    const populated = await Workplace.findById(workplace._id)
      .populate('company', 'name');

    // Format uyarısı varsa response'a ekle
    const response = { ...populated.toObject() };
    if (formatWarning) {
      response.formatWarning = formatWarning;
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update workplace
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const workplace = await Workplace.findById(req.params.id);
    if (!workplace) {
      return res.status(404).json({ message: 'İşyeri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== workplace.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const { name, sgkRegisterNumber, address, phone, email, isActive } = req.body;

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'İşyeri adı gereklidir' });
      }
      workplace.name = name.trim();
    }

    // SGK sicil numarası validasyonu
    let formatWarning = null;
    if (sgkRegisterNumber !== undefined) {
      if (sgkRegisterNumber === null || sgkRegisterNumber === '') {
        workplace.sgkRegisterNumber = null;
      } else {
        const cleanedNumber = sgkRegisterNumber.replace(/\D/g, '');
        if (cleanedNumber.length === 26) {
          workplace.sgkRegisterNumber = cleanedNumber;
        } else {
          formatWarning = 'SGK sicil numarası 26 haneli değil. İsterseniz sonra düzenleyebilirsiniz.';
          workplace.sgkRegisterNumber = cleanedNumber; // Yine de kaydedilir
        }
      }
    }

    if (address !== undefined) workplace.address = address?.trim() || null;
    if (phone !== undefined) workplace.phone = phone?.trim() || null;
    if (email !== undefined) workplace.email = email?.trim() || null;
    if (isActive !== undefined) workplace.isActive = isActive;

    await workplace.save();

    const populated = await Workplace.findById(workplace._id)
      .populate('company', 'name');

    const response = { ...populated.toObject() };
    if (formatWarning) {
      response.formatWarning = formatWarning;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete workplace
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const workplace = await Workplace.findById(req.params.id);
    if (!workplace) {
      return res.status(404).json({ message: 'İşyeri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== workplace.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Default workplace silinemez
    if (workplace.isDefault) {
      return res.status(400).json({ message: 'Varsayılan işyeri silinemez' });
    }

    // İşyerine bağlı çalışan var mı kontrol et
    const Employee = require('../models/Employee');
    const employeeCount = await Employee.countDocuments({ workplace: workplace._id });
    if (employeeCount > 0) {
      return res.status(400).json({ 
        message: `Bu işyerine bağlı ${employeeCount} çalışan bulunmaktadır. İşyeri silinemez.` 
      });
    }

    await Workplace.findByIdAndDelete(req.params.id);
    res.json({ message: 'İşyeri silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// ========== WORKPLACE SECTIONS ==========

// Get all sections for a workplace
router.get('/:workplaceId/sections', auth, async (req, res) => {
  try {
    const workplace = await Workplace.findById(req.params.workplaceId);
    if (!workplace) {
      return res.status(404).json({ message: 'İşyeri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) &&
        req.user.company.toString() !== workplace.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const sections = await WorkplaceSection.find({ workplace: req.params.workplaceId })
      .populate('parentSection', 'name')
      .sort({ createdAt: -1 });

    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single section
router.get('/sections/:id', auth, async (req, res) => {
  try {
    const section = await WorkplaceSection.findById(req.params.id)
      .populate('workplace', 'name')
      .populate('parentSection', 'name');

    if (!section) {
      return res.status(404).json({ message: 'Bölüm bulunamadı' });
    }

    // Check access
    const workplace = await Workplace.findById(section.workplace);
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) &&
        req.user.company.toString() !== workplace.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(section);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create section
router.post('/:workplaceId/sections', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const workplace = await Workplace.findById(req.params.workplaceId);
    if (!workplace) {
      return res.status(404).json({ message: 'İşyeri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== workplace.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const { name, parentSection, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Bölüm adı gereklidir' });
    }

    // Parent section kontrolü
    if (parentSection) {
      const parent = await WorkplaceSection.findById(parentSection);
      if (!parent) {
        return res.status(404).json({ message: 'Üst bölüm bulunamadı' });
      }
      if (parent.workplace.toString() !== workplace._id.toString()) {
        return res.status(400).json({ message: 'Üst bölüm aynı işyerine ait olmalıdır' });
      }
    }

    const section = new WorkplaceSection({
      name: name.trim(),
      workplace: workplace._id,
      parentSection: parentSection || null,
      description: description?.trim() || null,
      isActive: true
    });

    await section.save();

    const populated = await WorkplaceSection.findById(section._id)
      .populate('workplace', 'name')
      .populate('parentSection', 'name');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update section
router.put('/sections/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const section = await WorkplaceSection.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: 'Bölüm bulunamadı' });
    }

    const workplace = await Workplace.findById(section.workplace);
    
    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== workplace.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const { name, parentSection, description, isActive } = req.body;

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Bölüm adı gereklidir' });
      }
      section.name = name.trim();
    }

    if (parentSection !== undefined) {
      if (parentSection === null || parentSection === '') {
        section.parentSection = null;
      } else {
        const parent = await WorkplaceSection.findById(parentSection);
        if (!parent) {
          return res.status(404).json({ message: 'Üst bölüm bulunamadı' });
        }
        if (parent.workplace.toString() !== section.workplace.toString()) {
          return res.status(400).json({ message: 'Üst bölüm aynı işyerine ait olmalıdır' });
        }
        // Circular reference kontrolü
        if (parentSection === section._id.toString()) {
          return res.status(400).json({ message: 'Bölüm kendi üst bölümü olamaz' });
        }
        section.parentSection = parentSection;
      }
    }

    if (description !== undefined) section.description = description?.trim() || null;
    if (isActive !== undefined) section.isActive = isActive;

    await section.save();

    const populated = await WorkplaceSection.findById(section._id)
      .populate('workplace', 'name')
      .populate('parentSection', 'name');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete section
router.delete('/sections/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const section = await WorkplaceSection.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: 'Bölüm bulunamadı' });
    }

    const workplace = await Workplace.findById(section.workplace);
    
    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== workplace.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Alt bölüm var mı kontrol et
    const childSections = await WorkplaceSection.countDocuments({ parentSection: section._id });
    if (childSections > 0) {
      return res.status(400).json({ 
        message: `Bu bölüme bağlı ${childSections} alt bölüm bulunmaktadır. Önce alt bölümleri silin.` 
      });
    }

    // Bölüme bağlı çalışan var mı kontrol et
    const Employee = require('../models/Employee');
    const employeeCount = await Employee.countDocuments({ workplaceSection: section._id });
    if (employeeCount > 0) {
      return res.status(400).json({ 
        message: `Bu bölüme bağlı ${employeeCount} çalışan bulunmaktadır. Bölüm silinemez.` 
      });
    }

    await WorkplaceSection.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bölüm silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;




