const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { auth, requireRole } = require('../middleware/auth');

// Day names mapping (0=Sunday, 1=Monday, ..., 6=Saturday)
const DAY_NAMES = {
  0: 'Pazar',
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
  6: 'Cumartesi'
};

// Get weekend settings for company
router.get('/company/:companyId', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Şirket bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== req.params.companyId) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const weekendDays = company.leaveSettings?.weekendDays || [0]; // Default: Sunday
    
    res.json({
      companyId: company._id,
      weekendDays,
      weekendDayNames: weekendDays.map(day => DAY_NAMES[day])
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update weekend settings for company
router.put('/company/:companyId', auth, requireRole('super_admin', 'bayi_admin', 'company_admin'), async (req, res) => {
  try {
    const { weekendDays } = req.body;

    if (!Array.isArray(weekendDays) || weekendDays.length === 0) {
      return res.status(400).json({ message: 'Hafta tatili günleri seçilmelidir' });
    }

    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Şirket bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== req.params.companyId) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    if (!company.leaveSettings) {
      company.leaveSettings = {};
    }
    company.leaveSettings.weekendDays = weekendDays;
    await company.save();

    res.json({
      companyId: company._id,
      weekendDays: company.leaveSettings.weekendDays,
      weekendDayNames: weekendDays.map(day => DAY_NAMES[day])
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get weekend settings for department
router.get('/department/:departmentId', auth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.departmentId).populate('company');
    if (!department) {
      return res.status(404).json({ message: 'Departman bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== department.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Get from department or company default
    const weekendDays = department.weekendDays || department.company.leaveSettings?.weekendDays || [0];
    
    res.json({
      departmentId: department._id,
      weekendDays,
      weekendDayNames: weekendDays.map(day => DAY_NAMES[day]),
      source: department.weekendDays ? 'department' : 'company'
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update weekend settings for department
router.put('/department/:departmentId', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { weekendDays } = req.body;

    const department = await Department.findById(req.params.departmentId).populate('company');
    if (!department) {
      return res.status(404).json({ message: 'Departman bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== department.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    if (weekendDays && Array.isArray(weekendDays) && weekendDays.length > 0) {
      department.weekendDays = weekendDays;
    } else {
      department.weekendDays = null; // Use company default
    }
    
    await department.save();

    const finalWeekendDays = department.weekendDays || department.company.leaveSettings?.weekendDays || [0];
    
    res.json({
      departmentId: department._id,
      weekendDays: finalWeekendDays,
      weekendDayNames: finalWeekendDays.map(day => DAY_NAMES[day]),
      source: department.weekendDays ? 'department' : 'company'
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get weekend settings for employee
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId)
      .populate('department')
      .populate('company');
    
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
               req.user.company.toString() !== employee.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Get from employee, department, or company (in that order)
    let weekendDays = employee.weekendDays;
    let source = 'employee';
    
    if (!weekendDays || weekendDays.length === 0) {
      weekendDays = employee.department?.weekendDays;
      source = 'department';
    }
    
    if (!weekendDays || weekendDays.length === 0) {
      weekendDays = employee.company?.leaveSettings?.weekendDays || [0];
      source = 'company';
    }
    
    res.json({
      employeeId: employee._id,
      weekendDays,
      weekendDayNames: weekendDays.map(day => DAY_NAMES[day]),
      source
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update weekend settings for employee
router.put('/employee/:employeeId', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { weekendDays } = req.body;

    const employee = await Employee.findById(req.params.employeeId)
      .populate('department')
      .populate('company');
    
    if (!employee) {
      return res.status(404).json({ message: 'Çalışan bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== employee.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    if (weekendDays && Array.isArray(weekendDays) && weekendDays.length > 0) {
      employee.weekendDays = weekendDays;
    } else {
      employee.weekendDays = null; // Use department/company default
    }
    
    await employee.save();

    // Get final weekend days (employee -> department -> company)
    let finalWeekendDays = employee.weekendDays;
    let source = 'employee';
    
    if (!finalWeekendDays || finalWeekendDays.length === 0) {
      finalWeekendDays = employee.department?.weekendDays;
      source = 'department';
    }
    
    if (!finalWeekendDays || finalWeekendDays.length === 0) {
      finalWeekendDays = employee.company?.leaveSettings?.weekendDays || [0];
      source = 'company';
    }
    
    res.json({
      employeeId: employee._id,
      weekendDays: finalWeekendDays,
      weekendDayNames: finalWeekendDays.map(day => DAY_NAMES[day]),
      source
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;





