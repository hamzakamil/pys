<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">Fazla Mesai Onayları</h1>
    <div v-if="loading" class="text-center">Yükleniyor...</div>
    <div v-if="error" class="text-center text-red-500">{{ error }}</div>
    
    <div v-if="requests.length > 0" class="bg-white shadow rounded-lg overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Süre</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="request in requests" :key="request._id">
            <td class="px-6 py-4 whitespace-nowrap">{{ request.employeeId?.name || 'N/A' }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(request.date) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ request.hours }} saat</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" :class="getStatusClass(request.status)">
                {{ request.status }}
              </span>
            </td>
            <td v-if="request.status === 'pending'" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button @click="updateStatus(request._id, 'approved')" class="text-green-600 hover:text-green-900 mr-2">Onayla</button>
              <button @click="openRejectModal(request._id)" class="text-red-600 hover:text-red-900">Reddet</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
     <div v-else-if="!loading" class="text-center text-gray-500">
      Bekleyen fazla mesai talebi bulunmuyor.
    </div>

    <!-- Reject Modal -->
    <div v-if="rejectModal.show" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Talebi Reddet</h3>
            <div class="mt-2">
              <label for="rejectionReason" class="block text-sm font-medium text-gray-700">Reddetme Nedeni</label>
              <textarea v-model="rejectModal.reason" id="rejectionReason" rows="3" class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"></textarea>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button @click="confirmReject" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm">
              Reddet
            </button>
            <button @click="closeRejectModal" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '@/services/api';

const requests = ref([]);
const loading = ref(true);
const error = ref(null);
const rejectModal = reactive({ show: false, id: null, reason: '' });

const fetchRequests = async () => {
  try {
    loading.value = true;
    const response = await api.get('/overtimerequests');
    requests.value = response.data;
  } catch (err) {
    error.value = 'Talepler yüklenemedi.';
  } finally {
    loading.value = false;
  }
};

const updateStatus = async (id, status, reason = '') => {
  try {
    const payload = { status };
    if (status === 'rejected') {
      payload.rejectionReason = reason;
    }
    await api.put(`/overtimerequests/${id}/status`, payload);
    fetchRequests(); // Refresh list
  } catch (err) {
    alert('İşlem başarısız: ' + (err.response?.data?.message || err.message));
  }
};

const openRejectModal = (id) => {
  rejectModal.show = true;
  rejectModal.id = id;
  rejectModal.reason = '';
};

const closeRejectModal = () => {
  rejectModal.show = false;
  rejectModal.id = null;
};

const confirmReject = () => {
  if (!rejectModal.reason) {
    alert('Lütfen reddetme nedeni belirtin.');
    return;
  }
  updateStatus(rejectModal.id, 'rejected', rejectModal.reason);
  closeRejectModal();
};

const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR');
const getStatusClass = (status) => ({
  'bg-yellow-200 text-yellow-800': status === 'pending',
  'bg-green-200 text-green-800': status === 'approved',
  'bg-red-200 text-red-800': status === 'rejected',
});

onMounted(fetchRequests);
</script>