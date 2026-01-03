<template>
  <div class="space-y-6">
    <!-- Employee Info Card -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="text-center">
        <h2 class="text-xl font-bold text-gray-800 mb-2">
          {{ employeeName }}
        </h2>
        <p class="text-gray-600 text-sm">{{ employeeNumber }}</p>
      </div>
    </div>

    <!-- Today Info Card -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="text-center mb-4">
        <p class="text-sm text-gray-600 mb-1">Bugün</p>
        <p class="text-lg font-semibold text-gray-800">{{ todayDate }}</p>
      </div>
      <div v-if="workingHours" class="text-center">
        <p class="text-sm text-gray-600">Mesai: {{ workingHours.start }} - {{ workingHours.end }}</p>
      </div>
    </div>

    <!-- Check In/Out Buttons -->
    <div class="space-y-4">
      <!-- Check In Button -->
      <button
        v-if="!todayCheckIn?.checkInTime"
        @click="showCheckInModal = true"
        :disabled="checkingIn"
        class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-6 px-6 rounded-lg text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {{ checkingIn ? 'Giriş yapılıyor...' : 'GİRİŞ YAP' }}
      </button>

      <!-- Check Out Button -->
      <button
        v-if="todayCheckIn?.checkInTime && !todayCheckIn?.checkOutTime"
        @click="showCheckOutModal = true"
        :disabled="checkingOut"
        class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-6 px-6 rounded-lg text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {{ checkingOut ? 'Çıkış yapılıyor...' : 'ÇIKIŞ YAP' }}
      </button>

      <!-- Already Checked Out -->
      <div
        v-if="todayCheckIn?.checkOutTime"
        class="bg-gray-100 rounded-lg p-6 text-center"
      >
        <p class="text-gray-600">Bugün çıkış yaptınız</p>
      </div>
    </div>

    <!-- Today's Status -->
    <div v-if="todayCheckIn" class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Bugünkü Durum</h3>
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-gray-600">Giriş:</span>
          <span class="font-semibold">{{ formatTime(todayCheckIn.checkInTime) }}</span>
        </div>
        <div v-if="todayCheckIn.checkOutTime" class="flex justify-between">
          <span class="text-gray-600">Çıkış:</span>
          <span class="font-semibold">{{ formatTime(todayCheckIn.checkOutTime) }}</span>
        </div>
        <div v-else class="flex justify-between">
          <span class="text-gray-600">Çıkış:</span>
          <span class="text-gray-400">—</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Geç giriş:</span>
          <span :class="todayCheckIn.isLateCheckIn ? 'text-red-600' : 'text-green-600'">
            {{ todayCheckIn.isLateCheckIn ? 'Evet' : 'Hayır' }}
          </span>
        </div>
        <div v-if="todayCheckIn.workingHours" class="flex justify-between">
          <span class="text-gray-600">Çalışma süresi:</span>
          <span class="font-semibold">{{ todayCheckIn.workingHours.toFixed(2) }} saat</span>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-4">
      <router-link to="/mobile/leaves/balance" class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-600 mb-1">Kalan İzin</p>
        <p class="text-2xl font-bold text-blue-600">{{ leaveBalance?.remainingAnnualLeaveDays || 0 }}</p>
        <p class="text-xs text-gray-500 mt-1">gün</p>
      </router-link>
      <router-link to="/mobile/leaves" class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-600 mb-1">Bekleyen</p>
        <p class="text-2xl font-bold text-yellow-600">{{ pendingLeaves || 0 }}</p>
        <p class="text-xs text-gray-500 mt-1">talep</p>
      </router-link>
    </div>

    <!-- Check In Modal -->
    <CheckConfirmModal
      v-if="showCheckInModal"
      type="check-in"
      @confirm="handleCheckIn"
      @cancel="showCheckInModal = false"
    />

    <!-- Check Out Modal -->
    <CheckConfirmModal
      v-if="showCheckOutModal"
      type="check-out"
      @confirm="handleCheckOut"
      @cancel="showCheckOutModal = false"
    />

    <!-- Late Check In Warning -->
    <div
      v-if="showLateWarning"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="showLateWarning = false"
    >
      <div class="bg-white rounded-lg p-6 max-w-sm w-full" @click.stop>
        <div class="text-center mb-4">
          <div class="text-4xl mb-2">⚠️</div>
          <h3 class="text-lg font-bold text-gray-800">Geç Giriş</h3>
        </div>
        <p class="text-gray-600 text-center mb-4">
          Mesai başlangıcından {{ lateMinutes }} dakika sonra giriş yaptınız.
          Bu kayıt yöneticinize bildirilecektir.
        </p>
        <button
          @click="showLateWarning = false"
          class="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold"
        >
          TAMAM
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import CheckConfirmModal from '@/components/mobile/CheckConfirmModal.vue'

