const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const LeaveRequest = require('../models/LeaveRequest');
const EmploymentPreRecord = require('../models/EmploymentPreRecord');

/**
 * GET /api/requests/pending
 * Bekleyen talepler (izin + işe giriş/çıkış)
 */
router.get('/pending', auth, requireRole('company_admin'), async (req, res) => {
  try {
    const companyId = req.user.company;

    // Bekleyen izin talepleri
    const pendingLeaveRequests = await LeaveRequest.find({
      company: companyId,
      status: 'PENDING'
    })
      .populate('employee', 'firstName lastName employeeNumber email')
      .populate('companyLeaveType', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    // Bekleyen işe giriş/çıkış kayıtları
    const pendingEmploymentRecords = await EmploymentPreRecord.find({
      companyId: companyId,
      status: { $in: ['PENDING_APPROVAL', 'PENDING_COMPANY_APPROVAL', 'PENDING_DEALER_APPROVAL'] }
    })
      .populate('employeeId', 'firstName lastName employeeNumber email')
      .populate('candidateFullName')
      .sort({ createdAt: -1 })
      .limit(20);

    // Format: Her talep için tip ve veri
    const requests = [
      ...pendingLeaveRequests.map(req => ({
        id: req._id,
        type: 'leave_request',
        title: `${req.employee.firstName} ${req.employee.lastName} - İzin Talebi`,
        subtitle: `${req.startDate.toLocaleDateString('tr-TR')} - ${req.endDate.toLocaleDateString('tr-TR')}`,
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        date: req.createdAt,
        data: req
      })),
      ...pendingEmploymentRecords.map(record => ({
        id: record._id,
        type: record.processType === 'hire' ? 'hire_request' : 'termination_request',
        title: record.processType === 'hire' 
          ? `${record.candidateFullName || 'Yeni Çalışan'} - İşe Giriş`
          : `${record.employeeId ? `${record.employeeId.firstName} ${record.employeeId.lastName}` : 'Çalışan'} - İşten Çıkış`,
        subtitle: record.processType === 'hire'
          ? `Giriş Tarihi: ${record.hireDate ? new Date(record.hireDate).toLocaleDateString('tr-TR') : '-'}`
          : `Çıkış Tarihi: ${record.terminationDate ? new Date(record.terminationDate).toLocaleDateString('tr-TR') : '-'}`,
        employeeName: record.processType === 'hire' 
          ? record.candidateFullName 
          : (record.employeeId ? `${record.employeeId.firstName} ${record.employeeId.lastName}` : '-'),
        date: record.createdAt,
        data: record
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Bekleyen talepler hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

/**
 * POST /api/requests/:id/approve
 * Talep onaylama (izin veya işe giriş/çıkış)
 */
router.post('/:id/approve', auth, requireRole('company_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'leave_request', 'hire_request', 'termination_request'

    if (type === 'leave_request') {
      const leaveRequest = await LeaveRequest.findById(id);
      if (!leaveRequest) {
        return res.status(404).json({ success: false, message: 'İzin talebi bulunamadı' });
      }

      if (leaveRequest.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }

      leaveRequest.status = 'APPROVED';
      await leaveRequest.save();

      res.json({
        success: true,
        message: 'İzin talebi onaylandı'
      });
    } else if (type === 'hire_request' || type === 'termination_request') {
      const employmentRecord = await EmploymentPreRecord.findById(id);
      if (!employmentRecord) {
        return res.status(404).json({ success: false, message: 'İşlem kaydı bulunamadı' });
      }

      if (employmentRecord.companyId.toString() !== req.user.company.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }

      employmentRecord.status = 'APPROVED';
      await employmentRecord.save();

      res.json({
        success: true,
        message: 'İşlem onaylandı'
      });
    } else {
      return res.status(400).json({ success: false, message: 'Geçersiz talep tipi' });
    }
  } catch (error) {
    console.error('Talep onaylama hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

/**
 * POST /api/requests/:id/reject
 * Talep reddetme
 */
router.post('/:id/reject', auth, requireRole('company_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { type, reason } = req.body;

    if (type === 'leave_request') {
      const leaveRequest = await LeaveRequest.findById(id);
      if (!leaveRequest) {
        return res.status(404).json({ success: false, message: 'İzin talebi bulunamadı' });
      }

      if (leaveRequest.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }

      leaveRequest.status = 'REJECTED';
      if (reason) {
        leaveRequest.rejectReason = reason;
      }
      await leaveRequest.save();

      res.json({
        success: true,
        message: 'İzin talebi reddedildi'
      });
    } else if (type === 'hire_request' || type === 'termination_request') {
      const employmentRecord = await EmploymentPreRecord.findById(id);
      if (!employmentRecord) {
        return res.status(404).json({ success: false, message: 'İşlem kaydı bulunamadı' });
      }

      if (employmentRecord.companyId.toString() !== req.user.company.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }

      employmentRecord.status = 'REJECTED';
      if (reason) {
        employmentRecord.rejectionReason = reason;
      }
      await employmentRecord.save();

      res.json({
        success: true,
        message: 'İşlem reddedildi'
      });
    } else {
      return res.status(400).json({ success: false, message: 'Geçersiz talep tipi' });
    }
  } catch (error) {
    console.error('Talep reddetme hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

module.exports = router;

