const express = require('express');
const router = express.Router();
const LeaveBalance = require('../models/LeaveBalance');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { calculateAnnualLeaveDays, calculateSeniority, calculateAge } = require('../utils/leaveCalculator');

// Get leave balance
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    const { employee, company } = req.query;

    if (employee) {
      query.employee = employee;
    } else if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) {
        query.employee = emp._id;
      } else {
        return res.status(404).json({ message: 'Çalışan bulunamadı' });
      }
    }

    if (company) {
      query.company = company;
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      query.company = req.user.company;
    }

    const balances = await LeaveBalance.find(query)
      .populate('employee', 'firstName lastName email employeeNumber hireDate birthDate')
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    res.json(balances);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get or create leave balance for employee
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Çalışan bulunamadı' });
    }

    // Check access
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== employee._id.toString()) {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
               req.user.company.toString() !== employee.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const currentYear = new Date().getFullYear();
    let balance = await LeaveBalance.findOne({ employee: employee._id });

    if (!balance || balance.calculationYear !== currentYear) {
      const company = await Company.findById(employee.company);
      const seniority = calculateSeniority(employee.hireDate);
      const age = employee.birthDate ? calculateAge(employee.birthDate) : null;
      const annualDays = calculateAnnualLeaveDays(seniority, age);

      if (!balance) {
        balance = new LeaveBalance({
          employee: employee._id,
          company: employee.company,
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
        balance.remainingAnnualLeaveDays = annualDays;
        balance.calculationYear = currentYear;
        balance.seniority = seniority;
        balance.age = age;
      }

      await balance.save();
    }

    const populated = await LeaveBalance.findById(balance._id)
      .populate('employee')
      .populate('company');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Recalculate leave balance for employee
router.post('/employee/:employeeId/recalculate', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Çalışan bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== employee.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const company = await Company.findById(employee.company);
    const seniority = calculateSeniority(employee.hireDate);
    const age = employee.birthDate ? calculateAge(employee.birthDate) : null;
    const annualDays = calculateAnnualLeaveDays(seniority, age);
    const currentYear = new Date().getFullYear();

    let balance = await LeaveBalance.findOne({ employee: employee._id });

    if (!balance) {
      balance = new LeaveBalance({
        employee: employee._id,
        company: employee.company,
        annualLeaveDays: annualDays,
        usedAnnualLeaveDays: 0,
        remainingAnnualLeaveDays: annualDays,
        calculationYear: currentYear,
        seniority,
        age
      });
    } else {
      balance.annualLeaveDays = annualDays;
      balance.remainingAnnualLeaveDays = annualDays - balance.usedAnnualLeaveDays;
      balance.calculationYear = currentYear;
      balance.seniority = seniority;
      balance.age = age;
    }

    await balance.save();

    const populated = await LeaveBalance.findById(balance._id)
      .populate('employee')
      .populate('company');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;





