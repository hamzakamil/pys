<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Çalışanlar</h1>
      <div class="flex gap-2">
        <Button variant="secondary" @click="showImportModal = true">Excel'den İçe Aktar</Button>
        <Button @click="showModal = true">Yeni Çalışan Ekle</Button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departman</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="employee in employees" :key="employee._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ employee.firstName }} {{ employee.lastName }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ employee.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ employee.department?.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ employee.phone }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="editEmployee(employee)" class="text-indigo-600 hover:text-indigo-900 mr-4">Düzenle</button>
              <button @click="deleteEmployee(employee._id)" class="text-red-600 hover:text-red-900">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Employee Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">{{ editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle' }}</h2>
        <form @submit.prevent="saveEmployee">
          <div class="space-y-4">
            <Input v-model="form.firstName" label="Ad" required />
            <Input v-model="form.lastName" label="Soyad" required />
            <Input v-model="form.email" type="email" label="Email" required />
            <Input v-model="form.phone" label="Telefon" />
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Departman</label>
              <select v-model="form.department" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Seçiniz</option>
                <option v-for="dept in departments" :key="dept._id" :value="dept._id">{{ dept.name }}</option>
              </select>
            </div>
            <Input v-model="form.employeeNumber" label="Sicil No" />
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeModal">İptal</Button>
              <Button type="submit">Kaydet</Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Excel'den İçe Aktar</h2>
        <form @submit.prevent="importEmployees">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Excel Dosyası</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                @change="handleFileChange"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              <p class="mt-2 text-sm text-gray-500">
                Excel dosyasında şu sütunlar olmalıdır: ad, soyad, email, telefon, departman, sicil
              </p>
            </div>
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="showImportModal = false">İptal</Button>
              <Button type="submit" :disabled="importing">{{ importing ? 'İçe Aktarılıyor...' : 'İçe Aktar' }}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

const authStore = useAuthStore()
const employees = ref([])
const departments = ref([])
const showModal = ref(false)
const showImportModal = ref(false)
const editingEmployee = ref(null)
const importing = ref(false)
const importFile = ref(null)
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  employeeNumber: ''
})

const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    employees.value = response.data
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
  }
}

const loadDepartments = async () => {
  try {
    const response = await api.get('/departments')
    departments.value = response.data
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error)
  }
}

const saveEmployee = async () => {
  try {
    if (editingEmployee.value) {
      await api.put(`/employees/${editingEmployee.value._id}`, form.value)
    } else {
      await api.post('/employees', form.value)
    }
    closeModal()
    loadEmployees()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  }
}

const editEmployee = (employee) => {
  editingEmployee.value = employee
  form.value = {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone || '',
    department: employee.department?._id || '',
    employeeNumber: employee.employeeNumber || ''
  }
  showModal.value = true
}

const deleteEmployee = async (id) => {
  if (confirm('Bu çalışanı silmek istediğinize emin misiniz?')) {
    try {
      await api.delete(`/employees/${id}`)
      loadEmployees()
    } catch (error) {
      alert(error.response?.data?.message || 'Hata oluştu')
    }
  }
}

const handleFileChange = (event) => {
  importFile.value = event.target.files[0]
}

const importEmployees = async () => {
  if (!importFile.value) {
    alert('Lütfen bir dosya seçin')
    return
  }

  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)

    const response = await api.post('/employees/bulk-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    alert(`${response.data.added} çalışan eklendi`)
    if (response.data.errors && response.data.errors.length > 0) {
      console.error('Hatalar:', response.data.errors)
    }
    showImportModal.value = false
    loadEmployees()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  } finally {
    importing.value = false
  }
}

const closeModal = () => {
  showModal.value = false
  editingEmployee.value = null
  form.value = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    employeeNumber: ''
  }
}

onMounted(() => {
  loadEmployees()
  loadDepartments()
})
</script>

