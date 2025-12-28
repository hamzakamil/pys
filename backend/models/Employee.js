const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  workplace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workplace',
    required: true // SGK İşyeri - zorunlu
  },
  workplaceSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkplaceSection',
    default: null // İşyeri Bölümü - opsiyonel
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null // Departman - opsiyonel (artık zorunlu değil)
  },
  employeeNumber: {
    type: String
    // Otomatik sıra numarası (read-only, backend tarafından atanır)
  },
  personelNumarasi: {
    type: String
    // Manuel personel numarası (opsiyonel, kullanıcı girebilir, alfanumerik)
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  exitDate: {
    type: Date // İşten çıkış tarihi
  },
  exitReason: {
    type: String // İşten ayrılış nedeni (gösterim metni)
  },
  exitReasonCode: {
    type: String // İşten ayrılış nedeni kodu
  },
  status: {
    type: String,
    enum: ['active', 'separated'],
    default: 'active'
  },
  separationDate: {
    type: Date // Ayrılış tarihi (onaylandıktan sonra)
  },
  separationReason: {
    type: String // Ayrılış nedeni (onaylandıktan sonra)
  },
  birthDate: {
    type: Date
  },
  salary: {
    type: Number // Ücret
  },
  isNetSalary: {
    type: Boolean, // Net ücret mi? (true: net, false: brüt)
    default: true // Varsayılan olarak net ücret
  },
  // Genel Bilgiler
  tcKimlik: {
    type: String // TC Kimlik No
  },
  position: {
    type: String // Görevi
  },
  // Kimlik Bilgileri
  birthPlace: {
    type: String // Doğum yeri
  },
  passportNumber: {
    type: String // Pasaport No
  },
  bloodType: {
    type: String // Kan grubu
  },
  militaryStatus: {
    type: String // Askerlik durumu
  },
  hasCriminalRecord: {
    type: Boolean, // Sabıkalı mı?
    default: false
  },
  hasDrivingLicense: {
    type: Boolean, // Ehliyet var mı?
    default: false
  },
  // Özel Alanlar (dinamik)
  customFields: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  }],
  weekendDays: {
    type: [Number], // [0, 6] for Sunday and Saturday, default from company/department
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isActivated: {
    type: Boolean,
    default: false // Email aktivasyonu yapıldı mı?
  },
  activatedAt: {
    type: Date // Aktivasyon tarihi
  },
  activationToken: {
    type: String // Aktivasyon token'ı
  },
  // Çok Kademeli İzin Onay Sistemi
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null // Direkt yönetici (nullable)
  },
  approvalChain: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }], // Onay zinciri - manager'dan başlayarak yukarı doğru otomatik hesaplanacak
  createdByBayiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    default: null // Bayi admin tarafından oluşturulduysa bayi ID'si
  }
}, {
  timestamps: true
});

// Manager değiştiğinde approvalChain'i otomatik güncelle
employeeSchema.methods.updateApprovalChain = async function() {
  const chain = [];
  let currentManager = this.manager;
  
  // Manager'dan başlayarak yukarı doğru zincir oluştur
  while (currentManager) {
    const managerDoc = await mongoose.model('Employee').findById(currentManager).select('_id manager');
    if (managerDoc) {
      chain.push(managerDoc._id);
      currentManager = managerDoc.manager;
    } else {
      break;
    }
  }
  
  this.approvalChain = chain;
  return this.save();
};

// Pre-save hook: Manager değiştiğinde approvalChain'i güncelle
employeeSchema.pre('save', async function(next) {
  try {
    // Manager değiştiyse veya yeni kayıt ise
    if (this.isModified('manager') || this.isNew) {
      const chain = [];
      let currentManager = this.manager;
      
      // Manager'dan başlayarak yukarı doğru zincir oluştur
      while (currentManager) {
        const managerDoc = await mongoose.model('Employee').findById(currentManager).select('_id manager');
        if (managerDoc) {
          chain.push(managerDoc._id);
          currentManager = managerDoc.manager;
        } else {
          break;
        }
      }
      
      this.approvalChain = chain;
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Employee', employeeSchema);

