<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Ayarlar</h1>
    <div class="bg-white rounded-lg shadow p-6 max-w-2xl">
      <form @submit.prevent="saveSettings">
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
            <Input v-model="form.title" placeholder="Şirket başlığı" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <div v-if="form.logo" class="mt-4">
              <img :src="form.logo" alt="Logo" class="h-20 object-contain" />
            </div>
          </div>
          <div class="flex justify-end">
            <Button type="submit" :disabled="loading">{{ loading ? 'Kaydediliyor...' : 'Kaydet' }}</Button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

const form = ref({
  title: '',
  logo: ''
})
const file = ref(null)
const loading = ref(false)

const loadSettings = async () => {
  try {
    const response = await api.get('/settings')
    form.value = response.data
    if (response.data.logo) {
      form.value.logo = `http://localhost:3000${response.data.logo}`
    }
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error)
  }
}

const handleFileChange = (event) => {
  file.value = event.target.files[0]
  if (file.value) {
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.logo = e.target.result
    }
    reader.readAsDataURL(file.value)
  }
}

const saveSettings = async () => {
  loading.value = true
  try {
    const formData = new FormData()
    formData.append('title', form.value.title)
    if (file.value) {
      formData.append('logo', file.value)
    }

    await api.put('/settings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    alert('Ayarlar kaydedildi')
    loadSettings()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

