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
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="company in companies" :key="company._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ company.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ company.dealer?.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ company.contactEmail }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(company.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <router-link
                :to="`/attendance-calendar?company=${company._id}`"
                class="text-blue-600 hover:text-blue-900 mr-4"
              >
                Puantaj
              </router-link>
              <button v-if="canEdit" @click="editCompany(company)" class="text-indigo-600 hover:text-indigo-900 mr-4">Düzenle</button>
              <button v-if="canDelete" @click="deleteCompany(company._id)" class="text-red-600 hover:text-red-900">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">{{ editingCompany ? 'Şirket Düzenle' : 'Yeni Şirket Ekle' }}</h2>
        <form @submit.prevent="saveCompany">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <Input v-model="form.name" label="Şirket Ünvanı" required class="w-full" />
              </div>
              <Input v-if="isSuperAdmin && !editingCompany" v-model="form.dealerId" label="Bayi ID" required />
            </div>
            
            <div class="border-t pt-4">
              <h3 class="text-lg font-semibold mb-3">Vergi Bilgileri</h3>
              <div class="grid grid-cols-2 gap-4">
                <Input v-model="form.taxOffice" label="Vergi Dairesi" />
                <Input v-model="form.taxNumber" label="Vergi Numarası" />
              </div>
            </div>
            
            <div>
              <Textarea v-model="form.address" label="Adres" />
            </div>
            
            <div v-if="!editingCompany" class="border-t pt-4">
              <h3 class="text-lg font-semibold mb-3">Yetkili Kişi Bilgileri (Admin)</h3>
              <Input v-model="form.authorizedPersonFullName" label="Yetkili Adı Soyadı" required />
              <div class="grid grid-cols-2 gap-4 mt-4">
                <Input v-model="form.authorizedPersonEmail" type="email" label="Email" required />
                <Input v-model="form.authorizedPersonPhone" label="Telefon" />
              </div>
              <div class="mt-4">
                <Input v-model="form.authorizedPersonPassword" type="password" label="Şifre" required />
                <p class="text-xs text-gray-500 mt-1">İlk girişte şifre değiştirme ekranı açılacaktır</p>
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
import Textarea from '@/components/Textarea.vue'

const authStore = useAuthStore()
const companies = ref([])
const showModal = ref(false)
const editingCompany = ref(null)
const form = ref({
  name: '',
  dealerId: '',
  address: '',
  taxOffice: '',
  taxNumber: '',
  authorizedPersonFullName: '',
  authorizedPersonPhone: '',
  authorizedPersonEmail: '',
  authorizedPersonPassword: ''
})

const isSuperAdmin = computed(() => authStore.user?.role === 'super_admin')
const canCreate = computed(() => ['super_admin', 'bayi_admin'].includes(authStore.user?.role))
const canEdit = computed(() => ['super_admin', 'bayi_admin', 'company_admin'].includes(authStore.user?.role))
const canDelete = computed(() => ['super_admin', 'bayi_admin'].includes(authStore.user?.role))

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const saveCompany = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Companies.vue:138',message:'saveCompany entry',data:{form:form.value,editingCompany:editingCompany.value,isSuperAdmin:isSuperAdmin.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  try {
    // Validation
    if (!form.value.name || form.value.name.trim() === '') {
      alert('Şirket ünvanı gereklidir')
      return
    }

    if (!editingCompany.value) {
      // Yeni şirket oluştururken validasyon
      if (!form.value.authorizedPersonFullName || form.value.authorizedPersonFullName.trim() === '') {
        alert('Yetkili adı soyadı gereklidir')
        return
      }
      if (!form.value.authorizedPersonEmail || form.value.authorizedPersonEmail.trim() === '') {
        alert('Yetkili email adresi gereklidir')
        return
      }
      if (!form.value.authorizedPersonPassword || form.value.authorizedPersonPassword.trim() === '') {
        alert('Yetkili şifre gereklidir')
        return
      }
      if (isSuperAdmin.value && (!form.value.dealerId || form.value.dealerId.trim() === '')) {
        alert('Bayi ID gereklidir')
        return
      }
    }

    const payload = {
      name: form.value.name.trim(),
      address: form.value.address?.trim() || '',
      taxOffice: form.value.taxOffice?.trim() || '',
      taxNumber: form.value.taxNumber?.trim() || ''
    }

    if (isSuperAdmin.value && !editingCompany.value) {
      payload.dealerId = form.value.dealerId
    }

    if (!editingCompany.value) {
      // Yeni şirket oluştururken yetkili bilgileri gerekli
      payload.authorizedPersonFullName = form.value.authorizedPersonFullName.trim()
      payload.authorizedPersonPhone = form.value.authorizedPersonPhone?.trim() || ''
      payload.authorizedPersonEmail = form.value.authorizedPersonEmail.trim()
      payload.authorizedPersonPassword = form.value.authorizedPersonPassword
    } else {
      // Düzenleme sırasında yetkili bilgileri güncellenebilir (email hariç)
      if (form.value.authorizedPersonFullName) {
        payload.authorizedPersonFullName = form.value.authorizedPersonFullName.trim()
      }
      if (form.value.authorizedPersonPhone) {
        payload.authorizedPersonPhone = form.value.authorizedPersonPhone.trim()
      }
    }

    console.log('Payload gönderiliyor:', { ...payload, authorizedPersonPassword: '***' })
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Companies.vue:193',message:'Payload before API call',data:{payload:{...payload,authorizedPersonPassword:'***'},method:editingCompany.value?'PUT':'POST'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (editingCompany.value) {
      await api.put(`/companies/${editingCompany.value._id}`, payload)
    } else {
      await api.post('/companies', payload)
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Companies.vue:199',message:'API call success',data:{method:editingCompany.value?'PUT':'POST'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    closeModal()
    loadCompanies()
  } catch (error) {
    console.error('Şirket kaydetme hatası:', error)
    console.error('Hata detayı:', error.response?.data)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Companies.vue:202',message:'saveCompany error',data:{error:error.message,responseStatus:error.response?.status,responseData:error.response?.data,responseMessage:error.response?.data?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    let errorMessage = 'Bilinmeyen bir hata oluştu'
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }
    
    // Network error
    if (!error.response) {
      errorMessage = 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.'
    }
    
    alert(`Şirket kaydedilemedi!\n\nHata: ${errorMessage}\n\nLütfen:\n- Tüm zorunlu alanların doldurulduğundan emin olun\n- Email adresinin daha önce kullanılmadığından emin olun\n- Bayi ID'nin doğru olduğundan emin olun`)
  }
}

const editCompany = (company) => {
  editingCompany.value = company
  form.value = {
    name: company.name,
    dealerId: company.dealer?._id || '',
    address: company.address || '',
    taxOffice: company.taxOffice || '',
    taxNumber: company.taxNumber || '',
    authorizedPersonFullName: company.authorizedPerson?.fullName || '',
    authorizedPersonPhone: company.authorizedPerson?.phone || '',
    authorizedPersonEmail: '', // Email düzenleme sırasında boş olmalı (değiştirilemez)
    authorizedPersonPassword: ''
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
    address: '',
    taxOffice: '',
    taxNumber: '',
    authorizedPersonFullName: '',
    authorizedPersonPhone: '',
    authorizedPersonEmail: '',
    authorizedPersonPassword: ''
  }
}

onMounted(() => {
  loadCompanies()
})
</script>
