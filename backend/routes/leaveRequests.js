const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const Department = require('../models/Department');
const WorkingPermit = require('../models/WorkingPermit');
const CompanyLeaveType = require('../models/CompanyLeaveType');
const LeaveSubType = require('../models/LeaveSubType');
const { auth, requireRole } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { calculateLeaveDays, calculateSeniority, calculateAge, calculateAnnualLeaveDays, getEmployeeWeekendDays, calculateWorkingDays } = require('../utils/leaveCalculator');

// Approval Logic: Yeni servis kullanılıyor
const { calculateApprovalChain } = require('../services/approvalChainService');

const upload = multer({
  dest: 'uploads/leaves/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image|pdf/.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim ve PDF dosyaları yüklenebilir'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get all leave requests with pagination and advanced filtering
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    const { 
      status, 
      employee, 
      company, 
      startDate, 
      endDate, 
      leaveType, 
      employeeName,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Kullanıcının employee kaydını bul (yönetici kontrolü için gerekli)
    const currentUserEmployee = await Employee.findOne({ email: req.user.email });

    // Rol bazlı erişim kontrolü
    if (employee) {
      query.employee = employee;
    } else if (req.user.role.name === 'employee') {
      // Çalışan (yetki seviyesi 3) - sadece kendi taleplerini görür
      if (currentUserEmployee) {
        query.employee = currentUserEmployee._id;
      } else {
        return res.json({ 
          success: true, 
          data: [], 
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } 
        });
      }
    } else if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      // Şirket adminleri (yetki seviyesi 1) - tüm talepleri görür
      if (company) {
        query.company = company;
      } else {
        query.company = req.user.company;
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      // Bayi admin - bayi şirketlerinin taleplerini görür
      if (company) {
        const companyDoc = await Company.findById(company);
        if (!companyDoc || companyDoc.dealer.toString() !== req.user.dealer.toString()) {
          return res.status(403).json({ message: 'Yetkiniz yok' });
        }
        query.company = company;
      } else {
        const companies = await Company.find({ dealer: req.user.dealer });
        query.company = { $in: companies.map(c => c._id) };
      }
    } else if (currentUserEmployee && currentUserEmployee.department) {
      // Yetkilendirilmiş yönetici (yetki seviyesi 2) - kendi birimindeki çalışanların taleplerini görür
      const department = await Department.findById(currentUserEmployee.department);
      if (department && department.manager && department.manager.toString() === currentUserEmployee._id.toString()) {
        const departmentEmployees = await Employee.find({ department: currentUserEmployee.department });
        query.employee = { $in: departmentEmployees.map(e => e._id) };
        query.company = currentUserEmployee.company;
      } else if (currentUserEmployee.manager) {
        const managedEmployees = await Employee.find({ manager: currentUserEmployee._id });
        if (managedEmployees.length > 0) {
          query.employee = { $in: managedEmployees.map(e => e._id) };
          query.company = currentUserEmployee.company;
        } else {
          query.employee = currentUserEmployee._id;
        }
      } else {
        query.employee = currentUserEmployee._id;
      }
    } else {
      // Diğer durumlar için sadece kendi taleplerini görsün
      if (currentUserEmployee) {
        query.employee = currentUserEmployee._id;
      } else {
        return res.json({ 
          success: true, 
          data: [], 
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } 
        });
      }
    }

    // Durum filtresi
    if (status) {
      query.status = status;
    }

    // Tarih aralığı filtresi
    if (startDate && endDate) {
      query.$or = [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ];
    }

    // İzin türü filtresi
    if (leaveType) {
      query.$or = [
        { companyLeaveType: leaveType },
        { leaveSubType: leaveType }
      ];
    }

    // Çalışan adı arama filtresi
    if (employeeName) {
      const employees = await Employee.find({
        $or: [
          { firstName: { $regex: employeeName, $options: 'i' } },
          { lastName: { $regex: employeeName, $options: 'i' } }
        ]
      }).select('_id');
      
      if (employees.length > 0) {
        query.employee = { $in: employees.map(e => e._id) };
      } else {
        // Eğer eşleşen çalışan yoksa boş sonuç döndür
        return res.json({ 
          success: true, 
          data: [], 
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } 
        });
      }
    }

    // Toplam kayıt sayısı
    const total = await LeaveRequest.countDocuments(query);

    // Sıralama
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Verileri çek
    const requests = await LeaveRequest.find(query)
      .populate('employee', 'firstName lastName email employeeNumber department manager')
      .populate('company', 'name')
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId',
        strictPopulate: false
      })
      .populate('reviewedBy', 'email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('createdByAdmin', 'email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single leave request
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id)
      .populate('employee')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('reviewedBy');

    if (!request) {
      return res.status(404).json({ message: 'İzin talebi bulunamadı' });
    }

    // Check access
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== request.employee._id.toString()) {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
               req.user.company.toString() !== request.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// GET /api/leave-requests/my - Çalışan kendi taleplerini listeler
router.get('/my', auth, async (req, res) => {
  try {
    // Çalışan bilgisini bul
    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Çalışan bulunamadı' 
      });
    }

    const requests = await LeaveRequest.find({ employee: employee._id })
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: 'İzin talepleri başarıyla getirildi',
      data: requests
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

// GET /api/leave-requests/rejected - Reddedilen talepler
router.get('/rejected', auth, async (req, res) => {
  try {
    let query = { status: 'REJECTED' };

    if (req.user.role.name === 'employee') {
      // Çalışan sadece kendi reddedilen taleplerini görür
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) {
        query.employee = emp._id;
      } else {
        return res.json({ success: true, data: [] });
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      // Şirket admini şirketindeki tüm reddedilen talepleri görür
      query.company = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    }

    const rejectedRequests = await LeaveRequest.find(query)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('history.approver', 'firstName lastName email')
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      message: 'Reddedilen izin talepleri başarıyla getirildi',
      data: rejectedRequests
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

// GET /api/leave-requests/pending - Yöneticinin bekleyen talepleri
router.get('/pending', auth, async (req, res) => {
  try {
    // Kullanıcının employee kaydını bul
    const currentUserEmployee = await Employee.findOne({ email: req.user.email });
    if (!currentUserEmployee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Çalışan kaydı bulunamadı' 
      });
    }

    // Bu kullanıcının onaylaması gereken talepleri bul
    // currentApprover = currentUserEmployee._id ve status = IN_PROGRESS veya PENDING
    const pendingRequests = await LeaveRequest.find({
      currentApprover: currentUserEmployee._id,
      status: { $in: ['PENDING', 'IN_PROGRESS'] }
    })
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: 'Bekleyen izin talepleri başarıyla getirildi',
      data: pendingRequests
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

// Create leave request
// Permission-based kontrol: leave:request yetkisi gerekli (employee kendi talebini oluşturabilir)
router.post('/', auth, upload.single('document'), async (req, res) => {
  // #region agent log
  const fs = require('fs');
  const path = require('path');
  const logPath = path.join(__dirname, '../../.cursor/debug.log');
  try {
    fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:293',message:'POST /leave-requests called',data:{body:req.body,hasCompanyLeaveType:!!req.body.companyLeaveType,companyLeaveType:req.body.companyLeaveType,userRole:req.user?.role?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'}) + '\n');
  } catch(e) {}
  // #endregion
  try {
    const {
      companyLeaveType,
      leaveSubType,
      startDate,
      endDate,
      returnDate,
      startTime,
      endTime,
      isHalfDay,
      halfDayPeriod,
      isHourly,
      hours,
      description
    } = req.body;
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:309',message:'Body destructured',data:{companyLeaveType,leaveSubType,startDate,endDate,hasEmployee:!!req.body.employee},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'}) + '\n');
    } catch(e) {}
    // #endregion

    // Find employee
    let employee;
    if (req.user.role.name === 'employee') {
      employee = await Employee.findOne({ email: req.user.email });
      if (!employee) {
        return res.status(404).json({ message: 'Çalışan bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.' });
      }
    } else {
      if (!req.body.employee) {
        return res.status(400).json({ message: 'Çalışan seçilmelidir' });
      }
      employee = await Employee.findById(req.body.employee);
    }

    if (!employee) {
      return res.status(404).json({ message: 'Çalışan bulunamadı' });
    }

    const company = await Company.findById(employee.company);
    if (!company) {
      return res.status(404).json({ message: 'Şirket bulunamadı' });
    }

    // Check working permit (yeni model yapısı)
    if (!companyLeaveType) {
      return res.status(400).json({ success: false, message: 'İzin türü seçilmelidir' });
    }

    // WorkingPermit modelini kullan (yeni yapı)
    const workingPermit = await WorkingPermit.findById(companyLeaveType);
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:339',message:'WorkingPermit found',data:{hasWorkingPermit:!!workingPermit,workingPermitId:workingPermit?._id,workingPermitName:workingPermit?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'}) + '\n');
    } catch(e) {}
    // #endregion
    if (!workingPermit) {
      // #region agent log
      try {
        fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:342',message:'WorkingPermit not found',data:{companyLeaveType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'}) + '\n');
      } catch(e) {}
      // #endregion
      return res.status(404).json({ success: false, message: 'İzin türü bulunamadı' });
    }

    // Check if working permit belongs to employee's company
    if (workingPermit.company.toString() !== employee.company.toString()) {
      return res.status(403).json({ success: false, message: 'Bu izin türü bu şirkete ait değil' });
    }

    // Check if "Diğer izinler" category requires sub type
    const isOtherCategory = workingPermit.name === 'Diğer izinler';
    if (isOtherCategory && !leaveSubType) {
      return res.status(400).json({ success: false, message: 'Alt izin türü seçilmelidir' });
    }

    // Check leave sub type if provided
    let leaveSubTypeDoc = null;
    if (leaveSubType) {
      leaveSubTypeDoc = await WorkingPermit.findById(leaveSubType);
      if (!leaveSubTypeDoc) {
        return res.status(404).json({ success: false, message: 'Alt izin türü bulunamadı' });
      }
      // Alt izin türünün parent'ı doğru mu kontrol et
      if (leaveSubTypeDoc.parentPermitId?.toString() !== workingPermit._id.toString()) {
        return res.status(400).json({ success: false, message: 'Alt izin türü bu kategoriye ait değil' });
      }
    }

    // Check if unpaid leave requires description
    const leaveTypeName = leaveSubTypeDoc ? leaveSubTypeDoc.name : workingPermit.name;
    const isUnpaidLeave = leaveTypeName.toLowerCase().includes('ücretsiz') || 
                          leaveTypeName.toLowerCase().includes('mazeret');
    if (isUnpaidLeave && !description) {
      return res.status(400).json({ success: false, message: 'Ücretsiz izinlerde açıklama zorunludur' });
    }

    // Yıllık izin kontrolü - Parçalı kullanım kuralı
    const isAnnualLeave = leaveTypeName.toLowerCase().includes('yıllık');
    if (isAnnualLeave) {
      const leavePolicy = company.leavePolicy || { allowSplitLeave: true, minFirstBlockDays: 10 };
      
      // Mevcut yıllık izin taleplerini kontrol et (aynı yıl içinde)
      const currentYear = new Date().getFullYear();
      const existingAnnualLeaves = await LeaveRequest.find({
        employee: employee._id,
        companyLeaveType: companyLeaveType,
        status: { $in: ['PENDING', 'IN_PROGRESS', 'APPROVED'] },
        startDate: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) }
      });
      
      // Parçalı kullanım kontrolü
      const requestedBlocks = existingAnnualLeaves.length + 1; // Mevcut + yeni talep
      if (!leavePolicy.allowSplitLeave && requestedBlocks > 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'Bu şirkette izin tek parça kullanılabilir.' 
        });
      }
      
      // İlk parça 10 gün zorunluluğu kaldırıldı
      // Artık herhangi bir gün sayısı ile yıllık izin alınabilir
    }

    // Calculate total days based on return date if provided, otherwise use endDate
    let calculatedEndDate = endDate;
    let calculatedReturnDate = returnDate;
    
    if (calculatedReturnDate) {
      // If return date is provided, calculate days from startDate to returnDate
      calculatedEndDate = calculatedReturnDate;
    }

    // Yıllık izin için pazar günü kontrolü
    // Tarih aralığında Pazar varsa otomatik düş
    // Pazar izin süresine dahil edilmeyecek
    // calculateLeaveDays fonksiyonu zaten weekendDays kullanarak pazar günlerini düşüyor

    // Calculate total days (excluding weekends based on employee's weekend settings)
    // Yıllık izin için pazar günleri otomatik olarak düşülür (weekendDays içinde 0 = Pazar)
    const totalDays = await calculateLeaveDays(
      new Date(startDate),
      new Date(calculatedEndDate),
      employee,
      Department,
      Company,
      isHalfDay === 'true' || isHalfDay === true,
      isHourly === 'true' || isHourly === true,
      parseFloat(hours) || 0
    );

    // Check for conflicts with existing leave requests (especially annual leave vs sick leave)
    const conflictCheck = await checkLeaveConflicts(employee._id, new Date(startDate), new Date(calculatedEndDate), null, companyLeaveType);

    // Handle document upload
    let documentPath = null;
    if (req.file) {
      const fileName = `leave_${employee._id}_${Date.now()}${path.extname(req.file.originalname)}`;
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'leaves');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, fileName);
      fs.renameSync(req.file.path, filePath);
      documentPath = `/uploads/leaves/${fileName}`;
    }

    // Admin tarafından oluşturuluyor mu?
    const isAdminCreated = ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'].includes(req.user.role.name);
    
    // Approval chain hesapla (yeni servis ile) - sadece çalışan tarafından oluşturuluyorsa
    let approvalChain = [];
    let currentApprover = null;
    let initialStatus = 'PENDING';
    
    if (!isAdminCreated) {
      approvalChain = await calculateApprovalChain(employee._id);
      
      // İlk onaylayıcıyı belirle (alttan üste doğru - chain'in ilk elemanı en alt yönetici)
      if (approvalChain.length > 0) {
        currentApprover = approvalChain[0]; // İlk yönetici (en alt seviye)
        initialStatus = 'IN_PROGRESS';
      } else {
        initialStatus = 'APPROVED';
      }
    } else {
      // Admin tarafından oluşturuluyorsa direkt approved
      initialStatus = 'APPROVED';
    }

    // İzin tipini al (type field için) - yukarıda zaten tanımlı
    // const leaveTypeName = leaveSubTypeDoc ? leaveSubTypeDoc.name : workingPermit.name;

    const leaveRequest = new LeaveRequest({
      employee: employee._id,
      company: company._id,
      companyLeaveType: workingPermit._id, // WorkingPermit ID'si
      leaveSubType: leaveSubTypeDoc ? leaveSubTypeDoc._id : null,
      type: leaveTypeName, // String olarak izin tipi (backward compatibility)
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      returnDate: calculatedReturnDate ? new Date(calculatedReturnDate) : null,
      startTime: startTime || null,
      endTime: endTime || null,
      isHalfDay: isHalfDay === 'true' || isHalfDay === true,
      halfDayPeriod: halfDayPeriod || null,
      isHourly: isHourly === 'true' || isHourly === true,
      hours: parseFloat(hours) || 0,
      totalDays,
      description,
      document: documentPath,
      status: initialStatus,
      currentApprover: currentApprover,
      isAdminCreated: isAdminCreated,
      createdByAdmin: isAdminCreated ? req.user._id : null,
      history: [] // Başlangıçta boş
    });

    await leaveRequest.save();

    // İlk onaylayıcı varsa history'ye ekle
    if (currentApprover && !isAdminCreated) {
      leaveRequest.history.push({
        approver: currentApprover,
        status: 'IN_PROGRESS',
        note: 'İzin talebi oluşturuldu, onay bekleniyor',
        date: new Date()
      });
      await leaveRequest.save();
    } else if (isAdminCreated) {
      // Admin tarafından oluşturulduysa history'ye ekle
      leaveRequest.history.push({
        approver: employee._id, // Çalışan kendisi (admin tarafından oluşturuldu)
        status: 'APPROVED',
        note: 'Admin tarafından oluşturuldu ve onaylandı',
        date: new Date()
      });
      await leaveRequest.save();
      
      // Admin tarafından oluşturulan yıllık izin için calculatedDays'i set et
      const leaveTypeName = (leaveSubTypeDoc ? leaveSubTypeDoc.name : workingPermit.name).toLowerCase();
      if (leaveTypeName.includes('yıllık') || leaveTypeName === 'yıllık izin') {
        // Pazar günü sayısını hesapla
        let sundayCount = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);
        
        while (current <= end) {
          if (current.getDay() === 0) { // 0 = Pazar
            sundayCount++;
          }
          current.setDate(current.getDate() + 1);
        }
        
        // calculatedDays = requestedDays - sundayCount (Pazar hariç)
        const totalCalendarDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const requestedDays = totalCalendarDays;
        leaveRequest.calculatedDays = requestedDays - sundayCount;
        await leaveRequest.save();
      }
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId',
        strictPopulate: false
      })
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    // #region agent log
    try { 
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(__dirname, '../../.cursor/debug.log');
      fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:517',message:'Leave request created',data:{leaveRequestId:leaveRequest._id.toString(),status:leaveRequest.status,initialStatus,isAdminCreated,hasCurrentApprover:!!currentApprover,employeeId:employee._id.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n'); 
    } catch(e){}
    // #endregion

    return res.status(201).json({
      success: true,
      message: 'İzin talebi başarıyla oluşturuldu',
      data: populated
    });
  } catch (error) {
    console.error('İzin talebi oluşturma hatası:', error);
    res.status(500).json({ 
      success: false,
      message: 'Hata', 
      error: error.message 
    });
  }
});

