<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold text-gray-800">Yıllık İzin Durumu</h2>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Yükleniyor...</p>
    </div>

    <!-- Balance Card -->
    <div v-else-if="balance" class="bg-white rounded-lg shadow p-6">
      <div class="space-y-4">
        <div class="flex justify-between items-center pb-4 border-b">
          <span class="text-gray-600">Hak Edilen:</span>
          <span class="text-2xl font-bold text-gray-800">{{ balance.annualLeaveDays }} gün</span>
        </div>
        <div class="flex justify-between items-center pb-4 border-b">
          <span class="text-gray-600">Kullanılan:</span>
          <span class="text-2xl font-bold text-red-600">{{ balance.usedAnnualLeaveDays }} gün</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Kalan:</span>
          <span class="text-3xl font-bold text-blue-600">{{ balance.remainingAnnualLeaveDays }} gün</span>
        </div>
      </div>
    </div>

    <!-- Additional Info -->
    <div v-if="balance" class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Detaylar</h3>
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-gray-600">Hesaplama Yılı:</span>
          <span class="font-semibold">{{ balance.calculationYear }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Kıdem:</span>
          <span class="font-semibold">{{ balance.seniority }} yıl</span>
        </div>
        <div v-if="balance.age" class="flex justify-between">
          <span class="text-gray-600">Yaş:</span>
          <span class="font-semibold">{{ balance.age }} yaş</span>
        </div>
        <div v-if="balance.hourlyLeaveHours > 0" class="flex justify-between">
          <span class="text-gray-600">Saatlik İzin:</span>
          <span class="font-semibold">{{ balance.hourlyLeaveHours }} saat</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const balance = ref(null)
const loading = ref(true)

const loadBalance = async () => {
  try {
    loading.value = true
    const response = await api.get('/leave-balances/mobile/my-balance')
    if (response.data.success) {
      balance.value = response.data.data
    }
  } catch (error) {
    console.error('İzin bakiyesi yüklenemedi:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadBalance()
})
</script>


