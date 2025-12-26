const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'));
    }
  }
});

// Get company settings
router.get('/', auth, requireRole('company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({ message: 'Şirket bulunamadı' });
    }

    res.json({
      logo: company.logo,
      title: company.title
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update company settings
router.put('/', auth, requireRole('company_admin', 'resmi_muhasebe_ik'), upload.single('logo'), async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({ message: 'Şirket bulunamadı' });
    }

    if (req.body.title) {
      company.title = req.body.title;
    }

    if (req.file) {
      // Delete old logo if exists
      if (company.logo) {
        const oldLogoPath = path.join(__dirname, '..', 'uploads', path.basename(company.logo));
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      // Move uploaded file to uploads directory
      const fileName = `logo_${company._id}_${Date.now()}${path.extname(req.file.originalname)}`;
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      fs.renameSync(req.file.path, filePath);
      company.logo = `/uploads/${fileName}`;
    }

    await company.save();

    res.json({
      logo: company.logo,
      title: company.title
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;

