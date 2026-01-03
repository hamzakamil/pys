const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const CheckIn = require('../models/CheckIn');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const AdvanceRequest = require('../models/AdvanceRequest');
const OvertimeRequest = require('../models/OvertimeRequest');
const WorkingHours = require('../models/WorkingHours');
const { notifyManager, notifyRole } = require('../services/notificationService');
const geolib = require('geolib');

// @desc    Check-in for an employee
// @route   POST /api/mobile/check-in
// @access  Private
router.post('/check-in', protect, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const employee = await Employee.findOne({ userId: req.user._id });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const company = await Company.findById(employee.companyId);
        if (!company || !company.workplaceCoordinates || !company.workplaceCoordinates.coordinates) {
            return res.status(400).json({ message: 'Company location not set' });
        }

        // Location validation
        const distance = geolib.getDistance(
            { latitude, longitude },
            { longitude: company.workplaceCoordinates.coordinates[0], latitude: company.workplaceCoordinates.coordinates[1] }
        );

        if (distance > (company.locationTolerance || 100)) { // 100 meters tolerance default
            return res.status(400).json({ message: 'Belirlenen lokasyon dışında giriş yapılamaz' });
        }
        
        // Check for duplicate check-in
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingCheckIn = await CheckIn.findOne({
            employeeId: employee._id,
            checkInTime: { $gte: today, $lt: tomorrow }
        });

        if (existingCheckIn) {
            return res.status(400).json({ message: 'Aynı gün içinde ikinci girişe izin verilmez' });
        }

        const checkIn = new CheckIn({
            employeeId: employee._id,
            companyId: employee.companyId,
            departmentId: employee.departmentId,
            checkInTime: new Date(),
            location: { latitude, longitude }
        });

        await checkIn.save();

        // Late check-in notification
        const workingHours = await WorkingHours.findOne({ companyId: employee.companyId, isDefault: true }); // Assuming default working hours for now
        if (workingHours) {
            const checkInTime = new Date(checkIn.checkInTime);
            const workStartTime = new Date(checkInTime);
            const [startHour, startMinute] = workingHours.startTime.split(':');
            workStartTime.setHours(startHour, startMinute, 0, 0);

            const tolerance = company.checkInSettings?.checkInToleranceMinutes || 15;
            workStartTime.setMinutes(workStartTime.getMinutes() + tolerance);

            if (checkInTime > workStartTime) {
                const lateMinutes = Math.round((checkInTime - workStartTime) / (1000 * 60));
                notifyManager(employee._id, `${employee.name} ${lateMinutes} dakika geç giriş yaptı.`, '/attendance-calendar');
            }
        }

        res.status(201).json(checkIn);

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Check-out for an employee
// @route   POST /api/mobile/check-out
// @access  Private
router.post('/check-out', protect, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const employee = await Employee.findOne({ userId: req.user._id });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const checkIn = await CheckIn.findOne({
            employeeId: employee._id,
            checkInTime: { $gte: today },
            checkOutTime: null
        });

        if (!checkIn) {
            return res.status(400).json({ message: 'Açık bir giriş kaydı bulunamadı' });
        }

        checkIn.checkOutTime = new Date();
        checkIn.checkOutLocation = { latitude, longitude };
        
        // Warn if checkout is outside location, but allow it
        const company = await Company.findById(employee.companyId);
        if (company && company.workplaceCoordinates && company.workplaceCoordinates.coordinates) {
            const distance = geolib.getDistance(
                { latitude, longitude },
                { longitude: company.workplaceCoordinates.coordinates[0], latitude: company.workplaceCoordinates.coordinates[1] }
            );
            if (distance > (company.locationTolerance || 100)) {
                // This could be a notification later
                console.log(`User ${employee._id} checked out outside of the designated location.`);
                // We can add a flag to the check-in record itself
                checkIn.notes = 'Konum dışında çıkış yapıldı';
            }
        }

        await checkIn.save();

        // Early check-out notification
        const workingHours = await WorkingHours.findOne({ companyId: employee.companyId, isDefault: true }); // Assuming default working hours for now
        if (workingHours) {
            const checkOutTime = new Date(checkIn.checkOutTime);
            const workEndTime = new Date(checkOutTime);
            const [endHour, endMinute] = workingHours.endTime.split(':');
            workEndTime.setHours(endHour, endMinute, 0, 0);

            const tolerance = company.checkInSettings?.checkOutToleranceMinutes || 15;
            workEndTime.setMinutes(workEndTime.getMinutes() - tolerance);

            if (checkOutTime < workEndTime) {
                const earlyMinutes = Math.round((workEndTime - checkOutTime) / (1000 * 60));
                notifyManager(employee._id, `${employee.name} ${earlyMinutes} dakika erken çıkış yaptı.`, '/attendance-calendar');
            }
        }
        
        res.json(checkIn);

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// @desc    Get employee's own check-in history
// @route   GET /api/mobile/attendance-history
// @access  Private
router.get('/attendance-history', protect, async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        const history = await CheckIn.find({ employeeId: employee._id }).sort({ checkInTime: -1 }).limit(30);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// --- Leave Requests ---

// @desc    Create a leave request
// @route   POST /api/mobile/leave-requests
// @access  Private
router.post('/leave-requests', protect, async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const leaveRequest = new LeaveRequest({
            employeeId: employee._id,
            companyId: employee.companyId,
            leaveType,
            startDate,
            endDate,
            reason,
            status: 'pending'
        });
        
        await leaveRequest.save();
        const employeeData = await Employee.findById(employee._id).select('name');
        notifyManager(employee._id, `${employeeData.name} yeni bir izin talebi oluşturdu.`, '/approvals');
        res.status(201).json(leaveRequest);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get employee's own leave requests
// @route   GET /api/mobile/leave-requests
// @access  Private
router.get('/leave-requests', protect, async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const requests = await LeaveRequest.find({ employeeId: employee._id }).sort({ requestDate: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// --- Advance Requests ---

// @desc    Create an advance request
// @route   POST /api/mobile/advance-requests
// @access  Private
router.post('/advance-requests', protect, async (req, res) => {
    try {
        const { amount, repaymentType, repaymentDate, installments } = req.body;
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const advanceRequest = new AdvanceRequest({
            employeeId: employee._id,
            companyId: employee.companyId,
            amount,
            repaymentType,
            repaymentDate,
            installments
        });

        await advanceRequest.save();
        const employeeData = await Employee.findById(employee._id).select('name');
        notifyRole(employee.companyId, 'resmi_muhasebe_ik', `${employeeData.name} yeni bir avans talebi oluşturdu.`, '/approvals/advances');
        res.status(201).json(advanceRequest);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get employee's own advance requests
// @route   GET /api/mobile/advance-requests
// @access  Private
router.get('/advance-requests', protect, async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const requests = await AdvanceRequest.find({ employeeId: employee._id }).sort({ requestDate: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// --- Overtime Requests ---

// @desc    Create an overtime request
// @route   POST /api/mobile/overtime-requests
// @access  Private
router.post('/overtime-requests', protect, async (req, res) => {
    try {
        const { date, hours, description } = req.body;
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const overtimeRequest = new OvertimeRequest({
            employeeId: employee._id,
            companyId: employee.companyId,
            date,
            hours,
            description
        });

        await overtimeRequest.save();
        const employeeData = await Employee.findById(employee._id).select('name');
        notifyManager(employee._id, `${employeeData.name} yeni bir fazla mesai talebi oluşturdu.`, '/approvals/overtimes');
        res.status(201).json(overtimeRequest);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get employee's own overtime requests
// @route   GET /api/mobile/overtime-requests
// @access  Private
router.get('/overtime-requests', protect, async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const requests = await OvertimeRequest.find({ employeeId: employee._id }).sort({ requestDate: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


module.exports = router;
