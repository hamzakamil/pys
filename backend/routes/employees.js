const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Company = require('../models/Company');
const Workplace = require('../models/Workplace');
const WorkplaceSection = require('../models/WorkplaceSection');
const User = require('../models/User');
const Role = require('../models/Role');
const { auth, requireRole } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

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

// Email transporter helper
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Get all employees
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role.name === 'super_admin') {
      // Super admin can see all
    } else if (req.user.role.name === 'bayi_admin') {
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    } else {
      query.company = req.user.company;
    }

    // Sadece aktif çalışanları göster (ön-kayıt statüsündekiler görünmez)
    query.status = 'active';
    
    const employees = await Employee.find(query)
      .populate('company')
      .populate('workplace', 'name sgkRegisterNumber')
      .populate('workplaceSection', 'name')
      .populate('department', 'name')
      .sort({ createdAt: -1 });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get employees by company
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

    const employees = await Employee.find({ company: req.params.companyId })
      .populate('department')
      .sort({ employeeNumber: 1 }); // Çalışan Sıra No'ya göre artan sıralama

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single employee
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('company')
      .populate('workplace', 'name sgkRegisterNumber')
      .populate('workplaceSection', 'name')
      .populate('department', 'name');
    
    if (!employee) {
      return res.status(404).json({ message: 'Çalışan bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) && 
        req.user.company.toString() !== employee.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create employee
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  // #region agent log
  debugLog('employees.js:125', 'POST /employees entry', {body:req.body,bodyPosition:req.body?.position,userRole:req.user?.role?.name,userCompany:req.user?.company?.toString(),userDealer:req.user?.dealer?.toString()}, 'E');
  // #endregion
  try {
    // #region agent log
    debugLog('employees.js:130', 'Before destructuring', {reqBodyKeys:Object.keys(req.body),reqBodyPosition:req.body?.position}, 'H');
    // #endregion
    
    // Güvenli property erişimi - her değişken ayrı ayrı tanımlanıyor (TDZ riskini önler)
    // ÖNEMLİ: Destructuring kullanılmıyor çünkü TDZ hatasına neden olabilir
    const firstName = (req.body && req.body.firstName) ? String(req.body.firstName) : '';
    const lastName = (req.body && req.body.lastName) ? String(req.body.lastName) : '';
    const email = (req.body && req.body.email) ? String(req.body.email) : '';
    const phone = (req.body && req.body.phone) ? String(req.body.phone) : '';
    const company = (req.body && req.body.company) ? req.body.company : null;
    const workplace = (req.body && req.body.workplace) ? req.body.workplace : null;
    const workplaceSection = (req.body && req.body.workplaceSection) ? req.body.workplaceSection : null;
    const department = (req.body && req.body.department) ? req.body.department : null;
    // employeeNumber artık client'tan alınmayacak, sadece backend tarafından otomatik atanacak
    const personelNumarasi = (req.body && req.body.personelNumarasi) ? String(req.body.personelNumarasi).trim() : null;
    // Position değişkeni güvenli şekilde tanımlanıyor
    const position = (req.body && req.body.position) ? String(req.body.position) : '';
    const tcKimlik = (req.body && req.body.tcKimlik) ? String(req.body.tcKimlik) : null;
    const manager = (req.body && req.body.manager) ? req.body.manager : null;
    const hireDate = (req.body && req.body.hireDate) ? req.body.hireDate : null;
    const birthDate = (req.body && req.body.birthDate) ? req.body.birthDate : null;
    
    // #region agent log
    // employeeNumber tanımlanmadan önce log'a eklenmemeli (otomatik atanacak)
    debugLog('employees.js:163', 'After safe property access', {firstName,lastName,email,phone,company,department,position,tcKimlik,hireDate,birthDate,positionType:typeof position,employeeNumberDefined:false}, 'A');
    // #endregion

    // Validation
    if (!firstName || firstName.trim() === '') {
      // #region agent log
      debugLog('employees.js:139', 'Validation failed: firstName empty', {firstName:firstName}, 'E');
      // #endregion
      return res.status(400).json({ message: 'Ad gereklidir' });
    }
    if (!lastName || lastName.trim() === '') {
      // #region agent log
      debugLog('employees.js:145', 'Validation failed: lastName empty', {lastName:lastName}, 'E');
      // #endregion
      return res.status(400).json({ message: 'Soyad gereklidir' });
    }
    if (!email || email.trim() === '') {
      // #region agent log
      debugLog('employees.js:151', 'Validation failed: email empty', {email:email}, 'E');
      // #endregion
      return res.status(400).json({ message: 'Email gereklidir' });
    }
    // #region agent log
    debugLog('employees.js:157', 'Before position validation', {position:position,positionType:typeof position,positionUndefined:position===undefined,positionNull:position===null,hasPosition:!!position}, 'H');
    // #endregion
    if (!position || (typeof position === 'string' && position.trim() === '')) {
      // #region agent log
      debugLog('employees.js:163', 'Validation failed: position empty', {position:position,positionType:typeof position}, 'E');
      // #endregion
      return res.status(400).json({ message: 'Görevi gereklidir' });
    }
    
    // TC Kimlik No validation
    if (tcKimlik && tcKimlik.trim().length !== 11) {
      return res.status(400).json({ message: 'TC Kimlik No 11 haneli olmalıdır' });
    }
    
    // Company ID'yi önce belirle (workplace kontrolü için gerekli)
    let companyIdForValidation = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyIdForValidation = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      if (!company) {
        return res.status(400).json({ message: 'Lütfen işlem yapmak istediğiniz şirketi seçiniz.' });
      }
      companyIdForValidation = company;
    } else if (req.user.role.name === 'super_admin') {
      if (!company) {
        return res.status(400).json({ message: 'Şirket seçilmelidir' });
      }
      companyIdForValidation = company;
    }

    // Workplace zorunlu kontrolü - şirkette birden fazla varsa zorunlu
    const Workplace = require('../models/Workplace');
    const workplaceCount = await Workplace.countDocuments({ company: companyIdForValidation });
    
    if (workplaceCount > 1 && !workplace) {
      return res.status(400).json({ message: 'Bu şirket birden fazla SGK işyerine sahiptir. Lütfen SGK işyerini seçiniz.' });
    } else if (workplaceCount === 1 && !workplace) {
      // Tek işyeri varsa otomatik seç
      const defaultWorkplace = await Workplace.findOne({ company: companyIdForValidation });
      if (defaultWorkplace) {
        workplace = defaultWorkplace._id;
      } else {
        return res.status(400).json({ message: 'SGK İşyeri bulunamadı' });
      }
    } else if (!workplace) {
      return res.status(400).json({ message: 'SGK İşyeri seçilmelidir' });
    }
    
    // Workplace'nin şirkete ait olduğunu kontrol et
    const workplaceDoc = await Workplace.findById(workplace);
    if (!workplaceDoc) {
      return res.status(404).json({ message: 'İşyeri bulunamadı' });
    }
    if (workplaceDoc.company.toString() !== companyIdForValidation.toString()) {
      return res.status(400).json({ message: 'İşyeri seçilen şirkete ait değil' });
    }
    
    // WorkplaceSection kontrolü - işyerinde birden fazla bölüm varsa zorunlu
    const sectionCount = await WorkplaceSection.countDocuments({ workplace: workplace });
    if (sectionCount > 1 && !workplaceSection) {
      return res.status(400).json({ message: 'Bu SGK işyerinde birden fazla bölüm bulunmaktadır. Lütfen bölüm seçiniz.' });
    } else if (sectionCount === 1 && !workplaceSection) {
      // Tek bölüm varsa otomatik seç
      const defaultSection = await WorkplaceSection.findOne({ workplace: workplace });
      if (defaultSection) {
        workplaceSection = defaultSection._id;
      }
    }
    
    // WorkplaceSection varsa doğrula
    if (workplaceSection) {
      const sectionDoc = await WorkplaceSection.findById(workplaceSection);
      if (!sectionDoc) {
        return res.status(404).json({ message: 'İşyeri bölümü bulunamadı' });
      }
      if (sectionDoc.workplace.toString() !== workplace.toString()) {
        return res.status(400).json({ message: 'İşyeri bölümü seçilen işyerine ait olmalıdır' });
      }
    }
    
    // Department kontrolü (opsiyonel ama varsa doğrula)
    if (department) {
      const departmentDoc = await Department.findById(department);
      if (!departmentDoc) {
        return res.status(404).json({ message: 'Departman bulunamadı' });
      }
    }

    // TC Kimlik No uniqueness check (company bazında)
    if (tcKimlik && tcKimlik.trim().length === 11) {
      const existingEmployeeWithTC = await Employee.findOne({ 
        tcKimlik: tcKimlik.trim(), 
        company: companyIdForValidation 
      });
      if (existingEmployeeWithTC) {
        return res.status(400).json({ message: 'Bu TC Kimlik No ile kayıtlı bir çalışan zaten mevcut.' });
      }
    }

    // Company ID'yi belirle (yukarıda zaten belirlendi ama tekrar kullan)
    let companyId = companyIdForValidation;
    
    // Bayi admin için şirket erişim kontrolü (yukarıda zaten yapıldı ama tekrar kontrol edelim)
    if (req.user.role.name === 'bayi_admin') {
      const Company = require('../models/Company');
      const companyDoc = await Company.findById(companyId);
      if (!companyDoc) {
        return res.status(404).json({ message: 'Şirket bulunamadı' });
      }
      if (companyDoc.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ message: 'Bu şirket için yetkiniz yok' });
      }
    }

    // #region agent log
    debugLog('employees.js:137', 'Before creating employee', {firstName:firstName,lastName:lastName,email:email,companyId:companyId?.toString(),department:department,position:position}, 'E');
    // #endregion

    // Position değerini güvenli şekilde işle
    // #region agent log
    debugLog('employees.js:207', 'Before creating Employee object', {position:position,positionType:typeof position}, 'I');
    // #endregion
    // Position değişkeni zaten tanımlı, güvenli şekilde işleniyor
    let positionValue = undefined;
    if (position && typeof position === 'string' && position.trim() !== '') {
      positionValue = position.trim();
    } else if (position) {
      positionValue = String(position);
    }
    // #region agent log
    debugLog('employees.js:210', 'After position processing', {positionValue:positionValue}, 'I');
    // #endregion
    
    // TC Kimlik güvenli işleme
    const tcKimlikValue = (tcKimlik && typeof tcKimlik === 'string' && tcKimlik.trim().length === 11) ? tcKimlik.trim() : undefined;
    
    // Personel numarası unique kontrolü (şirket bazında)
    if (personelNumarasi && personelNumarasi !== '') {
      const existingPersonelNo = await Employee.findOne({ 
        company: companyId, 
        personelNumarasi: personelNumarasi 
      });
      if (existingPersonelNo) {
        return res.status(400).json({ 
          message: 'Bu personel numarası başka bir çalışanda kullanılıyor.' 
        });
      }
    }

    // Otomatik employeeNumber atama: Şirket bazında en yüksek numaradan devam et
    // Silinen çalışanların numaraları geri alınmaz, mevcut en büyük numaradan devam edilir
    // #region agent log
    debugLog('employees.js:336', 'Before employeeNumber calculation', {companyId:companyId?.toString(),companyIdType:typeof companyId}, 'B');
    // #endregion
    
    let finalEmployeeNumber;
    try {
      // Şirketteki tüm çalışanları al ve en yüksek sayısal employeeNumber'ı bul
      const allEmployees = await Employee.find({ company: companyId })
        .select('employeeNumber')
        .lean();
      
      // #region agent log
      debugLog('employees.js:345', 'After finding all employees', {employeeCount:allEmployees.length}, 'B');
      // #endregion
      
      let maxNum = 0;
      for (const emp of allEmployees) {
        if (emp && emp.employeeNumber) {
          const num = parseInt(emp.employeeNumber);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      
      // #region agent log
      debugLog('employees.js:357', 'After maxNum calculation', {maxNum:maxNum}, 'B');
      // #endregion
      
      // Yeni numara: en yüksek numara + 1
      finalEmployeeNumber = String(maxNum + 1);
      
      // #region agent log
      debugLog('employees.js:363', 'After finalEmployeeNumber assignment', {finalEmployeeNumber:finalEmployeeNumber,finalEmployeeNumberType:typeof finalEmployeeNumber}, 'B');
      // #endregion
    } catch (calcError) {
      // #region agent log
      debugLog('employees.js:366', 'Error calculating employeeNumber', {
        errorName: calcError.name,
        errorMessage: calcError.message,
        errorStack: calcError.stack?.substring(0, 300)
      }, 'B');
      // #endregion
      // Hata durumunda varsayılan değer
      finalEmployeeNumber = '1';
    }
    
    // #region agent log
    debugLog('employees.js:377', 'Final employeeNumber before Employee creation', {finalEmployeeNumber:finalEmployeeNumber,finalEmployeeNumberType:typeof finalEmployeeNumber,finalEmployeeNumberDefined:typeof finalEmployeeNumber !== 'undefined'}, 'B');
    // #endregion
    
    // finalEmployeeNumber kontrolü - eğer tanımlı değilse varsayılan değer ata
    if (typeof finalEmployeeNumber === 'undefined' || finalEmployeeNumber === null) {
      // #region agent log
      debugLog('employees.js:380', 'finalEmployeeNumber is undefined, setting default', {}, 'B');
      // #endregion
      finalEmployeeNumber = '1';
    }
    
    // Bayi admin için createdByBayiId ekle
    let createdByBayiId = null;
    if (req.user.role.name === 'bayi_admin' && req.user.dealer) {
      createdByBayiId = req.user.dealer;
    }
    
    // #region agent log
    debugLog('employees.js:390', 'Before creating Employee object', {finalEmployeeNumber:finalEmployeeNumber,finalEmployeeNumberType:typeof finalEmployeeNumber,personelNumarasi:personelNumarasi,firstName:firstName,lastName:lastName,email:email}, 'C');
    // #endregion
    
    // Employee objesi oluştur
    const employee = new Employee({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: (phone && typeof phone === 'string') ? phone.trim() : '',
      tcKimlik: tcKimlikValue,
      position: positionValue,
      company: companyId,
      workplace: workplace, // Zorunlu
      workplaceSection: workplaceSection || null, // Opsiyonel
      department: department || null, // Opsiyonel (artık zorunlu değil)
      manager: manager || null, // Opsiyonel
      employeeNumber: finalEmployeeNumber,
      personelNumarasi: personelNumarasi || undefined,
      hireDate: hireDate ? new Date(hireDate) : undefined,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      createdByBayiId: createdByBayiId
    });
    // #region agent log
    debugLog('employees.js:401', 'After creating Employee object, before save', {employeeId:employee._id,employeeNumber:employee.employeeNumber}, 'C');
    // #endregion
    await employee.save();
    // #region agent log
    debugLog('employees.js:404', 'After employee.save()', {employeeId:employee._id,employeeNumber:employee.employeeNumber}, 'C');
    // #endregion

    // Manager değiştiyse approval chain'i güncelle
    if (manager) {
      const { updateEmployeeApprovalChain } = require('../services/approvalChainService');
      try {
        await updateEmployeeApprovalChain(employee._id);
      } catch (error) {
        console.error('Approval chain güncelleme hatası:', error);
      }
    }

    // #region agent log
    debugLog('employees.js:151', 'Employee saved successfully', {employeeId:employee._id?.toString()}, 'E');
    // #endregion

    // Create user account for employee (without password - will be set on first login)
    const role = await Role.findOne({ name: 'employee' });
    if (!role) {
      // #region agent log
      debugLog('employees.js:214', 'Error: employee role not found', {}, 'E');
      // #endregion
      console.error('employee rolü bulunamadı');
    } else {
      // Check if user already exists
      let user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        try {
          user = new User({
            email: email.toLowerCase().trim(),
            password: null, // Null password - will be set on first login
            role: role._id,
            company: companyId,
            isActive: true,
            mustChangePassword: true // İlk girişte şifre belirleme zorunlu
          });
          await user.save();
          // #region agent log
          debugLog('employees.js:230', 'User created for employee (no password)', {userId:user._id?.toString(),employeeId:employee._id?.toString()}, 'E');
          // #endregion
        } catch (userError) {
          // #region agent log
          debugLog('employees.js:233', 'Error creating user for employee', {error:userError.message,errorName:userError.name,errorStack:userError.stack?.substring(0,200)}, 'E');
          // #endregion
          console.error('User oluşturma hatası:', userError);
          // User oluşturulamazsa bile employee kaydı başarılı sayılır
        }
      } else {
        // #region agent log
        debugLog('employees.js:240', 'User already exists for employee email', {userId:user._id?.toString(),email:email}, 'E');
        // #endregion
      }
    }

    const populated = await Employee.findById(employee._id)
      .populate('company')
      .populate('workplace', 'name sgkRegisterNumber')
      .populate('workplaceSection', 'name')
      .populate('department', 'name');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Çalışan oluşturma hatası:', error);
    // #region agent log
    debugLog('employees.js:469', 'POST /employees catch block', {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack?.substring(0, 500),
      errorType: typeof error,
      hasReferenceError: error.message?.includes('is not defined') || error.message?.includes('ReferenceError'),
      hasEmployeeNumber: error.message?.includes('employeeNumber'),
      errorKeys: Object.keys(error)
    }, 'E');
    // #endregion
    
    // ReferenceError özel işleme (employeeNumber is not defined gibi)
    if (error.name === 'ReferenceError' || (error.message && error.message.includes('is not defined'))) {
      // #region agent log
      debugLog('employees.js:485', 'ReferenceError detected', {
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 500)
      }, 'E');
      // #endregion
      // Hata mesajını güvenli şekilde işle
      const errorMessage = error.message || 'Bilinmeyen hata';
      return res.status(500).json({ 
        message: errorMessage.includes('employeeNumber is not defined') 
          ? 'Çalışan numarası hesaplanırken bir hata oluştu. Lütfen tekrar deneyin.' 
          : `Kod hatası: ${errorMessage}. Lütfen sistem yöneticisine bildirin.` 
      });
    }
    
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ 
        message: `Validasyon hatası: ${errors}` 
      });
    }
    
    // Mongoose duplicate key error
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
    
    res.status(500).json({ 
      message: error.message || 'Çalışan oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.' 
    });
  }
});

