const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String
  },
  address: {
    type: String
  },
  taxOffice: {
    type: String // Vergi dairesi
  },
  taxNumber: {
    type: String // Vergi numarası
  },
  authorizedPerson: {
    fullName: {
      type: String // Yetkili adı soyadı
    },
    phone: {
      type: String // Yetkili telefon
    },
    email: {
      type: String // Yetkili email (admin email)
    }
  },
  logo: {
    type: String
  },
  title: {
    type: String,
    default: 'Personel Yönetim Sistemi'
  },
  activeAttendanceTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceTemplate',
    default: null
  },
  leaveSettings: {
    minimumPartialLeave: {
      type: Number,
      default: 10 // Minimum days for partial leave
    },
    includeSaturdayInLeave: {
      type: String,
      enum: ['never', 'always', 'if_monday_start', 'if_friday_start', 'if_in_range'],
      default: 'never'
    },
    saturdayWorkingDay: {
      type: Boolean,
      default: false // If Saturday is a working day
    },
    sundayWorkingDay: {
      type: Boolean,
      default: false // If Sunday is a working day
    },
    weekendDays: {
      type: [Number], // [0] for Sunday (default), can be [0,6] for both, etc.
      default: [0] // Sunday by default
    }
  },
  checkInSettings: {
    enabled: {
      type: Boolean,
      default: false // Enable check-in/check-out buttons
    },
    locationRequired: {
      type: Boolean,
      default: true // Require location for check-in
    },
    allowedLocation: {
      latitude: {
        type: Number // Company location latitude
      },
      longitude: {
        type: Number // Company location longitude
      },
      radius: {
        type: Number, // Radius in meters
        default: 100 // Default 100 meters
      }
    },
    autoCheckIn: {
      type: Boolean,
      default: false // Auto check-in/check-out based on working hours
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isActivated: {
    type: Boolean,
    default: false // Şirket aktif mi? (company_admin ilk girişte aktif olur)
  },
  activatedAt: {
    type: Date // Aktif edilme tarihi
  },
  naceCode: {
    type: String,
    default: null // NACE kodu (İnşaat/Balıkçılık kontrolü için)
  },
  payrollCalculationType: {
    type: String,
    enum: ['NET', 'BRUT'],
    default: 'NET' // Ücret hesaplama türü (Net/Brüt)
  },
  onboarding_requires_dealer_approval: {
    type: Boolean,
    default: false // İşe giriş için bayi onayı gerekli mi?
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);

