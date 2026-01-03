const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const { auth } = require('../middleware/auth');

// Get notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const { isRead, type, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { recipient: req.user._id };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    if (type) {
      query.type = type;
    }

    const total = await Notification.countDocuments(query);

    const notifications = await Notification.find(query)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Bildirim bulunamadı' });
    }

    // Sadece kendi bildirimini okuyabilir
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Mark all notifications as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'Tüm bildirimler okundu olarak işaretlendi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get unread notification count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;


