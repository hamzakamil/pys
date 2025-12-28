<template>
  <div class="h-auto min-h-full overflow-y-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Çalışma Saatleri</h1>
      <Button @click="showModal = true">Yeni Çalışma Saati Ekle</Button>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şirket</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="workingHour in workingHours" :key="workingHour._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ workingHour.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ workingHour.company?.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="editWorkingHours(workingHour)" class="text-indigo-600 hover:text-indigo-900 mr-4">Düzenle</button>
              <button @click="deleteWorkingHours(workingHour._id)" class="text-red-600 hover:text-red-900">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-4 w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">{{ editingWorkingHours ? 'Çalışma Saatleri Düzenle' : 'Yeni Çalışma Saati Ekle' }}</h2>
        <form @submit.prevent="saveWorkingHours">
          <div class="space-y-4">
            <Input v-model="form.name" label="Ad" required />
            
            <div v-if="isSuperAdmin || isBayiAdmin">
              <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
              <select v-model="form.company" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Seçiniz</option>
                <option v-for="comp in companies" :key="comp._id" :value="comp._id">{{ comp.name }}</option>
              </select>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div v-for="day in days" :key="day.key" class="border rounded-lg p-3 bg-gray-50 max-w-[480px]">
                <div class="flex items-center mb-2">
                  <input
                    type="checkbox"
                    v-model="form[day.key].isWorking"
                    class="mr-2"
                  />
                  <label class="font-medium text-gray-800 text-sm">{{ day.label }}</label>
                </div>
                
                <div v-if="form[day.key].isWorking" class="space-y-2">
                  <!-- Mesai Saatleri -->
                  <div class="bg-white p-2 rounded border">
                    <p class="text-xs font-medium text-gray-700 mb-1">Mesai Saatleri</p>
                    <div class="grid grid-cols-2 gap-2">
                      <Input
                        v-model="form[day.key].start"
                        type="time"
                        label="Başlangıç"
                      />
                      <Input
                        v-model="form[day.key].end"
                        type="time"
                        label="Bitiş"
                      />
                    </div>
                  </div>

                  <!-- Öğle Arası -->
                  <div class="bg-white p-2 rounded border">
                    <p class="text-xs font-medium text-gray-700 mb-1">Öğle Arası</p>
                    <div class="grid grid-cols-2 gap-2">
                      <Input
                        v-model="form[day.key].lunchBreak.start"
                        type="time"
                        label="Başlangıç"
                      />
                      <Input
                        v-model="form[day.key].lunchBreak.end"
                        type="time"
                        label="Bitiş"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeModal">İptal</Button>
              <Button type="submit">Kaydet</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

const authStore = useAuthStore()
const workingHours = ref([])
const companies = ref([])
const showModal = ref(false)
const editingWorkingHours = ref(null)

const isSuperAdmin = computed(() => authStore.user?.role === 'super_admin')
const isBayiAdmin = computed(() => authStore.user?.role === 'bayi_admin')
const days = [
  { key: 'monday', label: 'Pazartesi' },
  { key: 'tuesday', label: 'Salı' },
  { key: 'wednesday', label: 'Çarşamba' },
  { key: 'thursday', label: 'Perşembe' },
  { key: 'friday', label: 'Cuma' },
  { key: 'saturday', label: 'Cumartesi' },
  { key: 'sunday', label: 'Pazar' }
]

const getDefaultDay = () => ({
  start: '09:00',
  end: '18:00',
  isWorking: true,
  lunchBreak: {
    start: '12:00',
    end: '13:00'
  }
})

const form = ref({
  name: '',
  company: '',
  monday: getDefaultDay(),
  tuesday: getDefaultDay(),
  wednesday: getDefaultDay(),
  thursday: getDefaultDay(),
  friday: getDefaultDay(),
  saturday: { ...getDefaultDay(), isWorking: false },
  sunday: { ...getDefaultDay(), isWorking: false }
})

const loadWorkingHours = async () => {
  try {
    const response = await api.get('/working-hours')
    workingHours.value = response.data
  } catch (error) {
    console.error('Çalışma saatleri yüklenemedi:', error)
  }
}

const loadCompanies = async () => {
  if (isSuperAdmin.value || isBayiAdmin.value) {
    try {
      const response = await api.get('/companies')
      companies.value = response.data
    } catch (error) {
      console.error('Şirketler yüklenemedi:', error)
    }
  }
}

