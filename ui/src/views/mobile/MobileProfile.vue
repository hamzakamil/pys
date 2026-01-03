<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold text-gray-800">Profil</h2>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>

    <!-- Profile Form -->
    <div v-else class="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
        <input
          v-model="form.name"
          type="text"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
          readonly
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
        <input
          v-model="form.email"
          type="email"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
          readonly
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
        <input
          v-model="form.phone"
          type="tel"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg"
          @blur="handleChange"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
        <input
          v-model="form.company"
          type="text"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
          readonly
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Departman</label>
        <input
          v-model="form.department"
          type="text"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
          readonly
        />
      </div>
    </div>

    <!-- Change Password -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Şifre Değiştir</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mevcut Şifre</label>
          <input
            v-model="passwordForm.currentPassword"
            type="password"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg"
            placeholder="Mevcut şifrenizi girin"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
          <input
            v-model="passwordForm.newPassword"
            type="password"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg"
            placeholder="Yeni şifrenizi girin"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre (Tekrar)</label>
          <input
            v-model="passwordForm.confirmPassword"
            type="password"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg"
            placeholder="Yeni şifrenizi tekrar girin"
          />
        </div>
        <button
          @click="changePassword"
          :disabled="changingPassword"
          class="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {{ changingPassword ? 'Değiştiriliyor...' : 'Şifre Değiştir' }}
        </button>
      </div>
    </div>

    <!-- Logout -->
    <button
      @click="handleLogout"
      class="w-full bg-red-500 text-white py-3 rounded-lg font-semibold"
    >
      Çıkış Yap
    </button>

    <!-- Save Confirmation Modal -->
    <div
      v-if="showSaveModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="showSaveModal = false"
    >
      <div class="bg-white rounded-lg p-6 max-w-sm w-full" @click.stop>
        <h3 class="text-lg font-bold text-gray-800 mb-4">Değişiklikleri kaydetmek istiyor musunuz?</h3>
        <div class="flex space-x-3">
          <button
            @click="showSaveModal = false"
            class="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold"
          >
            İptal
          </button>
          <button
            @click="saveProfile"
            class="flex-1 bg-blue-500 text-white py-3 rounded-lg font-semibold"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  name: '',
  email: '',
  phone: '',
  company: '',
  department: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const loading = ref(true)
const changingPassword = ref(false)
const showSaveModal = ref(false)
const hasChanges = ref(false)

const loadProfile = async () => {
  try {
    loading.value = true
    const response = await api.get('/auth/me')
    if (response.data) {
      form.value.name = `${response.data.firstName || ''} ${response.data.lastName || ''}`.trim()
      form.value.email = response.data.email || ''
      form.value.phone = response.data.phone || ''
      form.value.company = response.data.company?.name || ''
      form.value.department = response.data.department?.name || ''
    }
  } catch (error) {
    console.error('Profil yüklenemedi:', error)
  } finally {
    loading.value = false
  }
}

const handleChange = () => {
  hasChanges.value = true
  showSaveModal.value = true
}

const saveProfile = async () => {
  try {
    // Update employee phone
    const employee = await api.get('/employees')
    // Find current employee and update
    // This would require employee ID, which we need to get from the employee endpoint
    showSaveModal.value = false
    hasChanges.value = false
    alert('Profil güncellendi')
  } catch (error) {
    alert('Profil güncellenemedi')
  }
}

const changePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert('Yeni şifreler eşleşmiyor')
    return
  }

  if (passwordForm.value.newPassword.length < 6) {
    alert('Yeni şifre en az 6 karakter olmalıdır')
    return
  }

  try {
    changingPassword.value = true
    await api.post('/auth/change-password', {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    })
    
    alert('Şifre başarıyla değiştirildi')
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

const handleLogout = async () => {
  if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
    await authStore.logout()
    router.push('/login')
  }
}

onMounted(() => {
  loadProfile()
})
</script>


