const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Employment = require('../models/Employment');
const EmploymentPreRecord = require('../models/EmploymentPreRecord');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const Workplace = require('../models/Workplace');
const { auth, requireRole } = require('../middleware/auth');
const {
  isExceptionSector,
  validateHireDate,
  validateTerminationDate,
  generateEmploymentContract,
  generateResignationText,
  calculateSeveranceAndNotice,
  generateSeveranceNoticePDF
} = require('../services/employmentService');

// Multer configuration for file uploads
const upload = multer({
  dest: 'uploads/employment/',
  fileFilter: (req, file, cb) => {
    // PDF veya resim dosyaları kabul edilir
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image|pdf/.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece PDF veya resim dosyaları yüklenebilir'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure upload directories exist
const uploadsDirs = [
  'uploads/employment',
  'uploads/employment/contracts',
  'uploads/employment/resignations',
  'uploads/employment/severance',
  'uploads/employment/terminations'
];
uploadsDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

/**
 * POST /api/employment/hire - İşe giriş
 */
router.post('/hire', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const {
      candidateFullName,
      tcKimlikNo,
      email,
      phone,
      companyId,
      workplaceId,
      sectionId,
      departmentId,
      hireDate,
      sgkMeslekKodu,
      ucret,
      contractType
    } = req.body;

    // Validasyon - Zorunlu alanlar
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Şirket Seçimi Zorunludur.'
      });
    }
    
    if (!hireDate) {
      return res.status(400).json({
        success: false,
        message: 'İşe Giriş Tarihi Zorunludur.'
      });
    }
    
    if (!candidateFullName || !tcKimlikNo) {
      return res.status(400).json({
        success: false,
        message: 'Adı Soyadı Ve TC Kimlik No Zorunludur.'
      });
    }
    
    // Ad Soyad'ı büyük harfe çevir ve trim yap
    const formattedFullName = candidateFullName.trim().toUpperCase();

    // TC Kimlik No validasyonu
    if (tcKimlikNo.length !== 11 || !/^\d+$/.test(tcKimlikNo)) {
      return res.status(400).json({
        success: false,
        message: 'TC Kimlik No 11 Haneli Sayı Olmalıdır'
      });
    }

    // Sözleşme tipi validasyonu
    const validContractTypes = ['BELİRSİZ_SÜRELİ', 'BELİRLİ_SÜRELİ', 'KISMİ_SÜRELİ'];
    const finalContractType = contractType || 'BELİRSİZ_SÜRELİ';
    if (!validContractTypes.includes(finalContractType)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz Sözleşme Tipi'
      });
    }

    // Şirket kontrolü
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket Bulunamadı' });
    }

    // İşyeri kontrolü ve otomatik oluşturma
    let finalWorkplaceId = workplaceId;
    let workplace = null;
    
    if (workplaceId) {
      workplace = await Workplace.findById(workplaceId);
      if (!workplace) {
        return res.status(404).json({ success: false, message: 'İşyeri Bulunamadı' });
      }
      // İşyeri şirkete ait mi kontrol et
      if (workplace.company.toString() !== companyId) {
        return res.status(400).json({ success: false, message: 'İşyeri Bu Şirkete Ait Değil' });
      }
    } else {
      // İşyeri seçilmemişse, şirketteki işyerlerini kontrol et
      const existingWorkplaces = await Workplace.find({ company: companyId, isActive: true });
      
      if (existingWorkplaces.length === 1) {
        // Tek işyeri varsa otomatik seç
        finalWorkplaceId = existingWorkplaces[0]._id;
        workplace = existingWorkplaces[0];
      } else if (existingWorkplaces.length === 0) {
        // Hiç işyeri yoksa otomatik oluştur (şirket adıyla)
        workplace = new Workplace({
          name: company.name,
          company: companyId,
          isDefault: true,
          isActive: true
        });
        await workplace.save();
        finalWorkplaceId = workplace._id;
      } else {
        // Birden fazla işyeri varsa seçim zorunlu
        return res.status(400).json({
          success: false,
          message: 'Birden Fazla İşyeri Bulundu. Lütfen Seçim Yapınız.'
        });
      }
    }

    // İstisna sektör kontrolü
    const isException = await isExceptionSector(companyId);
    let warnings = [];
    
    if (!isException) {
      warnings = await validateHireDate(hireDate, companyId);
    } else {
      // İstisna sektör mesajı
      warnings.push('Bu Sektör İstisna Kapsamındadır (İnşaat/Balıkçılık).');
    }

    // Bayi onayı gerekli mi kontrol et
    const requiresDealerApproval = company.onboarding_requires_dealer_approval || false;
    const initialStatus = requiresDealerApproval ? 'PENDING_COMPANY_APPROVAL' : 'PENDING_COMPANY_APPROVAL';

    // Ücret kontrolü - boşsa asgari ücret
    const MINIMUM_WAGE = 17002.00;
    const finalUcret = ucret ? parseFloat(ucret) : MINIMUM_WAGE;

    // EmploymentPreRecord oluştur - ÖN-KAYIT (Employee oluşturulmayacak)
    const preRecord = new EmploymentPreRecord({
      processType: 'hire',
      candidateFullName: formattedFullName, // Büyük harfe çevrilmiş
      tcKimlikNo: tcKimlikNo.trim(),
      email: email || null,
      phone: phone || null,
      companyId,
      workplaceId: finalWorkplaceId,
      sectionId: sectionId || null,
      departmentId: departmentId || null,
      hireDate: new Date(hireDate),
      sgkMeslekKodu: sgkMeslekKodu || null,
      ucret: finalUcret,
      contractType: finalContractType,
      status: initialStatus,
      pendingDate: new Date(),
      waitingApprovalAt: new Date(), // Onaya gönderilme tarihi
      createdBy: req.user._id
    });

    await preRecord.save();

    // Populate edilmiş kaydı al
    const populatedPreRecord = await EmploymentPreRecord.findById(preRecord._id)
      .populate('employeeId', 'firstName lastName employeeNumber email')
      .populate('companyId', 'name')
      .populate('workplaceId', 'name')
      .populate('sectionId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'email')
      .populate('approvedBy', 'email')
      .populate('rejectedBy', 'email');

    // WhatsApp log (şimdilik sadece log)
    console.log('Çalışana WhatsApp Üzerinden Evrak Listesi İletilmesi Gerekiyor.');

    // Ücret uyarısı
    let salaryWarning = null;
    if (!ucret) {
      salaryWarning = `Ücret Girilmediği İçin Asgari Ücret (${MINIMUM_WAGE.toLocaleString('tr-TR')} TL) Uygulanmıştır.`;
    }

    res.status(201).json({
      success: true,
      message: 'İşe Giriş Ön-Kaydı Başarıyla Oluşturuldu Ve Onaya Gönderildi',
      data: {
        preRecord: populatedPreRecord,
        warnings: salaryWarning ? [...warnings, salaryWarning] : warnings,
        salaryWarning
      }
    });
  } catch (error) {
    console.error('İşe giriş hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

/**
 * POST /api/employment/terminate - İşten çıkış ön-kaydı oluştur
 */
router.post('/terminate', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), upload.single('resignationPhoto'), async (req, res) => {
  try {
    const {
      employeeId,
      companyId,
      terminationDate,
      terminationReason
    } = req.body;

    // Validasyon
    if (!employeeId || !companyId || !terminationDate || !terminationReason) {
      return res.status(400).json({
        success: false,
        message: 'Tüm zorunlu alanlar doldurulmalıdır'
      });
    }

    if (!['istifa', 'işten çıkarma'].includes(terminationReason)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz çıkış nedeni'
      });
    }

    // Çalışan kontrolü
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Çalışan bulunamadı' });
    }

    // Çalışan aktif mi kontrol et
    if (employee.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: 'Sadece aktif çalışanlar için işten çıkış işlemi yapılabilir' 
      });
    }

    // Şirket kontrolü
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
    }

    // Validasyon uyarıları
    const warnings = validateTerminationDate(terminationDate);

    // Bayi onayı gerekli mi kontrol et
    const requiresDealerApproval = company.onboarding_requires_dealer_approval || false;
    const initialStatus = requiresDealerApproval ? 'PENDING_COMPANY_APPROVAL' : 'PENDING_COMPANY_APPROVAL';

    // EmploymentPreRecord oluştur - ÖN-KAYIT
    const preRecord = new EmploymentPreRecord({
      processType: 'termination',
      employeeId,
      companyId,
      workplaceId: employee.workplace,
      sectionId: employee.workplaceSection || null,
      departmentId: employee.department || null,
      terminationDate: new Date(terminationDate),
      terminationReason,
      status: initialStatus,
      pendingDate: new Date(),
      waitingApprovalAt: new Date(), // Onaya gönderilme tarihi
      createdBy: req.user._id
    });

    // İstifa dilekçesi yükleme (opsiyonel, sadece istifa seçilmişse)
    if (terminationReason === 'istifa' && req.file) {
      const fileName = `resignation_${preRecord._id}_${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(__dirname, '..', 'uploads', 'employment', 'resignations', fileName);
      fs.renameSync(req.file.path, filePath);
      
      preRecord.documents.push({
        type: 'istifa_dilekçesi',
        fileUrl: `/uploads/employment/resignations/${fileName}`
      });
    }

    await preRecord.save();

    res.status(201).json({
      success: true,
      message: 'İşten çıkış ön-kaydı oluşturuldu ve onaya gönderildi',
      data: {
        preRecord,
        warnings
      }
    });
  } catch (error) {
    console.error('İşten çıkış hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

/**
 * GET /api/employment/:employeeId - Çalışanın employment kayıtlarını getir
 */
/**
 * GET /api/employment - Tüm işe giriş/çıkış ön-kayıtlarını listele
 */
router.get('/', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    let query = {};

    // Rol bazlı filtreleme
    if (req.user.role.name === 'super_admin') {
      // Tüm kayıtlar
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi'ye ait şirketlerin kayıtları
      const companies = await Company.find({ dealer: req.user.dealer });
      query.companyId = { $in: companies.map(c => c._id) };
    } else {
      // Şirket admin ve resmi muhasebe/İK - sadece kendi şirketleri
      query.companyId = req.user.company;
    }

    const preRecords = await EmploymentPreRecord.find(query)
      .populate('employeeId', 'firstName lastName employeeNumber email')
      .populate('companyId', 'name')
      .populate('workplaceId', 'name')
      .populate('sectionId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'email')
      .populate('approvedBy', 'email')
      .populate('rejectedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: preRecords
    });
  } catch (error) {
    console.error('İşe giriş/çıkış listesi hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

/**
 * POST /api/employment/:id/approve - İşe giriş/çıkış ön-kaydını onayla
 */
router.post('/:id/approve', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate('companyId')
      .populate('employeeId');

    if (!preRecord) {
      return res.status(404).json({ success: false, message: 'İşlem kaydı bulunamadı' });
    }

    // Yetki kontrolü
    const company = preRecord.companyId;
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      if (req.user.company.toString() !== company._id.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    } else if (req.user.role.name === 'bayi_admin') {
      if (company.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    // İşe giriş işlemi
    if (preRecord.processType === 'hire') {
      // Şirket onayı
      if (preRecord.status === 'PENDING_COMPANY_APPROVAL') {
        // Bayi onayı gerekli mi kontrol et
        if (company.onboarding_requires_dealer_approval) {
          // Bayi onayına gönder
          preRecord.status = 'PENDING_DEALER_APPROVAL';
          await preRecord.save();
          
          return res.json({
            success: true,
            message: 'Şirket onayı verildi, bayi onayı bekleniyor',
            data: preRecord
          });
        } else {
          // Direkt onayla ve Employee oluştur
          preRecord.status = 'APPROVED';
          preRecord.approvedAt = new Date();
          preRecord.approvedBy = req.user._id;
          await preRecord.save();

          // Employee kaydı oluştur
          const nameParts = preRecord.candidateFullName.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Email oluştur (yoksa)
          const email = preRecord.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${Date.now()}.com`;

          // Employee number hesapla
          const maxEmployee = await Employee.findOne({ company: company._id })
            .sort({ employeeNumber: -1 })
            .select('employeeNumber');
          
          let employeeNumber = '1';
          if (maxEmployee && maxEmployee.employeeNumber) {
            const maxNum = parseInt(maxEmployee.employeeNumber) || 0;
            employeeNumber = String(maxNum + 1);
          }

          const employee = new Employee({
            firstName,
            lastName,
            email: email.toLowerCase().trim(),
            phone: preRecord.phone || '',
            tcKimlik: preRecord.tcKimlikNo,
            position: preRecord.sgkMeslekKodu || '',
            company: company._id,
            workplace: preRecord.workplaceId,
            workplaceSection: preRecord.sectionId || null,
            department: preRecord.departmentId || null,
            employeeNumber,
            hireDate: preRecord.hireDate,
            status: 'active',
            salary: preRecord.ucret,
            isNetSalary: company.payrollCalculationType === 'NET'
          });

          await employee.save();

          return res.json({
            success: true,
            message: 'İşe giriş onaylandı ve çalışan kaydı oluşturuldu',
            data: {
              preRecord,
              employee
            }
          });
        }
      }
      // Bayi onayı
      else if (preRecord.status === 'PENDING_DEALER_APPROVAL' && req.user.role.name === 'bayi_admin') {
        preRecord.status = 'APPROVED';
        preRecord.approvedAt = new Date();
        preRecord.approvedBy = req.user._id;
        await preRecord.save();

        // Employee kaydı oluştur
        const nameParts = preRecord.candidateFullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const email = preRecord.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${Date.now()}.com`;

        const maxEmployee = await Employee.findOne({ company: company._id })
          .sort({ employeeNumber: -1 })
          .select('employeeNumber');
        
        let employeeNumber = '1';
        if (maxEmployee && maxEmployee.employeeNumber) {
          const maxNum = parseInt(maxEmployee.employeeNumber) || 0;
          employeeNumber = String(maxNum + 1);
        }

        const employee = new Employee({
          firstName,
          lastName,
          email: email.toLowerCase().trim(),
          phone: preRecord.phone || '',
          tcKimlik: preRecord.tcKimlikNo,
          position: preRecord.sgkMeslekKodu || '',
          company: company._id,
          workplace: preRecord.workplaceId,
          workplaceSection: preRecord.sectionId || null,
          department: preRecord.departmentId || null,
          employeeNumber,
          hireDate: preRecord.hireDate,
          status: 'active',
          salary: preRecord.ucret,
          isNetSalary: company.payrollCalculationType === 'NET'
        });

        await employee.save();

        return res.json({
          success: true,
          message: 'İşe giriş onaylandı ve çalışan kaydı oluşturuldu',
          data: {
            preRecord,
            employee
          }
        });
      }
    }
    // İşten çıkış işlemi
    else if (preRecord.processType === 'termination') {
      // Benzer onay mantığı (şimdilik basit)
      if (preRecord.status === 'PENDING_COMPANY_APPROVAL') {
        if (company.onboarding_requires_dealer_approval) {
          preRecord.status = 'PENDING_DEALER_APPROVAL';
          await preRecord.save();
          
          return res.json({
            success: true,
            message: 'Şirket onayı verildi, bayi onayı bekleniyor',
            data: preRecord
          });
        } else {
          preRecord.status = 'APPROVED';
          preRecord.approvedAt = new Date();
          preRecord.approvedBy = req.user._id;
          await preRecord.save();

          // Employee statüsünü güncelle
          const employee = await Employee.findById(preRecord.employeeId);
          if (employee) {
            employee.status = 'separated';
            employee.separationDate = preRecord.terminationDate;
            employee.separationReason = preRecord.terminationReason;
            employee.exitDate = preRecord.terminationDate;
            employee.exitReason = preRecord.terminationReason;
            await employee.save();
          }

          return res.json({
            success: true,
            message: 'İşten çıkış onaylandı',
            data: {
              preRecord,
              employee
            }
          });
        }
      }
      else if (preRecord.status === 'PENDING_DEALER_APPROVAL' && req.user.role.name === 'bayi_admin') {
        preRecord.status = 'APPROVED';
        preRecord.approvedAt = new Date();
        preRecord.approvedBy = req.user._id;
        await preRecord.save();

        const employee = await Employee.findById(preRecord.employeeId);
        if (employee) {
          employee.status = 'separated';
          employee.separationDate = preRecord.terminationDate;
          employee.separationReason = preRecord.terminationReason;
          employee.exitDate = preRecord.terminationDate;
          employee.exitReason = preRecord.terminationReason;
          await employee.save();
        }

        return res.json({
          success: true,
          message: 'İşten çıkış onaylandı',
          data: {
            preRecord,
            employee
          }
        });
      }
    }

    return res.status(400).json({ 
      success: false, 
      message: 'Bu kayıt onay beklenen durumda değil veya yetkiniz yok' 
    });
  } catch (error) {
    console.error('Onay hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

/**
 * POST /api/employment/:id/cancel-request - İptal talebi gönder
 */
router.post('/:id/cancel-request', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'İptal nedeni gereklidir' 
      });
    }

    const employment = await Employment.findById(req.params.id)
      .populate('companyId')
      .populate('employeeId');

    if (!employment) {
      return res.status(404).json({ success: false, message: 'İşe giriş kaydı bulunamadı' });
    }

    // Sadece onaylanmamış kayıtlar için iptal talebi gönderilebilir
    if (employment.status === 'APPROVED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Onaylanmış kayıtlar için iptal talebi gönderilemez' 
      });
    }

    // Yetki kontrolü
    const company = employment.companyId;
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      if (req.user.company.toString() !== company._id.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    } else if (req.user.role.name === 'bayi_admin') {
      if (company.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    employment.status = 'CANCELLATION_PENDING';
    employment.cancellationRequest = {
      reason: reason.trim(),
      requestedAt: new Date(),
      requestedBy: req.user._id,
      approvers: [],
      isApproved: false
    };
    await employment.save();

    res.json({
      success: true,
      message: 'İptal talebi gönderildi',
      data: employment
    });
  } catch (error) {
    console.error('İptal talebi hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

/**
 * POST /api/employment/:id/approve-cancellation - İptal talebini onayla
 */
router.post('/:id/approve-cancellation', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const employment = await Employment.findById(req.params.id)
      .populate('companyId')
      .populate('employeeId');

    if (!employment) {
      return res.status(404).json({ success: false, message: 'İşe giriş kaydı bulunamadı' });
    }

    if (employment.status !== 'CANCELLATION_PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu kayıt için iptal talebi beklenmiyor' 
      });
    }

    // Yetki kontrolü
    const company = employment.companyId;
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      if (req.user.company.toString() !== company._id.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    } else if (req.user.role.name === 'bayi_admin') {
      if (company.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    // Kullanıcı daha önce onaylamış mı kontrol et
    const alreadyApproved = employment.cancellationRequest.approvers.some(
      approver => approver.userId.toString() === req.user._id.toString()
    );

    if (alreadyApproved) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu iptal talebini zaten onayladınız' 
      });
    }

    // Onaylayanı ekle
    employment.cancellationRequest.approvers.push({
      userId: req.user._id,
      approvedAt: new Date()
    });

    // Tüm onaylayanlar onayladı mı kontrol et (şimdilik en az 1 onay yeterli)
    // İleride daha karmaşık onay mantığı eklenebilir
    if (employment.cancellationRequest.approvers.length >= 1) {
      employment.status = 'CANCELLED';
      employment.cancellationRequest.isApproved = true;
    }

    await employment.save();

    res.json({
      success: true,
      message: 'İptal talebi onaylandı',
      data: employment
    });
  } catch (error) {
    console.error('İptal onay hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

router.get('/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employments = await Employment.find({ employeeId })
      .populate('companyId', 'name')
      .populate('workplaceId', 'name')
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: employments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

module.exports = router;

