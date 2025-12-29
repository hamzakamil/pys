<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">İşe Giriş İşlemi</h1>

    <div class="bg-white rounded-lg shadow p-6 max-w-3xl">
      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Şirket Seçimi (bayi_admin için) -->
          <div v-if="isBayiAdmin">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Şirket <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.companyId"
              @change="handleCompanyChange"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seçiniz</option>
              <option v-for="comp in companies" :key="comp._id" :value="comp._id">
                {{ comp.name }}
              </option>
            </select>
          </div>

          <!-- Ad Soyad -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Adı Soyadı <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.fullName"
              @keyup="formatFullName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Adı Soyadı"
              required
            />
            <p class="mt-1 text-xs text-gray-500">
              Ad Soyad Otomatik Olarak Büyük Harfe Dönüştürülecektir.
            </p>
          </div>

          <!-- TC Kimlik No -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              TC Kimlik No <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.tckn"
              @input="formatTCKimlik"
              type="text"
              maxlength="11"
              placeholder="11 Haneli TC Kimlik No"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p v-if="form.tckn && form.tckn.replace(/\D/g, '').length !== 11" class="mt-1 text-xs text-red-600">
              TC Kimlik No 11 Haneli Olmalıdır
            </p>
          </div>

          <!-- Görevi (SGK Meslek Kodu) -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-medium text-gray-700">
                Görevi (SGK Meslek Kodu) <span class="text-red-500">*</span>
              </label>
              <a
                href="https://www.turmob.org.tr/arsiv/mbs/resmigazete/-MeslekAd%C4%B1veKodralri.pdf"
                target="_blank"
                class="text-xs text-blue-600 hover:text-blue-800 underline"
                download
              >
                📥 SGK Meslek Kodları Listesi İndir
              </a>
            </div>
            <input
              v-model="form.sgkJobCode"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Görevi (SGK Meslek Kodu) Giriniz"
              required
            />
            <p class="mt-1 text-xs text-gray-500">
              İndirilen Meslek Kodlarından Uygun Olanı Yazabilirsiniz.
            </p>
          </div>

          <!-- SGK İşyeri (Tek ise otomatik, birden fazla ise seçim) -->
          <div v-if="form.companyId && workplaces.length > 1">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              SGK İşyeri <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.workplaceId"
              @change="loadSections"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seçiniz</option>
              <option v-for="wp in workplaces" :key="wp._id" :value="wp._id">
                {{ wp.name }}
              </option>
            </select>
            <p v-if="!form.workplaceId" class="mt-1 text-xs text-yellow-600">
              Birden Fazla İşyeri Bulundu. Lütfen Seçim Yapınız.
            </p>
          </div>

          <!-- Bölüm (opsiyonel) -->
          <div v-if="form.workplaceId && sections.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Bölüm / Kısım
            </label>
            <select
              v-model="form.sectionId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seçiniz</option>
              <option v-for="section in sections" :key="section._id" :value="section._id">
                {{ section.name }}
              </option>
            </select>
          </div>

          <!-- Email (Opsiyonel) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              v-model="form.email"
              type="email"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email Adresi (Opsiyonel)"
            />
          </div>

          <!-- Telefon (Zorunlu) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Telefon <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.phone"
              @input="formatPhone"
              type="text"
              maxlength="15"
              placeholder="0 555 555 55 55"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p class="mt-1 text-xs text-gray-500">
              Format: 0 555 555 55 55
            </p>
          </div>

          <!-- Ücret Miktarı (Opsiyonel) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Ücret Miktarı
              <span v-if="companyPayrollType" class="text-sm text-gray-500 ml-2">
                ({{ companyPayrollType === 'BRUT' ? 'Brüt' : 'Net' }} — Şirket Ayarlarından Belirlenmiştir)
              </span>
            </label>
            <input
              v-model="form.salaryAmount"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            <p v-if="companyPayrollType" class="mt-1 text-xs text-gray-500">
              ℹ️ Bu Alan Şirket Ayarlarına Göre Otomatik Belirlenmiştir.
            </p>
            <p v-if="!form.salaryAmount || form.salaryAmount === ''" class="mt-1 text-xs text-yellow-600">
              ⚠️ Ücret Girilmezse Asgari Ücret Uygulanacaktır.
            </p>
          </div>

          <!-- Sözleşme Tipi -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Sözleşme Tipi <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.employmentType"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="BELİRSİZ_SÜRELİ">Belirsiz Süreli</option>
              <option value="BELİRLİ_SÜRELİ">Belirli Süreli</option>
              <option value="KISMİ_SÜRELİ">Kısmi Süreli - Part Time</option>
            </select>
          </div>

          <!-- İşe Giriş Tarihi -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              İşe Giriş Tarihi <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.startDate"
              @change="checkWarnings"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <!-- Ücret Uyarısı -->
          <div v-if="!form.salaryAmount || form.salaryAmount === ''" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p class="text-sm text-yellow-800">
              ⚠️ <strong>Ücret Girilmezse Asgari Ücret Uygulanacaktır.</strong>
            </p>
          </div>

          <!-- Uyarılar -->
          <div v-if="warnings.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p class="text-sm font-semibold text-yellow-800 mb-2">Uyarılar:</p>
            <ul class="list-disc list-inside text-sm text-yellow-700 space-y-1">
              <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
            </ul>
          </div>

          <!-- İstisna Sektör Mesajı -->
          <div v-if="isExceptionSector" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm text-blue-800">Bu Sektör İstisna Kapsamındadır (İnşaat/Balıkçılık).</p>
          </div>

          <div class="flex gap-2 justify-end pt-4">
            <button
              type="button"
              @click="$router.go(-1)"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ saving ? 'Gönderiliyor...' : 'Onaya Gönder' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()
