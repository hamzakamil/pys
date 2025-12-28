const mongoose = require('mongoose');

const workingPermitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  parentPermitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkingPermit',
    default: null // Alt kategori için parent referansı
  },
  createdBy: {
    type: String,
    enum: ['super_admin', 'company'],
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkingPermit', workingPermitSchema);

