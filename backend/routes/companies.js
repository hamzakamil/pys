const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Company = require('../models/Company');
const User = require('../models/User');
const Role = require('../models/Role');
const { auth, requireRole } = require('../middleware/auth');

// Get all companies
router.get('/', auth, async (req, res) => {
  try {
    let companies;
    
    if (req.user.role.name === 'super_admin') {
      companies = await Company.find().populate('dealer').sort({ createdAt: -1 });
    } else if (req.user.role.name === 'bayi_admin') {
      companies = await Company.find({ dealer: req.user.dealer }).populate('dealer').sort({ createdAt: -1 });
    } else {
      // company_admin, resmi_muhasebe_ik, employee
      companies = await Company.find({ _id: req.user.company }).populate('dealer');
    }

    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single company
router.get('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).populate('dealer');
    if (!company) {
      return res.status(404).json({ message: 'Şirket bulunamadı' });
    }

    // Check access
    if (req.user.role.name === 'bayi_admin' && req.user.dealer.toString() !== company.dealer._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) && 
        req.user.company.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create company (super_admin or bayi_admin)
router.post('/', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { name, contactEmail, contactPhone, address, dealerId, email, password } = req.body;

    let dealer;
    if (req.user.role.name === 'super_admin') {
      dealer = dealerId;
    } else {
      dealer = req.user.dealer;
    }

    const company = new Company({
      name,
      dealer,
      contactEmail,
      contactPhone,
      address
    });
    await company.save();

    // Create company_admin user
    if (email && password) {
      const role = await Role.findOne({ name: 'company_admin' });
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        email,
        password: hashedPassword,
        role: role._id,
        company: company._id
      });
      await user.save();
    }

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update company
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Şirket bulunamadı' });
    }

    // Check access
    if (req.user.role.name === 'bayi_admin' && req.user.dealer.toString() !== company.dealer.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    if (req.user.role.name === 'company_admin' && req.user.company.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    Object.assign(company, req.body);
    await company.save();

    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete company
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Şirket bulunamadı' });
    }

    // Check access
    if (req.user.role.name === 'bayi_admin' && req.user.dealer.toString() !== company.dealer.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    await Company.findByIdAndDelete(req.params.id);
    res.json({ message: 'Şirket silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;

