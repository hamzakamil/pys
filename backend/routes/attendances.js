const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');

// Get attendances with filters
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    const { employee, company, startDate, endDate, month, year } = req.query;

    if (employee) {
      query.employee = employee;
    }

    if (company) {
      query.company = company;
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      query.company = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.date = {
        $gte: start,
        $lte: end
      };
    }

    const attendances = await Attendance.find(query)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .sort({ date: -1, employee: 1 });

    res.json(attendances);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get attendance calendar for a month
router.get('/calendar', auth, async (req, res) => {
  try {
    const { employee, company, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'Ay ve yıl gereklidir' });
    }

    let companyId = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    let query = {
      company: companyId,
      date: {
        $gte: start,
        $lte: end
      }
    };

    if (employee) {
      query.employee = employee;
    }

    const attendances = await Attendance.find(query)
      .populate('employee', 'firstName lastName email employeeNumber')
      .sort({ date: 1, employee: 1 });

    // Group by employee and date
    const calendar = {};
    attendances.forEach(att => {
      const empId = att.employee._id.toString();
      const dateKey = att.date.toISOString().split('T')[0];
      
      if (!calendar[empId]) {
        calendar[empId] = {
          employee: att.employee,
          dates: {}
        };
      }
      
      calendar[empId].dates[dateKey] = {
        code: att.code,
        description: att.description,
        startTime: att.startTime,
        endTime: att.endTime,
        workingHours: att.workingHours,
        overtime: att.overtime,
        notes: att.notes
      };
    });

    res.json(calendar);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single attendance
router.get('/:id', auth, async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee')
      .populate('company');

    if (!attendance) {
      return res.status(404).json({ message: 'Puantaj kaydı bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== attendance.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create or update attendance
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employee, date, code, description, startTime, endTime, workingHours, overtime, notes } = req.body;

    const emp = await Employee.findById(employee);
    if (!emp) {
      return res.status(404).json({ message: 'Çalışan bulunamadı' });
    }

    let companyId = emp.company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      if (req.user.company.toString() !== companyId.toString()) {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists
    const existing = await Attendance.findOne({
      employee,
      date: attendanceDate
    });

    if (existing) {
      // Update existing
      existing.code = code.toUpperCase();
      existing.description = description;
      existing.startTime = startTime;
      existing.endTime = endTime;
      existing.workingHours = workingHours || 0;
      existing.overtime = overtime || 0;
      existing.notes = notes;
      existing.createdBy = req.user._id;
      await existing.save();

      const populated = await Attendance.findById(existing._id)
        .populate('employee')
        .populate('company');

      res.json(populated);
    } else {
      // Create new
      const attendance = new Attendance({
        employee,
        company: companyId,
        date: attendanceDate,
        code: code.toUpperCase(),
        description,
        startTime,
        endTime,
        workingHours: workingHours || 0,
        overtime: overtime || 0,
        notes,
        createdBy: req.user._id
      });

      await attendance.save();

      const populated = await Attendance.findById(attendance._id)
        .populate('employee')
        .populate('company');

      res.status(201).json(populated);
    }
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Bulk create/update attendances
router.post('/bulk', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { attendances } = req.body;

    if (!Array.isArray(attendances)) {
      return res.status(400).json({ message: 'Geçersiz veri formatı' });
    }

    const results = [];
    const errors = [];

    for (const attData of attendances) {
      try {
        const { employee, date, code, description, startTime, endTime, workingHours, overtime, notes } = attData;

        const emp = await Employee.findById(employee);
        if (!emp) {
          errors.push({ employee, date, error: 'Çalışan bulunamadı' });
          continue;
        }

        let companyId = emp.company;
        if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
          if (req.user.company.toString() !== companyId.toString()) {
            errors.push({ employee, date, error: 'Yetkiniz yok' });
            continue;
          }
        }

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const existing = await Attendance.findOne({
          employee,
          date: attendanceDate
        });

        if (existing) {
          existing.code = code.toUpperCase();
          existing.description = description;
          existing.startTime = startTime;
          existing.endTime = endTime;
          existing.workingHours = workingHours || 0;
          existing.overtime = overtime || 0;
          existing.notes = notes;
          existing.createdBy = req.user._id;
          await existing.save();
          results.push(existing);
        } else {
          const attendance = new Attendance({
            employee,
            company: companyId,
            date: attendanceDate,
            code: code.toUpperCase(),
            description,
            startTime,
            endTime,
            workingHours: workingHours || 0,
            overtime: overtime || 0,
            notes,
            createdBy: req.user._id
          });

          await attendance.save();
          results.push(attendance);
        }
      } catch (error) {
        errors.push({ employee: attData.employee, date: attData.date, error: error.message });
      }
    }

    res.json({
      message: `${results.length} puantaj kaydı işlendi`,
      success: results.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update attendance
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Puantaj kaydı bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== attendance.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    Object.assign(attendance, req.body);
    if (req.body.code) attendance.code = req.body.code.toUpperCase();
    attendance.createdBy = req.user._id;
    await attendance.save();

    const populated = await Attendance.findById(attendance._id)
      .populate('employee')
      .populate('company');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete attendance
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Puantaj kaydı bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== attendance.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Puantaj kaydı silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;

