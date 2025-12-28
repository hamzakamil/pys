<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">İşe Giriş ve Çıkış İşlem Kayıtları</h1>
      <div class="flex gap-2">
        <button
          @click="$router.push('/employment/hire')"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + İşe Giriş İşlemi Başlat
        </button>
        <button
          @click="$router.push('/employment/terminate')"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          - İşten Çıkış İşlemi Başlat
        </button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              İşlem Tipi
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Aday / Çalışan
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ücret
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sözleşme Tipi
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Statü
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Onaya Gönderilme
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Onaylanma / Red
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="record in preRecords" :key="record._id">
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="record.processType === 'hire' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                {{ record.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">
                {{ record.processType === 'hire' ? record.candidateFullName : (record.employeeId?.firstName + ' ' + record.employeeId?.lastName) }}
              </div>
              <div class="text-sm text-gray-500">
                {{ record.processType === 'hire' ? `TC: ${record.tcKimlikNo}` : (record.employeeId?.employeeNumber ? `#${record.employeeId.employeeNumber}` : '') }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div v-if="record.processType === 'hire'" class="text-sm text-gray-900">
                {{ formatCurrency(record.ucret) }}
              </div>
              <div v-else class="text-sm text-gray-500">—</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div v-if="record.processType === 'hire'" class="text-sm text-gray-900">
                {{ getContractTypeLabel(record.contractType) }}
              </div>
              <div v-else class="text-sm text-gray-500">—</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getStatusClass(record.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                {{ getStatusLabel(record.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDateTime(record.pendingDate || record.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <div v-if="record.status === 'APPROVED'">
                {{ formatDateTime(record.approvedAt) }}
              </div>
              <div v-else-if="record.status === 'REJECTED'" class="text-red-600">
                {{ formatDateTime(record.rejectedAt) }}
                <div class="text-xs text-gray-500 mt-1">{{ record.rejectionReason }}</div>
              </div>
              <div v-else>—</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex gap-2">
                <button
                  v-if="['PENDING_COMPANY_APPROVAL', 'PENDING_DEALER_APPROVAL'].includes(record.status) && canApprove"
                  @click="approveRecord(record._id)"
                  class="text-green-600 hover:text-green-900"
                >
                  Onayla
                </button>
                <button
                  v-if="['PENDING_COMPANY_APPROVAL', 'PENDING_DEALER_APPROVAL'].includes(record.status) && canReject"
                  @click="showRejectModal(record)"
                  class="text-red-600 hover:text-red-900"
                >
                  Reddet
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="preRecords.length === 0" class="text-center py-12">
        <p class="text-gray-500">Henüz işe giriş/çıkış işlem kaydı bulunmamaktadır.</p>
      </div>
    </div>

    <!-- Reddetme Modal -->
    <div v-if="showRejectDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">İşlemi Reddet</h2>
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
              @click="showRejectDialog = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              @click="submitReject"
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const authStore = useAuthStore()
const preRecords = ref([])
const showRejectDialog = ref(false)
const rejectReason = ref('')
const selectedRecord = ref(null)

const canApprove = computed(() => {
  const role = authStore.user?.role
  return ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'].includes(role)
})

const canReject = computed(() => {
  const role = authStore.user?.role
  return ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'].includes(role)
})

const formatCurrency = (amount) => {
  if (!amount) return '0,00'
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' TL'
}

const formatDateTime = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

const getContractTypeLabel = (type) => {
  const labels = {
    'BELİRSİZ_SÜRELİ': 'Belirsiz Süreli',
    'BELİRLİ_SÜRELİ': 'Belirli Süreli',
    'KISMİ_SÜRELİ': 'Kısmi Süreli'
  }
  return labels[type] || type
}

const getStatusLabel = (status) => {
  const labels = {
    'PENDING_COMPANY_APPROVAL': 'Şirket Onayı Bekliyor',
    'PENDING_DEALER_APPROVAL': 'Bayi Onayı Bekliyor',
    'APPROVED': 'Onaylandı',
    'REJECTED': 'Reddedildi'
  }
  return labels[status] || status
}

const getStatusClass = (status) => {
  const classes = {
    'PENDING_COMPANY_APPROVAL': 'bg-yellow-100 text-yellow-800',
    'PENDING_DEALER_APPROVAL': 'bg-orange-100 text-orange-800',
    'APPROVED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const loadPreRecords = async () => {
  try {
    const response = await api.get('/employment')
    preRecords.value = response.data.data || []
  } catch (error) {
    console.error('İşlem kayıtları yüklenemedi:', error)
    alert('İşlem kayıtları yüklenemedi')
  }
}

const approveRecord = async (id) => {
  if (!confirm('Bu işlemi onaylamak istediğinize emin misiniz?')) {
    return
  }
  try {
    await api.post(`/employment/${id}/approve`)
    alert('İşlem onaylandı')
    await loadPreRecords()
  } catch (error) {
    console.error('Onay hatası:', error)
    alert(error.response?.data?.message || 'Onay işlemi başarısız oldu')
  }
}

const showRejectModal = (record) => {
  selectedRecord.value = record
  rejectReason.value = ''
  showRejectDialog.value = true
}

const submitReject = async () => {
  if (!rejectReason.value || rejectReason.value.trim() === '') {
    alert('Lütfen reddetme nedenini giriniz')
    return
  }
  try {
    await api.post(`/employment/${selectedRecord.value._id}/reject`, {
      reason: rejectReason.value
    })
    alert('İşlem reddedildi')
    showRejectDialog.value = false
    await loadPreRecords()
  } catch (error) {
    console.error('Reddetme hatası:', error)
    alert(error.response?.data?.message || 'Reddetme işlemi başarısız oldu')
  }
}

onMounted(() => {
  loadPreRecords()
})
</script>

