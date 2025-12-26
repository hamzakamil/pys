const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

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

    const employees = await Employee.find(query)
      .populate('company')
      .populate('department')
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
      .sort({ createdAt: -1 });

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
      .populate('department');
    
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
  try {
    const { firstName, lastName, email, phone, company, department, employeeNumber } = req.body;

    let companyId = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    }

    const employee = new Employee({
      firstName,
      lastName,
      email,
      phone,
      company: companyId,
      department,
      employeeNumber
    });
    await employee.save();

    const populated = await Employee.findById(employee._id)
      .populate('company')
      .populate('department');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
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

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const employees = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const department = await Department.findOne({ 
          name: row.departman || row.department,
          company: companyId
        });

        if (!department) {
          errors.push(`Satır ${i + 2}: Departman bulunamadı - ${row.departman || row.department}`);
          continue;
        }

        const employee = new Employee({
          firstName: row.ad || row.firstName || row.first_name,
          lastName: row.soyad || row.lastName || row.last_name,
          email: row.email,
          phone: row.telefon || row.phone,
          company: companyId,
          department: department._id,
          employeeNumber: row.sicil || row.employeeNumber || row.employee_number
        });

        await employee.save();
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

    Object.assign(employee, req.body);
    await employee.save();

    const populated = await Employee.findById(employee._id)
      .populate('company')
      .populate('department');

    res.json(populated);
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

