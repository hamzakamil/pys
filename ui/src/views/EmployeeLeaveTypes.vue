<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">İzin Türleri ve Koşulları</h1>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <div v-else class="space-y-6">
      <!-- Yıllık İzin Detaylı Bilgisi -->
      <div v-if="annualLeaveType" class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <h2 class="text-xl font-bold text-blue-900">{{ annualLeaveType.name }}</h2>
          <span class="px-3 py-1 bg-blue-200 text-blue-800 text-xs font-semibold rounded-full">Detaylı Bilgi</span>
        </div>

        <div v-if="annualLeaveType.description" class="mb-4">
          <p class="text-gray-700">{{ annualLeaveType.description }}</p>
        </div>

        <!-- Kıdem Yılına Göre Hak Edilen Günler -->
        <div class="bg-white rounded-lg p-4 mb-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">📅 Kıdem Yılına Göre Hak Edilen Günler</h3>
          <div class="space-y-2">
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span class="text-gray-700">1-5 yıl arası kıdem</span>
              <span class="font-semibold text-gray-900">14 gün</span>
            </div>
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span class="text-gray-700">5-15 yıl arası kıdem</span>
              <span class="font-semibold text-gray-900">20 gün</span>
            </div>
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span class="text-gray-700">15 yıl ve üzeri kıdem</span>
              <span class="font-semibold text-gray-900">26 gün</span>
            </div>
          </div>
        </div>

        <!-- Özel Durumlar -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 class="text-lg font-semibold text-yellow-900 mb-2">⚠️ Özel Durumlar</h3>
          <p class="text-yellow-800 text-sm mb-2">
            <strong>Yaş Kuralı:</strong> 18 yaş altı veya 50 yaş üstü çalışanlar için asgari 20 gün yıllık izin hakkı tanınır.
          </p>
          <p class="text-yellow-800 text-sm">
            <strong>Pazar Günleri:</strong> Yıllık izin hesaplamasında Pazar günleri hariç tutulur. Örneğin, 7 günlük bir izin talebinde Pazar günleri çıkarılarak hesaplanır.
          </p>
        </div>

        <!-- Parçalı Kullanım Kuralları -->
        <div class="bg-white rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">🔀 Parçalı Kullanım Kuralları</h3>
          <div v-if="leavePolicy.allowSplitLeave" class="space-y-2">
            <p class="text-green-700 font-medium mb-2">✓ Parçalı kullanım izni verilmiştir.</p>
            <div class="bg-green-50 border border-green-200 rounded p-3">
              <p class="text-sm text-green-800 mb-1">
                <strong>Minimum İlk Blok:</strong> Yıllık izninizin ilk parçası en az <strong>{{ leavePolicy.minFirstBlockDays }} gün</strong> olmalıdır.
              </p>
              <p class="text-sm text-green-800">
                İlk parçayı kullandıktan sonra kalan izin hakkınızı istediğiniz gün sayısında (minimum 1 gün) parçalar halinde kullanabilirsiniz.
              </p>
            </div>
          </div>
          <div v-else class="bg-red-50 border border-red-200 rounded p-3">
            <p class="text-red-700 font-medium">✗ Parçalı kullanım izni verilmemiştir.</p>
            <p class="text-sm text-red-800 mt-1">
              Yıllık izninizi tek seferde kullanmanız gerekmektedir.
            </p>
          </div>
        </div>

        <!-- Çalışanın Mevcut Durumu -->
        <div v-if="employeeLeaveInfo" class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4">
          <h3 class="text-lg font-semibold text-indigo-900 mb-3">👤 Sizin Durumunuz</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p class="text-xs text-indigo-700 mb-1">Hak Ettiğiniz Gün</p>
              <p class="text-lg font-bold text-indigo-900">{{ employeeLeaveInfo.accrualDays }} gün</p>
            </div>
            <div>
              <p class="text-xs text-indigo-700 mb-1">Kullandığınız Gün</p>
              <p class="text-lg font-bold text-indigo-900">{{ employeeLeaveInfo.usedDays }} gün</p>
            </div>
            <div>
              <p class="text-xs text-indigo-700 mb-1">Kalan Gün</p>
              <p class="text-lg font-bold text-green-600">{{ employeeLeaveInfo.remainingDays }} gün</p>
            </div>
          </div>
          <div v-if="employeeLeaveInfo.nextAccrualDate" class="mt-3 pt-3 border-t border-indigo-200">
            <p class="text-sm text-indigo-700">
              <strong>Sonraki Hakediş Tarihi:</strong> {{ employeeLeaveInfo.nextAccrualDate }}
            </p>
          </div>
        </div>
      </div>

      <!-- Diğer İzin Türleri -->
      <div class="space-y-4">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Diğer İzin Türleri</h2>

        <!-- Ana İzin Türleri -->
        <div v-for="leaveType in mainLeaveTypes" :key="leaveType._id" class="bg-white rounded-lg shadow p-6">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="text-lg font-semibold text-gray-800">{{ leaveType.name }}</h3>
                <span v-if="leaveType.isDefault" class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  Varsayılan
                </span>
              </div>
              <p v-if="leaveType.description" class="text-gray-600 mb-3">{{ leaveType.description }}</p>

              <!-- Özel Kurallar (Yıllık izin hariç) -->
              <div v-if="leaveType.name.includes('Saatlik')" class="bg-gray-50 rounded p-3 mb-2">
                <p class="text-sm text-gray-700">
                  <strong>Kullanım:</strong> Saatlik izin alabilirsiniz. Başlangıç ve bitiş saatlerini belirtmeniz gerekmektedir.
                </p>
              </div>

              <div v-if="leaveType.name.includes('Mazeret') || leaveType.name.includes('ücretsiz')" class="bg-gray-50 rounded p-3 mb-2">
                <p class="text-sm text-gray-700">
                  <strong>Kullanım:</strong> Ücretsiz izinlerde açıklama zorunludur. Lütfen izin nedeninizi detaylı olarak belirtiniz.
                </p>
              </div>

              <div v-if="leaveType.name.includes('Hastalık') || leaveType.name.includes('Rapor')" class="bg-gray-50 rounded p-3 mb-2">
                <p class="text-sm text-gray-700">
                  <strong>Kullanım:</strong> Hastalık izinleri için rapor belgesi yüklenmesi gerekebilir.
                </p>
              </div>
            </div>
          </div>

          <!-- Alt Kategoriler (Diğer izinler için) -->
          <div v-if="leaveType.name === 'Diğer izinler' && getSubTypes(leaveType._id).length > 0" class="mt-4 pt-4 border-t">
            <h4 class="text-md font-semibold text-gray-700 mb-3">Alt Kategoriler:</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="subType in getSubTypes(leaveType._id)"
                :key="subType._id"
                class="bg-gray-50 rounded p-3"
              >
                <h5 class="font-medium text-gray-800 mb-1">{{ subType.name }}</h5>
                <p v-if="subType.description" class="text-sm text-gray-600">{{ subType.description }}</p>
              </div>
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

