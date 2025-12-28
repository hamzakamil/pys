const Employee = require('../models/Employee');
const Department = require('../models/Department');

/**
 * Çalışan için onay zincirini hesaplar (ALTTAN ÜSTE DOĞRU)
 * Öncelik sırası:
 * 1. Çalışanın departmanının yöneticisi (en alt seviye)
 * 2. Üst departmanların yöneticileri (parentDepartment üzerinden yukarı)
 * 3. Çalışanın direkt manager'ı (employee.manager)
 * 4. Manager'ın manager'ı (recursive)
 * 
 * Chain'in ilk elemanı en alt yönetici, son elemanı en üst yönetici olur.
 */
async function calculateApprovalChain(employeeId) {
  try {
    const employee = await Employee.findById(employeeId)
      .populate('department')
      .populate('manager', 'firstName lastName email manager department');

    if (!employee) {
      return [];
    }

    const chain = [];
    const visited = new Set(); // Sonsuz döngü önleme

    // 1. Departman yöneticisi (en alt seviye - chain'in başına ekle)
    if (employee.department) {
      const department = await Department.findById(employee.department)
        .populate('manager', 'firstName lastName email manager department')
        .populate('parentDepartment');

      if (department && department.manager) {
        const managerId = department.manager._id.toString();
        if (!visited.has(managerId)) {
          chain.push(department.manager._id);
          visited.add(managerId);
        }
      }

      // 2. Üst departmanların yöneticilerini ekle (parentDepartment üzerinden yukarı)
      let currentDept = department;
      while (currentDept && currentDept.parentDepartment) {
        const parentDept = await Department.findById(currentDept.parentDepartment)
          .populate('manager', 'firstName lastName email manager department')
          .populate('parentDepartment');

        if (parentDept && parentDept.manager) {
          const managerId = parentDept.manager._id.toString();
          if (!visited.has(managerId)) {
            chain.push(parentDept.manager._id);
            visited.add(managerId);
          }
        }

        currentDept = parentDept;
      }
    }

    // 3. Çalışanın direkt manager'ı (eğer departman yöneticisi değilse)
    if (employee.manager) {
      const managerId = employee.manager._id.toString();
      if (!visited.has(managerId)) {
        chain.push(employee.manager._id);
        visited.add(managerId);
      }
    }

    // 4. Manager'ların manager'larını recursive ekle (yukarı doğru)
    for (let i = 0; i < chain.length; i++) {
      const managerId = chain[i];
      await addManagerHierarchy(managerId, chain, visited);
    }

    // Approval chain'i employee'ye kaydet
    employee.approvalChain = chain;
    await employee.save();

    return chain;
  } catch (error) {
    console.error('Approval chain hesaplama hatası:', error);
    return [];
  }
}

/**
 * Manager'ın üst manager'larını recursive olarak ekler
 */
async function addManagerHierarchy(managerId, chain, visited) {
  const manager = await Employee.findById(managerId)
    .populate('manager', 'firstName lastName email manager department')
    .populate('department');

  if (!manager) {
    return;
  }

  // Manager'ın direkt manager'ı varsa ekle
  if (manager.manager) {
    const upperManagerId = manager.manager._id.toString();
    if (!visited.has(upperManagerId)) {
      chain.push(manager.manager._id);
      visited.add(upperManagerId);
      // Recursive olarak devam et
      await addManagerHierarchy(manager.manager._id, chain, visited);
    }
  }

  // Manager'ın departmanının yöneticisi varsa ve farklıysa ekle
  if (manager.department) {
    const dept = await Department.findById(manager.department)
      .populate('manager', 'firstName lastName email manager department')
      .populate('parentDepartment');

    if (dept && dept.manager) {
      const deptManagerId = dept.manager._id.toString();
      // Eğer departman yöneticisi manager'ın kendisi değilse ve chain'de yoksa ekle
      if (deptManagerId !== managerId.toString() && !visited.has(deptManagerId)) {
        chain.push(dept.manager._id);
        visited.add(deptManagerId);
        await addManagerHierarchy(dept.manager._id, chain, visited);
      }
    }

    // Üst departmanların yöneticilerini de ekle
    let currentDept = dept;
    while (currentDept && currentDept.parentDepartment) {
      const parentDept = await Department.findById(currentDept.parentDepartment)
        .populate('manager', 'firstName lastName email manager department')
        .populate('parentDepartment');

      if (parentDept && parentDept.manager) {
        const parentManagerId = parentDept.manager._id.toString();
        if (!visited.has(parentManagerId)) {
          chain.push(parentDept.manager._id);
          visited.add(parentManagerId);
          await addManagerHierarchy(parentDept.manager._id, chain, visited);
        }
      }

      currentDept = parentDept;
    }
  }
}

/**
 * Departman yöneticisi değiştiğinde, o departman ve alt departmanlardaki
 * tüm çalışanların approval chain'lerini güncelle
 */
async function updateDepartmentEmployeesApprovalChain(departmentId) {
  try {
    // Departman ve tüm alt departmanları bul (recursive)
    const getAllSubDepartments = async (deptId) => {
      const departments = [deptId];
      const subDepts = await Department.find({ parentDepartment: deptId });
      for (const subDept of subDepts) {
        const subSubDepts = await getAllSubDepartments(subDept._id);
        departments.push(...subSubDepts);
      }
      return departments;
    };

    const departmentIds = await getAllSubDepartments(departmentId);

    // Bu departmanlardaki tüm çalışanları bul
    const employees = await Employee.find({
      department: { $in: departmentIds }
    });

    // Her çalışan için approval chain'i yeniden hesapla
    for (const employee of employees) {
      await calculateApprovalChain(employee._id);
    }

    return { success: true, updatedCount: employees.length };
  } catch (error) {
    console.error('Departman çalışanları approval chain güncelleme hatası:', error);
    throw error;
  }
}

/**
 * Çalışanın manager'ı değiştiğinde approval chain'i güncelle
 */
async function updateEmployeeApprovalChain(employeeId) {
  try {
    return await calculateApprovalChain(employeeId);
  } catch (error) {
    console.error('Çalışan approval chain güncelleme hatası:', error);
    throw error;
  }
}

module.exports = {
  calculateApprovalChain,
  updateDepartmentEmployeesApprovalChain,
  updateEmployeeApprovalChain
};
