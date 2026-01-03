<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Fazla Mesai Taleplerim</h1>
      <router-link
        to="/mobile/overtimes/create"
        class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        Yeni Talep
      </router-link>
    </div>

    <div v-if="loading" class="text-center">Yükleniyor...</div>
    <div v-if="error" class="text-center text-red-500">{{ error }}</div>

    <div v-if="requests.length > 0" class="space-y-3">
      <div
        v-for="request in requests"
        :key="request._id"
        class="bg-white rounded-lg shadow p-4"
      >
        <div class="flex justify-between">
          <span class="font-semibold">{{ formatDate(request.date) }} - {{ request.hours }} saat</span>
          <span
            class="px-2 py-1 text-xs font-semibold rounded-full"
            :class="getStatusClass(request.status)"
          >
            {{ request.status }}
          </span>
        </div>
        <p v-if="request.description" class="text-sm text-gray-800 mt-2">{{ request.description }}</p>
      </div>
    </div>
    <div v-else-if="!loading" class="text-center text-gray-500">
      Henüz fazla mesai talebiniz bulunmuyor.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';

const requests = ref([]);
const loading = ref(true);
const error = ref(null);

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('tr-TR', options);
};

const getStatusClass = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-200 text-yellow-800';
    case 'approved':
      return 'bg-green-200 text-green-800';
    case 'rejected':
      return 'bg-red-200 text-red-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

onMounted(async () => {
  try {
    const response = await api.get('/mobile/overtime-requests');
    requests.value = response.data;
  } catch (err) {
    error.value = 'Fazla mesai talepleri yüklenemedi.';
    console.error(err);
  } finally {
    loading.value = false;
  }
});
</script>