const authStore = useAuthStore()
const loading = ref(true)
const error = ref(null)
const leaveTypes = ref([])
const leaveSubTypes = ref([])
const leavePolicy = ref({ allowSplitLeave: true, minFirstBlockDays: 10 })
const employeeLeaveInfo = ref(null)

const mainLeaveTypes = computed(() => {
  return leaveTypes.value.filter(lt => !lt.parentPermitId)
})

const annualLeaveType = computed(() => {
  return mainLeaveTypes.value.find(lt => lt.name.toLowerCase().includes('yıllık'))
})

const getSubTypes = (parentId) => {
  return leaveSubTypes.value.filter(st => st.parentPermitId && st.parentPermitId.toString() === parentId.toString())
}

const loadLeaveTypes = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeLeaveTypes.vue:183',message:'loadLeaveTypes called',data:{hasAuthStore:!!authStore,hasUser:!!authStore?.user,userCompany:authStore?.user?.company},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  try {
    loading.value = true
    error.value = null

    let companyId = null
    if (authStore.user?.company) {
      companyId = authStore.user.company
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeLeaveTypes.vue:192',message:'companyId extracted',data:{companyId,hasCompanyId:!!companyId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

    if (!companyId) {
      error.value = 'Şirket bilgisi bulunamadı'
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeLeaveTypes.vue:196',message:'companyId missing, returning early',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return
    }

    // İzin türlerini yükle
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeLeaveTypes.vue:200',message:'Before API call',data:{companyId,endpoint:'/working-permits'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const response = await api.get('/working-permits', {
      params: { companyId }
    })
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeLeaveTypes.vue:204',message:'API response received',data:{hasResponse:!!response,hasData:!!response?.data,success:response?.data?.success,dataLength:response?.data?.data?.length,dataType:typeof response?.data?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    if (response.data.success) {
      const allPermits = response.data.data || []
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeLeaveTypes.vue:208',message:'Before filter',data:{allPermitsLength:allPermits.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      leaveTypes.value = allPermits.filter(p => !p.parentPermitId)
      leaveSubTypes.value = allPermits.filter(p => p.parentPermitId)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeLeaveTypes.vue:210',message:'After filter',data:{leaveTypesLength:leaveTypes.value.length,leaveSubTypesLength:leaveSubTypes.value.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeLeaveTypes.vue:212',message:'API response success false',data:{responseData:response?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    }

    // Şirket politikalarını yükle
    await loadCompanyPolicy(companyId)

    // Çalışan izin bilgilerini yükle (yıllık izin için)
    await loadEmployeeLeaveInfo()
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeLeaveTypes.vue:219',message:'Error in loadLeaveTypes',data:{errorMessage:err.message,errorResponse:err.response?.data,errorStatus:err.response?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    console.error('İzin türleri yüklenemedi:', err)
    error.value = 'İzin türleri yüklenirken bir hata oluştu'
  } finally {
    loading.value = false
  }
}