// Download Excel template
router.get('/template', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  // #region agent log
  debugLog('employees.js:297', 'GET /template entry', {userRole:req.user?.role?.name,userId:req.user?._id?.toString()}, 'T');
  // #endregion
  try {
    // #region agent log
    debugLog('employees.js:300', 'Before creating template fields', {}, 'T');
    // #endregion
    
    // Zorunlu alanlar
    const requiredFields = [
      'Adı',
      'Soyadı',
      'TC Kimlik No',
      'İşe Giriş Tarihi',
      'Doğum Tarihi',
      'Görevi',
      'Email Adresi',
      'Telefon Numarası'
    ];

    // Tüm personel alanları (zorunlu alanlar + diğerleri)
    const allFields = [
      ...requiredFields,
      'Sıra No',
      'Departman',
      'Doğum Yeri',
      'Pasaport No',
      'Kan Grubu',
      'Askerlik Durumu',
      'Sabıka Kaydı Var mı?',
      'Ehliyet Var mı?',
      'Sicil No'
    ];

    // #region agent log
    debugLog('employees.js:330', 'Fields created', {requiredFieldsCount:requiredFields.length,allFieldsCount:allFields.length}, 'T');
    // #endregion

    // Excel şablonu oluştur
    // #region agent log
    debugLog('employees.js:334', 'Before xlsx.utils.book_new', {xlsxAvailable:typeof xlsx !== 'undefined'}, 'T');
    // #endregion
    
    const workbook = xlsx.utils.book_new();
    
    // #region agent log
    debugLog('employees.js:338', 'Workbook created', {workbookType:typeof workbook}, 'T');
    // #endregion
    
    const worksheetData = [
      allFields, // Başlık satırı
      // Örnek satır (örnek verilerle)
      [
        'Ahmet', // Adı
        'Yılmaz', // Soyadı
        '12345678901', // TC Kimlik No
        '2024-01-15', // İşe Giriş Tarihi
        '1990-05-20', // Doğum Tarihi
        'Yazılım Geliştirici', // Görevi
        'ahmet.yilmaz@example.com', // Email Adresi
        '05551234567', // Telefon Numarası
        '1', // Sıra No
        'Bilgi İşlem', // Departman
        'İstanbul', // Doğum Yeri
        '', // Pasaport No
        'A+', // Kan Grubu
        'Yapıldı', // Askerlik Durumu
        'Hayır', // Sabıka Kaydı Var mı?
        'Evet', // Ehliyet Var mı?
        'EMP001' // Sicil No
      ]
    ];
    
    // #region agent log
    debugLog('employees.js:365', 'Before xlsx.utils.aoa_to_sheet', {worksheetDataRows:worksheetData.length}, 'T');
    // #endregion
    
    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    
    // #region agent log
    debugLog('employees.js:370', 'Worksheet created', {worksheetType:typeof worksheet}, 'T');
    // #endregion
    
    // Sütun genişliklerini ayarla
    worksheet['!cols'] = allFields.map(() => ({ wch: 20 }));

    // #region agent log
    debugLog('employees.js:376', 'Before xlsx.utils.book_append_sheet', {}, 'T');
    // #endregion
    
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Personel');

    // #region agent log
    debugLog('employees.js:380', 'Before xlsx.write', {}, 'T');
    // #endregion

    // Excel dosyasını buffer olarak oluştur
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // #region agent log
    debugLog('employees.js:386', 'Buffer created', {bufferLength:buffer?.length,bufferType:typeof buffer}, 'T');
    // #endregion

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=personel_sablon.xlsx');
    
    // #region agent log
    debugLog('employees.js:392', 'Before res.send', {}, 'T');
    // #endregion
    
    res.send(buffer);
    
    // #region agent log
    debugLog('employees.js:396', 'Template sent successfully', {}, 'T');
    // #endregion
  } catch (error) {
    // #region agent log
    debugLog('employees.js:399', 'Template creation error', {error:error.message,errorName:error.name,errorStack:error.stack?.substring(0,300)}, 'T');
    // #endregion
    console.error('Şablon oluşturma hatası:', error);
    res.status(500).json({ message: 'Şablon oluşturulamadı', error: error.message });
  }
});

