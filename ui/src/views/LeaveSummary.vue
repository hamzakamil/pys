<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">{{ isEmployee ? 'İzin Özetim' : 'Çalışan İzin Özeti' }}</h1>
      <div v-if="(isBayiAdmin || isSuperAdmin) && !isEmployee" class="flex gap-2">
        <select
          v-model="selectedCompanyId"
          @change="loadSummary"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Şirket Seçiniz</option>
          <option v-for="comp in companies" :key="comp._id" :value="comp._id">
            {{ comp.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Summary Table -->
    <div v-if="!loading && summary.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Çalışan Adı
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              İşe Giriş Tarihi
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hakediş Günü
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kullanılan Gün
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kalan Gün
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sonraki Hakediş Tarihi
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in summary" :key="item.employeeId">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ item.name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(item.hireDate) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                {{ item.accrualDays }} gün
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                {{ item.usedDays }} gün
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span
                :class="{
                  'bg-green-100 text-green-800': item.remainingDays > 0,
                  'bg-red-100 text-red-800': item.remainingDays <= 0
                }"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ item.remainingDays }} gün
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ item.nextAccrualDate }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && summary.length === 0" class="bg-white rounded-lg shadow p-8 text-center">
      <p class="text-gray-500">Henüz çalışan bulunmuyor.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const authStore = useAuthStore()
const summary = ref([])
const companies = ref([])
const selectedCompanyId = ref('')
const loading = ref(false)
const error = ref(null)

const isBayiAdmin = computed(() => authStore.user?.role === 'bayi_admin')
const isSuperAdmin = computed(() => authStore.user?.role === 'super_admin')
const isEmployee = computed(() => authStore.user?.role === 'employee')

const loadCompanies = async () => {
  try {
    const response = await api.get('/companies')
    companies.value = response.data || []
  } catch (err) {
    console.error('Şirketler yüklenemedi:', err)
  }
}

const loadSummary = async () => {
  loading.value = true
  error.value = null

  try {
    let companyId = selectedCompanyId.value
    
    // Employee için companyId göndermeye gerek yok (backend kendi buluyor)
    if (isEmployee.value) {
      companyId = null
    } else if (!companyId && authStore.user?.company) {
      companyId = authStore.user.company
    }

    if (!companyId && (isBayiAdmin.value || isSuperAdmin.value)) {
      error.value = 'Lütfen bir şirket seçiniz'
      loading.value = false
      return
    }

    if (!companyId && !isEmployee.value) {
      error.value = 'Şirket bilgisi bulunamadı'
      loading.value = false
      return
    }

    const params = companyId ? { companyId } : {}
    const response = await api.get('/leave/summary', { params })

    if (response.data.success) {
      summary.value = response.data.data || []
    } else {
      error.value = response.data.error || 'Özet yüklenemedi'
    }
  } catch (err) {
    console.error('Özet yükleme hatası:', err)
    error.value = err.response?.data?.error || 'Özet yüklenirken bir hata oluştu'
  } finally {
    loading.value = false
  }
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR')
}

onMounted(async () => {
  if (isBayiAdmin.value || isSuperAdmin.value) {
    await loadCompanies()
  } else {
    // Employee ve company_admin için otomatik yükle
    await loadSummary()
  }
})
</script>

<style scoped>
</style>

