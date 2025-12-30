<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">İzin Talepleri</h1>
      <Button v-if="canCreate" @click="showModal = true">Yeni İzin Talebi</Button>
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
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
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
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ request.employee?.firstName }} {{ request.employee?.lastName }}
            </td>
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
                v-if="canReview && (request.status === 'PENDING' || request.status === 'IN_PROGRESS') && !request.isAdminCreated"
                @click="reviewRequest(request, 'approved')"
                class="text-green-600 hover:text-green-900 mr-4"
              >
                Onayla
              </button>
              <button
                v-if="canReview && (request.status === 'PENDING' || request.status === 'IN_PROGRESS') && !request.isAdminCreated"
                @click="openRejectModal(request)"
                class="text-red-600 hover:text-red-900 mr-4"
              >
                Reddet
              </button>
              <button
                v-if="canReview && request.status === 'CANCELLATION_REQUESTED'"
                @click="approveCancellation(request)"
                class="text-orange-600 hover:text-orange-900 mr-4"
              >
                İptal Talebini Onayla
              </button>
              <button @click="viewDetails(request)" class="text-blue-600 hover:text-blue-900">Detay</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">Yeni İzin Talebi</h2>
        <form @submit.prevent="saveRequest">
          <div class="space-y-4">
            <!-- Şirket seçimi (bayi_admin için) -->
            <div v-if="isBayiAdmin">
              <label class="block text-sm font-medium text-gray-700 mb-1">Şirket <span class="text-red-500">*</span></label>
              <select
                v-model="form.company"
                @change="loadEmployeesForCompany"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seçiniz</option>
                <option v-for="comp in companies" :key="comp._id" :value="comp._id">{{ comp.name }}</option>
              </select>
            </div>
            
            <!-- Çalışan seçimi (admin için) -->
            <div v-if="isAdmin">
              <label class="block text-sm font-medium text-gray-700 mb-1">Çalışan <span class="text-red-500">*</span></label>
              <select
                v-model="form.employee"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                :disabled="!form.company && isBayiAdmin"
              >
                <option value="">Seçiniz</option>
                <option v-for="emp in filteredEmployees" :key="emp._id" :value="emp._id">
                  {{ emp.firstName }} {{ emp.lastName }} {{ emp.employeeNumber ? `(${emp.employeeNumber})` : '' }}
                </option>
              </select>
            </div>
            
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
            <strong>Çalışan:</strong> {{ selectedRequest.employee?.firstName }} {{ selectedRequest.employee?.lastName }}
          </div>
          <div>
            <strong>İzin Türü:</strong> {{ selectedRequest.leaveSubType?.name || selectedRequest.companyLeaveType?.name || selectedRequest.type }}
          </div>
          <div>
            <strong>Tarih:</strong> {{ formatDate(selectedRequest.startDate) }} - {{ formatDate(selectedRequest.endDate) }}
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
          <div v-if="selectedRequest.rejectedReason">
            <strong>Red Nedeni:</strong> {{ selectedRequest.rejectedReason }}
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <Button variant="secondary" @click="showDetailModal = false">Kapat</Button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">İzin Talebini Reddet</h2>
        <form @submit.prevent="reviewRequest(rejectingRequest, 'rejected')">
          <div class="space-y-4">
            <Textarea
              v-model="rejectReason"
              label="Red Nedeni"
              required
              rows="4"
            />
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="showRejectModal = false">İptal</Button>
              <Button type="submit" variant="danger">Reddet</Button>
            </div>
          </div>
        </form>
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
const showRejectModal = ref(false)
const selectedRequest = ref(null)
const rejectingRequest = ref(null)
const rejectReason = ref('')
const filterStatus = ref('')
const saving = ref(false)
const descriptionRequired = ref(false)