// Bulk import from Excel
router.post('/bulk-import', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Dosya yüklenmedi' });
    }

    let companyId = req.body.company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    }

    // Helper function to get field value from row
    const getFieldValue = (row, possibleKeys) => {
      for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return String(row[key]);
        }
      }
      return null;
    };

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const employees = [];
    const errors = [];
    const requiredFields = {
      'Adı': ['Adı', 'ad', 'adı', 'firstName', 'first_name', 'firstname'],
      'Soyadı': ['Soyadı', 'soyad', 'soyadı', 'lastName', 'last_name', 'lastname'],
      'TC Kimlik No': ['TC Kimlik No', 'tcKimlik', 'tc_kimlik', 'tc', 'tckimlik', 'tc kimlik no'],
      'İşe Giriş Tarihi': ['İşe Giriş Tarihi', 'işe giriş tarihi', 'işeGirişTarihi', 'hireDate', 'hire_date', 'ise_giris_tarihi', 'işeGiriş', 'iseGiris'],
      'Doğum Tarihi': ['Doğum Tarihi', 'doğum tarihi', 'doğumTarihi', 'birthDate', 'birth_date', 'dogum_tarihi', 'doğumTarih', 'dogumTarih'],
      'Görevi': ['Görevi', 'görevi', 'görev', 'position', 'gorev', 'gorevi'],
      'Email Adresi': ['Email Adresi', 'email', 'email adresi', 'e-mail', 'e_mail'],
      'Telefon Numarası': ['Telefon Numarası', 'telefon', 'telefon numarası', 'phone', 'telefon_numarası', 'tel']
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowErrors = [];
      
      // Zorunlu alanları kontrol et
      const firstName = getFieldValue(row, requiredFields['Adı']);
      const lastName = getFieldValue(row, requiredFields['Soyadı']);
      const tcKimlik = getFieldValue(row, requiredFields['TC Kimlik No']);
      const hireDate = getFieldValue(row, requiredFields['İşe Giriş Tarihi']);
      const birthDate = getFieldValue(row, requiredFields['Doğum Tarihi']);
      const position = getFieldValue(row, requiredFields['Görevi']);
      const email = getFieldValue(row, requiredFields['Email Adresi']);
      const phone = getFieldValue(row, requiredFields['Telefon Numarası']);

      if (!firstName || firstName.trim() === '') rowErrors.push('Adı');
      if (!lastName || lastName.trim() === '') rowErrors.push('Soyadı');
      if (!tcKimlik || tcKimlik.trim() === '') rowErrors.push('TC Kimlik No');
      if (!hireDate || hireDate.trim() === '') rowErrors.push('İşe Giriş Tarihi');
      if (!birthDate || birthDate.trim() === '') rowErrors.push('Doğum Tarihi');
      if (!position || position.trim() === '') rowErrors.push('Görevi');
      if (!email || email.trim() === '') rowErrors.push('Email Adresi');
      if (!phone || phone.trim() === '') rowErrors.push('Telefon Numarası');

      if (rowErrors.length > 0) {
        errors.push(`Satır ${i + 2}: Eksik zorunlu alanlar - ${rowErrors.join(', ')}. Lütfen bu alanları doldurun.`);
        continue;
      }

      try {
        // Workplace kontrolü (zorunlu)
        const workplaceName = row['SGK İşyeri'] || row['İşyeri'] || row.workplace || row['SGK İşyeri Dosyası'];
        let workplace = null;
        if (workplaceName) {
          workplace = await Workplace.findOne({ 
            name: workplaceName,
            company: companyId
          });
          if (!workplace) {
            errors.push(`Satır ${i + 2}: SGK İşyeri bulunamadı - ${workplaceName}`);
            continue;
          }
        } else {
          // Workplace belirtilmemişse, şirketin varsayılan işyerini kullan
          workplace = await Workplace.findOne({ 
            company: companyId,
            isDefault: true
          });
          if (!workplace) {
            errors.push(`Satır ${i + 2}: Şirket için varsayılan işyeri bulunamadı`);
            continue;
          }
        }

        // WorkplaceSection kontrolü (opsiyonel)
        let workplaceSection = null;
        const sectionName = row['İşyeri Bölümü'] || row['Bölüm'] || row.workplaceSection;
        if (sectionName) {
          workplaceSection = await WorkplaceSection.findOne({ 
            name: sectionName,
            workplace: workplace._id
          });
          if (!workplaceSection) {
            errors.push(`Satır ${i + 2}: İşyeri bölümü bulunamadı - ${sectionName}`);
            continue;
          }
        }

        // Departman kontrolü (opsiyonel)
        let department = null;
        const departmentName = row['Departman'] || row.departman || row.department;
        if (departmentName) {
          department = await Department.findOne({ 
            name: departmentName,
            company: companyId
          });
          if (!department) {
            errors.push(`Satır ${i + 2}: Departman bulunamadı - ${departmentName}`);
            continue;
          }
        }

        // Tarih formatlarını parse et
        let parsedHireDate = null;
        let parsedBirthDate = null;
        try {
          parsedHireDate = new Date(hireDate);
          if (isNaN(parsedHireDate.getTime())) {
            errors.push(`Satır ${i + 2}: İşe Giriş Tarihi geçersiz format - ${hireDate}`);
            continue;
          }
        } catch (e) {
          errors.push(`Satır ${i + 2}: İşe Giriş Tarihi geçersiz format - ${hireDate}`);
          continue;
        }

        try {
          parsedBirthDate = new Date(birthDate);
          if (isNaN(parsedBirthDate.getTime())) {
            errors.push(`Satır ${i + 2}: Doğum Tarihi geçersiz format - ${birthDate}`);
            continue;
          }
        } catch (e) {
          errors.push(`Satır ${i + 2}: Doğum Tarihi geçersiz format - ${birthDate}`);
          continue;
        }

        // Email kontrolü
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          errors.push(`Satır ${i + 2}: Geçersiz email formatı - ${email}`);
          continue;
        }

        // Diğer alanlar
        const employeeNumber = row['Sıra No'] || row['Sicil No'] || row.sicil || row.employeeNumber || row.employee_number;
        const birthPlace = row['Doğum Yeri'] || row.doğumYeri || row.birthPlace || row.birth_place;
        const passportNumber = row['Pasaport No'] || row.pasaportNo || row.passportNumber || row.passport_number;
        const bloodType = row['Kan Grubu'] || row.kanGrubu || row.bloodType || row.blood_type;
        const militaryStatus = row['Askerlik Durumu'] || row.askerlikDurumu || row.militaryStatus || row.military_status;
        const hasCriminalRecord = row['Sabıka Kaydı Var mı?'] === 'Evet' || row['Sabıka Kaydı Var mı?'] === 'evet' || row['Sabıka Kaydı Var mı?'] === true || row.hasCriminalRecord === true;
        const hasDrivingLicense = row['Ehliyet Var mı?'] === 'Evet' || row['Ehliyet Var mı?'] === 'evet' || row['Ehliyet Var mı?'] === true || row.hasDrivingLicense === true;

        // Otomatik sıra numarası atama - şirket bazında oluşturulma sırasına göre
        let finalEmployeeNumber = null;
        if (employeeNumber && employeeNumber.trim() !== '') {
          // Excel'den sıra numarası gelmişse onu kullan
          finalEmployeeNumber = employeeNumber.trim();
        } else {
          // Otomatik sıra numarası: şirketteki toplam çalışan sayısı + 1
          const employeeCount = await Employee.countDocuments({ company: companyId });
          finalEmployeeNumber = String(employeeCount + 1);
        }

        const employee = new Employee({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          tcKimlik: tcKimlik.trim(),
          position: position.trim(),
          company: companyId,
          workplace: workplace._id, // Zorunlu
          workplaceSection: workplaceSection ? workplaceSection._id : null, // Opsiyonel
          department: department ? department._id : null, // Opsiyonel
          employeeNumber: finalEmployeeNumber,
          hireDate: parsedHireDate,
          birthDate: parsedBirthDate,
          birthPlace: birthPlace?.trim() || undefined,
          passportNumber: passportNumber?.trim() || undefined,
          bloodType: bloodType?.trim() || undefined,
          militaryStatus: militaryStatus?.trim() || undefined,
          hasCriminalRecord: hasCriminalRecord || false,
          hasDrivingLicense: hasDrivingLicense || false
        });

        await employee.save();

        // Create user account for employee (without password)
        const role = await Role.findOne({ name: 'employee' });
        if (role) {
          let user = await User.findOne({ email: email.toLowerCase().trim() });
          if (!user) {
            user = new User({
              email: email.toLowerCase().trim(),
              password: null,
              role: role._id,
              company: companyId,
              isActive: true,
              mustChangePassword: true
            });
            await user.save();
          }
        }

        employees.push(employee);
      } catch (error) {
        errors.push(`Satır ${i + 2}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);

    res.json({
      message: `${employees.length} çalışan eklendi`,
      added: employees.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update employee
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Çalışan bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== employee.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Update all fields - Güvenli destructuring ile default değerler
    const firstName = req.body?.firstName;
    const lastName = req.body?.lastName;
    const email = req.body?.email;
    const phone = req.body?.phone;
    const workplace = req.body?.workplace;
    const workplaceSection = req.body?.workplaceSection;
    const department = req.body?.department;
    const tcKimlik = req.body?.tcKimlik;
    const position = req.body?.position;
    const birthDate = req.body?.birthDate;
    const hireDate = req.body?.hireDate;
    const exitDate = req.body?.exitDate;
    const exitReason = req.body?.exitReason;
    const exitReasonCode = req.body?.exitReasonCode;
    const salary = req.body?.salary;
    const isNetSalary = req.body?.isNetSalary;
    const birthPlace = req.body?.birthPlace;
    const passportNumber = req.body?.passportNumber;
    const bloodType = req.body?.bloodType;
    const militaryStatus = req.body?.militaryStatus;
    const hasCriminalRecord = req.body?.hasCriminalRecord;
    const hasDrivingLicense = req.body?.hasDrivingLicense;
    const customFields = req.body?.customFields;
    // employeeNumber read-only - client'tan alınmaz
    const personelNumarasi = req.body?.personelNumarasi;
    const manager = req.body?.manager;

    employee.firstName = firstName !== undefined ? firstName : employee.firstName;
    employee.lastName = lastName !== undefined ? lastName : employee.lastName;
    employee.email = email !== undefined ? email : employee.email;
    employee.phone = phone !== undefined ? phone : employee.phone;
    employee.department = department !== undefined ? department : employee.department;
    // TC Kimlik validation
    if (tcKimlik !== undefined) {
      if (tcKimlik && tcKimlik.trim() && tcKimlik.trim().length !== 11) {
        return res.status(400).json({ message: 'TC Kimlik No 11 haneli olmalıdır' });
      }
      employee.tcKimlik = tcKimlik?.trim() && tcKimlik.trim().length === 11 ? tcKimlik.trim() : undefined;
    }
    // Position güvenli güncelleme
    if (position !== undefined) {
      employee.position = (position && typeof position === 'string' && position.trim()) ? position.trim() : undefined;
    }
    employee.birthDate = birthDate ? new Date(birthDate) : employee.birthDate;
    employee.hireDate = hireDate ? new Date(hireDate) : employee.hireDate;
    employee.exitDate = exitDate !== undefined ? (exitDate ? new Date(exitDate) : null) : employee.exitDate;
    employee.exitReason = exitReason !== undefined ? (exitReason || undefined) : employee.exitReason;
    employee.exitReasonCode = exitReasonCode !== undefined ? (exitReasonCode || undefined) : employee.exitReasonCode;
    employee.salary = salary !== undefined ? (salary || null) : employee.salary;
    employee.isNetSalary = isNetSalary !== undefined ? isNetSalary : employee.isNetSalary;
    // employeeNumber read-only - güncelleme yapılamaz (sadece backend tarafından atanır)
    
    // Personel numarası güncelleme (unique kontrolü ile)
    if (personelNumarasi !== undefined) {
      const trimmedPersonelNo = personelNumarasi ? personelNumarasi.trim() : null;
      if (trimmedPersonelNo && trimmedPersonelNo !== '') {
        // Aynı personel numarası başka bir çalışanda var mı kontrol et
        const existingPersonelNo = await Employee.findOne({ 
          company: employee.company, 
          personelNumarasi: trimmedPersonelNo,
          _id: { $ne: employee._id } // Mevcut çalışan hariç
        });
        if (existingPersonelNo) {
          return res.status(400).json({ 
            message: 'Bu personel numarası başka bir çalışanda kullanılıyor.' 
          });
        }
      }
      employee.personelNumarasi = trimmedPersonelNo || undefined;
    }
    
    // İşten çıkış tarihi girildiğinde çalışanı pasif yap
    if (exitDate !== undefined) {
      if (exitDate && new Date(exitDate) <= new Date()) {
        employee.isActive = false;
        
        // User hesabını da pasif yap
        const user = await User.findOne({ email: employee.email });
        if (user) {
          user.isActive = false;
          await user.save();
        }
      } else if (exitDate === null || exitDate === '') {
        // İşten çıkış tarihi kaldırıldıysa aktif yap
        employee.isActive = true;
        
        // User hesabını da aktif yap
        const user = await User.findOne({ email: employee.email });
        if (user) {
          user.isActive = true;
          await user.save();
        }
      }
    }
    employee.birthPlace = birthPlace !== undefined ? birthPlace : employee.birthPlace;
    employee.passportNumber = passportNumber !== undefined ? passportNumber : employee.passportNumber;
    employee.bloodType = bloodType !== undefined ? bloodType : employee.bloodType;
    employee.militaryStatus = militaryStatus !== undefined ? militaryStatus : employee.militaryStatus;
    employee.hasCriminalRecord = hasCriminalRecord !== undefined ? hasCriminalRecord : employee.hasCriminalRecord;
    employee.hasDrivingLicense = hasDrivingLicense !== undefined ? hasDrivingLicense : employee.hasDrivingLicense;
    // Manager güncellemesi
    const oldManager = employee.manager ? employee.manager.toString() : null;
    const newManager = manager ? manager.toString() : null;

    if (newManager !== oldManager) {
      if (manager) {
        const managerEmployee = await Employee.findById(manager);
        if (!managerEmployee) {
          return res.status(404).json({ message: 'Yönetici olarak seçilen çalışan bulunamadı.' });
        }
        if (managerEmployee.company.toString() !== employee.company.toString()) {
          return res.status(400).json({ message: 'Yönetici olarak seçilen çalışan aynı şirkete ait olmalıdır.' });
        }
      }
      employee.manager = manager || null;
      // Manager değiştiyse, approval chain'i yeniden hesapla (pre-save hook tarafından yapılacak)
    }

    // Custom fields güncellemesi - yeni alanlar şirketteki tüm personellere eklenir
    if (customFields !== undefined) {
      const newFields = customFields.filter(cf => cf.name && cf.value)
      const existingFieldNames = employee.customFields.map(cf => cf.name)
      
      // Yeni eklenen alanları bul
      const newlyAddedFields = newFields.filter(cf => !existingFieldNames.includes(cf.name))
      
      // Eğer yeni alanlar eklendiyse, şirketteki tüm personellere ekle
      if (newlyAddedFields.length > 0) {
        const allEmployees = await Employee.find({ company: employee.company })
        
        for (const emp of allEmployees) {
          // Sadece bu personelde olmayan alanları ekle
          const empFieldNames = emp.customFields.map(cf => cf.name)
          const fieldsToAdd = newlyAddedFields.filter(cf => !empFieldNames.includes(cf.name))
          
          if (fieldsToAdd.length > 0) {
            emp.customFields = [...emp.customFields, ...fieldsToAdd]
            await emp.save()
          }
        }
      }
      
      employee.customFields = customFields
    }

    await employee.save();

    const populated = await Employee.findById(employee._id)
      .populate('company')
      .populate('workplace', 'name sgkRegisterNumber')
      .populate('workplaceSection', 'name')
      .populate('department', 'name');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Send activation link to employee
router.post('/:id/send-activation-link', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Çalışan bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== employee.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    if (employee.isActivated) {
      return res.status(400).json({ message: 'Çalışan zaten aktif' });
    }

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    employee.activationToken = activationToken;
    await employee.save();

    // Create activation link
    const activationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate-employee?token=${activationToken}&email=${encodeURIComponent(employee.email)}`;

    // Send email
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: employee.email,
        subject: 'Personel Yönetim Sistemi - Hesap Aktivasyonu',
        html: `
          <h2>Hesap Aktivasyonu</h2>
          <p>Merhaba ${employee.firstName} ${employee.lastName},</p>
          <p>Personel Yönetim Sistemine hesabınızı aktif etmek için aşağıdaki linke tıklayın:</p>
          <p><a href="${activationLink}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Hesabı Aktif Et</a></p>
          <p>Veya aşağıdaki linki tarayıcınıza yapıştırın:</p>
          <p>${activationLink}</p>
          <p>İyi çalışmalar,<br>Personel Yönetim Sistemi</p>
        `
      });

      res.json({ message: 'Aktivasyon linki gönderildi' });
    } catch (emailError) {
      console.error('Email gönderme hatası:', emailError);
      res.status(500).json({ message: 'Email gönderilemedi', error: emailError.message });
    }
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Bulk send activation links
router.post('/bulk-send-activation-links', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: 'Çalışan ID listesi gereklidir' });
    }

    let query = { _id: { $in: employeeIds }, isActivated: false };
    
    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      query.company = req.user.company;
    }

    const employees = await Employee.find(query);
    
    if (employees.length === 0) {
      return res.status(404).json({ message: 'Aktivasyon linki gönderilecek çalışan bulunamadı' });
    }

    const transporter = createTransporter();
    let successCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      try {
        // Generate activation token
        const activationToken = crypto.randomBytes(32).toString('hex');
        employee.activationToken = activationToken;
        await employee.save();

        // Create activation link
        const activationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate-employee?token=${activationToken}&email=${encodeURIComponent(employee.email)}`;

        // Send email
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: employee.email,
          subject: 'Personel Yönetim Sistemi - Hesap Aktivasyonu',
          html: `
            <h2>Hesap Aktivasyonu</h2>
            <p>Merhaba ${employee.firstName} ${employee.lastName},</p>
            <p>Personel Yönetim Sistemine hesabınızı aktif etmek için aşağıdaki linke tıklayın:</p>
            <p><a href="${activationLink}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Hesabı Aktif Et</a></p>
            <p>Veya aşağıdaki linki tarayıcınıza yapıştırın:</p>
            <p>${activationLink}</p>
            <p>İyi çalışmalar,<br>Personel Yönetim Sistemi</p>
          `
        });

        successCount++;
      } catch (error) {
        console.error(`Email gönderme hatası (${employee.email}):`, error);
        errorCount++;
      }
    }

    res.json({ 
      message: `${successCount} çalışan için aktivasyon linki gönderildi`,
      success: successCount,
      errors: errorCount > 0 ? errorCount : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Activate employee (public endpoint)
router.post('/activate', async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({ message: 'Token, email ve şifre gereklidir' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
    }

    const employee = await Employee.findOne({ 
      activationToken: token,
      email: email,
      isActivated: false
    });

    if (!employee) {
      return res.status(404).json({ message: 'Geçersiz veya süresi dolmuş aktivasyon linki' });
    }

    // Create user account for employee
    const role = await Role.findOne({ name: 'employee' });
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      // Update existing user
      user.password = hashedPassword;
      user.role = role._id;
      user.company = employee.company;
      user.isActive = true;
      user.mustChangePassword = false;
      await user.save();
    } else {
      // Create new user
      user = new User({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role._id,
        company: employee.company,
        isActive: true,
        mustChangePassword: false
      });
      await user.save();
    }

    // Activate employee
    employee.isActivated = true;
    employee.activatedAt = new Date();
    employee.activationToken = null;
    await employee.save();

    res.json({ message: 'Hesap başarıyla aktif edildi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete employee
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Çalışan bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== employee.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Çalışan silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;

