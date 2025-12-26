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
      query = {
        $or: [
          { isDefault: true },
          { company: req.user.company }
        ]
      };
    } else {
      // bayi_admin sees all
      query = {};
    }

    const permits = await WorkingPermit.find(query).sort({ isDefault: -1, createdAt: -1 });
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
    const { name, description } = req.body;

    let permitData = {
      name,
      description,
      isDefault: false,
      createdBy: 'company',
      company: null
    };

    if (req.user.role.name === 'super_admin') {
      permitData.isDefault = true;
      permitData.createdBy = 'super_admin';
    } else {
      permitData.company = req.user.company;
    }

    const permit = new WorkingPermit(permitData);
    await permit.save();

    res.status(201).json(permit);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update working permit
router.put('/:id', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const permit = await WorkingPermit.findById(req.params.id);
    if (!permit) {
      return res.status(404).json({ message: 'İzin türü bulunamadı' });
    }

    // Super admin can update default permits
    if (permit.isDefault && req.user.role.name !== 'super_admin') {
      return res.status(403).json({ message: 'Varsayılan izin türlerini sadece super admin düzenleyebilir' });
    }

    // Company users can only update their own permits
    if (!permit.isDefault && permit.company && 
        req.user.role.name !== 'super_admin' &&
        req.user.company.toString() !== permit.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    Object.assign(permit, req.body);
    await permit.save();

    res.json(permit);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete working permit
router.delete('/:id', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const permit = await WorkingPermit.findById(req.params.id);
    if (!permit) {
      return res.status(404).json({ message: 'İzin türü bulunamadı' });
    }

    // Super admin can delete default permits
    if (permit.isDefault && req.user.role.name !== 'super_admin') {
      return res.status(403).json({ message: 'Varsayılan izin türlerini sadece super admin silebilir' });
    }

    // Company users can only delete their own permits
    if (!permit.isDefault && permit.company && 
        req.user.role.name !== 'super_admin' &&
        req.user.company.toString() !== permit.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    await WorkingPermit.findByIdAndDelete(req.params.id);
    res.json({ message: 'İzin türü silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;

