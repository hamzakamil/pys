const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const Company = require('../models/Company');
const User = require('../models/User');
const Role = require('../models/Role');
const WorkingHours = require('../models/WorkingHours');
const { auth, requireRole } = require('../middleware/auth');

// Debug logging helper
const debugLog = (location, message, data, hypothesisId) => {
  try {
    const logPath = path.join(__dirname, '..', '.cursor', 'debug.log');
    const logEntry = JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId
    }) + '\n';
    fs.appendFileSync(logPath, logEntry, 'utf8');
  } catch (e) {}
};

// Email transporter setup
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Get all companies
router.get('/', auth, async (req, res) => {
  try {
    let companies;
    
    if (req.user.role.name === 'super_admin') {
      companies = await Company.find()
        .populate('dealer')
        .populate('activeAttendanceTemplate')
        .sort({ createdAt: -1 });
    } else if (req.user.role.name === 'bayi_admin') {
      // Her bayi sadece kendi oluşturduğu şirketleri görür
      if (!req.user.dealer) {
        return res.status(403).json({ message: 'Bayi bilgisi bulunamadı' });
      }
      companies = await Company.find({ dealer: req.user.dealer })
        .populate('dealer')
        .populate('activeAttendanceTemplate')
        .sort({ createdAt: -1 });
    } else {
      // company_admin, resmi_muhasebe_ik, employee
      companies = await Company.find({ _id: req.user.company })
        .populate('dealer')
        .populate('activeAttendanceTemplate');
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
  // #region agent log
  debugLog('companies.js:81', 'POST /companies entry', {body:{...req.body,authorizedPersonPassword:'***'},userRole:req.user?.role?.name,userId:req.user?._id?.toString()}, 'A');
  // #endregion
  try {
    const { 
      name, 
      address, 
      dealerId, 
      authorizedPersonFullName,
      authorizedPersonPhone,
      authorizedPersonEmail,
      authorizedPersonPassword,
      taxOffice,
      taxNumber
    } = req.body;

    // Validation
    // #region agent log
    debugLog('companies.js:95', 'Before validation checks', {name:name,authorizedPersonEmail:authorizedPersonEmail,authorizedPersonPassword:authorizedPersonPassword?'***':'empty',authorizedPersonFullName:authorizedPersonFullName}, 'A');
    // #endregion
    if (!name || name.trim() === '') {
      // #region agent log
      debugLog('companies.js:96', 'Validation failed: name empty', {name:name}, 'A');
      // #endregion
      return res.status(400).json({ message: 'Şirket ünvanı gereklidir' });
    }

    if (!authorizedPersonEmail || authorizedPersonEmail.trim() === '') {
      // #region agent log
      debugLog('companies.js:100', 'Validation failed: email empty', {email:authorizedPersonEmail}, 'A');
      // #endregion
      return res.status(400).json({ message: 'Yetkili email adresi gereklidir' });
    }

    if (!authorizedPersonPassword || authorizedPersonPassword.trim() === '') {
      // #region agent log
      debugLog('companies.js:104', 'Validation failed: password empty', {passwordEmpty:!authorizedPersonPassword}, 'A');
      // #endregion
      return res.status(400).json({ message: 'Yetkili şifre gereklidir' });
    }

    let dealer;
    if (req.user.role.name === 'super_admin') {
      if (!dealerId) {
        return res.status(400).json({ message: 'Bayi ID gereklidir' });
      }
      dealer = dealerId;
    } else {
      // bayi_admin
      if (!req.user.dealer) {
        return res.status(400).json({ message: 'Bayi bilgisi bulunamadı' });
      }
      dealer = req.user.dealer;
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: authorizedPersonEmail.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Bu email adresi zaten kullanılıyor. Lütfen farklı bir email adresi girin.' 
      });
    }

    // Check company limit for dealer
    const Dealer = require('../models/Dealer');
    const dealerDoc = await Dealer.findById(dealer);
    // #region agent log
    debugLog('companies.js:130', 'Checking dealer limit', {dealerId:dealer?.toString(),maxCompanies:dealerDoc?.maxCompanies,dealerDocExists:!!dealerDoc}, 'A');
    // #endregion
    if (dealerDoc && dealerDoc.maxCompanies !== null && dealerDoc.maxCompanies !== undefined) {
      const currentCompanyCount = await Company.countDocuments({ dealer: dealer });
      // #region agent log
      debugLog('companies.js:134', 'Company count check', {currentCount:currentCompanyCount,maxCompanies:dealerDoc.maxCompanies,limitExceeded:currentCompanyCount>=dealerDoc.maxCompanies}, 'A');
      // #endregion
      if (currentCompanyCount >= dealerDoc.maxCompanies) {
        return res.status(400).json({ 
          message: `Bu bayi için maksimum şirket sayısına ulaşıldı. Maksimum şirket sayısı: ${dealerDoc.maxCompanies}. Mevcut şirket sayısı: ${currentCompanyCount}.` 
        });
      }
    }

    // Validate authorizedPersonFullName is not empty (required field)
    if (!authorizedPersonFullName || authorizedPersonFullName.trim() === '') {
      return res.status(400).json({ message: 'Yetkili adı soyadı gereklidir' });
    }

    // #region agent log
    debugLog('companies.js:147', 'Before creating company', {name:name,dealer:dealer?.toString(),authorizedPersonEmail:authorizedPersonEmail}, 'A');
    // #endregion
    // Create company
    const company = new Company({
      name,
      dealer,
      contactEmail: authorizedPersonEmail, // Yetkili email'i contactEmail olarak kullan
      address,
      taxOffice,
      taxNumber,
      authorizedPerson: {
        fullName: authorizedPersonFullName,
        phone: authorizedPersonPhone,
        email: authorizedPersonEmail
      }
    });
    await company.save();
    // #region agent log
    debugLog('companies.js:159', 'Company saved successfully', {companyId:company._id?.toString()}, 'A');
    // #endregion

    // Create default Workplace (SGK İşyeri) - otomatik oluşturulur
    const Workplace = require('../models/Workplace');
    const defaultWorkplace = new Workplace({
      name: name, // Şirket adı ile aynı
      company: company._id,
      isDefault: true, // Otomatik oluşturulan işyeri
      isActive: true
    });
    await defaultWorkplace.save();
    // #region agent log
    debugLog('companies.js:167', 'Default Workplace created', {workplaceId:defaultWorkplace._id?.toString(),companyId:company._id?.toString()}, 'A');
    // #endregion

    // Create company_admin user (must change password on first login)
    if (authorizedPersonEmail && authorizedPersonPassword) {
      // #region agent log
      debugLog('companies.js:209', 'Creating company_admin user', {email:authorizedPersonEmail,companyId:company._id?.toString()}, 'A');
      // #endregion
      
      const role = await Role.findOne({ name: 'company_admin' });
      if (!role) {
        // #region agent log
        debugLog('companies.js:214', 'Error: company_admin role not found', {}, 'A');
        // #endregion
        return res.status(500).json({ message: 'company_admin rolü bulunamadı. Lütfen sistem yöneticisine başvurun.' });
      }
      
      // Check if user already exists (should not happen due to earlier check, but double-check)
      const existingUser = await User.findOne({ email: authorizedPersonEmail.toLowerCase().trim() });
      if (existingUser) {
        // #region agent log
        debugLog('companies.js:222', 'Error: User already exists', {email:authorizedPersonEmail,existingUserId:existingUser._id?.toString()}, 'A');
        // #endregion
        return res.status(400).json({ 
          message: 'Bu email adresi zaten kullanılıyor. Lütfen farklı bir email adresi girin.' 
        });
      }
      
      const hashedPassword = await bcrypt.hash(authorizedPersonPassword, 10);

      const user = new User({
        email: authorizedPersonEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: role._id,
        company: company._id,
        isActive: true,
        mustChangePassword: true // İlk girişte şifre değiştirme zorunlu
      });
      
      // #region agent log
      debugLog('companies.js:238', 'Before saving company_admin user', {email:user.email,companyId:user.company?.toString(),roleId:user.role?.toString()}, 'A');
      // #endregion
      
      await user.save();
      
      // #region agent log
      debugLog('companies.js:243', 'Company_admin user created successfully', {userId:user._id?.toString(),email:user.email,companyId:user.company?.toString()}, 'A');
      // #endregion
    } else {
      // #region agent log
      debugLog('companies.js:246', 'Warning: Not creating company_admin user', {hasEmail:!!authorizedPersonEmail,hasPassword:!!authorizedPersonPassword}, 'A');
      // #endregion
    }

    // Create default departments for the new company
    const Department = require('../models/Department');
    
    // Merkez departmanı (varsayılan, aktif, silinemez)
    const merkezDepartment = await Department.create({
      name: 'Merkez',
      company: company._id,
      parentDepartment: null,
      description: 'Varsayılan departman - aktif',
      isActive: true,
      isDefault: true
    });

    // Create default company leave types from global defaults
    const { initializeCompanyLeaveTypes } = require('../services/leaveTypeInitializer');
    try {
      await initializeCompanyLeaveTypes(company._id);
      // #region agent log
      debugLog('companies.js:285', 'Company leave types initialized', {companyId:company._id?.toString()}, 'A');
      // #endregion
    } catch (leaveTypeError) {
      // #region agent log
      debugLog('companies.js:288', 'Error initializing company leave types', {error:leaveTypeError.message,companyId:company._id?.toString()}, 'A');
      // #endregion
      console.error('Şirket izin türleri oluşturulurken hata:', leaveTypeError);
      // İzin türleri oluşturulamazsa bile şirket oluşturma devam eder
    }

    // Örnek pasif departmanlar oluştur
    // Satın Alma (pasif)
    await Department.create({
      name: 'Satın Alma',
      company: company._id,
      parentDepartment: null,
      description: 'Örnek departman',
      isActive: false
    });

    // Depo Sevkiyat (pasif)
    await Department.create({
      name: 'Depo Sevkiyat',
      company: company._id,
      parentDepartment: null,
      description: 'Örnek departman',
      isActive: false
    });

    // Üretim Departmanı (pasif)
    await Department.create({
      name: 'Üretim Departmanı',
      company: company._id,
      parentDepartment: null,
      description: 'Örnek departman',
      isActive: false
    });

    // Pazarlama Departmanı (pasif)
    await Department.create({
      name: 'Pazarlama Departmanı',
      company: company._id,
      parentDepartment: null,
      description: 'Örnek departman',
      isActive: false
    });

    // Ofis Bölümü (pasif, ana departman)
    const ofisBolumu = await Department.create({
      name: 'Ofis Bölümü',
      company: company._id,
      parentDepartment: null,
      description: 'Örnek departman',
      isActive: false
    });

    // Satış Pazarlama (Ofis Bölümü altında, pasif)
    await Department.create({
      name: 'Satış Pazarlama',
      company: company._id,
      parentDepartment: ofisBolumu._id,
      description: 'Örnek departman',
      isActive: false
    });


    // Diğer örnek departmanlar (top-level)
    const exampleDepartments = [
      { name: 'Pazarlama Departmanı', description: 'Pazarlama ve reklam departmanı' },
      { name: 'Üretim Departmanı', description: 'Üretim ve imalat departmanı' },
      { name: 'Depo Sevkiyat', description: 'Depo ve sevkiyat departmanı' },
      { name: 'Satın Alma', description: 'Satın alma departmanı' }
    ];

    for (const dept of exampleDepartments) {
      await Department.create({
        name: dept.name,
        company: company._id,
        parentDepartment: null,
        description: dept.description
      });
    }

    const populated = await Company.findById(company._id)
      .populate('dealer')
      .populate('activeAttendanceTemplate');
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Şirket oluşturma hatası:', error);
    // #region agent log
    debugLog('companies.js:238', 'POST /companies catch block', {errorName:error.name,errorMessage:error.message,errorCode:error.code,errorStack:error.stack?.substring(0,200)}, 'C');
    // #endregion
    
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ 
        message: `Validasyon hatası: ${errors}` 
      });
    }
    
    // Mongoose duplicate key error (email unique constraint)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'email') {
        return res.status(400).json({ 
          message: 'Bu email adresi zaten kullanılıyor. Lütfen farklı bir email adresi girin.' 
        });
      }
      return res.status(400).json({ 
        message: `${field} alanı için bu değer zaten kullanılıyor.` 
      });
    }
    
    // Mongoose cast error (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: `Geçersiz ID formatı: ${error.path}` 
      });
    }
    
    // Default error
    res.status(500).json({ 
      message: error.message || 'Şirket oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.' 
    });
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

    // Update fields
    const { name, address, taxOffice, taxNumber, authorizedPersonFullName, authorizedPersonPhone } = req.body;

    if (name !== undefined) company.name = name;
    if (address !== undefined) company.address = address;
    if (taxOffice !== undefined) company.taxOffice = taxOffice;
    if (taxNumber !== undefined) company.taxNumber = taxNumber;
    
    // Update authorized person info (email cannot be changed)
    if (authorizedPersonFullName !== undefined || authorizedPersonPhone !== undefined) {
      if (!company.authorizedPerson) {
        company.authorizedPerson = {};
      }
      if (authorizedPersonFullName !== undefined) {
        company.authorizedPerson.fullName = authorizedPersonFullName;
      }
      if (authorizedPersonPhone !== undefined) {
        company.authorizedPerson.phone = authorizedPersonPhone;
      }
    }

    await company.save();

    const populated = await Company.findById(company._id)
      .populate('dealer')
      .populate('activeAttendanceTemplate');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Set active attendance template for company
router.put('/:id/attendance-template', auth, requireRole('super_admin', 'bayi_admin', 'company_admin'), async (req, res) => {
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

    const { templateId } = req.body;

    if (templateId) {
      const AttendanceTemplate = require('../models/AttendanceTemplate');
      const template = await AttendanceTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Şablon bulunamadı' });
      }

      // Check if template is accessible
      if (!template.isDefault && template.company && template.company.toString() !== req.params.id) {
        return res.status(403).json({ message: 'Bu şablon bu şirket için kullanılamaz' });
      }
    }

    company.activeAttendanceTemplate = templateId || null;
    await company.save();

    const populated = await Company.findById(company._id).populate('activeAttendanceTemplate');
    res.json(populated);
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

