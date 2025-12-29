const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const CheckIn = require('../models/CheckIn');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const WorkingHours = require('../models/WorkingHours');
const EmploymentPreRecord = require('../models/EmploymentPreRecord');
const LeaveBalance = require('../models/LeaveBalance');
const Company = require('../models/Company');

/**
 * GET /api/dashboard/company-admin/summary
 * Şirket Admin için özet kartlar
 */
router.get('/company-admin/summary', auth, requireRole('company_admin'), async (req, res) => {
  try {
    const companyId = req.user.company;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Bugün giriş yapanlar
    const todayCheckIns = await CheckIn.find({
      company: companyId,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      checkInTime: { $exists: true }
    }).countDocuments();

    // 2. Geç kalanlar
    // Aktif çalışanları al
    const activeEmployees = await Employee.find({
      company: companyId,
      status: 'active'
    }).populate('workingHours');

    let lateCount = 0;
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Pazar, 1 = Pazartesi, ...
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[currentDay];

    for (const employee of activeEmployees) {
      const workingHours = employee.workingHours;
      if (!workingHours || !workingHours[currentDayName] || !workingHours[currentDayName].isWorking) {
        continue;
      }

      const expectedStartTime = workingHours[currentDayName].start;
      if (!expectedStartTime) continue;

      const [expectedHour, expectedMinute] = expectedStartTime.split(':').map(Number);
      const expectedTime = new Date(today);
      expectedTime.setHours(expectedHour, expectedMinute, 0, 0);

      // Bugün giriş yapmış mı kontrol et
      const todayCheckIn = await CheckIn.findOne({
        employee: employee._id,
        date: {
          $gte: today,
          $lt: tomorrow
        },
        checkInTime: { $exists: true }
      });

      if (todayCheckIn && todayCheckIn.checkInTime) {
        const checkInTime = new Date(todayCheckIn.checkInTime);
        if (checkInTime > expectedTime) {
          lateCount++;
        }
      } else if (now > expectedTime) {
        // Giriş yapmamış ve beklenen saat geçmiş
        lateCount++;
      }
    }

    // 3. İzinli olan çalışanlar (bugün izin başlangıcı veya içinde olanlar)
    const onLeaveCount = await LeaveRequest.countDocuments({
      company: companyId,
      status: 'APPROVED',
      startDate: { $lte: tomorrow },
      endDate: { $gte: today }
    });

    // 4. Bekleyen talepler (izin talepleri + işe giriş/çıkış)
    const pendingLeaveRequests = await LeaveRequest.countDocuments({
      company: companyId,
      status: 'PENDING'
    });

    const pendingEmploymentRecords = await EmploymentPreRecord.countDocuments({
      companyId: companyId,
      status: { $in: ['PENDING_APPROVAL', 'PENDING_COMPANY_APPROVAL', 'PENDING_DEALER_APPROVAL'] }
    });

    const pendingRequestsCount = pendingLeaveRequests + pendingEmploymentRecords;

    res.json({
      success: true,
      data: {
        todayCheckIns,
        lateCount,
        onLeaveCount,
        pendingRequestsCount
      }
    });
  } catch (error) {
    console.error('Dashboard summary hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

/**
 * GET /api/dashboard/employee/summary
 * Çalışan için özet kartlar
 */
router.get('/employee/summary', auth, requireRole('employee'), async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Çalışan bulunamadı' });
    }

    const companyId = employee.company;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Bugün giriş yaptı mı?
    const todayCheckIn = await CheckIn.findOne({
      employee: employee._id,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      checkInTime: { $exists: true }
    });

    const hasCheckedIn = !!todayCheckIn;

    // 2. İzin bakiyesi
    const leaveBalance = await LeaveBalance.findOne({ employee: employee._id });
    const remainingDays = leaveBalance ? leaveBalance.remainingAnnualLeaveDays : 0;

    // 3. Bekleyen izin talepleri
    const pendingLeaveRequests = await LeaveRequest.countDocuments({
      employee: employee._id,
      status: 'PENDING'
    });

    // 4. Onaylanan izin talepleri (gelecek)
    const upcomingLeaves = await LeaveRequest.countDocuments({
      employee: employee._id,
      status: 'APPROVED',
      startDate: { $gte: today }
    });

    res.json({
      success: true,
      data: {
        hasCheckedIn,
        remainingDays,
        pendingLeaveRequests,
        upcomingLeaves
      }
    });
  } catch (error) {
    console.error('Employee dashboard summary hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

/**
 * GET /api/dashboard/bayi-admin/summary
 * Bayi Admin için özet kartlar
 */
router.get('/bayi-admin/summary', auth, requireRole('bayi_admin'), async (req, res) => {
  try {
    const dealerId = req.user.dealer;
    
    // Bayi'ye ait şirketler
    const companies = await Company.find({ dealer: dealerId });
    const companyIds = companies.map(c => c._id);

    // 1. Toplam şirket sayısı
    const totalCompanies = companies.length;

    // 2. Bekleyen işe giriş/çıkış kayıtları
    const pendingEmploymentRecords = await EmploymentPreRecord.countDocuments({
      companyId: { $in: companyIds },
      status: { $in: ['PENDING_APPROVAL', 'PENDING_COMPANY_APPROVAL', 'PENDING_DEALER_APPROVAL'] }
    });

    // 3. Bugün giriş yapanlar (tüm şirketler)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCheckIns = await CheckIn.find({
      company: { $in: companyIds },
      date: {
        $gte: today,
        $lt: tomorrow
      },
      checkInTime: { $exists: true }
    }).countDocuments();

    // 4. Toplam aktif çalışan sayısı
    const totalEmployees = await Employee.countDocuments({
      company: { $in: companyIds },
      status: 'active'
    });

    res.json({
      success: true,
      data: {
        totalCompanies,
        pendingEmploymentRecords,
        todayCheckIns,
        totalEmployees
      }
    });
  } catch (error) {
    console.error('Bayi admin dashboard summary hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

module.exports = router;

