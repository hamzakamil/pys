<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Resmi Tatiller</h1>

    <div class="bg-white rounded-lg shadow p-6">
      <!-- Yıl Seçimi -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Yıl Seçiniz
        </label>
        <select
          v-model="selectedYear"
          @change="loadHolidays"
          class="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="year in availableYears" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
      </div>

      <!-- Takvim Görünümü -->
      <div class="grid grid-cols-7 gap-2 mb-4">
        <div
          v-for="day in ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']"
          :key="day"
          class="text-center text-sm font-semibold text-gray-600 py-2"
        >
          {{ day }}
        </div>
      </div>

      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          @click="toggleHoliday(day.date)"
          :class="[
            'p-3 text-center cursor-pointer rounded-lg border transition-colors',
            day.isCurrentMonth
              ? day.isHoliday
                ? 'bg-red-100 border-red-300 text-red-800 font-semibold'
                : day.isWeekend
                ? 'bg-gray-100 text-gray-500'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50'
              : 'bg-gray-50 text-gray-400',
            day.isToday ? 'ring-2 ring-blue-500' : ''
          ]"
        >
          <div class="text-sm">{{ day.day }}</div>
          <div v-if="day.isHoliday" class="text-xs mt-1">🎉</div>
        </div>
      </div>

      <!-- Kaydet Butonu -->
      <div class="mt-6 flex justify-end">
        <button
          @click="saveHolidays"
          :disabled="saving"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {{ saving ? 'Kaydediliyor...' : 'Tatilleri Kaydet' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const authStore = useAuthStore()
const selectedYear = ref(new Date().getFullYear())
const holidays = ref([])
const saving = ref(false)

const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
})

const calendarDays = computed(() => {
  const year = selectedYear.value
  const month = new Date().getMonth() // Şu anki ay (ileride ay seçimi eklenebilir)
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1) // Pazartesi'den başla

  const days = []
  const holidayDates = holidays.value.map(h => new Date(h).toISOString().split('T')[0])

  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Pazar veya Cumartesi
    const isHoliday = holidayDates.includes(dateStr)
    const isCurrentMonth = date.getMonth() === month
    const today = new Date()
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()

    days.push({
      date: dateStr,
      day: date.getDate(),
      isCurrentMonth,
      isWeekend,
      isHoliday,
      isToday
    })
  }

  return days
})

const loadHolidays = async () => {
  if (!authStore.user?.company) {
    return
  }

  try {
    const response = await api.get(`/company-holidays/${authStore.user.company}/${selectedYear.value}`)
    if (response.data.holidays) {
      holidays.value = response.data.holidays.map(h => new Date(h).toISOString().split('T')[0])
    } else {
      holidays.value = []
    }
  } catch (error) {
    console.error('Tatiller yüklenemedi:', error)
    holidays.value = []
  }
}

const toggleHoliday = (dateStr) => {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  
  // Pazar her zaman tatil, değiştirilemez
  if (dayOfWeek === 0) {
    return
  }

  const index = holidays.value.indexOf(dateStr)
  if (index > -1) {
    holidays.value.splice(index, 1)
  } else {
    holidays.value.push(dateStr)
  }
}

const saveHolidays = async () => {
  if (!authStore.user?.company) {
    alert('Şirket Bilgisi Bulunamadı')
    return
  }

  saving.value = true
  try {
    await api.post('/company-holidays', {
      companyId: authStore.user.company,
      year: selectedYear.value,
      holidays: holidays.value
    })
    alert('Tatiller Başarıyla Kaydedildi')
  } catch (error) {
    alert(error.response?.data?.message || 'Hata Oluştu')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadHolidays()
})
</script>



