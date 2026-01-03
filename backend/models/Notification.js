const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['late_checkin', 'early_checkout', 'missing_checkout', 'leave_request'],
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Bildirimi alacak yönetici
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Ek bilgiler (checkIn ID, leaveRequest ID, vs.)
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ company: 1, type: 1, createdAt: -1 });
notificationSchema.index({ employee: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);


