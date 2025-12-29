const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  annualLeaveDays: {
    type: Number,
    default: 0
  },
  usedAnnualLeaveDays: {
    type: Number,
    default: 0
  },
  remainingAnnualLeaveDays: {
    type: Number,
    default: 0
  },
  hourlyLeaveHours: {
    type: Number,
    default: 0 // Accumulated hourly leave hours
  },
  hourlyLeaveDaysEquivalent: {
    type: Number,
    default: 0 // hourlyLeaveHours / 8 (rounded)
  },
  lastCalculationDate: {
    type: Date,
    default: Date.now
  },
  calculationYear: {
    type: Number,
    required: true
  },
  seniority: {
    type: Number, // Years of service
    default: 0
  },
  age: {
    type: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);