// POST /api/leave-requests/:id/approve - Yönetici onaylar
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { note } = req.body; // Opsiyonel not

    // Kullanıcının employee kaydını bul
    const approverEmployee = await Employee.findOne({ email: req.user.email });
    if (!approverEmployee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Çalışan kaydı bulunamadı' 
      });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber approvalChain')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description');

    if (!leaveRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'İzin talebi bulunamadı' 
      });
    }

    // Sadece currentApprover onaylayabilir
    if (!leaveRequest.currentApprover || 
        leaveRequest.currentApprover.toString() !== approverEmployee._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bu talebi onaylama yetkiniz yok' 
      });
    }

    // Status kontrolü
    if (leaveRequest.status === 'APPROVED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu talep zaten onaylanmış' 
      });
    }

    if (leaveRequest.status === 'REJECTED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu talep reddedilmiş, onaylanamaz' 
      });
    }

    // Employee'nin approvalChain'ini al (güncel olsun)
    const employee = await Employee.findById(leaveRequest.employee._id || leaveRequest.employee);
    let approvalChain = employee.approvalChain || [];
    
    // Eğer chain boşsa yeniden hesapla
    if (approvalChain.length === 0) {
      approvalChain = await calculateApprovalChain(employee._id);
    }

    // Mevcut onaylayıcının index'ini bul (alttan üste doğru - chain[0] en alt, chain[n] en üst)
    const currentApproverIndex = approvalChain.findIndex(
      id => id.toString() === approverEmployee._id.toString()
    );

    if (currentApproverIndex === -1) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bu talebi onaylama yetkiniz yok' 
      });
    }

    // Sıradaki onaylayıcıyı bul (bir üst seviye - index + 1)
    let nextApprover = null;
    if (currentApproverIndex < approvalChain.length - 1) {
      nextApprover = approvalChain[currentApproverIndex + 1];
    }

    // History'ye ekle
    leaveRequest.history.push({
      approver: approverEmployee._id,
      status: nextApprover ? 'IN_PROGRESS' : 'APPROVED',
      note: note || 'Onaylandı',
      date: new Date()
    });

    // Sıradaki onaylayıcı varsa IN_PROGRESS, yoksa APPROVED
    if (nextApprover) {
      leaveRequest.status = 'IN_PROGRESS';
      leaveRequest.currentApprover = nextApprover;
    } else {
      leaveRequest.status = 'APPROVED';
      leaveRequest.currentApprover = null;
    }

    await leaveRequest.save();

    // Eğer onaylandıysa ve yıllık izin ise balance güncelle
    if (leaveRequest.status === 'APPROVED') {
      const leaveTypeName = (leaveRequest.leaveSubType?.name || leaveRequest.companyLeaveType?.name || leaveRequest.type || '').toLowerCase();
      if (leaveTypeName.includes('yıllık') || leaveRequest.type === 'Yıllık izin') {
        // Pazar günü sayısını hesapla
        let sundayCount = 0;
        const start = new Date(leaveRequest.startDate);
        const end = new Date(leaveRequest.endDate);
        const current = new Date(start);
        
        while (current <= end) {
          if (current.getDay() === 0) { // 0 = Pazar
            sundayCount++;
          }
          current.setDate(current.getDate() + 1);
        }
        
        // calculatedDays = requestedDays - sundayCount (Pazar hariç)
        // totalDays zaten pazar hariç hesaplanmış, ama kullanıcı açıkça sundayCount çıkarmamızı istiyor
        // Toplam gün sayısını hesapla (başlangıç ve bitiş dahil)
        const totalCalendarDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const requestedDays = totalCalendarDays;
        leaveRequest.calculatedDays = requestedDays - sundayCount;
        
        await leaveRequest.save();
        await updateLeaveBalance(employee._id, leaveRequest.calculatedDays);
      }
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: nextApprover ? 'Onaylandı, sıradaki yöneticiye iletildi' : 'İzin talebi onaylandı',
      data: populated
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

// POST /api/leave-requests/:id/reject - Yönetici reddeder
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { note } = req.body; // Zorunlu not

    if (!note || note.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Red nedeni (note) zorunludur' 
      });
    }

    // Kullanıcının employee kaydını bul
    const approverEmployee = await Employee.findOne({ email: req.user.email });
    if (!approverEmployee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Çalışan kaydı bulunamadı' 
      });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description');

    if (!leaveRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'İzin talebi bulunamadı' 
      });
    }

    // Sadece currentApprover reddedebilir
    if (!leaveRequest.currentApprover || 
        leaveRequest.currentApprover.toString() !== approverEmployee._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bu talebi reddetme yetkiniz yok' 
      });
    }

    // Status kontrolü
    if (leaveRequest.status === 'APPROVED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu talep zaten onaylanmış, reddedilemez' 
      });
    }

    if (leaveRequest.status === 'REJECTED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu talep zaten reddedilmiş' 
      });
    }

    // History'ye ekle
    leaveRequest.history.push({
      approver: approverEmployee._id,
      status: 'REJECTED',
      note: note.trim(),
      date: new Date()
    });

    // Status ve rejectReason güncelle
    leaveRequest.status = 'REJECTED';
    leaveRequest.rejectReason = note.trim();
    leaveRequest.currentApprover = null; // Reddedildi, artık onaylayıcı yok

    await leaveRequest.save();

    // Tüm önceki onaylayıcıları ve çalışanı bilgilendir
    try {
      const User = require('../models/User');
      const employee = await Employee.findById(leaveRequest.employee._id || leaveRequest.employee);
      
      // Çalışanı bilgilendir
      if (employee && employee.email) {
        // Email gönderme işlemi burada yapılabilir
        console.log(`Red bildirimi gönderiliyor: ${employee.email}`);
      }

      // Önceki onaylayıcıları bilgilendir
      const previousApprovers = leaveRequest.history
        .filter(h => h.status === 'IN_PROGRESS' || h.status === 'APPROVED')
        .map(h => h.approver);

      for (const approverId of previousApprovers) {
        const approver = await Employee.findById(approverId);
        if (approver && approver.email) {
          // Email gönderme işlemi burada yapılabilir
          console.log(`Red bildirimi gönderiliyor (önceki onaylayıcı): ${approver.email}`);
        }
      }
    } catch (emailError) {
      console.error('Bildirim gönderme hatası:', emailError);
      // Email hatası onay işlemini engellemez
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'İzin talebi reddedildi',
      data: populated
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

// POST /api/leave-requests/:id/suspend - İzin talebini askıya al
router.post('/:id/suspend', auth, async (req, res) => {
  try {
    const { note } = req.body; // Opsiyonel not

    // Yetki kontrolü - sadece yöneticiler askıya alabilir
    if (!['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'BAYI_ADMIN', 'SUPER_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bu işlem için yetkiniz yok' 
      });
    }

    // Kullanıcının employee kaydını bul
    const approverEmployee = await Employee.findOne({ email: req.user.email });
    if (!approverEmployee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Çalışan kaydı bulunamadı' 
      });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company')
      .populate('companyLeaveType', 'name description')
      .populate('leaveSubType', 'name description');

    if (!leaveRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'İzin talebi bulunamadı' 
      });
    }

    // Şirket/Bayi yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      if (leaveRequest.company._id.toString() !== req.user.company.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bu şirkete ait talepleri askıya alma yetkiniz yok' 
        });
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      const company = await Company.findById(leaveRequest.company._id || leaveRequest.company);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bu bayinin taleplerini askıya alma yetkiniz yok' 
        });
      }
    }

    // Status kontrolü
    if (leaveRequest.status === 'APPROVED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Onaylanmış izin talebi askıya alınamaz' 
      });
    }

    if (leaveRequest.status === 'REJECTED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Reddedilmiş izin talebi askıya alınamaz' 
      });
    }

    if (leaveRequest.status === 'CANCELLED') {
      return res.status(400).json({ 
        success: false, 
        message: 'İptal edilmiş izin talebi askıya alınamaz' 
      });
    }

    // History'ye ekle
    leaveRequest.history.push({
      approver: approverEmployee._id,
      status: 'SUSPENDED',
      note: note || 'İzin talebi askıya alındı',
      date: new Date()
    });

    // Status güncelle
    leaveRequest.status = 'SUSPENDED';
    // currentApprover'ı koru, askıya alındıktan sonra devam edebilir

    await leaveRequest.save();

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'İzin talebi askıya alındı',
      data: populated
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

