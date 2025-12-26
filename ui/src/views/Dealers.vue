<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Bayiler</h1>
      <Button @click="showModal = true">Yeni Bayi Ekle</Button>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="dealer in dealers" :key="dealer._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ dealer.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ dealer.contactEmail }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ dealer.contactPhone }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="viewCompanies(dealer._id)" class="text-blue-600 hover:text-blue-900 mr-4">Şirketler</button>
              <button @click="editDealer(dealer)" class="text-indigo-600 hover:text-indigo-900 mr-4">Düzenle</button>
              <button @click="deleteDealer(dealer._id)" class="text-red-600 hover:text-red-900">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">{{ editingDealer ? 'Bayi Düzenle' : 'Yeni Bayi Ekle' }}</h2>
        <form @submit.prevent="saveDealer">
          <div class="space-y-4">
            <Input v-model="form.name" label="Bayi Adı" required />
            <Input v-model="form.contactEmail" type="email" label="İletişim Email" required />
            <Input v-model="form.contactPhone" label="Telefon" />
            <Textarea v-model="form.address" label="Adres" />
            <div v-if="!editingDealer">
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
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'

const dealers = ref([])
const showModal = ref(false)
const editingDealer = ref(null)
const form = ref({
  name: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  email: '',
  password: ''
})

const loadDealers = async () => {
  try {
    const response = await api.get('/dealers')
    dealers.value = response.data
  } catch (error) {
    console.error('Bayiler yüklenemedi:', error)
  }
}

const saveDealer = async () => {
  try {
    if (editingDealer.value) {
      await api.put(`/dealers/${editingDealer.value._id}`, form.value)
    } else {
      await api.post('/dealers', form.value)
    }
    closeModal()
    loadDealers()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  }
}

const editDealer = (dealer) => {
  editingDealer.value = dealer
  form.value = {
    name: dealer.name,
    contactEmail: dealer.contactEmail,
    contactPhone: dealer.contactPhone || '',
    address: dealer.address || '',
    email: '',
    password: ''
  }
  showModal.value = true
}

const deleteDealer = async (id) => {
  if (confirm('Bu bayiyi silmek istediğinize emin misiniz?')) {
    try {
      await api.delete(`/dealers/${id}`)
      loadDealers()
    } catch (error) {
      alert(error.response?.data?.message || 'Hata oluştu')
    }
  }
}

const viewCompanies = (dealerId) => {
  // Navigate to companies view with dealer filter
  window.location.href = '/companies?dealer=' + dealerId
}

const closeModal = () => {
  showModal.value = false
  editingDealer.value = null
  form.value = {
    name: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    email: '',
    password: ''
  }
}

onMounted(() => {
  loadDealers()
})
</script>

