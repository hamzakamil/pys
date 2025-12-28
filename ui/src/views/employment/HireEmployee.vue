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
              v-model="form.candidateFullName"
              @blur="formatFullName"
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
              v-model="form.tcKimlik"
              @input="formatTCKimlik"
              type="text"
              maxlength="11"
              placeholder="11 Haneli TC Kimlik No"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p v-if="form.tcKimlik && form.tcKimlik.replace(/\D/g, '').length !== 11" class="mt-1 text-xs text-red-600">
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
              v-model="form.position"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Görevi (Mesleği) Giriniz"
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

          <!-- Telefon (Opsiyonel) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              v-model="form.phone"
              @input="formatPhone"
              type="text"
              maxlength="15"
              placeholder="0 555 555 55 55"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              v-model="form.contractType"
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
              v-model="form.hireDate"
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
  candidateFullName: '', // Ad Soyad tek alan olarak
  tcKimlik: '',
  position: '',
  email: '',
  phone: '',
  workplaceId: '',
  sectionId: '',
  salaryAmount: '',
  contractType: 'BELİRSİZ_SÜRELİ',
  hireDate: ''
})

const companyPayrollType = ref(null)

const formatTCKimlik = (event) => {
  let value = event.target.value.replace(/\D/g, '')
  if (value.length > 11) value = value.substring(0, 11)
  form.value.tcKimlik = value
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

// Ad Soyad'ı büyük harfe çevir
const formatFullName = () => {
  if (form.value.candidateFullName) {
    form.value.candidateFullName = form.value.candidateFullName.trim().toUpperCase()
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
  
  if (!form.value.hireDate || !form.value.companyId) {
    return
  }
  
  try {
    // Backend'den uyarıları al
    const response = await api.post('/employment/validate-hire-date', {
      hireDate: form.value.hireDate,
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
  // Ad Soyad'ı büyük harfe çevir
  if (form.value.candidateFullName) {
    form.value.candidateFullName = form.value.candidateFullName.trim().toUpperCase()
  }
  
  // Validasyon - Zorunlu alanlar
  if (!form.value.companyId) {
    alert('Şirket Seçimi Zorunludur.')
    return
  }
  
  if (!form.value.hireDate) {
    alert('İşe Giriş Tarihi Zorunludur.')
    return
  }
  
  if (!form.value.candidateFullName) {
    alert('Adı Soyadı Zorunludur.')
    return
  }
  
  if (!form.value.tcKimlik) {
    alert('TC Kimlik No Zorunludur.')
    return
  }
  
  if (form.value.tcKimlik.replace(/\D/g, '').length !== 11) {
    alert('TC Kimlik No 11 Haneli Olmalıdır.')
    return
  }
  
  if (!form.value.position) {
    alert('Görevi (SGK Meslek Kodu) Zorunludur.')
    return
  }
  
  // İşyeri kontrolü - Sadece birden fazla işyeri varsa zorunlu
  if (workplaces.value.length > 1 && !form.value.workplaceId) {
    alert('Birden Fazla İşyeri Bulundu. Lütfen Seçim Yapınız.')
    return
  }

  saving.value = true
  try {
    // İşe giriş ön-kaydı oluştur (Employee oluşturulmayacak)
    const MINIMUM_WAGE = 17002.00
    const finalUcret = form.value.salaryAmount ? parseFloat(form.value.salaryAmount) : MINIMUM_WAGE
    
    const employmentData = {
      candidateFullName: form.value.candidateFullName.trim().toUpperCase(), // Büyük harfe çevir
      tcKimlikNo: form.value.tcKimlik.replace(/\D/g, ''),
      email: form.value.email || null,
      phone: form.value.phone || null,
      companyId: form.value.companyId,
      workplaceId: form.value.workplaceId || null, // Opsiyonel - backend otomatik atayacak
      sectionId: form.value.sectionId || null,
      departmentId: null, // İleride eklenebilir
      hireDate: form.value.hireDate,
      sgkMeslekKodu: form.value.position,
      ucret: finalUcret,
      contractType: form.value.contractType || 'BELİRSİZ_SÜRELİ'
    }

    const response = await api.post('/employment/hire', employmentData)
    
    if (response.data.success) {
      // Uyarılar varsa göster
      if (response.data.data.warnings && response.data.data.warnings.length > 0) {
        alert('Uyarılar:\n' + response.data.data.warnings.join('\n'))
      }
      // Liste sayfasına yönlendir
      await router.push('/employment/list')
    }
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
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

