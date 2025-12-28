<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">İşten Çıkış İşlemi</h1>

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
              @change="loadEmployees"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seçiniz</option>
              <option v-for="comp in companies" :key="comp._id" :value="comp._id">
                {{ comp.name }}
              </option>
            </select>
          </div>

          <!-- Çalışan Seçimi (Personeller içinden) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Çalışan (Personeller) <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.employeeId"
              @change="loadEmployment"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              :disabled="!form.companyId && isBayiAdmin"
            >
              <option value="">Seçiniz</option>
              <option v-for="emp in employees" :key="emp._id" :value="emp._id">
                {{ emp.firstName }} {{ emp.lastName }} {{ emp.employeeNumber ? `(${emp.employeeNumber})` : '' }}
              </option>
            </select>
            <p v-if="!form.employeeId" class="mt-1 text-xs text-gray-500">
              Personeller Listesinden Çalışan Seçiniz
            </p>
          </div>

          <!-- Çıkış Tarihi -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Çıkış Tarihi <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.terminationDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <!-- Çıkış Nedeni -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Çıkış Nedeni <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.terminationReason"
              @change="handleReasonChange"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seçiniz</option>
              <option value="istifa">İstifa</option>
              <option value="işten çıkarma">İşten Çıkarma</option>
            </select>
          </div>

          <!-- İstifa Dilekçesi (Opsiyonel) -->
          <div v-if="form.terminationReason === 'istifa'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              İstifa Dilekçesi Yükleyiniz (Opsiyonel)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              @change="handleResignationFileChange"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500">
              Kendi El Yazısıyla Yazdığı Dilekçenin Fotoğrafını Yükleyiniz.
            </p>
          </div>

          <!-- İşten Çıkarma Hesaplama -->
          <div v-if="form.terminationReason === 'işten çıkarma' && employment">
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-gray-800 mb-3">Kıdem ve İhbar Tazminatı Hesaplama</h3>
              
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">İşe Giriş:</span>
                  <span class="font-medium">{{ formatDate(employment.hireDate) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Çıkış Tarihi:</span>
                  <span class="font-medium">{{ form.terminationDate ? formatDate(form.terminationDate) : '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Brüt Maaş:</span>
                  <span class="font-medium">{{ employment.salaryAmount }} TL ({{ employment.salaryType }})</span>
                </div>
              </div>

              <button
                type="button"
                @click="calculateSeverance"
                class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Hesapla
              </button>

              <!-- Hesaplama Sonuçları -->
              <div v-if="calculation" class="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                <h4 class="text-sm font-semibold text-gray-800 mb-2">Hesaplama Sonuçları:</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Çalışma Süresi:</span>
                    <span class="font-medium">{{ calculation.yearsWorked }} yıl</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Kıdem Tazminatı:</span>
                    <span class="font-medium">{{ calculation.severancePay.toLocaleString('tr-TR') }} TL</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">İhbar Süresi:</span>
                    <span class="font-medium">{{ calculation.noticeWeeks }} hafta</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">İhbar Tazminatı:</span>
                    <span class="font-medium">{{ calculation.noticePay.toLocaleString('tr-TR') }} TL</span>
                  </div>
                  <div class="flex justify-between pt-2 border-t border-gray-200">
                    <span class="text-gray-800 font-semibold">TOPLAM:</span>
                    <span class="font-bold text-blue-600">{{ calculation.total.toLocaleString('tr-TR') }} TL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Uyarılar -->
          <div v-if="warnings.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p class="text-sm font-semibold text-yellow-800 mb-2">Uyarılar:</p>
            <ul class="list-disc list-inside text-sm text-yellow-700 space-y-1">
              <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
            </ul>
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
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const authStore = useAuthStore()
const companies = ref([])
const employees = ref([])
const employment = ref(null)
const calculation = ref(null)
const warnings = ref([])
const saving = ref(false)
const file = ref(null)
const resignationFile = ref(null) // İstifa dilekçesi dosyası

const isBayiAdmin = computed(() => authStore.user?.role === 'bayi_admin')

const form = ref({
  companyId: '',
  employeeId: '',
  terminationDate: '',
  terminationReason: ''
})

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const loadEmployees = async () => {
  if (!form.value.companyId) {
    employees.value = []
    return
  }
  try {
    const response = await api.get('/employees', {
      params: { company: form.value.companyId }
    })
    // Sadece aktif çalışanları göster
    employees.value = (response.data || []).filter(emp => emp.status === 'active')
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
  }
}

const loadEmployment = async () => {
  if (!form.value.employeeId) {
    employment.value = null
    return
  }
  try {
    const response = await api.get(`/employment/${form.value.employeeId}`)
    const employments = response.data.data || []
    // Aktif employment kaydını bul
    employment.value = employments.find(e => e.status === 'aktif') || null
  } catch (error) {
    console.error('İşe giriş kaydı yüklenemedi:', error)
  }
}

const handleReasonChange = () => {
  calculation.value = null
  file.value = null
  resignationFile.value = null
}

const handleFileChange = (event) => {
  file.value = event.target.files[0]
}

const handleResignationFileChange = (event) => {
  resignationFile.value = event.target.files[0]
}

const calculateSeverance = async () => {
  if (!employment.value || !form.value.terminationDate) {
    alert('Çıkış tarihi seçilmelidir')
    return
  }
  
  try {
    // Basit hesaplama (gerçekte backend'den gelecek)
    const hire = new Date(employment.value.hireDate)
    const termination = new Date(form.value.terminationDate)
    const yearsWorked = (termination - hire) / (1000 * 60 * 60 * 24 * 365.25)
    
    const grossSalary = employment.value.salaryType === 'brüt' 
      ? employment.value.salaryAmount 
      : employment.value.salaryAmount * 1.2
    
    let noticeWeeks = 0
    if (yearsWorked < 0.5) noticeWeeks = 2
    else if (yearsWorked < 1) noticeWeeks = 4
    else if (yearsWorked < 3) noticeWeeks = 6
    else noticeWeeks = 8
    
    calculation.value = {
      yearsWorked: yearsWorked.toFixed(2),
      severancePay: Math.floor(yearsWorked) * (grossSalary * 30),
      noticeWeeks,
      noticePay: noticeWeeks * (grossSalary / 30 * 7)
    }
    
    calculation.value.total = calculation.value.severancePay + calculation.value.noticePay
  } catch (error) {
    console.error('Hesaplama hatası:', error)
  }
}

const checkWarnings = () => {
  warnings.value = []
  
  if (!form.value.terminationDate) {
    return
  }
  
  const now = new Date()
  const termination = new Date(form.value.terminationDate)
  const diffDays = Math.floor((now - termination) / (1000 * 60 * 60 * 24))
  
  if (diffDays > 10) {
    warnings.value.push('CEZA UYARISI: 10 günlük geriye dönük limit aşıldı.')
  }
  
  const hour = now.getHours()
  if (hour >= 13 && diffDays > 0) {
    warnings.value.push('CEZA UYARISI: Ek süre aşımı.')
  }
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const formData = new FormData()
    formData.append('employeeId', form.value.employeeId)
    formData.append('companyId', form.value.companyId)
    formData.append('terminationDate', form.value.terminationDate)
    formData.append('terminationReason', form.value.terminationReason)
    
    // İstifa dilekçesi (opsiyonel)
    if (form.value.terminationReason === 'istifa' && resignationFile.value) {
      formData.append('resignationPhoto', resignationFile.value)
    }
    
    const response = await api.post('/employment/terminate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    if (response.data.success) {
      alert('İşten Çıkış Kaydı Başarıyla Oluşturuldu Ve Onaya Gönderildi')
      if (response.data.data.warnings && response.data.data.warnings.length > 0) {
        alert('Uyarılar:\n' + response.data.data.warnings.join('\n'))
      }
      window.location.href = '/employment/list'
    }
  } catch (error) {
    alert(error.response?.data?.message || 'Hata Oluştu')
  } finally {
    saving.value = false
  }
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR')
}

onMounted(async () => {
  if (isBayiAdmin.value) {
    await loadCompanies()
  } else if (authStore.user?.company) {
    form.value.companyId = authStore.user.company
    await loadEmployees()
  }
  
  // Tarih değişikliklerini dinle
  const terminationDateInput = document.querySelector('input[type="date"]')
  if (terminationDateInput) {
    terminationDateInput.addEventListener('change', checkWarnings)
  }
})
</script>

