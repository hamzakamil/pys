const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { calculateAnnualLeave } = require('../services/leaveAccrualEngine');
const moment = require('moment');

// GET /leave/calculate/:employeeId
// İzin hakedişini getir.
router.get('/calculate/:employeeId', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId).populate('company');
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Çalışan bulunamadı' });
    }

    // Yetki kontrolü
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== employee._id.toString()) {
        return res.status(403).json({ success: false, error: 'Yetkiniz yok' });
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
               req.user.company.toString() !== employee.company._id.toString()) {
      return res.status(403).json({ success: false, error: 'Yetkiniz yok' });
    }

    const companyPolicy = employee.company.leavePolicy || {
      allowSplitLeave: true,
      minFirstBlockDays: 10
    };
    
    const result = calculateAnnualLeave(employee, companyPolicy);

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('İzin hakediş hesaplama hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /leave/summary?companyId=
router.get('/summary', auth, async (req, res) => {
  try {
    const { companyId } = req.query;
    
    // Yetki kontrolü
    let targetCompanyId = companyId;
    if (req.user.role.name === 'employee') {
      // Employee için companyId gönderilse bile yok sayılır, sadece email'den bulunacak
      // Güvenlik: Employee başka bir şirketin verilerini göremez
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp) {
        return res.status(404).json({ success: false, error: 'Çalışan bulunamadı' });
      }
      // Employee'nin kendi şirket ID'si kullanılır (gönderilen companyId yok sayılır)
      targetCompanyId = emp.company.toString();
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      targetCompanyId = req.user.company ? req.user.company.toString() : companyId;
    } else if (req.user.role.name === 'bayi_admin') {
      // bayi_admin için companyId zorunlu
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'companyId gerekli' });
      }
      targetCompanyId = companyId;
    } else if (req.user.role.name === 'super_admin') {
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'companyId gerekli' });
      }
      targetCompanyId = companyId;
    }

    if (!targetCompanyId) {
      return res.status(400).json({ success: false, error: 'companyId gerekli' });
    }

    let employees;
    // Employee rolü için sadece kendi kaydını getir
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp) {
        return res.status(404).json({ success: false, error: 'Çalışan bulunamadı' });
      }
      employees = [emp];
    } else {
      employees = await Employee.find({ company: targetCompanyId });
    }
    const company = await Company.findById(targetCompanyId);
    const policy = company?.leavePolicy || { allowSplitLeave: true, minFirstBlockDays: 10 };

    const summary = [];
    for (const emp of employees) {
      const accrual = calculateAnnualLeave(emp, policy);

      // Kullanılan yıllık izinleri çek (onaylanmış ve yıllık izin türü)
      const annualLeaveRequests = await LeaveRequest.find({
        employee: emp._id,
        status: 'APPROVED'
      })
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name',
        strictPopulate: false
      });

      let used = 0;
      for (const leave of annualLeaveRequests) {
        const leaveTypeName = leave.leaveSubType?.name || leave.companyLeaveType?.name || leave.type || '';
        if (leaveTypeName.toLowerCase().includes('yıllık')) {
          used += leave.calculatedDays || leave.totalDays || 0;
        }
      }

      const remaining = accrual.leaveDays - used;

      // Bir sonraki hakediş tarihi
      const hireDate = moment(emp.hireDate || emp.startDate);
      const nextAccrualDate = moment(hireDate).add(accrual.seniorityYears + 1, 'years').format('DD.MM.YYYY');

      summary.push({
        employeeId: emp._id,
        name: `${emp.firstName} ${emp.lastName}`.toUpperCase(),
        hireDate: emp.hireDate || emp.startDate,
        accrualDays: accrual.leaveDays,
        nextAccrualDate,
        usedDays: used,
        remainingDays: remaining
      });
    }

    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('İzin özeti hesaplama hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