// POST /api/leave-requests/:id/resume - Askıya alınan izin talebini devam ettir
router.post('/:id/resume', auth, async (req, res) => {
  try {
    // Yetki kontrolü - sadece yöneticiler devam ettirebilir
    if (!['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'BAYI_ADMIN', 'SUPER_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bu işlem için yetkiniz yok' 
      });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber approvalChain')
      .populate('company');

    if (!leaveRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'İzin talebi bulunamadı' 
      });
    }

    if (leaveRequest.status !== 'SUSPENDED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Sadece askıya alınmış talepler devam ettirilebilir' 
      });
    }

    // Şirket/Bayi yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      if (leaveRequest.company._id.toString() !== req.user.company.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bu şirkete ait talepleri devam ettirme yetkiniz yok' 
        });
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      const company = await Company.findById(leaveRequest.company._id || leaveRequest.company);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bu bayinin taleplerini devam ettirme yetkiniz yok' 
        });
      }
    }

    // Kullanıcının employee kaydını bul
    const approverEmployee = await Employee.findOne({ email: req.user.email });
    if (!approverEmployee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Çalışan kaydı bulunamadı' 
      });
    }

    // Approval chain'i kontrol et
    const employee = await Employee.findById(leaveRequest.employee._id || leaveRequest.employee);
    let approvalChain = employee.approvalChain || [];
    
    if (approvalChain.length === 0) {
      approvalChain = await calculateApprovalChain(employee._id);
    }

    // Eğer currentApprover varsa, o seviyeden devam et
    // Yoksa, approval chain'in başından devam et
    let nextApprover = leaveRequest.currentApprover;
    let nextStatus = 'IN_PROGRESS';

    if (!nextApprover && approvalChain.length > 0) {
      nextApprover = approvalChain[0];
    }

    if (!nextApprover) {
      nextStatus = 'APPROVED';
    }

    // History'ye ekle
    leaveRequest.history.push({
      approver: approverEmployee._id,
      status: nextStatus,
      note: 'İzin talebi askıdan çıkarıldı ve devam ettirildi',
      date: new Date()
    });

    // Status güncelle
    leaveRequest.status = nextStatus;
    leaveRequest.currentApprover = nextApprover;

    await leaveRequest.save();

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'İzin talebi devam ettirildi',
      data: populated
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

