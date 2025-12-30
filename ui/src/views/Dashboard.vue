<template>
  <div>
    <!-- Company Admin Dashboard -->
    <div v-if="isCompanyAdmin">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <!-- Özet Kartlar -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Bugün Giriş Yapanlar -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Bugün Giriş Yapanlar</h3>
              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ summary.todayCheckIns || 0 }}</p>
            <button
              @click="$router.push('/attendance-calendar')"
              class="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Listeye Git →
            </button>
          </div>
        </div>

        <!-- Geç Kalanlar -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Geç Kalanlar</h3>
              <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ summary.lateCount || 0 }}</p>
            <button
              @click="$router.push('/attendance-calendar')"
              class="text-sm text-orange-600 hover:text-orange-800 font-medium"
            >
              Detay →
            </button>
          </div>
        </div>

        <!-- İzinli Olan Çalışanlar -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">İzinli Olan Çalışanlar</h3>
              <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ summary.onLeaveCount || 0 }}</p>
            <button
              @click="$router.push('/leave-requests')"
              class="text-sm text-green-600 hover:text-green-800 font-medium"
            >
              İzin Listesine Git →
            </button>
          </div>
        </div>

        <!-- Bekleyen Talepler -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-red-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Bekleyen Talepler</h3>
              <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ summary.pendingRequestsCount || 0 }}</p>
            <button
              @click="scrollToQuickApprove"
              class="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Hemen İncele →
            </button>
          </div>
        </div>
      </div>

      <!-- Hızlı Onay Paneli -->
      <div ref="quickApproveSection" class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-800">Hızlı Onay</h2>
          <button
            @click="loadPendingRequests"
            class="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Yenile
          </button>
        </div>

        <div v-if="loading" class="text-center py-8">
          <p class="text-gray-500">Yükleniyor...</p>
        </div>

        <div v-else-if="pendingRequests.length === 0" class="text-center py-8">
          <p class="text-gray-500">Bekleyen talep bulunmamaktadır.</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="request in pendingRequests"
            :key="request.id"
            class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span
                    :class="{
                      'bg-blue-100 text-blue-800': request.type === 'leave_request',
                      'bg-green-100 text-green-800': request.type === 'hire_request',
                      'bg-red-100 text-red-800': request.type === 'termination_request'
                    }"
                    class="px-2 py-1 text-xs font-semibold rounded"
                  >
                    {{ getRequestTypeLabel(request.type) }}
                  </span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ request.title }}</h3>
                <p class="text-sm text-gray-600 mb-2">{{ request.subtitle }}</p>
                <p class="text-xs text-gray-500">
                  {{ new Date(request.date).toLocaleDateString('tr-TR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) }}
                </p>
              </div>
              <div class="flex gap-2 ml-4">
                <button
                  @click="approveRequest(request)"
                  :disabled="processingRequests.has(request.id)"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {{ processingRequests.has(request.id) ? 'İşleniyor...' : 'Onayla' }}
                </button>
                <button
                  @click="showRejectModal(request)"
                  :disabled="processingRequests.has(request.id)"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Reddet
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reddetme Modal -->
      <div v-if="showRejectDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 class="text-xl font-bold mb-4">Talebi Reddet</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Reddetme Nedeni <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="rejectReason"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Reddetme nedenini açıklayınız..."
                required
              ></textarea>
            </div>
            <div class="flex gap-2 justify-end">
              <button
                @click="showRejectDialog = false; selectedRequest = null; rejectReason = ''"
                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                @click="rejectRequest"
                :disabled="!rejectReason || rejectReason.trim() === ''"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reddet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bayi Admin Dashboard -->
    <div v-else-if="isBayiAdmin">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <!-- Özet Kartlar -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Toplam Şirket -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Toplam Şirket</h3>
              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ bayiSummary.totalCompanies || 0 }}</p>
            <button
              @click="$router.push('/companies')"
              class="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Şirketlere Git →
            </button>
          </div>
        </div>

        <!-- Bekleyen İşlemler -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Bekleyen İşlemler</h3>
              <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ bayiSummary.pendingEmploymentRecords || 0 }}</p>
            <button
              @click="$router.push('/employment/list')"
              class="text-sm text-orange-600 hover:text-orange-800 font-medium"
            >
              İşlemlere Git →
            </button>
          </div>
        </div>

        <!-- Bugün Giriş Yapanlar -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Bugün Giriş Yapanlar</h3>
              <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ bayiSummary.todayCheckIns || 0 }}</p>
            <button
              @click="$router.push('/attendance-calendar')"
              class="text-sm text-green-600 hover:text-green-800 font-medium"
            >
              Puantaj Takvimi →
            </button>
          </div>
        </div>

        <!-- Toplam Çalışan -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-purple-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Toplam Çalışan</h3>
              <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ bayiSummary.totalEmployees || 0 }}</p>
            <button
              @click="$router.push('/employees')"
              class="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Çalışanlara Git →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Employee Dashboard -->
    <div v-else-if="isEmployee">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      <CheckInButton />

      <!-- Özet Kartlar -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Bugün Giriş Durumu -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Bugün Giriş</h3>
              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-2xl font-bold mb-2" :class="employeeSummary.hasCheckedIn ? 'text-green-600' : 'text-red-600'">
              {{ employeeSummary.hasCheckedIn ? 'Yapıldı' : 'Yapılmadı' }}
            </p>
            <p class="text-xs text-gray-500">Giriş durumu</p>
          </div>
        </div>

        <!-- Kalan İzin Günü -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Kalan İzin Günü</h3>
              <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ employeeSummary.remainingDays || 0 }}</p>
            <button
              @click="$router.push('/leave-balances')"
              class="text-sm text-green-600 hover:text-green-800 font-medium"
            >
              İzin Bakiyem →
            </button>
          </div>
        </div>

        <!-- Bekleyen İzin Talepleri -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Bekleyen Talepler</h3>
              <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ employeeSummary.pendingLeaveRequests || 0 }}</p>
            <button
              @click="$router.push('/my-leaves')"
              class="text-sm text-orange-600 hover:text-orange-800 font-medium"
            >
              İzin Taleplerim →
            </button>
          </div>
        </div>

        <!-- Yaklaşan İzinler -->
        <div class="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-20 h-20 bg-purple-100 rounded-full -mr-10 -mt-10"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-600">Yaklaşan İzinler</h3>
              <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900 mb-4">{{ employeeSummary.upcomingLeaves || 0 }}</p>
            <button
              @click="$router.push('/my-leaves')"
              class="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Detayları Gör →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Diğer Roller -->
    <div v-else>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Hoş Geldiniz</h3>
        <p class="text-gray-600">{{ user?.email }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import CheckInButton from '@/components/CheckInButton.vue'
import api from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()
const user = computed(() => authStore.user)
const isEmployee = computed(() => authStore.user?.role === 'employee')
const isCompanyAdmin = computed(() => authStore.user?.role === 'company_admin')
const isBayiAdmin = computed(() => authStore.user?.role === 'bayi_admin')

const summary = ref({
  todayCheckIns: 0,
  lateCount: 0,
  onLeaveCount: 0,
  pendingRequestsCount: 0
})

const employeeSummary = ref({
  hasCheckedIn: false,
  remainingDays: 0,
  pendingLeaveRequests: 0,
  upcomingLeaves: 0
})

const bayiSummary = ref({
  totalCompanies: 0,
  pendingEmploymentRecords: 0,
  todayCheckIns: 0,
  totalEmployees: 0
})

const pendingRequests = ref([])
const loading = ref(false)
const processingRequests = ref(new Set())
const showRejectDialog = ref(false)
const selectedRequest = ref(null)
const rejectReason = ref('')
const quickApproveSection = ref(null)

let refreshInterval = null

const loadSummary = async () => {
  if (isCompanyAdmin.value) {
    try {
      const response = await api.get('/dashboard/company-admin/summary')
      if (response.data && response.data.success) {
        summary.value = response.data.data
      }
    } catch (error) {
      console.error('Özet yükleme hatası:', error)
    }
  } else if (isEmployee.value) {
    try {
      const response = await api.get('/dashboard/employee/summary')
      if (response.data && response.data.success) {
        employeeSummary.value = response.data.data
      }
    } catch (error) {
      console.error('Çalışan özet yükleme hatası:', error)
    }
  } else if (isBayiAdmin.value) {
    try {
      const response = await api.get('/dashboard/bayi-admin/summary')
      if (response.data && response.data.success) {
        bayiSummary.value = response.data.data
      }
    } catch (error) {
      console.error('Bayi admin özet yükleme hatası:', error)
    }
  }
}

const loadPendingRequests = async () => {
  if (!isCompanyAdmin.value) return
  
  loading.value = true
  try {
    const response = await api.get('/requests/pending')
    if (response.data && response.data.success) {
      pendingRequests.value = response.data.data
    }
  } catch (error) {
    console.error('Bekleyen talepler yükleme hatası:', error)
    alert('Bekleyen talepler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const approveRequest = async (request) => {
  if (!confirm('Bu talebi onaylamak istediğinize emin misiniz?')) {
    return
  }

  processingRequests.value.add(request.id)
  try {
    await api.post(`/requests/${request.id}/approve`, {
      type: request.type
    })
    
    alert('Talep onaylandı')
    
    // Realtime güncelleme
    await loadPendingRequests()
    await loadSummary()
  } catch (error) {
    console.error('Onay hatası:', error)
    alert(error.response?.data?.message || 'Onay işlemi başarısız oldu')
  } finally {
    processingRequests.value.delete(request.id)
  }
}

const showRejectModal = (request) => {
  selectedRequest.value = request
  rejectReason.value = ''
  showRejectDialog.value = true
}

const rejectRequest = async () => {
  if (!selectedRequest.value || !rejectReason.value.trim()) {
    alert('Lütfen reddetme nedenini giriniz')
    return
  }

  processingRequests.value.add(selectedRequest.value.id)
  try {
    await api.post(`/requests/${selectedRequest.value.id}/reject`, {
      type: selectedRequest.value.type,
      reason: rejectReason.value
    })
    
    alert('Talep reddedildi')
    showRejectDialog.value = false
    selectedRequest.value = null
    rejectReason.value = ''
    
    // Realtime güncelleme
    await loadPendingRequests()
    await loadSummary()
  } catch (error) {
    console.error('Reddetme hatası:', error)
    alert(error.response?.data?.message || 'Reddetme işlemi başarısız oldu')
  } finally {
    processingRequests.value.delete(selectedRequest.value?.id)
  }
}

const getRequestTypeLabel = (type) => {
  const labels = {
    'leave_request': 'İzin Talebi',
    'hire_request': 'İşe Giriş',
    'termination_request': 'İşten Çıkış'
  }
  return labels[type] || type
}

const scrollToQuickApprove = () => {
  if (quickApproveSection.value) {
    quickApproveSection.value.scrollIntoView({ behavior: 'smooth' })
  }
}

onMounted(async () => {
  await loadSummary()
  
  if (isCompanyAdmin.value) {
    await loadPendingRequests()
    
    // Her 30 saniyede bir otomatik yenile
    refreshInterval = setInterval(async () => {
      await loadSummary()
      await loadPendingRequests()
    }, 30000)
  } else {
    // Employee ve bayi admin için sadece summary yenile
    refreshInterval = setInterval(async () => {
      await loadSummary()
    }, 30000)
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
