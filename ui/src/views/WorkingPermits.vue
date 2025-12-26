<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Çalışan İzinleri</h1>
      <Button @click="showModal = true">Yeni İzin Türü Ekle</Button>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="permit in permits" :key="permit._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ permit.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ permit.description }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span v-if="permit.isDefault" class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                Varsayılan
              </span>
              <span v-else class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                Şirket Özel
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                v-if="canEdit(permit)"
                @click="editPermit(permit)"
                class="text-indigo-600 hover:text-indigo-900 mr-4"
              >
                Düzenle
              </button>
              <button
                v-if="canDelete(permit)"
                @click="deletePermit(permit._id)"
                class="text-red-600 hover:text-red-900"
              >
                Sil
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">{{ editingPermit ? 'İzin Türü Düzenle' : 'Yeni İzin Türü Ekle' }}</h2>
        <form @submit.prevent="savePermit">
          <div class="space-y-4">
            <Input v-model="form.name" label="İzin Türü Adı" required />
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
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'

const authStore = useAuthStore()
const permits = ref([])
const showModal = ref(false)
const editingPermit = ref(null)
const form = ref({
  name: '',
  description: ''
})

const isSuperAdmin = computed(() => authStore.user?.role === 'super_admin')

const canEdit = (permit) => {
  if (isSuperAdmin.value) return true
  if (permit.isDefault) return false
  return permit.company === authStore.user?.company
}

const canDelete = (permit) => {
  if (isSuperAdmin.value) return true
  if (permit.isDefault) return false
  return permit.company === authStore.user?.company
}

const loadPermits = async () => {
  try {
    const response = await api.get('/working-permits')
    permits.value = response.data
  } catch (error) {
    console.error('İzin türleri yüklenemedi:', error)
  }
}

const savePermit = async () => {
  try {
    if (editingPermit.value) {
      await api.put(`/working-permits/${editingPermit.value._id}`, form.value)
    } else {
      await api.post('/working-permits', form.value)
    }
    closeModal()
    loadPermits()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  }
}

const editPermit = (permit) => {
  editingPermit.value = permit
  form.value = {
    name: permit.name,
    description: permit.description || ''
  }
  showModal.value = true
}

const deletePermit = async (id) => {
  if (confirm('Bu izin türünü silmek istediğinize emin misiniz?')) {
    try {
      await api.delete(`/working-permits/${id}`)
      loadPermits()
    } catch (error) {
      alert(error.response?.data?.message || 'Hata oluştu')
    }
  }
}

const closeModal = () => {
  showModal.value = false
  editingPermit.value = null
  form.value = {
    name: '',
    description: ''
  }
}

onMounted(() => {
  loadPermits()
})
</script>

