const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');

// Get all departments
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // If company query parameter is provided, use it (for super_admin and bayi_admin)
    if (req.query.company) {
      query.company = req.query.company;
      
      // Verify access
      if (req.user.role.name === 'bayi_admin') {
        const company = await Company.findById(req.query.company);
        if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
          return res.status(403).json({ message: 'Yetkiniz yok' });
        }
      } else if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name)) {
        if (req.query.company !== req.user.company.toString()) {
          return res.status(403).json({ message: 'Yetkiniz yok' });
        }
      }
    } else {
      // No company parameter - use role-based filtering
      if (req.user.role.name === 'super_admin') {
        // Super admin can see all
      } else if (req.user.role.name === 'bayi_admin') {
        // Get companies of dealer
        const companies = await Company.find({ dealer: req.user.dealer });
        query.company = { $in: companies.map(c => c._id) };
      } else {
        // company_admin, resmi_muhasebe_ik, employee
        query.company = req.user.company;
      }
    }

    const departments = await Department.find(query)
      .populate('company')
      .populate('parentDepartment', 'name')
      .populate('workingHours', 'name')
      .populate('manager', 'firstName lastName email')
      .sort({ parentDepartment: 1, createdAt: -1 });

    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get departments by company
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

    const departments = await Department.find({ company: req.params.companyId })
      .populate('parentDepartment', 'name')
      .populate('workingHours', 'name')
      .populate('manager', 'firstName lastName email')
      .sort({ parentDepartment: 1, createdAt: -1 });

    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single department
