const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'],
    unique: true
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);