// Approve/Reject leave request (Eski endpoint - geriye dönük uyumluluk için)
router.put('/:id/review', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { status, rejectedReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Geçersiz durum' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description');

    if (!leaveRequest) {
      return res.status(404).json({ message: 'İzin talebi bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== leaveRequest.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    if (status === 'rejected' && !rejectedReason) {
      return res.status(400).json({ message: 'Red nedeni gereklidir' });
    }

    leaveRequest.status = status;
    leaveRequest.rejectedReason = status === 'rejected' ? rejectedReason : null;
    leaveRequest.reviewedBy = req.user._id;
    leaveRequest.reviewedAt = new Date();

    await leaveRequest.save();

    // If approved and is annual leave, update balance
    if (status === 'approved') {
      const permitName = leaveRequest.leaveType.name.toLowerCase();
      if (permitName.includes('yıllık')) {
        const emp = await Employee.findById(leaveRequest.employee._id || leaveRequest.employee);
        if (emp) {
          await updateLeaveBalance(emp._id, leaveRequest.totalDays);
        }
      }
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('reviewedBy');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update leave request (only pending requests)
router.put('/:id', auth, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ message: 'İzin talebi bulunamadı' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Sadece bekleyen talepler düzenlenebilir' });
    }

    // Check access
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== leaveRequest.employee.toString()) {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
    }

    // Update allowed fields
    const allowedFields = ['startDate', 'endDate', 'returnDate', 'startTime', 'endTime', 'isHalfDay', 
                          'halfDayPeriod', 'isHourly', 'hours', 'description'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'startDate' || field === 'endDate' || field === 'returnDate') {
          leaveRequest[field] = new Date(req.body[field]);
        } else {
          leaveRequest[field] = req.body[field];
        }
      }
    });

    // Recalculate total days if dates changed
    if (req.body.startDate || req.body.endDate || req.body.returnDate) {
      const employee = await Employee.findById(leaveRequest.employee);
      let calculatedEndDate = leaveRequest.endDate;
      if (leaveRequest.returnDate) {
        calculatedEndDate = leaveRequest.returnDate;
      } else if (req.body.returnDate) {
        calculatedEndDate = new Date(req.body.returnDate);
      } else if (req.body.endDate) {
        calculatedEndDate = new Date(req.body.endDate);
      }
      
      leaveRequest.totalDays = await calculateLeaveDays(
        leaveRequest.startDate,
        calculatedEndDate,
        employee,
        Department,
        Company,
        leaveRequest.isHalfDay,
        leaveRequest.isHourly,
        leaveRequest.hours
      );
    }

    await leaveRequest.save();

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete leave request
router.delete('/:id', auth, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ message: 'İzin talebi bulunamadı' });
    }

    // Check access
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== leaveRequest.employee.toString()) {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ message: 'Sadece bekleyen talepler silinebilir' });
      }
    }

    // Delete document if exists
    if (leaveRequest.document) {
      const filePath = path.join(__dirname, '..', leaveRequest.document);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await LeaveRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'İzin talebi silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Helper function to update leave balance
async function updateLeaveBalance(employeeId, days) {
  const employee = await Employee.findById(employeeId);
  if (!employee) return;

  const company = await Company.findById(employee.company);
  if (!company) return;

  const seniority = calculateSeniority(employee.hireDate);
  const age = employee.birthDate ? calculateAge(employee.birthDate) : null;
  const currentYear = new Date().getFullYear();

  let balance = await LeaveBalance.findOne({ employee: employeeId });
  
  if (!balance || balance.calculationYear !== currentYear) {
    // Calculate new annual leave days
    const annualDays = calculateAnnualLeaveDays(seniority, age);
    
    if (!balance) {
      balance = new LeaveBalance({
        employee: employeeId,
        company: company._id,
        annualLeaveDays: annualDays,
        usedAnnualLeaveDays: 0,
        remainingAnnualLeaveDays: annualDays,
        calculationYear: currentYear,
        seniority,
        age
      });
    } else {
      balance.annualLeaveDays = annualDays;
      balance.usedAnnualLeaveDays = 0;
      balance.calculationYear = currentYear;
      balance.seniority = seniority;
      balance.age = age;
    }
  }

  balance.usedAnnualLeaveDays += days;
  balance.remainingAnnualLeaveDays = balance.annualLeaveDays - balance.usedAnnualLeaveDays;
  await balance.save();
}

// Check for leave conflicts
async function checkLeaveConflicts(employeeId, startDate, endDate, excludeRequestId = null, newCompanyLeaveTypeId = null) {
  const LeaveRequest = require('../models/LeaveRequest');
  const CompanyLeaveType = require('../models/CompanyLeaveType');
  const LeaveSubType = require('../models/LeaveSubType');
  
  // Get new leave type name if provided
  let newLeaveTypeName = '';
  if (newCompanyLeaveTypeId) {
    const newCompanyLeaveType = await CompanyLeaveType.findById(newCompanyLeaveTypeId)
      .populate('leaveSubType', 'name');
    if (newCompanyLeaveType) {
      newLeaveTypeName = (newCompanyLeaveType.leaveSubType?.name || newCompanyLeaveType.name)?.toLowerCase() || '';
    }
  }
  const isNewSickLeave = newLeaveTypeName.includes('rapor') || 
                         newLeaveTypeName.includes('istirahat') || 
                         newLeaveTypeName.includes('hastalık');
  const isNewAnnualLeave = newLeaveTypeName.includes('yıllık');
  
  // Find overlapping leave requests
  const overlapping = await LeaveRequest.find({
    employee: employeeId,
    status: { $in: ['PENDING', 'APPROVED', 'IN_PROGRESS'] },
    _id: excludeRequestId ? { $ne: excludeRequestId } : { $exists: true },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    ]
  })
    .populate('companyLeaveType', 'name')
    .populate('leaveSubType', 'name');

  if (overlapping.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  // Check if there's a conflict between annual leave and sick leave
  const conflicts = [];
  for (const overlap of overlapping) {
    const leaveTypeName = (overlap.leaveSubType?.name || overlap.companyLeaveType?.name || overlap.type)?.toLowerCase() || '';
    const isSickLeave = leaveTypeName.includes('rapor') || 
                        leaveTypeName.includes('istirahat') || 
                        leaveTypeName.includes('hastalık');
    const isAnnualLeave = leaveTypeName.includes('yıllık');
    
    // Check conflict: new annual leave with existing sick leave
    if (isNewAnnualLeave && isSickLeave) {
      conflicts.push({
        request: overlap,
        type: 'sick_leave',
        message: 'Bu tarihlerde hastalık izni mevcut. Yıllık izin talebinizi düzeltmeniz gerekebilir. Hastalık raporu alındıysa, yıllık izin başlangıç ve bitiş tarihlerini yeni bir izin talebi ile düzeltmeniz gerekmektedir.'
      });
    }
    
    // Check conflict: new sick leave with existing annual leave
    if (isNewSickLeave && isAnnualLeave) {
      conflicts.push({
        request: overlap,
        type: 'annual_leave',
        message: 'Bu tarihlerde yıllık izin mevcut. Hastalık izni yıllık izin süresinden düşülmeyecektir. Yıllık izin tarihlerinizi düzeltmek için yeni bir izin talebi oluşturmanız gerekmektedir.'
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

// POST /api/leave-requests/:id/cancel - Çalışan talebi iptal eder
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    // Kullanıcının employee kaydını bul
    const currentUserEmployee = await Employee.findOne({ email: req.user.email });
    if (!currentUserEmployee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Çalışan kaydı bulunamadı' 
      });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company')
      .populate('companyLeaveType', 'name description parentPermitId')
      .populate('leaveSubType', 'name description parentPermitId');

    if (!leaveRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'İzin talebi bulunamadı' 
      });
    }

    // Sadece çalışan kendi talebini iptal edebilir
    if (leaveRequest.employee._id.toString() !== currentUserEmployee._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bu talebi iptal etme yetkiniz yok' 
      });
    }

    // Status kontrolü
    if (leaveRequest.status === 'APPROVED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Onaylanmış talepler iptal edilemez. Lütfen yöneticiniz ile iletişime geçin.' 
      });
    }

    if (leaveRequest.status === 'CANCELLED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu talep zaten iptal edilmiş' 
      });
    }

    if (leaveRequest.status === 'REJECTED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Reddedilmiş talepler iptal edilemez' 
      });
    }

    // Henüz işlem görmediyse (PENDING ve currentApprover yok veya history boş) → direkt CANCELLED
    // Onaya düştüyse (PENDING veya IN_PROGRESS ve currentApprover var) → CANCELLATION_REQUESTED
    if ((leaveRequest.status === 'PENDING' && !leaveRequest.currentApprover && (!leaveRequest.history || leaveRequest.history.length === 0))) {
      // Henüz işlem görmediyse direkt iptal et
      leaveRequest.status = 'CANCELLED';
      leaveRequest.currentApprover = null;

      // History'ye ekle
      leaveRequest.history.push({
        approver: currentUserEmployee._id,
        status: 'CANCELLED',
        note: 'Çalışan tarafından iptal edildi',
        date: new Date()
      });

      await leaveRequest.save();
    } else if (leaveRequest.status === 'PENDING' || leaveRequest.status === 'IN_PROGRESS') {
      // Onaya düştüyse iptal talebi oluştur
      leaveRequest.status = 'CANCELLATION_REQUESTED';
      // currentApprover'ı koru, çünkü admin/yönetici bu talebi onaylamalı

      // History'ye ekle
      leaveRequest.history.push({
        approver: currentUserEmployee._id,
        status: 'CANCELLATION_REQUESTED',
        note: 'Çalışan tarafından iptal talebi oluşturuldu',
        date: new Date()
      });

      await leaveRequest.save();
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu talep durumu iptal edilemez' 
      });
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId',
        strictPopulate: false
      })
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: leaveRequest.status === 'CANCELLED' ? 'İzin talebi iptal edildi' : 'İptal talebi oluşturuldu, yönetici onayı bekleniyor',
      data: populated
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

