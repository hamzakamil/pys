const mongoose = require('mongoose');

const workingHoursSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  monday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: true }
  },
  tuesday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: true }
  },
  wednesday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: true }
  },
  thursday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: true }
  },
  friday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: true }
  },
  saturday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: false }
  },
  sunday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkingHours', workingHoursSchema);