const loadCompanyPolicy = async (companyId) => {
  try {
    const response = await api.get(`/companies/${companyId}`)
    if (response.data && response.data.leavePolicy) {
      leavePolicy.value = {
        allowSplitLeave: response.data.leavePolicy.allowSplitLeave ?? true,
        minFirstBlockDays: response.data.leavePolicy.minFirstBlockDays ?? 10
      }
    }
  } catch (err) {
    console.error('Şirket politikası yüklenemedi:', err)
  }
}

const loadEmployeeLeaveInfo = async () => {
  try {
    // Çalışan bilgisini al
    const employeesResponse = await api.get('/employees')
    const employee = employeesResponse.data.find(e => e.email === authStore.user.email)

    if (!employee) {
      return
    }

    // İzin özetini al
    const summaryResponse = await api.get('/leave/summary', {
      params: { companyId: employee.company }
    })

    if (summaryResponse.data.success && summaryResponse.data.data && summaryResponse.data.data.length > 0) {
      const summary = summaryResponse.data.data[0]
      
      employeeLeaveInfo.value = {
        seniorityYears: 0, // Backend'den gelmiyor, UI'da gösterilmesi opsiyonel
        accrualDays: summary.accrualDays || 0,
        usedDays: summary.usedDays || 0,
        remainingDays: summary.remainingDays || 0,
        nextAccrualDate: summary.nextAccrualDate || null
      }
    }
  } catch (err) {
    console.error('Çalışan izin bilgisi yüklenemedi:', err)
  }
}

const formatDate = (date) => {
  if (!date) return ''
  // If it's already a formatted string (DD.MM.YYYY), return as is
  if (typeof date === 'string' && date.includes('.')) {
    return date
  }
  return new Date(date).toLocaleDateString('tr-TR')
}

onMounted(async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeLeaveTypes.vue:277',message:'onMounted called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  await loadLeaveTypes()
})
</script>

<style scoped>
</style>

