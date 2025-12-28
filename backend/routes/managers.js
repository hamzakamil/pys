const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const { auth, requireRole } = require('../middleware/auth');
const { 
  calculateApprovalChain, 
  updateDepartmentEmployeesApprovalChain,
  updateEmployeeApprovalChain 
} = require('../services/approvalChainService');

// ========== ÇALIŞAN YÖNETİCİSİ BELİRLEME ==========

// Çalışana direkt manager atama
router.put('/employee/:employeeId/manager', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { managerId } = req.body;

    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Çalışan bulunamadı' });
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== employee.company.toString()) {
      return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    }

    // Manager kontrolü
    if (managerId) {
      const manager = await Employee.findById(managerId);
      if (!manager) {
        return res.status(404).json({ success: false, message: 'Yönetici bulunamadı' });
      }

      // Aynı şirkette olmalı
      if (manager.company.toString() !== employee.company.toString()) {
        return res.status(400).json({ success: false, message: 'Yönetici aynı şirkette olmalıdır' });
      }

      // Kendi kendine manager olamaz
      if (managerId === req.params.employeeId) {
        return res.status(400).json({ success: false, message: 'Çalışan kendi yöneticisi olamaz' });
      }

      employee.manager = managerId;
    } else {
      employee.manager = null;
    }

    await employee.save();

    // Approval chain'i güncelle
    await updateEmployeeApprovalChain(employee._id);

    const populated = await Employee.findById(employee._id)
      .populate('manager', 'firstName lastName email')
      .populate('department', 'name manager')
      .populate('company', 'name');

    res.json({ 
      success: true, 
      message: 'Yönetici başarıyla atandı',
      data: populated 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// ========== DEPARTMAN YÖNETİCİSİ BELİRLEME ==========

// Departmana yönetici atama
router.put('/department/:departmentId/manager', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { managerId } = req.body;

    const department = await Department.findById(req.params.departmentId);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Departman bulunamadı' });
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const company = await require('../models/Company').findById(department.company);
      if (!company || company._id.toString() !== req.user.company.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    // Manager kontrolü
    if (managerId) {
      const manager = await Employee.findById(managerId);
      if (!manager) {
        return res.status(404).json({ success: false, message: 'Yönetici bulunamadı' });
      }

      // Aynı şirkette olmalı
      if (manager.company.toString() !== department.company.toString()) {
        return res.status(400).json({ success: false, message: 'Yönetici aynı şirkette olmalıdır' });
      }

      department.manager = managerId;
    } else {
      department.manager = null;
    }

    await department.save();

    // Bu departman ve alt departmanlardaki tüm çalışanların approval chain'lerini güncelle
    await updateDepartmentEmployeesApprovalChain(department._id);

    const populated = await Department.findById(department._id)
      .populate('manager', 'firstName lastName email')
      .populate('company', 'name')
      .populate('parentDepartment', 'name');

    res.json({ 
      success: true, 
      message: 'Departman yöneticisi başarıyla atandı. Tüm alt departman çalışanlarının onay zincirleri güncellendi.',
      data: populated 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// ========== ÇALIŞAN ONAY ZİNCİRİNİ GÖRÜNTÜLEME ==========

// Çalışanın onay zincirini getir
router.get('/employee/:employeeId/approval-chain', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId)
      .populate('manager', 'firstName lastName email position')
      .populate('department', 'name manager')
      .populate('approvalChain', 'firstName lastName email position');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Çalışan bulunamadı' });
    }

    // Yetki kontrolü
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
               req.user.company.toString() !== employee.company.toString()) {
      return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    }

    // Approval chain'i hesapla (güncel olsun)
    const chain = await calculateApprovalChain(employee._id);

    // Chain'deki çalışanları populate et
    const chainEmployees = await Employee.find({ _id: { $in: chain } })
      .select('firstName lastName email position department manager')
      .populate('department', 'name')
      .populate('manager', 'firstName lastName');

    res.json({ 
      success: true, 
      data: {
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          position: employee.position,
          manager: employee.manager,
          department: employee.department
        },
        approvalChain: chainEmployees,
        chainOrder: chain
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

module.exports = router;

