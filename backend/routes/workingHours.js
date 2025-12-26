const express = require('express');
const router = express.Router();
const WorkingHours = require('../models/WorkingHours');
const { auth, requireRole } = require('../middleware/auth');

// Get all working hours
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role.name === 'super_admin') {
      // Super admin can see all
    } else if (req.user.role.name === 'bayi_admin') {
      // Get companies of dealer
      const Company = require('../models/Company');
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    } else {
      query.company = req.user.company;
    }

    const workingHours = await WorkingHours.find(query)
      .populate('company')
      .sort({ createdAt: -1 });

    res.json(workingHours);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get working hours by company
router.get('/company/:companyId', auth, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Şirket bulunamadı' });
    }

    // Check access
    if (req.user.role.name === 'bayi_admin' && req.user.dealer.toString() !== company.dealer.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) && 
        req.user.company.toString() !== req.params.companyId) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const workingHours = await WorkingHours.find({ company: req.params.companyId })
      .sort({ createdAt: -1 });

    res.json(workingHours);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single working hours
router.get('/:id', auth, async (req, res) => {
  try {
    const workingHours = await WorkingHours.findById(req.params.id).populate('company');
    if (!workingHours) {
      return res.status(404).json({ message: 'Çalışma saatleri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) && 
        req.user.company.toString() !== workingHours.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(workingHours);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create working hours
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { name, company, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = req.body;

    let companyId = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    }

    const workingHours = new WorkingHours({
      name,
      company: companyId,
      monday: monday || { start: '09:00', end: '18:00', isWorking: true },
      tuesday: tuesday || { start: '09:00', end: '18:00', isWorking: true },
      wednesday: wednesday || { start: '09:00', end: '18:00', isWorking: true },
      thursday: thursday || { start: '09:00', end: '18:00', isWorking: true },
      friday: friday || { start: '09:00', end: '18:00', isWorking: true },
      saturday: saturday || { start: '09:00', end: '18:00', isWorking: false },
      sunday: sunday || { start: '09:00', end: '18:00', isWorking: false }
    });
    await workingHours.save();

    const populated = await WorkingHours.findById(workingHours._id).populate('company');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update working hours
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const workingHours = await WorkingHours.findById(req.params.id);
    if (!workingHours) {
      return res.status(404).json({ message: 'Çalışma saatleri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== workingHours.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    Object.assign(workingHours, req.body);
    await workingHours.save();

    const populated = await WorkingHours.findById(workingHours._id).populate('company');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete working hours
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const workingHours = await WorkingHours.findById(req.params.id);
    if (!workingHours) {
      return res.status(404).json({ message: 'Çalışma saatleri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== workingHours.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    await WorkingHours.findByIdAndDelete(req.params.id);
    res.json({ message: 'Çalışma saatleri silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;

