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
          @change="handleYearChange"
          class="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="year in availableYears" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
      </div>

      <!-- Loading States -->
      <div v-if="loading || loadingGoogleHolidays" class="text-center py-8">
        <p class="text-gray-500">Yükleniyor...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        <p class="font-medium">Hata:</p>
        <p>{{ error }}</p>
      </div>

      <!-- Takvim Görünümü -->
      <div v-else>
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
                ? day.isGoogleHoliday
                  ? 'bg-purple-100 border-purple-300 text-purple-800 font-semibold cursor-not-allowed'
                  : day.isCompanyHoliday
                  ? 'bg-red-100 border-red-300 text-red-800 font-semibold'
                  : day.isWeekend
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50'
                : 'bg-gray-50 text-gray-400',
              day.isToday ? 'ring-2 ring-blue-500' : ''
            ]"
            :title="day.isGoogleHoliday ? day.googleHolidayName : (day.isCompanyHoliday ? 'Şirket Tatili' : '')"
          >
            <div class="text-sm">{{ day.day }}</div>
            <div v-if="day.isGoogleHoliday" class="text-xs mt-1">🇹🇷</div>
            <div v-else-if="day.isCompanyHoliday" class="text-xs mt-1">🎉</div>
          </div>
        </div>

        <!-- Kaydet Butonu -->
        <div class="mt-6 flex justify-end">
          <button
            @click="saveHolidays"
            :disabled="saving"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? 'Kaydediliyor...' : 'Şirket Tatillerini Kaydet' }}
          </button>
        </div>

        <!-- Google Resmi Tatiller Listesi -->
        <div v-if="googleHolidays.length > 0" class="mt-8 pt-6 border-t border-gray-200">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Türkiye Resmi Tatilleri (Google Calendar)</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="holiday in googleHolidays"
              :key="holiday.id"
              class="bg-purple-50 p-4 rounded-lg shadow-sm flex items-center justify-between"
            >
              <div>
                <p class="text-sm font-medium text-purple-800">{{ formatDate(holiday.date) }}</p>
                <p class="text-md text-purple-900">{{ holiday.name }}</p>
              </div>
              <span class="text-purple-600 text-xl">🇹🇷</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import axios from 'axios' // Import axios for Google API

const authStore = useAuthStore()
const selectedYear = ref(new Date().getFullYear())
const companyHolidays = ref([]) // Renamed from holidays to avoid conflict
const googleHolidays = ref([])
const loading = ref(true)
const loadingGoogleHolidays = ref(false)
const saving = ref(false)
const error = ref(null)

const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
})

const allHolidays = computed(() => {
  const combined = [
    ...companyHolidays.value.map(date => ({ date, type: 'company' })),
    ...googleHolidays.value.map(h => ({ date: h.date, type: 'google', name: h.name }))
  ]
  return new Map(combined.map(item => [item.date, item]))
})

const calendarDays = computed(() => {
  const year = selectedYear.value
  const month = new Date().getMonth() // Şu anki ay (ileride ay seçimi eklenebilir)
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1) // Pazartesi'den başla

  const days = []
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Pazar veya Cumartesi
    
    const holidayInfo = allHolidays.value.get(dateStr)
    const isCompanyHoliday = holidayInfo?.type === 'company'
    const isGoogleHoliday = holidayInfo?.type === 'google'
    const googleHolidayName = holidayInfo?.name || ''

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
      isCompanyHoliday,
      isGoogleHoliday,
      googleHolidayName,
      isToday
    })
  }

  return days
})

const loadGoogleHolidays = async () => {
  try {
    loadingGoogleHolidays.value = true

    const apiKey = import.meta.env.VITE_GOOGLE_API_HOLIDAY_KEY

    if (!apiKey) {
      console.warn('Google API anahtarı bulunamadı. Resmi tatiller çekilemeyecek.')
      return
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/turkish__tr%40holiday.calendar.google.com/events?key=${apiKey}&timeMin=${selectedYear.value}-01-01T00:00:00Z&timeMax=${selectedYear.value}-12-31T23:59:59Z`

    const response = await axios.get(url)

    if (response.data && response.data.items) {
      const holidayList = response.data.items
        .filter(item => item.summary && item.start && item.start.date)
        .map(item => ({
          id: item.id,
          name: item.summary,
          date: item.start.date
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      googleHolidays.value = holidayList
    } else {
      console.warn('Google Calendar tatil verileri bulunamadı.')
    }
  } catch (err) {
    console.error('Google Calendar tatilleri yüklenemedi:', err)
    // Hata durumunda kullanıcıya gösterilecek genel bir mesaj ayarla
    error.value = 'Resmi tatiller yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
  } finally {
    loadingGoogleHolidays.value = false
  }
}

const loadCompanyHolidays = async () => {
  if (!authStore.user?.company) {
    error.value = 'Şirket bilgisi bulunamadı. Şirket tatilleri yüklenemiyor.'
    return
  }

  try {
    loading.value = true
    error.value = null
    const response = await api.get(`/company-holidays/${authStore.user.company}/${selectedYear.value}`)

    if (response.data.holidays) {
      companyHolidays.value = response.data.holidays.map(h => new Date(h).toISOString().split('T')[0])
    } else {
      companyHolidays.value = []
    }
  } catch (err) {
    console.error('Şirket tatilleri yüklenemedi:', err)
    error.value = 'Şirket tatilleri yüklenirken bir hata oluştu.'
  } finally {
    loading.value = false
  }
}

const toggleHoliday = (dateStr) => {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  
  // Google tatilleri değiştirilemez
  if (allHolidays.value.get(dateStr)?.type === 'google') {
    return
  }

  // Pazar her zaman tatil, değiştirilemez (şirket tatili olarak)
  if (dayOfWeek === 0) {
    return
  }

  const index = companyHolidays.value.indexOf(dateStr)
  if (index > -1) {
    companyHolidays.value.splice(index, 1)
  } else {
    companyHolidays.value.push(dateStr)
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
      holidays: companyHolidays.value
    })
    alert('Şirket Tatilleri Başarıyla Kaydedildi')
  } catch (err) {
    console.error('Şirket tatilleri kaydedilemedi:', err)
    alert(err.response?.data?.message || 'Hata Oluştu')
  } finally {
    saving.value = false
  }
}

const handleYearChange = () => {
  loadCompanyHolidays()
  loadGoogleHolidays()
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString + 'T00:00:00') // Ensure UTC to avoid timezone issues
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

onMounted(() => {
  handleYearChange() // Initial load for both company and Google holidays
})
</script>

<style scoped>
</style>