// POST /api/leave-requests/:id/approve-cancellation - Admin/yönetici iptal talebini onaylar
router.post('/:id/approve-cancellation', auth, async (req, res) => {
  try {
    // Kullanıcının employee kaydını bul
    const approverEmployee = await Employee.findOne({ email: req.user.email });
    if (!approverEmployee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Çalışan kaydı bulunamadı' 
      });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber department manager')
      .populate('company')
      .populate('companyLeaveType', 'name description parentPermitId')
      .populate('leaveSubType', 'name description parentPermitId');

    if (!leaveRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'İzin talebi bulunamadı' 
      });
    }

    // Sadece CANCELLATION_REQUESTED durumundaki talepler için çalışır
    if (leaveRequest.status !== 'CANCELLATION_REQUESTED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu talep iptal talebi durumunda değil' 
      });
    }

    // Yetki kontrolü: Admin veya yönetici olmalı
    const isAdmin = ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'].includes(req.user.role.name);
    const isManager = leaveRequest.currentApprover && leaveRequest.currentApprover.toString() === approverEmployee._id.toString();

    if (!isAdmin && !isManager) {
      return res.status(403).json({ 
        success: false, 
        message: 'İptal talebini onaylama yetkiniz yok' 
      });
    }

    // İptal talebini onayla
    leaveRequest.status = 'CANCELLED';
    leaveRequest.currentApprover = null;

    // History'ye ekle
    leaveRequest.history.push({
      approver: approverEmployee._id,
      status: 'CANCELLED',
      note: req.body.note || 'İptal talebi onaylandı',
      date: new Date()
    });

    await leaveRequest.save();

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId',
        strictPopulate: false
      })
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'İptal talebi onaylandı, izin talebi iptal edildi',
      data: populated
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

