<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Ayarlar</h1>
    
    <!-- Şifre Değiştirme Modal (İlk girişte zorunlu) -->
    <div v-if="showPasswordChangeModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Şifre Değiştirme Zorunlu</h2>
        <p class="text-sm text-gray-600 mb-4">İlk girişinizde şifrenizi değiştirmeniz gerekmektedir.</p>
        <form @submit.prevent="changePassword">
          <div class="space-y-4">
            <Input
              v-model="passwordForm.newPassword"
              type="password"
              label="Yeni Şifre"
              required
              minlength="6"
            />
            <Input
              v-model="passwordForm.confirmPassword"
              type="password"
              label="Yeni Şifre Tekrar"
              required
            />
            <div v-if="passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" class="text-sm text-red-600">
              Şifreler eşleşmiyor
            </div>
            <div class="flex gap-2 justify-end">
              <Button type="submit" :disabled="passwordForm.newPassword !== passwordForm.confirmPassword || passwordForm.newPassword.length < 6">
                Şifreyi Değiştir
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6 max-w-2xl">
      <form @submit.prevent="saveSettings" @input="hasChanges = true">
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
            <Input v-model="form.title" placeholder="Şirket başlığı" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <div v-if="form.logo" class="mt-4">
              <img :src="form.logo" alt="Logo" class="h-20 object-contain" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Aktif Puantaj Şablonu</label>
            <select
              v-model="form.activeAttendanceTemplate"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              @change="saveTemplateSetting"
            >
              <option value="">Şablon Seçiniz</option>
              <option
                v-for="template in attendanceTemplates"
                :key="template._id"
                :value="template._id"
              >
                {{ template.name }} {{ template.isDefault ? '(Varsayılan)' : '' }}
              </option>
            </select>
          </div>

          <!-- Şifre Değiştirme -->
          <div class="border-t pt-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Şifre Değiştirme</h2>
            <form @submit.prevent="changePassword" class="space-y-4">
              <div v-if="authStore.user?.mustChangePassword" class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                <p class="text-sm">İlk giriş yapıyorsunuz. Lütfen şifrenizi belirleyin.</p>
              </div>
              <div v-if="!authStore.user?.mustChangePassword">
                <Input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  label="Mevcut Şifre"
                  required
                />
              </div>
              <Input
                v-model="passwordForm.newPassword"
                type="password"
                label="Yeni Şifre"
                required
                minlength="6"
              />
              <Input
                v-model="passwordForm.confirmPassword"
                type="password"
                label="Yeni Şifre Tekrar"
                required
              />
              <div v-if="passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" class="text-sm text-red-600">
                Şifreler eşleşmiyor
              </div>
              <div class="flex justify-end">
                <Button type="submit" :disabled="passwordForm.newPassword !== passwordForm.confirmPassword || passwordForm.newPassword.length < 6 || changingPassword">
                  {{ changingPassword ? 'Değiştiriliyor...' : 'Şifreyi Değiştir' }}
                </Button>
              </div>
            </form>
          </div>

          <!-- Check-In Settings -->
          <div class="border-t pt-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">İşe Giriş/Çıkış Ayarları</h2>
            <div class="space-y-4">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  v-model="form.checkInSettings.enabled"
                  class="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700">İşe giriş/çıkış butonlarını kullan</span>
              </label>

              <div v-if="form.checkInSettings.enabled" class="space-y-4 pl-6 border-l-2 border-gray-200">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    v-model="form.checkInSettings.locationRequired"
                    class="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">Lokasyon kontrolü gerekli</span>
                </label>

                <div v-if="form.checkInSettings.locationRequired">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Şirket Lokasyonu</label>
                  <div class="grid grid-cols-2 gap-4">
                    <Input
                      v-model.number="form.checkInSettings.allowedLocation.latitude"
                      type="number"
                      step="0.000001"
                      placeholder="Enlem (Latitude)"
                      label="Enlem"
                    />
                    <Input
                      v-model.number="form.checkInSettings.allowedLocation.longitude"
                      type="number"
                      step="0.000001"
                      placeholder="Boylam (Longitude)"
                      label="Boylam"
                    />
                  </div>
                  <div class="mt-2">
                    <Input
                      v-model.number="form.checkInSettings.allowedLocation.radius"
                      type="number"
                      placeholder="Yarıçap (metre)"
                      label="İzin Verilen Yarıçap (metre)"
                    />
                    <p class="text-xs text-gray-500 mt-1">Çalışanlar bu yarıçap içinde olmalıdır</p>
                  </div>
                  <div class="mt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      @click="getCurrentLocation"
                      :disabled="gettingLocation"
                    >
                      {{ gettingLocation ? 'Konum alınıyor...' : 'Mevcut Konumu Kullan' }}
                    </Button>
                  </div>
                </div>

                <label class="flex items-center">
                  <input
                    type="checkbox"
                    v-model="form.checkInSettings.autoCheckIn"
                    class="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">Otomatik giriş/çıkış (mesai saatlerine göre)</span>
                </label>
                <p class="text-xs text-gray-500 pl-6">
                  İzinli veya tatil gününde değilse, belirlenen mesai saatlerinde otomatik olarak geldi/gitti olarak kaydedilir
                </p>
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <Button type="submit" :disabled="loading">{{ loading ? 'Kaydediliyor...' : 'Kaydet' }}</Button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

