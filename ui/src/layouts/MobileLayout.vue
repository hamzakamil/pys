<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <img 
            v-if="companyInfo.companyLogo" 
            :src="companyInfo.companyLogo" 
            alt="Logo" 
            class="h-8 object-contain"
            @error="handleLogoError"
          />
          <h1 class="text-lg font-bold text-gray-800 uppercase">
            {{ companyInfo.companyName || 'Personel Yönetim' }}
          </h1>
        </div>
        <button 
          @click="showNotifications = !showNotifications"
          class="relative p-2"
        >
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span 
            v-if="unreadCount > 0"
            class="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </button>
      </div>
    </header>

    <!-- Notifications Dropdown -->
    <div 
      v-if="showNotifications"
      class="absolute top-16 right-4 w-80 bg-white rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto"
    >
      <div class="p-4 border-b">
        <h3 class="font-semibold">Bildirimler</h3>
      </div>
      <div v-if="notifications.length === 0" class="p-4 text-center text-gray-500">
        Bildirim yok
      </div>
      <div v-else>
        <div 
          v-for="notif in notifications" 
          :key="notif._id"
          class="p-4 border-b hover:bg-gray-50 cursor-pointer"
          :class="{ 'bg-blue-50': !notif.isRead }"
          @click="markAsRead(notif._id)"
        >
          <p class="text-sm font-medium">{{ notif.message }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ formatDate(notif.createdAt) }}</p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="px-4 py-4">
      <slot />
    </main>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div class="flex justify-around items-center h-16">
        <router-link 
          to="/mobile" 
          class="flex flex-col items-center justify-center flex-1 h-full"
          active-class="text-blue-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span class="text-xs mt-1">Ana Sayfa</span>
        </router-link>
        <router-link 
          to="/mobile/leaves" 
          class="flex flex-col items-center justify-center flex-1 h-full"
          active-class="text-blue-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="text-xs mt-1">İzinler</span>
        </router-link>
        <router-link 
          to="/mobile/attendance" 
          class="flex flex-col items-center justify-center flex-1 h-full"
          active-class="text-blue-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs mt-1">Geçmiş</span>
        </router-link>
        <router-link 
          to="/mobile/profile" 
          class="flex flex-col items-center justify-center flex-1 h-full"
          active-class="text-blue-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="text-xs mt-1">Profil</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const authStore = useAuthStore()
const companyInfo = ref({
  companyName: null,
  companyLogo: null
})
const notifications = ref([])
const showNotifications = ref(false)
const unreadCount = ref(0)

const loadCompanyInfo = async () => {
  try {
    const response = await api.get('/auth/me/company-info')
    if (response.data.success) {
      companyInfo.value.companyName = response.data.companyName
      companyInfo.value.companyLogo = response.data.companyLogo
    }
  } catch (error) {
    console.error('Şirket bilgisi alınamadı:', error)
  }
}

const loadNotifications = async () => {
  try {
    const response = await api.get('/notifications?limit=10')
    if (response.data.success) {
      notifications.value = response.data.data
    }
    
    const countResponse = await api.get('/notifications/unread-count')
    if (countResponse.data.success) {
      unreadCount.value = countResponse.data.count
    }
  } catch (error) {
    console.error('Bildirimler yüklenemedi:', error)
  }
}

const markAsRead = async (id) => {
  try {
    await api.patch(`/notifications/${id}/read`)
    await loadNotifications()
  } catch (error) {
    console.error('Bildirim okunamadı:', error)
  }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('tr-TR', { 
    day: 'numeric', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const handleLogoError = (event) => {
  event.target.style.display = 'none'
}

onMounted(async () => {
  await loadCompanyInfo()
  await loadNotifications()
  
  // Her 30 saniyede bir bildirimleri yenile
  setInterval(loadNotifications, 30000)
})
</script>

<style scoped>
.router-link-active {
  color: #2563eb;
}
</style>


