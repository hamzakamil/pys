<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">İzin Taleplerim</h1>
      <Button @click="showModal = true">Yeni İzin Talebi</Button>
    </div>

    <div class="mb-4 flex gap-2">
      <select
        v-model="filterStatus"
        @change="loadRequests"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Tüm Durumlar</option>
        <option value="PENDING">Bekleyen</option>
        <option value="IN_PROGRESS">Onay Sürecinde</option>
        <option value="APPROVED">Onaylanan</option>
        <option value="REJECTED">Reddedilen</option>
        <option value="CANCELLED">İptal Edilen</option>
        <option value="CANCELLATION_REQUESTED">İptal Talebi</option>
      </select>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İzin Türü</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlangıç</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bitiş</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gün</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="request in requests" :key="request._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ request.leaveSubType?.name || request.companyLeaveType?.name || request.type }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(request.startDate) }}
              <span v-if="request.startTime"> ({{ request.startTime }})</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(request.endDate) }}
              <span v-if="request.endTime"> ({{ request.endTime }})</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ request.totalDays }} {{ request.isHourly ? 'saat' : 'gün' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="{
                  'bg-yellow-100 text-yellow-800': request.status === 'PENDING' || request.status === 'IN_PROGRESS',
                  'bg-green-100 text-green-800': request.status === 'APPROVED',
                  'bg-red-100 text-red-800': request.status === 'REJECTED',
                  'bg-gray-100 text-gray-800': request.status === 'CANCELLED',
                  'bg-orange-100 text-orange-800': request.status === 'CANCELLATION_REQUESTED'
                }"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ getStatusText(request.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                v-if="canCancel(request)"
                @click="cancelRequest(request)"
                class="text-gray-600 hover:text-gray-900 mr-4"
              >
                İptal Et
              </button>
              <button @click="viewDetails(request)" class="text-blue-600 hover:text-blue-900">Detay</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Empty State -->
      <div v-if="requests.length === 0" class="text-center py-12">
        <p class="text-gray-500">Henüz izin talebiniz bulunmamaktadır.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">Yeni İzin Talebi</h2>
        <form @submit.prevent="saveRequest">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">İzin Türü <span class="text-red-500">*</span></label>
              <select
                v-model="form.companyLeaveType"
                @change="handleLeaveTypeChange"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seçiniz</option>
                <option
                  v-for="type in leaveTypes"
                  :key="type._id"
                  :value="type._id"
                >
                  {{ type.name }}
                </option>
              </select>
            </div>
            
            <!-- Alt izin türü -->
            <div v-if="selectedLeaveType?.name === 'Diğer izinler' && filteredSubTypes.length > 0">
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
              <Input
                v-model="form.startDate"
                type="date"
                label="İzin Başlangıç Tarihi"
                required
                @input="handleStartDateChange"
              />
              <Input
                v-model="form.endDate"
                type="date"
                label="İzin Bitiş Tarihi"
                required
                :min="form.startDate"
                :max="isSameDayRequired ? form.startDate : undefined"
                :disabled="isSameDayRequired"
              />
            </div>
            
            <!-- Yarım Gün Seçeneği -->
            <div v-if="showHalfDayOption" class="flex items-center gap-4">
              <label class="flex items-center">
                <input type="checkbox" v-model="form.isHalfDay" class="mr-2" @change="handleHalfDayChange" />
                <span class="text-sm text-gray-700">Yarım Gün</span>
              </label>
              <div v-if="form.isHalfDay">
                <label class="block text-sm font-medium text-gray-700 mb-1">Yarım Gün Dönemi</label>
                <select
                  v-model="form.halfDayPeriod"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="morning">Öğleden Önce</option>
                  <option value="afternoon">Öğleden Sonra</option>
                </select>
              </div>
            </div>
            
            <!-- Saatlik İzin Seçeneği -->
            <div v-if="showHourlyOption" class="flex items-center gap-4">
              <label class="flex items-center">
                <input type="checkbox" v-model="form.isHourly" class="mr-2" @change="handleHourlyChange" />
                <span class="text-sm text-gray-700">Saatlik İzin</span>
              </label>
              <div v-if="form.isHourly" class="grid grid-cols-2 gap-4 flex-1">
                <Input
                  v-model="form.startTime"
                  type="time"
                  label="Başlangıç Saati"
                  @input="calculateHours"
                />
                <Input
                  v-model="form.endTime"
                  type="time"
                  label="Bitiş Saati"
                  @input="calculateHours"
                />
                <div v-if="calculatedHours > 0" class="col-span-2 bg-blue-50 p-3 rounded-lg">
                  <p class="text-sm text-blue-800">
                    <strong>Toplam Saat:</strong> {{ calculatedHours }} saat
                  </p>
                </div>
              </div>
            </div>
            
            <Textarea
              v-model="form.description"
              label="Açıklama"
              :required="descriptionRequired"
            />
            <div v-if="isReportLeave">
              <label class="block text-sm font-medium text-gray-700 mb-2">Rapor Dosyası</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                @change="handleFileChange"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeModal">İptal</Button>
              <Button type="submit" :disabled="saving">{{ saving ? 'Kaydediliyor...' : 'Kaydet' }}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 class="text-xl font-bold mb-4">İzin Talebi Detayları</h2>
        <div class="space-y-4" v-if="selectedRequest">
          <div>
            <strong>İzin Türü:</strong> {{ selectedRequest.leaveSubType?.name || selectedRequest.companyLeaveType?.name || selectedRequest.type }}
          </div>
          <div>
            <strong>Tarih:</strong> {{ formatDate(selectedRequest.startDate) }} - {{ formatDate(selectedRequest.endDate) }}
          </div>
          <div v-if="selectedRequest.startTime || selectedRequest.endTime">
            <strong>Saat:</strong> {{ selectedRequest.startTime }} - {{ selectedRequest.endTime }}
          </div>
          <div>
            <strong>Toplam:</strong> {{ selectedRequest.totalDays }} {{ selectedRequest.isHourly ? 'saat' : 'gün' }}
          </div>
          <div v-if="selectedRequest.description">
            <strong>Açıklama:</strong> {{ selectedRequest.description }}
          </div>
          <div v-if="selectedRequest.document">
            <strong>Rapor:</strong>
            <a :href="`http://localhost:3000${selectedRequest.document}`" target="_blank" class="text-blue-600 hover:underline ml-2">
              Dosyayı Görüntüle
            </a>
          </div>
          <div v-if="selectedRequest.status === 'REJECTED' && selectedRequest.rejectReason">
            <strong>Red Nedeni:</strong> {{ selectedRequest.rejectReason }}
          </div>
          <div v-if="selectedRequest.currentApprover && selectedRequest.status === 'IN_PROGRESS'">
            <strong>Onay Bekleniyor:</strong> {{ selectedRequest.currentApprover?.firstName }} {{ selectedRequest.currentApprover?.lastName }}
          </div>
          <div v-if="selectedRequest.history && selectedRequest.history.length > 0">
            <strong>Onay Geçmişi:</strong>
            <div class="mt-2 space-y-1">
              <div
                v-for="(item, index) in selectedRequest.history"
                :key="index"
                class="text-sm text-gray-600"
              >
                {{ item.approver?.firstName }} {{ item.approver?.lastName }}: {{ getStatusText(item.status) }} - {{ formatDate(item.date) }}
                <span v-if="item.note" class="text-gray-500 italic">({{ item.note }})</span>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <Button variant="secondary" @click="showDetailModal = false">Kapat</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'

const authStore = useAuthStore()
const requests = ref([])
const leaveTypes = ref([])
const leaveSubTypes = ref([])
const showModal = ref(false)
const showDetailModal = ref(false)
const selectedRequest = ref(null)
const filterStatus = ref('')
const saving = ref(false)
const descriptionRequired = ref(false)
const file = ref(null)
const calculatedDays = ref(0)
const calculatedHours = ref(0)
const conflictWarning = ref(null)

const form = ref({
  companyLeaveType: '',
  leaveSubType: '',
  startDate: '',
  endDate: '',
  returnDate: '',
  startTime: '',
  endTime: '',
  isHalfDay: false,
  halfDayPeriod: 'morning',
  isHourly: false,
  hours: 0,
  description: ''
})

const selectedLeaveType = computed(() => {
  return leaveTypes.value.find(lt => lt._id === form.value.companyLeaveType)
})

const filteredSubTypes = computed(() => {
  if (selectedLeaveType.value?.name === 'Diğer izinler') {
    return leaveSubTypes.value.filter(st => st.parentPermitId === selectedLeaveType.value._id)
  }
  return []
})

const showHourlyOption = computed(() => {
  return selectedLeaveType.value?.name?.toLowerCase().includes('saatlik')
})

const showHalfDayOption = computed(() => {
  return selectedLeaveType.value?.name?.toLowerCase().includes('yarım gün yıllık izin')
})

const isSameDayRequired = computed(() => {
  return form.value.isHourly || form.value.isHalfDay
})

const isReportLeave = computed(() => {
  return selectedLeaveType.value?.name?.toLowerCase().includes('rapor') || 
         selectedLeaveType.value?.name?.toLowerCase().includes('istirahat')
})

const loadLeaveTypes = async () => {
  try {
    let companyId = null
    if (authStore.user?.company) {
      companyId = authStore.user.company
    }

    if (!companyId) {
      console.error('Şirket bilgisi bulunamadı')
      return
    }

    const response = await api.get('/working-permits', {
      params: { companyId }
    })

    if (response.data.success) {
      const allPermits = response.data.data || []
      leaveTypes.value = allPermits.filter(p => !p.parentPermitId)
      leaveSubTypes.value = allPermits.filter(p => p.parentPermitId)
    }
  } catch (error) {
    console.error('İzin türleri yüklenemedi:', error)
  }
}

const loadRequests = async () => {
  try {
    const params = {}
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    const response = await api.get('/leave-requests', { params })
    requests.value = response.data
  } catch (error) {
    console.error('Talepler yüklenemedi:', error)
  }
}

const calculateDays = async () => {
  if (!form.value.startDate || !form.value.endDate) {
    calculatedDays.value = 0
    conflictWarning.value = null
    return
  }
  if (form.value.isHourly) {
    conflictWarning.value = null
    return
  }

  try {
    const employeesResponse = await api.get('/employees')
    const employee = employeesResponse.data.find(e => e.email === authStore.user.email)

    if (employee) {
      const returnDate = form.value.returnDate || form.value.endDate
      const params = {
        employeeId: employee._id,
        startDate: form.value.startDate,
        returnDate: returnDate,
        isHalfDay: form.value.isHalfDay,
        isHourly: form.value.isHourly,
        hours: form.value.hours
      }

      const response = await api.post('/leave-requests/calculate-days', params)
      calculatedDays.value = response.data.totalDays
      
      if (response.data.hasConflict && response.data.conflicts.length > 0) {
        const conflict = response.data.conflicts[0]
        conflictWarning.value = conflict.message
      } else {
        conflictWarning.value = null
      }
    } else {
      const start = new Date(form.value.startDate)
      const end = new Date(form.value.endDate)
      const diffTime = Math.abs(end - start)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (form.value.isHalfDay) {
        calculatedDays.value = 0.5
      } else {
        calculatedDays.value = diffDays
      }
      conflictWarning.value = null
    }
  } catch (error) {
    console.error('Gün hesaplanamadı:', error)
    conflictWarning.value = null
  }
}

const calculateHours = () => {
  if (!form.value.startTime || !form.value.endTime) {
    calculatedHours.value = 0
    return
  }

  const start = new Date(`2000-01-01T${form.value.startTime}`)
  const end = new Date(`2000-01-01T${form.value.endTime}`)
  const diffMs = end - start
  const diffHours = diffMs / (1000 * 60 * 60)
  
  calculatedHours.value = Math.abs(diffHours)
  form.value.hours = calculatedHours.value
}

const handleHalfDayChange = () => {
  if (form.value.isHalfDay) {
    form.value.isHourly = false
    form.value.startTime = ''
    form.value.endTime = ''
    if (form.value.startDate) {
      form.value.endDate = form.value.startDate
    }
    calculatedDays.value = 0.5
    conflictWarning.value = null
  } else {
    calculateDays()
  }
}

const handleHourlyChange = () => {
  if (form.value.isHourly) {
    form.value.isHalfDay = false
    form.value.halfDayPeriod = 'morning'
    if (form.value.startDate) {
      form.value.endDate = form.value.startDate
    }
    calculatedDays.value = 0
    conflictWarning.value = null
  } else {
    calculateDays()
  }
}

const handleStartDateChange = () => {
  if (isSameDayRequired.value && form.value.startDate) {
    form.value.endDate = form.value.startDate
  }
  calculateDays()
}

const handleLeaveTypeChange = async () => {
  checkDescriptionRequired()
  if (selectedLeaveType.value?.name !== 'Diğer izinler') {
    form.value.leaveSubType = ''
  }
  
  if (!showHourlyOption.value) {
    form.value.isHourly = false
    form.value.startTime = ''
    form.value.endTime = ''
  }
  if (!showHalfDayOption.value) {
    form.value.isHalfDay = false
    form.value.halfDayPeriod = 'morning'
  }
  
  if (isSameDayRequired.value && form.value.startDate) {
    form.value.endDate = form.value.startDate
  }
}

const checkDescriptionRequired = () => {
  const isUnpaid = selectedLeaveType.value?.name?.toLowerCase().includes('ücretsiz') || 
                   selectedLeaveType.value?.name?.toLowerCase().includes('mazeret')
  descriptionRequired.value = isUnpaid || false
}

const handleFileChange = (event) => {
  file.value = event.target.files[0]
}

const saveRequest = async () => {
  if (selectedLeaveType.value?.name === 'Diğer izinler' && !form.value.leaveSubType) {
    alert('Alt izin türü seçilmelidir')
    return
  }
  
  if ((form.value.isHourly || form.value.isHalfDay) && form.value.startDate !== form.value.endDate) {
    alert('Saatlik ve yarım gün izinler için başlangıç ve bitiş tarihi aynı gün olmalıdır')
    return
  }

  if (form.value.isHourly && (!form.value.startTime || !form.value.endTime)) {
    alert('Saatlik izin için başlangıç ve bitiş saati gereklidir')
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
    formData.append('endDate', form.value.endDate || form.value.startDate)
    if (form.value.returnDate) formData.append('returnDate', form.value.returnDate)
    formData.append('isHalfDay', form.value.isHalfDay)
    formData.append('halfDayPeriod', form.value.halfDayPeriod)
    formData.append('isHourly', form.value.isHourly)
    if (form.value.startTime) formData.append('startTime', form.value.startTime)
    if (form.value.endTime) formData.append('endTime', form.value.endTime)
    if (form.value.hours) formData.append('hours', form.value.hours)
    if (form.value.description) formData.append('description', form.value.description)
    if (file.value) formData.append('document', file.value)

    await api.post('/leave-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    closeModal()
    loadRequests()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  } finally {
    saving.value = false
  }
}

const viewDetails = (request) => {
  selectedRequest.value = request
  showDetailModal.value = true
}

const cancelRequest = async (request) => {
  if (confirm('İzin talebini iptal etmek istediğinizden emin misiniz?')) {
    try {
      await api.post(`/leave-requests/${request._id}/cancel`)
      loadRequests()
    } catch (error) {
      alert(error.response?.data?.message || error.response?.data?.error || 'Hata oluştu')
    }
  }
}

const canCancel = (request) => {
  return request.status === 'PENDING' || request.status === 'IN_PROGRESS' || request.status === 'CANCELLATION_REQUESTED'
}

const resetForm = () => {
  form.value = {
    companyLeaveType: '',
    leaveSubType: '',
    startDate: '',
    endDate: '',
    returnDate: '',
    startTime: '',
    endTime: '',
    isHalfDay: false,
    halfDayPeriod: 'morning',
    isHourly: false,
    hours: 0,
    description: ''
  }
  file.value = null
  calculatedDays.value = 0
  calculatedHours.value = 0
  descriptionRequired.value = false
  conflictWarning.value = null
}

const closeModal = () => {
  showModal.value = false
  resetForm()
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
    'REJECTED': 'Reddedildi',
    'CANCELLED': 'İptal Edildi',
    'CANCELLATION_REQUESTED': 'İptal Talebi'
  }
  return statusMap[status] || status
}

onMounted(async () => {
  await loadRequests()
  await loadLeaveTypes()
})

watch(() => form.value.startDate, calculateDays)
watch(() => form.value.endDate, calculateDays)
watch(() => form.value.isHalfDay, handleHalfDayChange)
watch(() => form.value.isHourly, handleHourlyChange)
watch(() => form.value.startTime, calculateHours)
watch(() => form.value.endTime, calculateHours)
watch(selectedLeaveType, handleLeaveTypeChange)
</script>

<style scoped>
</style>
