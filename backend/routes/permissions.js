const express = require('express');
const router = express.Router();
const Permission = require('../models/Permission');
const { auth, requireRole } = require('../middleware/auth');

// Tüm yetkileri listele (super_admin, bayi_admin, company_admin)
router.get('/', auth, async (req, res) => {
  try {
    // Super admin, bayi admin ve company admin yetkileri görebilir
    if (!['super_admin', 'bayi_admin', 'company_admin'].includes(req.user.role.name)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Yetkiniz yok' 
      });
    }
    
    const permissions = await Permission.find().sort({ category: 1, name: 1 });
    res.json({ success: true, data: permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Yeni yetki oluştur (sadece super_admin)
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { name, description, category } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tüm alanlar gereklidir' 
      });
    }

    const permission = new Permission({
      name,
      description,
      category
    });

    await permission.save();
    res.status(201).json({ success: true, data: permission });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu yetki zaten mevcut' 
      });
    }
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Yetki güncelle (sadece super_admin)
router.put('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { description, category } = req.body;

    const permission = await Permission.findByIdAndUpdate(
      req.params.id,
      { description, category },
      { new: true, runValidators: true }
    );

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Yetki bulunamadı' });
    }

    res.json({ success: true, data: permission });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Yetki sil (sadece super_admin)
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const permission = await Permission.findByIdAndDelete(req.params.id);

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Yetki bulunamadı' });
    }

    // İlişkili RolePermission kayıtlarını da sil
    const RolePermission = require('../models/RolePermission');
    await RolePermission.deleteMany({ permission: req.params.id });

    res.json({ success: true, message: 'Yetki silindi' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

module.exports = router;

