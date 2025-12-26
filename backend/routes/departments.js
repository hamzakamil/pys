const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');

// Get all departments
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role.name === 'super_admin') {
      // Super admin can see all
    } else if (req.user.role.name === 'bayi_admin') {
      // Get companies of dealer
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    } else {
      // company_admin, resmi_muhasebe_ik, employee
      query.company = req.user.company;
    }

    const departments = await Department.find(query)
      .populate('company')
      .sort({ createdAt: -1 });

    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get departments by company
router.get('/company/:companyId', auth, async (req, res) => {
  try {
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

    const departments = await Department.find({ company: req.params.companyId })
      .sort({ createdAt: -1 });

    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single department
router.get('/:id', auth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate('company');
    if (!department) {
      return res.status(404).json({ message: 'Departman bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) && 
        req.user.company.toString() !== department.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create department
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { name, company, description } = req.body;

    let companyId = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    } else if (req.user.role.name === 'bayi_admin' && !companyId) {
      return res.status(400).json({ message: 'Şirket seçilmelidir' });
    }

    const department = new Department({
      name,
      company: companyId,
      description
    });
    await department.save();

    const populated = await Department.findById(department._id).populate('company');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update department
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Departman bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== department.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    Object.assign(department, req.body);
    await department.save();

    const populated = await Department.findById(department._id).populate('company');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete department
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Departman bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== department.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Departman silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;

