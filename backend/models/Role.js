const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  // Sistem rolleri (super_admin, bayi_admin, company_admin, resmi_muhasebe_ik, employee, bayi_yetkilisi)
  // Özel rolleri bayi_admin tarafından oluşturulabilir
  isSystemRole: {
    type: Boolean,
    default: false
  },
  // Bayi yetkilisi için hangi bayiye ait
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    default: null
  },
  // Rolü oluşturan kullanıcı (bayi_admin için özel roller)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);

