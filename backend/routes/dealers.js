const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Dealer = require('../models/Dealer');
const User = require('../models/User');
const Role = require('../models/Role');
const { auth, requireRole } = require('../middleware/auth');

// Get all dealers (only super_admin)
router.get('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const dealers = await Dealer.find().sort({ createdAt: -1 });
    res.json(dealers);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single dealer
router.get('/:id', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: 'Bayi bulunamadı' });
    }

    // Check if user has access
    if (req.user.role.name === 'bayi_admin' && req.user.dealer.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(dealer);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create dealer (only super_admin)
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { name, contactEmail, contactPhone, address, maxCompanies, email, password } = req.body;

    const dealer = new Dealer({
      name,
      contactEmail,
      contactPhone,
      address,
      maxCompanies: maxCompanies !== undefined && maxCompanies !== null && maxCompanies !== '' ? parseInt(maxCompanies) : null
    });
    await dealer.save();

    // Create bayi_admin user
    const role = await Role.findOne({ name: 'bayi_admin' });
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      role: role._id,
      dealer: dealer._id
    });
    await user.save();

    res.status(201).json(dealer);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update dealer
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: 'Bayi bulunamadı' });
    }

    // Check if user has access
    if (req.user.role.name === 'bayi_admin' && req.user.dealer.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Update fields (maxCompanies can be set to null for unlimited)
    const { name, contactEmail, contactPhone, address, maxCompanies } = req.body;
    
    if (name !== undefined) dealer.name = name;
    if (contactEmail !== undefined) dealer.contactEmail = contactEmail;
    if (contactPhone !== undefined) dealer.contactPhone = contactPhone;
    if (address !== undefined) dealer.address = address;
    if (maxCompanies !== undefined) {
      dealer.maxCompanies = maxCompanies !== null && maxCompanies !== '' ? parseInt(maxCompanies) : null;
    }
    
    await dealer.save();

    res.json(dealer);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete dealer (only super_admin)
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    await Dealer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bayi silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;

