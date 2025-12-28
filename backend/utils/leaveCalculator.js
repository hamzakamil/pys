/**
 * Calculate annual leave days based on seniority and age
 */
function calculateAnnualLeaveDays(seniority, age) {
  let baseDays = 14;

  // Seniority-based calculation
  if (seniority >= 15) {
    baseDays = 26;
  } else if (seniority >= 5) {
    baseDays = 20;
  } else if (seniority >= 1) {
    baseDays = 14;
  }

  // Age-based minimum (18 yaş altı veya 50+ yaş: minimum 20 gün)
  if ((age && age < 18) || (age && age >= 50)) {
    baseDays = Math.max(baseDays, 20);
  }

  return baseDays;
}

/**
 * Calculate working days between two dates (excluding weekends and holidays)
 */
function calculateWorkingDays(startDate, endDate, weekendDays = [0]) {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    
    // Skip weekend days
    if (!weekendDays.includes(dayOfWeek)) {
      count++;
    }
    
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get weekend days for employee (from employee -> department -> company hierarchy)
 */
async function getEmployeeWeekendDays(employee, Department, Company) {
  // Check employee specific weekend days
  if (employee.weekendDays && employee.weekendDays.length > 0) {
    return employee.weekendDays;
  }

  // Check department weekend days
  const department = await Department.findById(employee.department);
  if (department && department.weekendDays && department.weekendDays.length > 0) {
    return department.weekendDays;
  }

  // Get company weekend days
  const company = await Company.findById(employee.company);
  if (company && company.leaveSettings && company.leaveSettings.weekendDays) {
    return company.leaveSettings.weekendDays;
  }

  // Default: Sunday only
  return [0];
}

/**
 * Calculate leave days based on company settings and weekend days
 */
async function calculateLeaveDays(startDate, endDate, employee, Department, Company, isHalfDay = false, isHourly = false, hours = 0) {
  if (isHourly) {
    return hours / 8; // Convert hours to days (8 hours = 1 day)
  }

  if (isHalfDay) {
    return 0.5;
  }

  const weekendDays = await getEmployeeWeekendDays(employee, Department, Company);
  return calculateWorkingDays(startDate, endDate, weekendDays);
}

/**
 * Calculate seniority in years
 */
function calculateSeniority(hireDate) {
  if (!hireDate) return 0;
  
  const today = new Date();
  const hire = new Date(hireDate);
  const diffTime = Math.abs(today - hire);
  const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
  
  return diffYears;
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate) {
  if (!birthDate) return null;
  
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

module.exports = {
  calculateAnnualLeaveDays,
  calculateWorkingDays,
  calculateLeaveDays,
  calculateSeniority,
  calculateAge,
  getEmployeeWeekendDays
};

