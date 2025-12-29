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
const { auth, requireRole } = require('../middleware/auth');
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

// Get all leave requests
router.get('/', auth, async (req, res) => {
  // #region agent log
  const fs = require('fs');
  const path = require('path');
  const logPath = path.join(__dirname, '../../.cursor/debug.log');
  try {
    fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:35',message:'GET /leave-requests entry',data:{query:req.query,userRole:req.user?.role?.name,userId:req.user?._id?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n');
  } catch(e){}
  // #endregion
  try {
    let query = {};
    const { status, employee, company, startDate, endDate } = req.query;

    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:42',message:'Query params parsed',data:{status,employee,company,startDate,endDate,userRole:req.user?.role?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n');
    } catch(e){}
    // #endregion

    if (employee) {
      query.employee = employee;
      // #region agent log
      try {
        fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:46',message:'Employee filter added',data:{employeeId:employee},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n');
      } catch(e){}
      // #endregion
    } else if (req.user.role.name === 'employee') {
      // Employees can only see their own requests
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) {
        query.employee = emp._id;
        // #region agent log
        try {
          fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:52',message:'Employee found by email',data:{employeeId:emp._id.toString(),email:req.user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n');
        } catch(e){}
        // #endregion
      } else {
        // #region agent log
        try {
          fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:57',message:'Employee not found by email',data:{email:req.user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n');
        } catch(e){}
        // #endregion
        return res.json([]);
      }
    }

    if (company) {
      query.company = company;
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      query.company = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    }

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.$or = [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ];
    }

    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:85',message:'Final query before find',data:{query:JSON.stringify(query)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n');
    } catch(e){}
    // #endregion

    const requests = await LeaveRequest.find(query)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('reviewedBy', 'email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('createdByAdmin', 'email')
      .sort({ createdAt: -1 });

    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:98',message:'Requests found',data:{count:requests.length,requestIds:requests.map(r=>r._id.toString())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n');
    } catch(e){}
    // #endregion

    res.json(requests);
  } catch (error) {
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'leaveRequests.js:103',message:'Error in GET /leave-requests',data:{error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n');
    } catch(e){}
    // #endregion
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
router.post('/', auth, upload.single('document'), async (req, res) => {
  try {
    const {
      companyLeaveType,
      leaveSubType,
      startDate,
      endDate,
      startTime,
      endTime,
      isHalfDay,
      halfDayPeriod,
      isHourly,
      hours,
      description
    } = req.body;

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

    // Check company leave type
    if (!companyLeaveType) {
      return res.status(400).json({ success: false, message: 'İzin türü seçilmelidir' });
    }

    const companyLeaveTypeDoc = await CompanyLeaveType.findById(companyLeaveType)
      .populate('leaveType', 'name description defaultDays');
    if (!companyLeaveTypeDoc) {
      return res.status(404).json({ success: false, message: 'İzin türü bulunamadı' });
    }

    // Check if company leave type belongs to employee's company
    if (companyLeaveTypeDoc.company.toString() !== employee.company.toString()) {
      return res.status(403).json({ success: false, message: 'Bu izin türü bu şirkete ait değil' });
    }

    // Check if "Diğer" category requires sub type
    if (companyLeaveTypeDoc.isOtherCategory && !leaveSubType) {
      return res.status(400).json({ success: false, message: 'Alt izin türü seçilmelidir' });
    }

    // Check leave sub type if provided
    let leaveSubTypeDoc = null;
    if (leaveSubType) {
      leaveSubTypeDoc = await LeaveSubType.findById(leaveSubType);
      if (!leaveSubTypeDoc) {
        return res.status(404).json({ success: false, message: 'Alt izin türü bulunamadı' });
      }
    }

    // Check if unpaid leave requires description
    const isUnpaidLeave = companyLeaveTypeDoc.name.toLowerCase().includes('ücretsiz') || 
                          companyLeaveTypeDoc.name.toLowerCase().includes('mazeret');
    if (isUnpaidLeave && !description) {
      return res.status(400).json({ success: false, message: 'Ücretsiz izinlerde açıklama zorunludur' });
    }

    // Calculate total days based on return date if provided, otherwise use endDate
    let calculatedEndDate = endDate;
    let calculatedReturnDate = returnDate;
    
    if (calculatedReturnDate) {
      // If return date is provided, calculate days from startDate to returnDate
      calculatedEndDate = calculatedReturnDate;
    }

    // Calculate total days (excluding weekends based on employee's weekend settings)
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

    // İzin tipini al (type field için)
    const leaveTypeName = leaveSubTypeDoc ? leaveSubTypeDoc.name : companyLeaveTypeDoc.name;

    const leaveRequest = new LeaveRequest({
      employee: employee._id,
      company: company._id,
      companyLeaveType: companyLeaveTypeDoc._id,
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
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.status(201).json({
      success: true,
      message: 'İzin talebi başarıyla oluşturuldu',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
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
      if (leaveTypeName.includes('yıllık')) {
        await updateLeaveBalance(employee._id, leaveRequest.totalDays);
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

module.exports = router;

