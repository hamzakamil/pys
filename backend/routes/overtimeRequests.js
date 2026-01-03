const express = require('express');
const router = express.Router();
const OvertimeRequest = require('../models/OvertimeRequest');
const { protect, admin } = require('../middleware/auth'); // Assuming admin middleware exists
const { createNotification } = require('../services/notificationService');
const Employee = require('../models/Employee');

// @desc    Get all overtime requests for a company
// @route   GET /api/overtimerequests
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const requests = await OvertimeRequest.find({ companyId: req.user.companyId }).populate('employeeId', 'name');
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Approve or reject an overtime request
// @route   PUT /api/overtimerequests/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, admin, async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        const request = await OvertimeRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Ensure the admin belongs to the same company
        if (request.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        request.status = status;
        request.approvedBy = req.user._id;
        request.approvedDate = Date.now();
        if (status === 'rejected') {
            request.rejectionReason = rejectionReason;
        }

        await request.save();

        // Notify employee
        const employee = await Employee.findById(request.employeeId);
        if (employee && employee.userId) {
            const message = `Fazla mesai talebiniz ${status === 'approved' ? 'onaylandı' : 'reddedildi'}.`;
            createNotification(employee.userId, message, '/mobile/overtimes');
        }

        res.json(request);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
