const CheckIn = require('../models/CheckIn');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const Department = require('../models/Department');
const WorkingHours = require('../models/WorkingHours');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper function to get employee's working hours
async function getEmployeeWorkingHours(employee) {
  let workingHours = null;
  
  if (employee.department) {
    const department = await Department.findById(employee.department).populate('workingHours');
    if (department && department.workingHours) {
      workingHours = department.workingHours;
    }
  }
  
  return workingHours;
}

// Helper function to get expected check-out time for a day
function getExpectedCheckOutTime(workingHours, date) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = date.getDay();
  const dayName = dayNames[dayOfWeek];
  
  if (!workingHours || !workingHours[dayName] || !workingHours[dayName].isWorking) {
    return null;
  }
  
  const daySchedule = workingHours[dayName];
  const [endHour, endMinute] = daySchedule.end.split(':').map(Number);
  
  const expectedCheckOut = new Date(date);
  expectedCheckOut.setHours(endHour, endMinute, 0, 0);
  
  return expectedCheckOut;
}

// Helper function to create notification for managers
async function createNotification(type, employee, company, message, data = {}) {
  try {
    let recipients = [];
    
    if (employee.manager) {
      const managerEmployee = await Employee.findById(employee.manager);
      if (managerEmployee) {
        const managerUser = await User.findOne({ email: managerEmployee.email });
        if (managerUser) {
          recipients.push(managerUser._id);
        }
      }
    }
    
    const Role = require('../models/Role');
    const companyAdminRole = await Role.findOne({ name: 'company_admin' });
    if (companyAdminRole) {
      const companyAdmin = await User.findOne({ 
        company: company._id,
        role: companyAdminRole._id
      });
      if (companyAdmin && !recipients.some(r => r.toString() === companyAdmin._id.toString())) {
        recipients.push(companyAdmin._id);
      }
    }
    
    const notifications = recipients.map(recipientId => ({
      type,
      employee: employee._id,
      company: company._id,
      recipient: recipientId,
      message,
      data
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Bildirim oluşturma hatası:', error);
  }
}

// Check for employees who haven't checked out
async function checkMissingCheckouts() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Bugün giriş yapmış ama çıkış yapmamış çalışanları bul
    const checkInsWithoutCheckout = await CheckIn.find({
      date: {
        $gte: today,
        $lt: tomorrow
      },
      checkInTime: { $exists: true, $ne: null },
      checkOutTime: null
    }).populate('employee').populate('company');

    for (const checkIn of checkInsWithoutCheckouts) {
      const employee = checkIn.employee;
      const company = checkIn.company;

      if (!employee || !company) continue;

      // Çalışanın workingHours'unu al
      const workingHours = await getEmployeeWorkingHours(employee);
      
      if (workingHours) {
        const expectedCheckOut = getExpectedCheckOutTime(workingHours, today);
        
        if (expectedCheckOut) {
          const now = new Date();
          // Mesai bitiş saatinden en az 1 saat geçmişse bildirim oluştur
          const oneHourAfterExpected = new Date(expectedCheckOut.getTime() + 60 * 60 * 1000);
          
          if (now > oneHourAfterExpected) {
            // Bugün için zaten bildirim oluşturulmuş mu kontrol et
            const existingNotification = await Notification.findOne({
              type: 'missing_checkout',
              employee: employee._id,
              company: company._id,
              createdAt: {
                $gte: today,
                $lt: tomorrow
              }
            });

            if (!existingNotification) {
              await createNotification(
                'missing_checkout',
                employee,
                company,
                `${employee.firstName} ${employee.lastName} bugün çıkış yapmadı.`,
                { checkInId: checkIn._id, expectedCheckOutTime: expectedCheckOut }
              );
            }
          }
        }
      }
    }

    console.log(`Çıkış yapmayan çalışan kontrolü tamamlandı: ${checkInsWithoutCheckouts.length} kayıt kontrol edildi`);
  } catch (error) {
    console.error('Çıkış yapmayan çalışan kontrolü hatası:', error);
  }
}

// Scheduled job: Her saat başı çalışır (mesai bitiş saatlerinden sonra kontrol eder)
function startCheckInNotificationService() {
  // İlk çalıştırma: 1 dakika sonra
  setTimeout(() => {
    checkMissingCheckouts();
  }, 60 * 1000);

  // Sonra her saat başı çalıştır
  setInterval(() => {
    checkMissingCheckouts();
  }, 60 * 60 * 1000); // 1 saat

  console.log('Çıkış yapmayan çalışan kontrol servisi başlatıldı');
}

module.exports = {
  checkMissingCheckouts,
  startCheckInNotificationService
};