const companies = ref([])
const employees = ref([])
const workplaces = ref([])
const sections = ref([])
const warnings = ref([])
const isExceptionSector = ref(false)
const saving = ref(false)

const isBayiAdmin = computed(() => authStore.user?.role === 'bayi_admin')

const form = ref({
  companyId: '',
  fullName: '', // Ad Soyad tek alan olarak
  tckn: '',
  sgkJobCode: '',
  email: '',
  phone: '',
  workplaceId: '',
  sectionId: '',
  salaryAmount: '',
  employmentType: 'BELİRSİZ_SÜRELİ',
  startDate: ''
})

const companyPayrollType = ref(null)

const formatTCKimlik = (event) => {
  let value = event.target.value.replace(/\D/g, '')
  if (value.length > 11) value = value.substring(0, 11)
  form.value.tckn = value
}

const formatPhone = (event) => {
  let value = event.target.value.replace(/\D/g, '')
  if (value.length > 11) value = value.substring(0, 11)
  // Format: 0 555 555 55 55
  if (value.length > 0) {
    value = value.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
    value = value.replace(/(\d{1})(\d{3})(\d{3})(\d{2})/, '$1 $2 $3 $4')
    value = value.replace(/(\d{1})(\d{3})(\d{3})/, '$1 $2 $3')
    value = value.replace(/(\d{1})(\d{3})/, '$1 $2')
  }
  form.value.phone = value
}

// Ad Soyad'ı büyük harfe çevir (keyup event)
const formatFullName = () => {
  if (form.value.fullName) {
    form.value.fullName = form.value.fullName.trim().toUpperCase()
  }
}

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const loadCompanySettings = async (companyId) => {
  if (!companyId) {
    companyPayrollType.value = null
    return
  }
  try {
    const response = await api.get(`/companies/${companyId}`)
    companyPayrollType.value = response.data.payrollCalculationType || 'NET'
  } catch (error) {
    console.error('Şirket ayarları yüklenemedi:', error)
    companyPayrollType.value = 'NET'
  }
}

// Çalışan yükleme artık gerekli değil - yeni çalışan oluşturulacak

const handleCompanyChange = async () => {
  await loadWorkplaces()
  await loadCompanySettings(form.value.companyId)
}

const loadWorkplaces = async () => {
  if (!form.value.companyId) {
    workplaces.value = []
    return
  }
  try {
    const response = await api.get('/workplaces', {
      params: { company: form.value.companyId }
    })
    workplaces.value = response.data || []
    
    // Tek işyeri varsa otomatik seç
    if (workplaces.value.length === 1) {
      form.value.workplaceId = workplaces.value[0]._id
      loadSections()
    }
    
    await loadEmployees()
  } catch (error) {
    console.error('İşyerleri yüklenemedi:', error)
  }
}

const loadSections = async () => {
  if (!form.value.workplaceId) {
    sections.value = []
    return
  }
  try {
    const response = await api.get('/workplaces/sections', {
      params: { workplace: form.value.workplaceId }
    })
    sections.value = response.data || []
    
    // Tek bölüm varsa otomatik seç
    if (sections.value.length === 1) {
      form.value.sectionId = sections.value[0]._id
    }
  } catch (error) {
    console.error('Bölümler yüklenemedi:', error)
  }
}

const checkWarnings = async () => {
  warnings.value = []
  isExceptionSector.value = false
  
  if (!form.value.startDate || !form.value.companyId) {
    return
  }
  
  try {
    // Backend'den uyarıları al
    const response = await api.post('/employment/validate-hire-date', {
      hireDate: form.value.startDate,
      companyId: form.value.companyId
    })
    
    if (response.data.success) {
      warnings.value = response.data.warnings || []
      isExceptionSector.value = response.data.isExceptionSector || false
    }
    
    // İstisna sektör kontrolü
    const company = companies.value.find(c => c._id === form.value.companyId)
    if (company?.naceCode) {
      const nacePrefix = company.naceCode.substring(0, 2)
      const constructionCodes = ['41', '42', '43']
      const fishingCodes = ['03']
      isExceptionSector.value = constructionCodes.includes(nacePrefix) || fishingCodes.includes(nacePrefix)
    }
  } catch (error) {
    console.error('Uyarı kontrolü hatası:', error)
    // Hata durumunda sessizce devam et
  }
}

