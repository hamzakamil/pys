<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Departmanlar</h1>
      <Button @click="showModal = true">Yeni Departman Ekle</Button>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şirket</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="department in departments" :key="department._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ department.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ department.company?.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ department.description }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="editDepartment(department)" class="text-indigo-600 hover:text-indigo-900 mr-4">Düzenle</button>
              <button @click="deleteDepartment(department._id)" class="text-red-600 hover:text-red-900">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">{{ editingDepartment ? 'Departman Düzenle' : 'Yeni Departman Ekle' }}</h2>
        <form @submit.prevent="saveDepartment">
          <div class="space-y-4">
            <Input v-model="form.name" label="Departman Adı" required />
            <Textarea v-model="form.description" label="Açıklama" />
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
import Textarea from '@/components/Textarea.vue'

const departments = ref([])
const showModal = ref(false)
const editingDepartment = ref(null)
const form = ref({
  name: '',
  description: ''
})

const loadDepartments = async () => {
  try {
    const response = await api.get('/departments')
    departments.value = response.data
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error)
  }
}

const saveDepartment = async () => {
  try {
    if (editingDepartment.value) {
      await api.put(`/departments/${editingDepartment.value._id}`, form.value)
    } else {
      await api.post('/departments', form.value)
    }
    closeModal()
    loadDepartments()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  }
}

const editDepartment = (department) => {
  editingDepartment.value = department
  form.value = {
    name: department.name,
    description: department.description || ''
  }
  showModal.value = true
}

const deleteDepartment = async (id) => {
  if (confirm('Bu departmanı silmek istediğinize emin misiniz?')) {
    try {
      await api.delete(`/departments/${id}`)
      loadDepartments()
    } catch (error) {
      alert(error.response?.data?.message || 'Hata oluştu')
    }
  }
}

const closeModal = () => {
  showModal.value = false
  editingDepartment.value = null
  form.value = {
    name: '',
    description: ''
  }
}

onMounted(() => {
  loadDepartments()
})
</script>