const saveWorkingHours = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkingHours.vue:212',message:'saveWorkingHours entry',data:{form:JSON.parse(JSON.stringify(form.value)),editingWorkingHours:editingWorkingHours.value?._id,userRole:authStore.user?.role,isSuperAdmin:isSuperAdmin.value,isBayiAdmin:isBayiAdmin.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    // Validation
    if (!form.value.name || form.value.name.trim() === '') {
      alert('Ad gereklidir')
      return
    }
    if ((isSuperAdmin.value || isBayiAdmin.value) && !form.value.company) {
      alert('Şirket seçilmelidir')
      return
    }

    // Mola alanlarını payload'dan temizle
    const payload = { 
      name: form.value.name,
      company: form.value.company,
      monday: {
        start: form.value.monday.start,
        end: form.value.monday.end,
        isWorking: form.value.monday.isWorking,
        lunchBreak: form.value.monday.lunchBreak
      },
      tuesday: {
        start: form.value.tuesday.start,
        end: form.value.tuesday.end,
        isWorking: form.value.tuesday.isWorking,
        lunchBreak: form.value.tuesday.lunchBreak
      },
      wednesday: {
        start: form.value.wednesday.start,
        end: form.value.wednesday.end,
        isWorking: form.value.wednesday.isWorking,
        lunchBreak: form.value.wednesday.lunchBreak
      },
      thursday: {
        start: form.value.thursday.start,
        end: form.value.thursday.end,
        isWorking: form.value.thursday.isWorking,
        lunchBreak: form.value.thursday.lunchBreak
      },
      friday: {
        start: form.value.friday.start,
        end: form.value.friday.end,
        isWorking: form.value.friday.isWorking,
        lunchBreak: form.value.friday.lunchBreak
      },
      saturday: {
        start: form.value.saturday.start,
        end: form.value.saturday.end,
        isWorking: form.value.saturday.isWorking,
        lunchBreak: form.value.saturday.lunchBreak
      },
      sunday: {
        start: form.value.sunday.start,
        end: form.value.sunday.end,
        isWorking: form.value.sunday.isWorking,
        lunchBreak: form.value.sunday.lunchBreak
      }
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkingHours.vue:228',message:'Payload before API call',data:{payload:JSON.parse(JSON.stringify(payload)),method:editingWorkingHours.value?'PUT':'POST'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    if (editingWorkingHours.value) {
      await api.put(`/working-hours/${editingWorkingHours.value._id}`, payload)
    } else {
      await api.post('/working-hours', payload)
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkingHours.vue:237',message:'API call success',data:{method:editingWorkingHours.value?'PUT':'POST'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    closeModal()
    loadWorkingHours()
  } catch (error) {
    console.error('Çalışma saatleri kaydetme hatası:', error)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkingHours.vue:243',message:'saveWorkingHours error',data:{error:error.message,responseStatus:error.response?.status,responseData:error.response?.data,responseMessage:error.response?.data?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    alert(error.response?.data?.message || error.message || 'Hata oluştu')
  }
}

const editWorkingHours = (workingHour) => {
  editingWorkingHours.value = workingHour
  
    // Ensure all fields are properly initialized
    const initializeDay = (dayData) => {
      return {
        start: dayData?.start || '09:00',
        end: dayData?.end || '18:00',
        isWorking: dayData?.isWorking !== undefined ? dayData.isWorking : true,
        lunchBreak: {
          start: dayData?.lunchBreak?.start || '12:00',
          end: dayData?.lunchBreak?.end || '13:00'
        }
      }
    }

  form.value = {
    name: workingHour.name,
    company: workingHour.company?._id || workingHour.company || '',
    monday: initializeDay(workingHour.monday),
    tuesday: initializeDay(workingHour.tuesday),
    wednesday: initializeDay(workingHour.wednesday),
    thursday: initializeDay(workingHour.thursday),
    friday: initializeDay(workingHour.friday),
    saturday: initializeDay(workingHour.saturday),
    sunday: initializeDay(workingHour.sunday)
  }
  showModal.value = true
}

const deleteWorkingHours = async (id) => {
  if (confirm('Bu çalışma saatini silmek istediğinize emin misiniz?')) {
    try {
      await api.delete(`/working-hours/${id}`)
      loadWorkingHours()
    } catch (error) {
      alert(error.response?.data?.message || 'Hata oluştu')
    }
  }
}

const closeModal = () => {
  showModal.value = false
  editingWorkingHours.value = null
  form.value = {
    name: '',
    company: '',
    monday: getDefaultDay(),
    tuesday: getDefaultDay(),
    wednesday: getDefaultDay(),
    thursday: getDefaultDay(),
    friday: getDefaultDay(),
    saturday: { ...getDefaultDay(), isWorking: false },
    sunday: { ...getDefaultDay(), isWorking: false }
  }
}

onMounted(() => {
  loadWorkingHours()
  if (isSuperAdmin.value || isBayiAdmin.value) {
    loadCompanies()
  }
})
</script>