const handleSubmit = async () => {
  try {
    // Ad Soyad'ı büyük harfe çevir
    if (form.value.fullName) {
      form.value.fullName = form.value.fullName.trim().toUpperCase()
    }
    
    // Tüm değişkenleri console.log ile kontrol et
    console.log('Form Data:', {
      companyId: form.value.companyId,
      fullName: form.value.fullName,
      tckn: form.value.tckn,
      sgkJobCode: form.value.sgkJobCode,
      email: form.value.email,
      phone: form.value.phone,
      salaryAmount: form.value.salaryAmount,
      employmentType: form.value.employmentType,
      startDate: form.value.startDate
    })
    
    // Validasyon - Zorunlu alanlar
    if (!form.value.companyId) {
      alert('Şirket Seçimi Zorunludur.')
      return
    }
    
    if (!form.value.startDate) {
      alert('İşe Giriş Tarihi Zorunludur.')
      return
    }
    
    if (!form.value.fullName || form.value.fullName.trim() === '') {
      alert('Adı Soyadı Zorunludur.')
      return
    }
    
    if (!form.value.tckn || form.value.tckn.trim() === '') {
      alert('TC Kimlik No Zorunludur.')
      return
    }
    
    const cleanTCKN = (form.value.tckn || '').replace(/\D/g, '')
    if (cleanTCKN.length !== 11 || !/^\d+$/.test(cleanTCKN)) {
      alert('TC Kimlik No 11 Haneli Olmalıdır.')
      return
    }
    
    if (!form.value.sgkJobCode || form.value.sgkJobCode.trim() === '') {
      alert('Görevi (SGK Meslek Kodu) Zorunludur.')
      return
    }

    if (!form.value.phone || form.value.phone.trim() === '') {
      alert('Telefon Zorunludur.')
      return
    }

    // Telefon formatı kontrolü
    const cleanPhone = (form.value.phone || '').replace(/\D/g, '')
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('0')) {
      alert('Telefon Numarası 11 Haneli ve 0 ile Başlamalıdır')
      return
    }

    saving.value = true
    
    // Default değerler - eksik alanlar için
    const employmentData = {
      type: 'GIRIS', // İşe giriş
      fullName: (form.value.fullName || '').trim().toUpperCase(),
      tckn: cleanTCKN,
      sgkJobCode: (form.value.sgkJobCode || '').trim(),
      jobName: null, // Görevi (Meslek) alanı kaldırıldı
      email: (form.value.email || '').trim() || null,
      phone: cleanPhone,
      salaryAmount: form.value.salaryAmount ? parseFloat(form.value.salaryAmount) : null,
      salaryType: companyPayrollType.value || 'NET',
      employmentType: form.value.employmentType || 'BELİRSİZ_SÜRELİ',
      startDate: form.value.startDate,
      exitDate: null, // İşe giriş için null
      companyId: form.value.companyId
    }

    console.log('Sending Data:', employmentData)

    // Yeni endpoint: POST /employment/create
    const response = await api.post('/employment/create', employmentData)
    
    if (response.data && response.data.success) {
      // Uyarılar varsa göster
      if (response.data.data && response.data.data.warnings && response.data.data.warnings.length > 0) {
        alert('Uyarılar:\n' + response.data.data.warnings.join('\n'))
      }
      // Liste sayfasına yönlendir
      await router.push('/employment/list')
    } else {
      alert('İşlem başarısız oldu')
    }
  } catch (error) {
    console.error('İşe giriş hatası:', error)
    console.error('Error response:', error.response?.data)
    console.error('Error status:', error.response?.status)
    
    // Daha açıklayıcı hata mesajı
    let errorMessage = 'Hata oluştu'
    
    if (error.response?.data) {
      // Backend'den gelen hata mesajı
      if (error.response.data.message) {
        errorMessage = error.response.data.message
      }
      // Eğer error field'ı varsa onu da ekle
      if (error.response.data.error) {
        errorMessage += '\n' + error.response.data.error
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    // Network hatası kontrolü
    if (!error.response) {
      errorMessage = 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.'
    }
    
    alert(errorMessage)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (isBayiAdmin.value) {
    await loadCompanies()
  } else if (authStore.user?.company) {
    form.value.companyId = authStore.user.company
    await loadWorkplaces()
    await loadCompanySettings(form.value.companyId)
  }
  
  // Tarih değişikliklerini dinle
  setTimeout(() => {
    const hireDateInput = document.querySelector('input[type="date"]')
    if (hireDateInput) {
      hireDateInput.addEventListener('change', checkWarnings)
    }
  }, 100)
})
</script>