// Get leave days calculation endpoint
router.post('/calculate-days', auth, async (req, res) => {
  try {
    const { employeeId, startDate, returnDate, isHalfDay, isHourly, hours } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Çalışan bulunamadı' });
    }

    // Check access
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== employee._id.toString()) {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
    }

    const endDate = returnDate || startDate;
    const totalDays = await calculateLeaveDays(
      new Date(startDate),
      new Date(endDate),
      employee,
      Department,
      Company,
      isHalfDay === 'true' || isHalfDay === true,
      isHourly === 'true' || isHourly === true,
      parseFloat(hours) || 0
    );

    // Check for conflicts (need companyLeaveType for proper conflict detection)
    const conflictCheck = await checkLeaveConflicts(employeeId, new Date(startDate), new Date(endDate), null, req.body.companyLeaveType || null);

    res.json({
      totalDays,
      hasConflict: conflictCheck.hasConflict,
      conflicts: conflictCheck.conflicts
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// GET /api/leave-requests/reports/summary - İzin özet raporları
router.get('/reports/summary', auth, async (req, res) => {
  try {
    const { company, employee, startDate, endDate, year } = req.query;
    
    let query = {};
    let employeeQuery = {};

    // Rol bazlı erişim kontrolü
    if (req.user.role.name === 'employee') {
      const currentUserEmployee = await Employee.findOne({ email: req.user.email });
      if (!currentUserEmployee) {
        return res.status(404).json({ success: false, message: 'Çalışan bulunamadı' });
      }
      employeeQuery._id = currentUserEmployee._id;
    } else if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      if (company) {
        employeeQuery.company = company;
      } else {
        employeeQuery.company = req.user.company;
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      if (company) {
        const companyDoc = await Company.findById(company);
        if (!companyDoc || companyDoc.dealer.toString() !== req.user.dealer.toString()) {
          return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
        }
        employeeQuery.company = company;
      } else {
        const companies = await Company.find({ dealer: req.user.dealer });
        employeeQuery.company = { $in: companies.map(c => c._id) };
      }
    } else if (req.user.role.name === 'super_admin' || req.user.role.name === 'SUPER_ADMIN') {
      if (company) {
        employeeQuery.company = company;
      }
    } else {
      return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    }

    // Çalışan filtresi
    if (employee) {
      employeeQuery._id = employee;
    }

    // Tarih filtresi
    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const dateStart = startDate ? new Date(startDate) : new Date(`${reportYear}-01-01`);
    const dateEnd = endDate ? new Date(endDate) : new Date(`${reportYear}-12-31T23:59:59`);

    query.startDate = { $lte: dateEnd };
    query.endDate = { $gte: dateStart };

    // Çalışanları bul
    const employees = await Employee.find(employeeQuery).select('_id firstName lastName email employeeNumber company');

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          totalEmployees: 0,
          totalEntitledDays: 0,
          totalUsedDays: 0,
          totalRemainingDays: 0
        }
      });
    }

    const employeeIds = employees.map(e => e._id);
    query.employee = { $in: employeeIds };

    // İzin taleplerini getir
    const leaveRequests = await LeaveRequest.find({
      ...query,
      status: 'APPROVED' // Sadece onaylanmış izinler
    })
      .populate('companyLeaveType', 'name')
      .populate('leaveSubType', 'name')
      .populate('employee', 'firstName lastName email employeeNumber');

    // İzin bakiyelerini getir
    const leaveBalances = await LeaveBalance.find({
      employee: { $in: employeeIds },
      calculationYear: reportYear
    }).populate('employee', 'firstName lastName email employeeNumber');

    // Rapor verilerini oluştur
    const reportData = employees.map(emp => {
      const balance = leaveBalances.find(b => b.employee._id.toString() === emp._id.toString());
      const employeeLeaves = leaveRequests.filter(lr => 
        (lr.employee._id || lr.employee).toString() === emp._id.toString()
      );

      // Tür bazlı kullanım
      const typeUsage = {};
      let totalUsedDays = 0;
      let totalUsedHours = 0;

      employeeLeaves.forEach(leave => {
        const leaveTypeName = (leave.leaveSubType?.name || leave.companyLeaveType?.name || leave.type || '').toLowerCase();
        const days = leave.isHourly ? (leave.hours / 8) : (leave.calculatedDays || leave.totalDays || 0);
        
        if (leave.isHourly) {
          totalUsedHours += leave.hours || 0;
        } else {
          totalUsedDays += days;
        }

        if (!typeUsage[leaveTypeName]) {
          typeUsage[leaveTypeName] = {
            days: 0,
            hours: 0,
            count: 0
          };
        }

        if (leave.isHourly) {
          typeUsage[leaveTypeName].hours += leave.hours || 0;
        } else {
          typeUsage[leaveTypeName].days += days;
        }
        typeUsage[leaveTypeName].count += 1;
      });

      const entitledDays = balance ? balance.annualLeaveDays : 0;
      const usedAnnualDays = balance ? balance.usedAnnualLeaveDays : 0;
      const remainingDays = balance ? balance.remainingAnnualLeaveDays : 0;

      return {
        employee: {
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          employeeNumber: emp.employeeNumber
        },
        entitledDays,
        usedDays: usedAnnualDays,
        remainingDays,
        totalUsedDays,
        totalUsedHours,
        typeUsage: Object.keys(typeUsage).map(type => ({
          type,
          days: typeUsage[type].days,
          hours: typeUsage[type].hours,
          count: typeUsage[type].count
        })),
        leaveCount: employeeLeaves.length
      };
    });

    // Toplam özet
    const summary = {
      totalEmployees: reportData.length,
      totalEntitledDays: reportData.reduce((sum, r) => sum + r.entitledDays, 0),
      totalUsedDays: reportData.reduce((sum, r) => sum + r.usedDays, 0),
      totalRemainingDays: reportData.reduce((sum, r) => sum + r.remainingDays, 0),
      totalUsedHours: reportData.reduce((sum, r) => sum + r.totalUsedHours, 0)
    };

    res.json({
      success: true,
      data: reportData,
      summary,
      filters: {
        year: reportYear,
        startDate: dateStart,
        endDate: dateEnd,
        company: company || null,
        employee: employee || null
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

// GET /api/leave-requests/reports/export - Excel/CSV export
router.get('/reports/export', auth, async (req, res) => {
  try {
    const { format = 'csv', company, employee, startDate, endDate, year } = req.query;

    // Yetki kontrolü
    if (!['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'BAYI_ADMIN', 'SUPER_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    }

    // Rapor verilerini doğrudan burada hesapla (summary endpoint mantığını tekrarla)
    let query = {};
    let employeeQuery = {};

    // Rol bazlı erişim kontrolü
    if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      if (company) {
        employeeQuery.company = company;
      } else {
        employeeQuery.company = req.user.company;
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      if (company) {
        const companyDoc = await Company.findById(company);
        if (!companyDoc || companyDoc.dealer.toString() !== req.user.dealer.toString()) {
          return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
        }
        employeeQuery.company = company;
      } else {
        const companies = await Company.find({ dealer: req.user.dealer });
        employeeQuery.company = { $in: companies.map(c => c._id) };
      }
    }

    if (employee) {
      employeeQuery._id = employee;
    }

    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const dateStart = startDate ? new Date(startDate) : new Date(`${reportYear}-01-01`);
    const dateEnd = endDate ? new Date(endDate) : new Date(`${reportYear}-12-31T23:59:59`);

    query.startDate = { $lte: dateEnd };
    query.endDate = { $gte: dateStart };

    const employees = await Employee.find(employeeQuery).select('_id firstName lastName email employeeNumber company');
    if (employees.length === 0) {
      return res.status(404).json({ success: false, message: 'Çalışan bulunamadı' });
    }

    const employeeIds = employees.map(e => e._id);
    query.employee = { $in: employeeIds };

    const leaveRequests = await LeaveRequest.find({
      ...query,
      status: 'APPROVED'
    })
      .populate('companyLeaveType', 'name')
      .populate('leaveSubType', 'name')
      .populate('employee', 'firstName lastName email employeeNumber');

    const leaveBalances = await LeaveBalance.find({
      employee: { $in: employeeIds },
      calculationYear: reportYear
    }).populate('employee', 'firstName lastName email employeeNumber');

    const reportData = employees.map(emp => {
      const balance = leaveBalances.find(b => b.employee._id.toString() === emp._id.toString());
      const employeeLeaves = leaveRequests.filter(lr => 
        (lr.employee._id || lr.employee).toString() === emp._id.toString()
      );

      const typeUsage = {};
      let totalUsedDays = 0;
      let totalUsedHours = 0;

      employeeLeaves.forEach(leave => {
        const leaveTypeName = (leave.leaveSubType?.name || leave.companyLeaveType?.name || leave.type || '').toLowerCase();
        const days = leave.isHourly ? (leave.hours / 8) : (leave.calculatedDays || leave.totalDays || 0);
        
        if (leave.isHourly) {
          totalUsedHours += leave.hours || 0;
        } else {
          totalUsedDays += days;
        }

        if (!typeUsage[leaveTypeName]) {
          typeUsage[leaveTypeName] = { days: 0, hours: 0, count: 0 };
        }

        if (leave.isHourly) {
          typeUsage[leaveTypeName].hours += leave.hours || 0;
        } else {
          typeUsage[leaveTypeName].days += days;
        }
        typeUsage[leaveTypeName].count += 1;
      });

      const entitledDays = balance ? balance.annualLeaveDays : 0;
      const usedAnnualDays = balance ? balance.usedAnnualLeaveDays : 0;
      const remainingDays = balance ? balance.remainingAnnualLeaveDays : 0;

      return {
        employee: {
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          employeeNumber: emp.employeeNumber
        },
        entitledDays,
        usedDays: usedAnnualDays,
        remainingDays,
        totalUsedDays,
        totalUsedHours,
        leaveCount: employeeLeaves.length
      };
    });

    if (format === 'csv') {
      // CSV formatında döndür
      let csv = 'Çalışan Adı,Çalışan Soyadı,Email,Personel No,Hak Edilen Gün,Kullanılan Gün,Kalan Gün,Toplam Kullanılan Gün,Toplam Kullanılan Saat,İzin Sayısı\n';
      
      reportData.forEach(item => {
        csv += `"${item.employee.firstName}","${item.employee.lastName}","${item.employee.email}","${item.employee.employeeNumber || ''}",${item.entitledDays},${item.usedDays},${item.remainingDays},${item.totalUsedDays.toFixed(2)},${item.totalUsedHours.toFixed(2)},${item.leaveCount}\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="izin-raporu-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csv); // BOM ekle (Excel için UTF-8 desteği)
    } else {
      // JSON formatında döndür
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="izin-raporu-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        success: true,
        data: reportData,
        filters: { year: reportYear, startDate: dateStart, endDate: dateEnd, company: company || null, employee: employee || null }
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Hata', 
      error: error.message 
    });
  }
});

module.exports = router;

