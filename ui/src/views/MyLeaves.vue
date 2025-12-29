<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">İzin Taleplerim</h1>
      <Button @click="showModal = true">Yeni İzin Talebi</Button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-8">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>

    <!-- Error -->
    <div v-if="store.error && !store.loading" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {{ store.error }}
    </div>

    <!-- Son Aldığı İzinler (Onaylanmış) -->
    <div v-if="!store.loading && approvedLeaves.length > 0" class="mb-8">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Son Aldığım İzinler</h2>
      <div class="space-y-4">
        <div
          v-for="request in approvedLeaves"
          :key="request._id"
          class="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-400"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-gray-800">
                  {{ request.leaveSubType?.name || request.companyLeaveType?.name || request.type }}
                </h3>
                <span class="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Onaylandı
                </span>
              </div>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                <div>
                  <span class="font-medium">Başlangıç:</span>
                  <p>{{ formatDate(request.startDate) }}</p>
                  <p v-if="request.startTime" class="text-xs">{{ request.startTime }}</p>
                </div>
                <div>
                  <span class="font-medium">Bitiş:</span>
                  <p>{{ formatDate(request.endDate) }}</p>
                  <p v-if="request.endTime" class="text-xs">{{ request.endTime }}</p>
                </div>
                <div>
                  <span class="font-medium">Süre:</span>
                  <p>{{ request.totalDays }} {{ request.isHourly ? 'saat' : 'gün' }}</p>
                </div>
                <div>
                  <span class="font-medium">Onay Tarihi:</span>
                  <p>{{ formatDate(request.updatedAt) }}</p>
                </div>
              </div>

              <div v-if="request.description" class="mb-3">
                <span class="font-medium text-gray-700">Açıklama:</span>
                <p class="text-gray-600 text-sm mt-1">{{ request.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tüm İzin Talepleri -->
    <div v-if="!store.loading">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Tüm İzin Taleplerim</h2>
      
      <!-- Empty State -->
      <div v-if="store.myRequests.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
        <p class="text-gray-500">Henüz izin talebiniz bulunmamaktadır.</p>
      </div>
      
      <!-- Requests List -->
      <div v-else class="space-y-4">
        <div
          v-for="request in store.myRequests"
          :key="request._id"
          class="bg-white rounded-lg shadow p-6 border-l-4"
          :class="getStatusBorderClass(request.status)"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-gray-800">
                  {{ request.leaveSubType?.name || request.companyLeaveType?.name || request.type }}
                </h3>
                <span
                  class="px-3 py-1 rounded-full text-xs font-medium"
                  :class="getStatusClass(request.status)"
                >
                  {{ getStatusText(request.status) }}
                </span>
              </div>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                <div>
                  <span class="font-medium">Başlangıç:</span>
                  <p>{{ formatDate(request.startDate) }}</p>
                  <p v-if="request.startTime" class="text-xs">{{ request.startTime }}</p>
                </div>
                <div>
                  <span class="font-medium">Bitiş:</span>
                  <p>{{ formatDate(request.endDate) }}</p>
                  <p v-if="request.endTime" class="text-xs">{{ request.endTime }}</p>
                </div>
                <div>
                  <span class="font-medium">Süre:</span>
                  <p>{{ request.totalDays }} {{ request.isHourly ? 'saat' : 'gün' }}</p>
                </div>
                <div>
                  <span class="font-medium">Oluşturulma:</span>
                  <p>{{ formatDate(request.createdAt) }}</p>
                </div>
              </div>

              <div v-if="request.description" class="mb-3">
                <span class="font-medium text-gray-700">Açıklama:</span>
                <p class="text-gray-600 text-sm mt-1">{{ request.description }}</p>
              </div>

              <!-- Current Approver -->
              <div v-if="request.currentApprover && request.status === 'IN_PROGRESS'" class="mb-3">
                <p class="text-sm text-yellow-600">
                  <span class="font-medium">Onay Bekleniyor:</span>
                  {{ request.currentApprover?.firstName }} {{ request.currentApprover?.lastName }}
                </p>
              </div>

              <!-- Rejection Reason -->
              <div v-if="request.status === 'REJECTED' && request.rejectReason" class="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <p class="text-sm text-red-700">
                  <span class="font-medium">Red Nedeni:</span>
                  "{{ request.rejectReason }}"
                </p>
              </div>

              <!-- History -->
              <div v-if="request.history && request.history.length > 0" class="mt-4 pt-4 border-t">
                <p class="text-sm font-medium text-gray-700 mb-2">Onay Geçmişi:</p>
                <div class="space-y-2">
                  <div
                    v-for="(item, index) in request.history"
                    :key="index"
                    class="text-xs text-gray-600 flex items-center gap-2"
                  >
                    <span class="font-medium">{{ item.approver?.firstName }} {{ item.approver?.lastName }}:</span>
                    <span :class="getStatusTextClass(item.status)">{{ getStatusText(item.status) }}</span>
                    <span class="text-gray-400">•</span>
                    <span>{{ formatDate(item.date) }}</span>
                    <span v-if="item.note" class="text-gray-500 italic">- {{ item.note }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Request Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">Yeni İzin Talebi</h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">İzin Türü *</label>
              <select
                v-model="form.companyLeaveType"
                @change="handleLeaveTypeChange"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option v-for="type in leaveTypes" :key="type._id" :value="type._id">
                  {{ type.name }}
                </option>
              </select>
            </div>
            
            <!-- Alt izin türü (Diğer kategorisi için) -->
            <div v-if="selectedLeaveType?.isOtherCategory && filteredSubTypes.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1">Alt İzin Türü *</label>
              <select
                v-model="form.leaveSubType"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option v-for="subType in filteredSubTypes" :key="subType._id" :value="subType._id">
                  {{ subType.name }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi *</label>
                <input
                  v-model="form.startDate"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi *</label>
                <input
                  v-model="form.endDate"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                v-model="form.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <div class="flex gap-2 justify-end">
              <Button type="button" variant="secondary" @click="closeModal">İptal</Button>
              <Button type="submit" :disabled="saving">
                {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLeaveRequestsStore } from '@/stores/leaveRequests'
import api from '@/services/api'
import Button from '@/components/Button.vue'

const store = useLeaveRequestsStore()
const showModal = ref(false)
const saving = ref(false)
const leaveTypes = ref([])
const leaveSubTypes = ref([])

// Onaylanmış izinleri ayrı göster
const approvedLeaves = computed(() => {
  return store.myRequests
    .filter(req => req.status === 'APPROVED')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5) // Son 5 onaylanmış izin
})

const form = ref({
  companyLeaveType: '',
  leaveSubType: '',
  startDate: '',
  endDate: '',
  description: ''
})

const selectedLeaveType = computed(() => {
  return leaveTypes.value.find(t => t._id === form.value.companyLeaveType)
})

const filteredSubTypes = computed(() => {
  if (!selectedLeaveType.value?.isOtherCategory) {
    return []
  }
  return leaveSubTypes.value.filter(st => 
    st.parentLeaveType && 
    st.parentLeaveType.toString() === selectedLeaveType.value._id.toString()
  )
})

const loadLeaveTypes = async () => {
  try {
    const response = await api.get('/leave-types')
    if (response.data.success) {
      leaveTypes.value = response.data.data || []
    }
  } catch (error) {
    console.error('İzin türleri yüklenemedi:', error)
  }
}

const loadLeaveSubTypes = async () => {
  try {
    const params = {}
    if (selectedLeaveType.value?.isOtherCategory && selectedLeaveType.value._id) {
      params.parentLeaveType = selectedLeaveType.value._id
    }
    const response = await api.get('/leave-types/sub-types', { params })
    if (response.data.success) {
      leaveSubTypes.value = response.data.data || []
    }
  } catch (error) {
    console.error('Alt izin türleri yüklenemedi:', error)
  }
}

const handleLeaveTypeChange = async () => {
  // Diğer kategorisi değilse alt izin türünü temizle
  if (!selectedLeaveType.value?.isOtherCategory) {
    form.value.leaveSubType = ''
    leaveSubTypes.value = []
  } else {
    // Diğer kategorisi seçildiyse alt izin türlerini yükle
    await loadLeaveSubTypes()
  }
}

const handleSubmit = async () => {
  // Diğer kategorisi seçildiyse alt izin türü zorunlu
  if (selectedLeaveType.value?.isOtherCategory && !form.value.leaveSubType) {
    alert('Alt izin türü seçilmelidir')
    return
  }

  saving.value = true
  try {
    const formData = new FormData()
    formData.append('companyLeaveType', form.value.companyLeaveType)
    if (form.value.leaveSubType) {
      formData.append('leaveSubType', form.value.leaveSubType)
    }
    formData.append('startDate', form.value.startDate)
    formData.append('endDate', form.value.endDate)
    if (form.value.description) {
      formData.append('description', form.value.description)
    }

    const result = await store.createRequest(formData)
    if (result.success) {
      closeModal()
    } else {
      alert(result.error || 'İzin talebi oluşturulamadı')
    }
  } catch (error) {
    alert('Hata oluştu')
  } finally {
    saving.value = false
  }
}

const closeModal = () => {
  showModal.value = false
  form.value = {
    companyLeaveType: '',
    leaveSubType: '',
    startDate: '',
    endDate: '',
    description: ''
  }
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR')
}

const getStatusText = (status) => {
  const statusMap = {
    'PENDING': 'Bekleyen',
    'IN_PROGRESS': 'Onay Sürecinde',
    'APPROVED': 'Onaylandı',
    'REJECTED': 'Reddedildi'
  }
  return statusMap[status] || status
}

const getStatusClass = (status) => {
  const classes = {
    'PENDING': 'bg-gray-100 text-gray-800',
    'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
    'APPROVED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getStatusTextClass = (status) => {
  const classes = {
    'PENDING': 'text-gray-600',
    'IN_PROGRESS': 'text-yellow-600',
    'APPROVED': 'text-green-600',
    'REJECTED': 'text-red-600'
  }
  return classes[status] || 'text-gray-600'
}

const getStatusBorderClass = (status) => {
  const classes = {
    'PENDING': 'border-gray-400',
    'IN_PROGRESS': 'border-yellow-400',
    'APPROVED': 'border-green-400',
    'REJECTED': 'border-red-400'
  }
  return classes[status] || 'border-gray-400'
}

onMounted(async () => {
  await store.fetchMyRequests()
  await loadLeaveTypes()
  await loadLeaveSubTypes()
})
</script>

