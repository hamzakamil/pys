<template>
  <div>
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
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">{{ editingWorkingHours ? 'Çalışma Saatleri Düzenle' : 'Yeni Çalışma Saati Ekle' }}</h2>
        <form @submit.prevent="saveWorkingHours">
          <div class="space-y-4">
            <Input v-model="form.name" label="Ad" required />
            <div class="grid grid-cols-2 gap-4">
              <div v-for="day in days" :key="day.key" class="border rounded-lg p-4">
                <div class="flex items-center mb-2">
                  <input
                    type="checkbox"
                    v-model="form[day.key].isWorking"
                    class="mr-2"
                  />
                  <label class="font-medium">{{ day.label }}</label>
                </div>
                <div v-if="form[day.key].isWorking" class="grid grid-cols-2 gap-2 mt-2">
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
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

const workingHours = ref([])
const showModal = ref(false)
const editingWorkingHours = ref(null)
const days = [
  { key: 'monday', label: 'Pazartesi' },
  { key: 'tuesday', label: 'Salı' },
  { key: 'wednesday', label: 'Çarşamba' },
  { key: 'thursday', label: 'Perşembe' },
  { key: 'friday', label: 'Cuma' },
  { key: 'saturday', label: 'Cumartesi' },
  { key: 'sunday', label: 'Pazar' }
]

const form = ref({
  name: '',
  monday: { start: '09:00', end: '18:00', isWorking: true },
  tuesday: { start: '09:00', end: '18:00', isWorking: true },
  wednesday: { start: '09:00', end: '18:00', isWorking: true },
  thursday: { start: '09:00', end: '18:00', isWorking: true },
  friday: { start: '09:00', end: '18:00', isWorking: true },
  saturday: { start: '09:00', end: '18:00', isWorking: false },
  sunday: { start: '09:00', end: '18:00', isWorking: false }
})

const loadWorkingHours = async () => {
  try {
    const response = await api.get('/working-hours')
    workingHours.value = response.data
  } catch (error) {
    console.error('Çalışma saatleri yüklenemedi:', error)
  }
}

const saveWorkingHours = async () => {
  try {
    if (editingWorkingHours.value) {
      await api.put(`/working-hours/${editingWorkingHours.value._id}`, form.value)
    } else {
      await api.post('/working-hours', form.value)
    }
    closeModal()
    loadWorkingHours()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  }
}

const editWorkingHours = (workingHour) => {
  editingWorkingHours.value = workingHour
  form.value = {
    name: workingHour.name,
    monday: workingHour.monday,
    tuesday: workingHour.tuesday,
    wednesday: workingHour.wednesday,
    thursday: workingHour.thursday,
    friday: workingHour.friday,
    saturday: workingHour.saturday,
    sunday: workingHour.sunday
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
    monday: { start: '09:00', end: '18:00', isWorking: true },
    tuesday: { start: '09:00', end: '18:00', isWorking: true },
    wednesday: { start: '09:00', end: '18:00', isWorking: true },
    thursday: { start: '09:00', end: '18:00', isWorking: true },
    friday: { start: '09:00', end: '18:00', isWorking: true },
    saturday: { start: '09:00', end: '18:00', isWorking: false },
    sunday: { start: '09:00', end: '18:00', isWorking: false }
  }
}

onMounted(() => {
  loadWorkingHours()
})
</script>

