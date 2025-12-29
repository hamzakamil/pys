const mongoose = require('mongoose');

const employmentPreRecordSchema = new mongoose.Schema({
  // İşlem tipi: 'hire' (işe giriş) veya 'termination' (işten çıkış)
  processType: {
    type: String,
    enum: ['hire', 'termination'],
    required: true
  },
  
  // İşe giriş için aday bilgileri (termination için employeeId kullanılır)
  candidateFullName: {
    type: String,
    required: function() { return this.processType === 'hire'; }
  },
  tcKimlikNo: {
    type: String,
    required: function() { return this.processType === 'hire'; },
    validate: {
      validator: function(v) {
        return !v || v.length === 11;
      },
      message: 'TC Kimlik No 11 haneli olmalıdır'
    }
  },
  email: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  
  // İşten çıkış için çalışan referansı
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: function() { return this.processType === 'termination'; }
  },
  
  // Şirket ve işyeri bilgileri
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  workplaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workplace',
    required: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkplaceSection',
    default: null
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  
  // İşe giriş bilgileri
  hireDate: {
    type: Date,
    required: function() { return this.processType === 'hire'; }
  },
  sgkMeslekKodu: {
    type: String,
    default: null
  },
  jobName: {
    type: String,
    default: null // Görevi (Meslek) açıklama alanı
  },
  ucret: {
    type: Number,
    required: true // Sadece ücret rakamı, net/brüt bilgisi şirket ayarından
  },
  contractType: {
    type: String,
    enum: ['BELİRSİZ_SÜRELİ', 'BELİRLİ_SÜRELİ', 'KISMİ_SÜRELİ'],
    default: 'BELİRSİZ_SÜRELİ'
  },
  
  // İşten çıkış bilgileri
  terminationDate: {
    type: Date,
    required: function() { return this.processType === 'termination'; }
  },
  terminationReason: {
    type: String,
    enum: ['istifa', 'işten çıkarma', null],
    default: null
  },
  
  // Dosyalar
  documents: [{
    type: {
      type: String,
      enum: ['sözleşme', 'istifa_dilekçesi', 'ihbar_kıdem_hesap', 'işe_giriş_bildirgesi'],
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Onay süreci
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'PENDING_COMPANY_APPROVAL', 'PENDING_DEALER_APPROVAL', 'APPROVED', 'REJECTED', 'ASKIDA', 'IPTAL'],
    default: 'PENDING_APPROVAL'
  },
      pendingDate: {
        type: Date,
        default: Date.now
      },
      waitingApprovalAt: {
        type: Date,
        default: Date.now // Onaya gönderilme tarihi
      },
  approvedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Reddetme bilgileri
  rejectionReason: {
    type: String,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Oluşturan
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
employmentPreRecordSchema.index({ companyId: 1, status: 1 });
employmentPreRecordSchema.index({ processType: 1, status: 1 });
employmentPreRecordSchema.index({ tcKimlikNo: 1, companyId: 1 });

module.exports = mongoose.model('EmploymentPreRecord', employmentPreRecordSchema);

