<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Onay Bekleyen İzin Talepleri</h1>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-8">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>

    <!-- Error -->
    <div v-if="store.error && !store.loading" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {{ store.error }}
    </div>

    <!-- Requests List -->
    <div v-if="!store.loading" class="space-y-4">
      <div
        v-for="request in store.pendingRequests"
        :key="request._id"
        class="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-400"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-lg font-semibold text-gray-800">
                {{ request.employee?.firstName }} {{ request.employee?.lastName }}
              </h3>
              <span class="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Onay Bekleniyor
              </span>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
              <div>
                <span class="font-medium">İzin Türü:</span>
                <p>{{ request.leaveSubType?.name || request.companyLeaveType?.name || request.type }}</p>
              </div>
              <div>
                <span class="font-medium">Başlangıç:</span>
                <p>{{ formatDate(request.startDate) }}</p>
              </div>
              <div>
                <span class="font-medium">Bitiş:</span>
                <p>{{ formatDate(request.endDate) }}</p>
              </div>
              <div>
                <span class="font-medium">Süre:</span>
                <p>{{ request.totalDays }} {{ request.isHourly ? 'saat' : 'gün' }}</p>
              </div>
            </div>

            <div v-if="request.description" class="mb-3">
              <span class="font-medium text-gray-700">Açıklama:</span>
              <p class="text-gray-600 text-sm mt-1">{{ request.description }}</p>
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

          <div class="flex gap-2 ml-4">
            <Button variant="primary" @click="handleApprove(request)">Onayla</Button>
            <Button variant="danger" @click="openRejectModal(request)">Reddet</Button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="store.pendingRequests.length === 0 && !store.loading" class="text-center py-12 bg-white rounded-lg shadow">
        <p class="text-gray-500">Onay bekleyen izin talebi bulunmamaktadır.</p>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">İzin Talebini Reddet</h2>
        <form @submit.prevent="handleReject">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Red Nedeni *</label>
              <textarea
                v-model="rejectNote"
                required
                rows="4"
                placeholder="Red nedeni zorunludur..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              ></textarea>
            </div>
            <div class="flex gap-2 justify-end">
              <Button type="button" variant="secondary" @click="closeRejectModal">İptal</Button>
              <Button type="submit" variant="danger" :disabled="!rejectNote.trim() || saving">
                {{ saving ? 'Reddediliyor...' : 'Reddet' }}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useLeaveRequestsStore } from '@/stores/leaveRequests'
import Button from '@/components/Button.vue'

const store = useLeaveRequestsStore()
const showRejectModal = ref(false)
const rejectNote = ref('')
const selectedRequest = ref(null)
const saving = ref(false)

const handleApprove = async (request) => {
  if (!confirm('Bu izin talebini onaylamak istediğinize emin misiniz?')) {
    return
  }

  saving.value = true
  try {
    const result = await store.approveRequest(request._id)
    if (result.success) {
      alert('İzin talebi onaylandı')
    } else {
      alert(result.error || 'İzin talebi onaylanamadı')
    }
  } catch (error) {
    alert('Hata oluştu')
  } finally {
    saving.value = false
  }
}

const openRejectModal = (request) => {
  selectedRequest.value = request
  rejectNote.value = ''
  showRejectModal.value = true
}

const closeRejectModal = () => {
  showRejectModal.value = false
  rejectNote.value = ''
  selectedRequest.value = null
}

const handleReject = async () => {
  if (!rejectNote.value.trim()) {
    alert('Red nedeni zorunludur')
    return
  }

  saving.value = true
  try {
    const result = await store.rejectRequest(selectedRequest.value._id, rejectNote.value)
    if (result.success) {
      closeRejectModal()
      alert('İzin talebi reddedildi')
    } else {
      alert(result.error || 'İzin talebi reddedilemedi')
    }
  } catch (error) {
    alert('Hata oluştu')
  } finally {
    saving.value = false
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

const getStatusTextClass = (status) => {
  const classes = {
    'PENDING': 'text-gray-600',
    'IN_PROGRESS': 'text-yellow-600',
    'APPROVED': 'text-green-600',
    'REJECTED': 'text-red-600'
  }
  return classes[status] || 'text-gray-600'
}

onMounted(async () => {
  await store.fetchPendingRequests()
})
</script>