const form = ref({
  company: '',
  employee: '',
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

const employees = ref([])
const filteredEmployees = ref([])
const workplaces = ref([])
const filterWorkplace = ref(null)
const companies = ref([])

const selectedLeaveType = computed(() => {
  return leaveTypes.value.find(t => t._id === form.value.companyLeaveType)
})

const filteredSubTypes = computed(() => {
  if (!selectedLeaveType.value || selectedLeaveType.value.name !== 'Diğer izinler') {
    return []
  }
  return leaveSubTypes.value.filter(st => 
    st.parentPermitId && 
    (st.parentPermitId === selectedLeaveType.value._id || 
     st.parentPermitId._id === selectedLeaveType.value._id ||
     st.parentPermitId.toString() === selectedLeaveType.value._id.toString())
  )
})

const showHourlyOption = computed(() => {
  return selectedLeaveType.value?.name === 'Saatlik İzin'
})

const showHalfDayOption = computed(() => {
  return selectedLeaveType.value?.name === 'Saatlik İzin' || 
         selectedLeaveType.value?.name === 'Yıllık izin (Ücretli İzin)'
})

const isSameDayRequired = computed(() => {
  return form.value.isHourly || form.value.isHalfDay
})

const conflictWarning = ref(null)
const file = ref(null)
const calculatedDays = ref(0)
const calculatedHours = ref(0)

const canCreate = computed(() => {
  return ['employee', 'company_admin', 'resmi_muhasebe_ik'].includes(authStore.user?.role)
})

const canReview = computed(() => {
  return ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'].includes(authStore.user?.role)
})

const isReportLeave = computed(() => {
  return selectedLeaveType.value?.name?.toLowerCase().includes('rapor') || 
         selectedLeaveType.value?.name?.toLowerCase().includes('istirahat')
})

const isBayiAdmin = computed(() => authStore.user?.role === 'bayi_admin')
const isAdmin = computed(() => ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'].includes(authStore.user?.role))

const loadLeaveTypes = async () => {
  try {
    let companyId = null
    if (form.value.company) {
      companyId = form.value.company
    } else if (authStore.user?.company) {
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

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const loadEmployeesForCompany = async () => {
  if (!form.value.company) {
    employees.value = []
    filteredEmployees.value = []
    workplaces.value = []
    return
  }
  
  try {
    const empResponse = await api.get('/employees', { params: { company: form.value.company } })
    employees.value = empResponse.data || []
    filteredEmployees.value = employees.value
    
    const wpResponse = await api.get('/workplaces', { params: { company: form.value.company } })
    workplaces.value = wpResponse.data || []
    
    filterEmployees()
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
  }
}

const filterEmployees = () => {
  if (!filterWorkplace.value) {
    filteredEmployees.value = employees.value
  } else {
    filteredEmployees.value = employees.value.filter(emp => 
      emp.workplace && emp.workplace.toString() === filterWorkplace.value
    )
  }
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

const handleStartDateChange = () => {
  if (isSameDayRequired.value && form.value.startDate) {
    form.value.endDate = form.value.startDate
  }
  calculateDays()
}

const loadRequests = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:495',message:'loadRequests called',data:{filterStatus:filterStatus.value,hasFilterStatus:!!filterStatus.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  try {
    const params = {}
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:502',message:'Before API call',data:{params,url:'/leave-requests'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const response = await api.get('/leave-requests', { params })
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:505',message:'API response received',data:{requestsCount:response.data?.length,hasData:!!response.data,firstRequestStatus:response.data?.[0]?.status,firstRequestId:response.data?.[0]?._id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    requests.value = response.data
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:510',message:'Error loading requests',data:{errorMessage:error.message,responseError:error.response?.data?.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('Talepler yüklenemedi:', error)
  }
}

const calculateDays = async () => {
  if (!form.value.startDate || !form.value.returnDate) {
    calculatedDays.value = 0
    conflictWarning.value = null
    return
  }
  if (form.value.isHourly) {
    conflictWarning.value = null
    return
  }

  try {
    let employeeId = null
    if (authStore.user?.role === 'employee') {
      const employeesResponse = await api.get('/employees')
      const employee = employeesResponse.data.find(e => e.email === authStore.user.email)
      if (employee) {
        employeeId = employee._id
      }
    }

    if (employeeId || form.value.employee) {
      const params = {
        employeeId: employeeId || form.value.employee,
        startDate: form.value.startDate,
        returnDate: form.value.returnDate,
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
      const end = new Date(form.value.returnDate)
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

const checkDescriptionRequired = () => {
  const isUnpaid = selectedLeaveType.value?.name?.toLowerCase().includes('ücretsiz') || 
                   selectedLeaveType.value?.name?.toLowerCase().includes('mazeret')
  descriptionRequired.value = isUnpaid || false
}

const handleFileChange = (event) => {
  file.value = event.target.files[0]
}

const saveRequest = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:645',message:'saveRequest called',data:{formValue:form.value,selectedLeaveType:selectedLeaveType.value?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  if (selectedLeaveType.value?.name === 'Diğer izinler' && !form.value.leaveSubType) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:647',message:'Validation failed: leaveSubType required',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    alert('Alt izin türü seçilmelidir')
    return
  }
  
  if ((form.value.isHourly || form.value.isHalfDay) && form.value.startDate !== form.value.endDate) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:652',message:'Validation failed: same day required',data:{startDate:form.value.startDate,endDate:form.value.endDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    alert('Saatlik ve yarım gün izinler için başlangıç ve bitiş tarihi aynı gün olmalıdır')
    return
  }

  if (form.value.isHourly && (!form.value.startTime || !form.value.endTime)) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:657',message:'Validation failed: time required',data:{startTime:form.value.startTime,endTime:form.value.endTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    alert('Saatlik izin için başlangıç ve bitiş saati gereklidir')
    return
  }
  
  if (isAdmin.value && !form.value.employee) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:662',message:'Validation failed: employee required',data:{isAdmin:isAdmin.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    alert('Çalışan seçilmelidir')
    return
  }

  saving.value = true
  try {
    const formData = new FormData()
    if (form.value.employee) {
      formData.append('employee', form.value.employee)
    }
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
    // #region agent log
    const formDataEntries = {}
    for (const [key, value] of formData.entries()) {
      formDataEntries[key] = typeof value === 'string' ? value : '[FILE]'
    }
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:686',message:'Before API call',data:{formDataEntries,endpoint:'/leave-requests'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    await api.post('/leave-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:692',message:'API call success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    closeModal()
    loadRequests()
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaveRequests.vue:698',message:'API call error',data:{errorMessage:error.message,errorResponse:error.response?.data,errorStatus:error.response?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    alert(error.response?.data?.message || 'Hata oluştu')
  } finally {
    saving.value = false
  }
}

const reviewRequest = async (request, status) => {
  try {
    if (status === 'approved') {
      await api.post(`/leave-requests/${request._id}/approve`, {})
    } else if (status === 'rejected') {
      await api.post(`/leave-requests/${request._id}/reject`, { note: rejectReason.value })
      showRejectModal.value = false
      rejectReason.value = ''
    }
    loadRequests()
  } catch (error) {
    alert(error.response?.data?.message || error.response?.data?.error || 'Hata oluştu')
  }
}

const approveCancellation = async (request) => {
  try {
    await api.post(`/leave-requests/${request._id}/approve-cancellation`, {})
    loadRequests()
  } catch (error) {
    alert(error.response?.data?.message || error.response?.data?.error || 'Hata oluştu')
  }
}

const openRejectModal = (request) => {
  rejectingRequest.value = request
  rejectReason.value = ''
  showRejectModal.value = true
}

const viewDetails = (request) => {
  selectedRequest.value = request
  showDetailModal.value = true
}

const closeModal = () => {
  showModal.value = false
  form.value = {
    company: '',
    employee: '',
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
  filterWorkplace.value = ''
  file.value = null
  calculatedDays.value = 0
  calculatedHours.value = 0
  descriptionRequired.value = false
  conflictWarning.value = null
  employees.value = []
  filteredEmployees.value = []
  workplaces.value = []
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

onMounted(async () => {
  await loadRequests()
  await loadLeaveTypes()
  if (isBayiAdmin.value) {
    await loadCompanies()
  } else if (isAdmin.value && authStore.user?.company) {
    form.value.company = authStore.user.company
    await loadEmployeesForCompany()
  }
})
</script>

<style scoped>
</style>
