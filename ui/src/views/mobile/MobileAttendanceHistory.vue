<template>
  <div class="space-y-4">
    <h2 class="text-xl font-bold text-gray-800 mb-4">Giriş/Çıkış Geçmişi</h2>

    <!-- Month Selector -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex justify-between items-center">
        <button
          @click="changeMonth(-1)"
          class="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 class="text-lg font-semibold text-gray-800">
          {{ currentMonthText }}
        </h3>
        <button
          @click="changeMonth(1)"
          class="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="checkIns.length === 0" class="text-center py-8">
      <p class="text-gray-500">Bu ay için kayıt bulunamadı</p>
    </div>

    <!-- Check In List -->
    <div v-else class="space-y-3">
      <div
        v-for="checkIn in checkIns"
        :key="checkIn._id"
        class="bg-white rounded-lg shadow p-4"
      >
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="font-semibold text-gray-800">
              {{ formatDate(checkIn.date) }}
            </p>
          </div>
          <span
            class="px-2 py-1 text-xs rounded-full"
            :class="{
              'bg-green-100 text-green-800': !checkIn.isLateCheckIn && !checkIn.isEarlyCheckOut,
              'bg-yellow-100 text-yellow-800': checkIn.isLateCheckIn || checkIn.isEarlyCheckOut
            }"
          >
            {{ getStatusText(checkIn) }}
          </span>
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Giriş:</span>
            <span class="font-semibold">{{ formatTime(checkIn.checkInTime) }}</span>
          </div>
          <div v-if="checkIn.checkOutTime" class="flex justify-between">
            <span class="text-gray-600">Çıkış:</span>
            <span class="font-semibold">{{ formatTime(checkIn.checkOutTime) }}</span>
          </div>
          <div v-if="checkIn.workingHours" class="flex justify-between">
            <span class="text-gray-600">Çalışma Süresi:</span>
            <span class="font-semibold">{{ checkIn.workingHours.toFixed(2) }} saat</span>
          </div>
          <div v-if="checkIn.isLateCheckIn" class="text-yellow-600 text-xs">
            ⚠️ Geç Giriş
          </div>
          <div v-if="checkIn.isEarlyCheckOut" class="text-yellow-600 text-xs">
            ⚠️ Erken Çıkış
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const checkIns = ref([])
const loading = ref(true)
const currentMonth = ref(new Date())

const currentMonthText = computed(() => {
  return currentMonth.value.toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric'
  })
})

const loadCheckIns = async () => {
  try {
    loading.value = true
    const startDate = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
    const endDate = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0)
    
    const response = await api.get(`/check-ins/mobile/my-checkins?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
    if (response.data.success) {
      checkIns.value = response.data.data
    }
  } catch (error) {
    console.error('Giriş/çıkış kayıtları yüklenemedi:', error)
  } finally {
    loading.value = false
  }
}

const changeMonth = (direction) => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + direction,
    1
  )
  loadCheckIns()
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'numeric'
  })
}

const formatTime = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

const getStatusText = (checkIn) => {
  if (checkIn.isLateCheckIn || checkIn.isEarlyCheckOut) {
    return 'Uyarı'
  }
  return 'Normal'
}

onMounted(() => {
  loadCheckIns()
})
</script>


