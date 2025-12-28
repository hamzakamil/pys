const mongoose = require('mongoose');

const companyHolidayCalendarSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  holidays: [{
    type: Date,
    required: true
  }]
}, {
  timestamps: true
});

// Unique constraint: Bir şirket için bir yıl sadece bir kez olabilir
companyHolidayCalendarSchema.index({ companyId: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('CompanyHolidayCalendar', companyHolidayCalendarSchema);