const authStore = useAuthStore()
const todayCheckIn = ref(null)
const workingHours = ref(null)
const leaveBalance = ref(null)
const pendingLeaves = ref(0)
const checkingIn = ref(false)
const checkingOut = ref(false)
const showCheckInModal = ref(false)
const showCheckOutModal = ref(false)
const showLateWarning = ref(false)
const lateMinutes = ref(0)

const employeeName = computed(() => {
  return authStore.user?.name || 'Çalışan'
})

const employeeNumber = computed(() => {
  return authStore.user?.employeeNumber || ''
})

const todayDate = computed(() => {
  return new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

const loadTodayStatus = async () => {
  try {
    // History endpoint returns an array of check-ins
    const response = await api.get('/mobile/attendance-history')
    const todayStr = new Date().toISOString().slice(0, 10)
    todayCheckIn.value = response.data.find(c => c.checkInTime.startsWith(todayStr)) || null
    // TODO: Fetch working hours separately if needed
    // workingHours.value = ?
  } catch (error) {
    console.error('Durum yüklenemedi:', error)
  }
}

const loadLeaveBalance = async () => {
  try {
    const response = await api.get('/leave-balances/mobile/my-balance')
    if (response.data.success) {
      leaveBalance.value = response.data.data
    }
  } catch (error) {
    console.error('İzin bakiyesi yüklenemedi:', error)
  }
}

const loadPendingLeaves = async () => {
  try {
    const response = await api.get('/mobile/leave-requests');
    pendingLeaves.value = response.data.filter(r => r.status === 'pending').length;
  } catch (error) {
    console.error('Bekleyen izinler yüklenemedi:', error);
  }
};

const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Konum özelliği desteklenmiyor'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: `${position.coords.latitude}, ${position.coords.longitude}`
        })
      },
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

const handleCheckIn = async () => {
  try {
    checkingIn.value = true
    showCheckInModal.value = false

    const location = await getCurrentLocation();

    const response = await api.post('/mobile/check-in', {
      latitude: location.latitude,
      longitude: location.longitude,
    });
    
    await loadTodayStatus();

    // The backend doesn't send late check-in info in this simplified version.
    // This can be re-added if the mobile API is updated to provide it.
    // if (response.data.isLateCheckIn) { ... }
    
  } catch (error) {
    alert(error.response?.data?.message || 'Giriş yapılamadı');
  } finally {
    checkingIn.value = false;
  }
}

const handleCheckOut = async () => {
  try {
    checkingOut.value = true
    showCheckOutModal.value = false

    const location = await getCurrentLocation();

    await api.post('/mobile/check-out', {
      latitude: location.latitude,
      longitude: location.longitude,
    });

    await loadTodayStatus();
  } catch (error) {
    alert(error.response?.data?.message || 'Çıkış yapılamadı');
  } finally {
    checkingOut.value = false;
  }
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  await loadTodayStatus()
  await loadLeaveBalance()
  await loadPendingLeaves()
})
</script>

