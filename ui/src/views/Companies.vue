<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Şirketler</h1>
      <Button v-if="canCreate" @click="showModal = true">Yeni Şirket Ekle</Button>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bayi</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="company in companies" :key="company._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ company.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ company.dealer?.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ company.contactEmail }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button v-if="canEdit" @click="editCompany(company)" class="text-indigo-600 hover:text-indigo-900 mr-4">Düzenle</button>
              <button v-if="canDelete" @click="deleteCompany(company._id)" class="text-red-600 hover:text-red-900">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">{{ editingCompany ? 'Şirket Düzenle' : 'Yeni Şirket Ekle' }}</h2>
        <form @submit.prevent="saveCompany">
          <div class="space-y-4">
            <Input v-model="form.name" label="Şirket Adı" required />
            <Input v-if="isSuperAdmin" v-model="form.dealerId" label="Bayi ID" />
            <Input v-model="form.contactEmail" type="email" label="İletişim Email" required />
            <Input v-model="form.contactPhone" label="Telefon" />
            <Textarea v-model="form.address" label="Adres" />
            <div v-if="!editingCompany">
              <Input v-model="form.email" type="email" label="Admin Email" required />
              <Input v-model="form.password" type="password" label="Admin Şifre" required />
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
import Textarea from '@/components/Textarea.vue'

const authStore = useAuthStore()
const companies = ref([])
const showModal = ref(false)
const editingCompany = ref(null)
const form = ref({
  name: '',
  dealerId: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  email: '',
  password: ''
})

const isSuperAdmin = computed(() => authStore.user?.role === 'super_admin')
const canCreate = computed(() => ['super_admin', 'bayi_admin'].includes(authStore.user?.role))
const canEdit = computed(() => ['super_admin', 'bayi_admin', 'company_admin'].includes(authStore.user?.role))
const canDelete = computed(() => ['super_admin', 'bayi_admin'].includes(authStore.user?.role))

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const saveCompany = async () => {
  try {
    if (editingCompany.value) {
      await api.put(`/companies/${editingCompany.value._id}`, form.value)
    } else {
      await api.post('/companies', form.value)
    }
    closeModal()
    loadCompanies()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  }
}

const editCompany = (company) => {
  editingCompany.value = company
  form.value = {
    name: company.name,
    dealerId: company.dealer?._id || '',
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone || '',
    address: company.address || '',
    email: '',
    password: ''
  }
  showModal.value = true
}

const deleteCompany = async (id) => {
  if (confirm('Bu şirketi silmek istediğinize emin misiniz?')) {
    try {
      await api.delete(`/companies/${id}`)
      loadCompanies()
    } catch (error) {
      alert(error.response?.data?.message || 'Hata oluştu')
    }
  }
}

const closeModal = () => {
  showModal.value = false
  editingCompany.value = null
  form.value = {
    name: '',
    dealerId: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    email: '',
    password: ''
  }
}

onMounted(() => {
  loadCompanies()
})
</script>