router.get('/:id', auth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('company')
      .populate('parentDepartment', 'name')
      .populate('workingHours', 'name')
      .populate('manager', 'firstName lastName email');
    if (!department) {
      return res.status(404).json({ message: 'Departman bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) && 
        req.user.company.toString() !== department.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create department
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { name, company, parentDepartment, description, workingHours } = req.body;

    let companyId = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    } else if (req.user.role.name === 'bayi_admin' && !companyId) {
      return res.status(400).json({ message: 'Şirket seçilmelidir' });
    }

    // Validate parentDepartment if provided
    if (parentDepartment) {
      const parentDept = await Department.findById(parentDepartment);
      if (!parentDept) {
        return res.status(404).json({ message: 'Üst departman bulunamadı' });
      }
      if (parentDept.company.toString() !== companyId.toString()) {
        return res.status(400).json({ message: 'Üst departman aynı şirkete ait olmalıdır' });
      }
    }

    // Validate workingHours if provided
    if (workingHours) {
      const WorkingHours = require('../models/WorkingHours');
      const wh = await WorkingHours.findById(workingHours);
      if (!wh) {
        return res.status(404).json({ message: 'Çalışma saatleri bulunamadı' });
      }
      if (wh.company.toString() !== companyId.toString()) {
        return res.status(400).json({ message: 'Çalışma saatleri aynı şirkete ait olmalıdır' });
      }
    }

    // Validate manager if provided
    if (manager) {
      const Employee = require('../models/Employee');
      const managerEmployee = await Employee.findById(manager);
      if (!managerEmployee) {
        return res.status(404).json({ message: 'Yönetici çalışan bulunamadı' });
      }
      if (managerEmployee.company.toString() !== companyId.toString()) {
        return res.status(400).json({ message: 'Yönetici aynı şirkete ait olmalıdır' });
      }
    }

    const department = new Department({
      name,
      company: companyId,
      parentDepartment: parentDepartment || null,
      description,
      workingHours: workingHours || null,
      manager: manager || null
    });
    await department.save();

    const populated = await Department.findById(department._id)
      .populate('company')
      .populate('parentDepartment', 'name')
      .populate('workingHours', 'name')
      .populate('manager', 'firstName lastName email');
    
    // Departman yöneticisi değiştiğinde approval chain'leri güncelle
    if (manager) {
      const { updateDepartmentEmployeesApprovalChain } = require('../services/approvalChainService');
      try {
        await updateDepartmentEmployeesApprovalChain(department._id);
      } catch (error) {
        console.error('Approval chain güncelleme hatası:', error);
        // Hata olsa bile departman oluşturma devam eder
      }
    }
    
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Activate department (pasif departmanı aktif yap)
router.post('/:id/activate', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Departman bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== department.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    if (department.isActive) {
      return res.status(400).json({ message: 'Bu departman zaten aktif' });
    }

    department.isActive = true;
    await department.save();

    const populated = await Department.findById(department._id)
      .populate('company')
      .populate('parentDepartment', 'name')
      .populate('workingHours', 'name')
      .populate('manager', 'firstName lastName email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Update department
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Departman bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== department.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const { name, parentDepartment, description, workingHours, manager, isActive } = req.body;

    // Validate parentDepartment if provided
    if (parentDepartment !== undefined) {
      if (parentDepartment) {
        const parentDept = await Department.findById(parentDepartment);
        if (!parentDept) {
          return res.status(404).json({ message: 'Üst departman bulunamadı' });
        }
        if (parentDept.company.toString() !== department.company.toString()) {
          return res.status(400).json({ message: 'Üst departman aynı şirkete ait olmalıdır' });
        }
        // Prevent circular reference
        if (parentDepartment === req.params.id) {
          return res.status(400).json({ message: 'Departman kendi alt departmanı olamaz' });
        }
      }
      department.parentDepartment = parentDepartment || null;
    }

    // Validate workingHours if provided
    if (workingHours !== undefined) {
      if (workingHours) {
        const WorkingHours = require('../models/WorkingHours');
        const wh = await WorkingHours.findById(workingHours);
        if (!wh) {
          return res.status(404).json({ message: 'Çalışma saatleri bulunamadı' });
        }
        if (wh.company.toString() !== department.company.toString()) {
          return res.status(400).json({ message: 'Çalışma saatleri aynı şirkete ait olmalıdır' });
        }
      }
      department.workingHours = workingHours || null;
    }

    // Validate manager if provided
    if (manager !== undefined) {
      if (manager) {
        const Employee = require('../models/Employee');
        const managerEmployee = await Employee.findById(manager);
        if (!managerEmployee) {
          return res.status(404).json({ message: 'Yönetici çalışan bulunamadı' });
        }
        if (managerEmployee.company.toString() !== department.company.toString()) {
          return res.status(400).json({ message: 'Yönetici aynı şirkete ait olmalıdır' });
        }
      }
      const oldManager = department.manager;
      department.manager = manager || null;
      
      // Manager değiştiyse approval chain'leri güncelle
      if (oldManager?.toString() !== (manager || null)?.toString()) {
        const { updateDepartmentEmployeesApprovalChain } = require('../services/approvalChainService');
        try {
          await updateDepartmentEmployeesApprovalChain(department._id);
        } catch (error) {
          console.error('Approval chain güncelleme hatası:', error);
        }
      }
    }

    department.name = name || department.name;
    department.description = description !== undefined ? description : department.description;
    
    // isActive güncellemesi (varsayılan departman her zaman aktif kalmalı)
    if (isActive !== undefined && !department.isDefault) {
      department.isActive = isActive;
    }
    
    await department.save();

    const populated = await Department.findById(department._id)
      .populate('company')
      .populate('parentDepartment', 'name')
      .populate('workingHours', 'name')
      .populate('manager', 'firstName lastName email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete department
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Departman bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== department.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    // Prevent deletion of "Merkez" department
    if (department.name === 'Merkez') {
      return res.status(400).json({ 
        message: 'Merkez departmanı silinemez. İsterseniz ismini değiştirebilirsiniz.' 
      });
    }

    // Check if department has children
    const children = await Department.find({ parentDepartment: department._id });
    if (children.length > 0) {
      return res.status(400).json({ 
        message: 'Bu departmanın alt departmanları var. Önce alt departmanları silin veya taşıyın.' 
      });
    }

    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Departman silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;