const authStore = useAuthStore()
const form = ref({
  title: '',
  logo: '',
  activeAttendanceTemplate: '',
  checkInSettings: {
    enabled: false,
    locationRequired: true,
    allowedLocation: {
      latitude: null,
      longitude: null,
      radius: 100
    },
    autoCheckIn: false
  }
})
const file = ref(null)
const loading = ref(false)
const gettingLocation = ref(false)
const attendanceTemplates = ref([])
const showPasswordChangeModal = ref(false)
const changingPassword = ref(false)
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const loadSettings = async () => {
  try {
    const response = await api.get('/settings')
    form.value.title = response.data.title || ''
    form.value.logo = response.data.logo ? `http://localhost:3000${response.data.logo}` : ''
    
    // Load check-in settings
    if (response.data.checkInSettings) {
      form.value.checkInSettings = {
        enabled: response.data.checkInSettings.enabled || false,
        locationRequired: response.data.checkInSettings.locationRequired !== false,
        allowedLocation: response.data.checkInSettings.allowedLocation || {
          latitude: null,
          longitude: null,
          radius: 100
        },
        autoCheckIn: response.data.checkInSettings.autoCheckIn || false
      }
    }
    
    // Load company to get active template
    if (authStore.user?.company) {
      const companyResponse = await api.get(`/companies/${authStore.user.company}`)
      form.value.activeAttendanceTemplate = companyResponse.data.activeAttendanceTemplate?._id || ''
    }
    
    // Load templates
    const templatesResponse = await api.get('/attendance-templates')
    attendanceTemplates.value = templatesResponse.data
    
    hasChanges.value = false
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error)
  }
}

const saveTemplateSetting = async () => {
  try {
    if (authStore.user?.company) {
      await api.put(`/companies/${authStore.user.company}/attendance-template`, {
        templateId: form.value.activeAttendanceTemplate || null
      })
    }
  } catch (error) {
    console.error('Şablon ayarı kaydedilemedi:', error)
    alert(error.response?.data?.message || 'Hata oluştu')
  }
}

const handleFileChange = (event) => {
  file.value = event.target.files[0]
  if (file.value) {
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.logo = e.target.result
    }
    reader.readAsDataURL(file.value)
  }
}

const getCurrentLocation = () => {
  gettingLocation.value = true
  if (!navigator.geolocation) {
    alert('Tarayıcınız konum özelliğini desteklemiyor')
    gettingLocation.value = false
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.value.checkInSettings.allowedLocation.latitude = position.coords.latitude
      form.value.checkInSettings.allowedLocation.longitude = position.coords.longitude
      gettingLocation.value = false
    },
    (error) => {
      alert('Konum alınamadı: ' + error.message)
      gettingLocation.value = false
    }
  )
}

const saveSettings = async () => {
  if (!confirm('Değişiklikleri kaydetmek istiyor musunuz?')) {
    return
  }

  loading.value = true
  try {
    const formData = new FormData()
    formData.append('title', form.value.title)
    if (file.value) {
      formData.append('logo', file.value)
    }
    formData.append('checkInSettings', JSON.stringify(form.value.checkInSettings))

    await api.put('/settings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    alert('Ayarlar kaydedildi')
    hasChanges.value = false
    loadSettings()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  } finally {
    loading.value = false
  }
}

const changePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert('Şifreler eşleşmiyor')
    return
  }

  if (passwordForm.value.newPassword.length < 6) {
    alert('Şifre en az 6 karakter olmalıdır')
    return
  }

  changingPassword.value = true
  try {
    await api.post('/auth/change-password', {
      currentPassword: passwordForm.value.currentPassword || undefined,
      newPassword: passwordForm.value.newPassword
    })

    alert('Şifre başarıyla değiştirildi')
    
    // İlk giriş şifre değiştirme ise modal'ı kapat ve kullanıcıyı güncelle
    if (authStore.user?.mustChangePassword) {
      showPasswordChangeModal.value = false
      // Kullanıcı bilgilerini yeniden yükle
      const meResponse = await api.get('/auth/me')
      authStore.setUser(meResponse.data)
    }
    
    // Formu temizle
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    alert(error.response?.data?.message || 'Şifre değiştirilemedi')
  } finally {
    changingPassword.value = false
  }
}

const route = useRoute()

// Warn before leaving page with unsaved changes
const beforeUnload = (e) => {
  if (hasChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  loadSettings()
  
  // İlk girişte şifre değiştirme zorunlu ise modal'ı göster
  if (route.query.changePassword === 'true' || authStore.user?.mustChangePassword) {
    showPasswordChangeModal.value = true
  }
  
  window.addEventListener('beforeunload', beforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>

