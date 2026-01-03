<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Yeni İzin Talebi</h1>
    <form @submit.prevent="submitRequest" class="space-y-4">
      <div>
        <label for="leaveType" class="block text-sm font-medium text-gray-700">İzin Türü</label>
        <select
          v-model="form.leaveType"
          id="leaveType"
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option v-for="type in leaveTypes" :key="type._id" :value="type._id">
            {{ type.name }}
          </option>
        </select>
      </div>

      <div>
        <label for="startDate" class="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
        <input
          type="date"
          v-model="form.startDate"
          id="startDate"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label for="endDate" class="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
        <input
          type="date"
          v-model="form.endDate"
          id="endDate"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      
      <div>
        <label for="reason" class="block text-sm font-medium text-gray-700">Açıklama</label>
        <textarea
          v-model="form.reason"
          id="reason"
          rows="4"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        ></textarea>
      </div>

      <div v-if="error" class="text-red-500">{{ error }}</div>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50"
      >
        {{ submitting ? 'Gönderiliyor...' : 'Talep Oluştur' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();
const form = ref({
  leaveType: '',
  startDate: '',
  endDate: '',
  reason: '',
});
const leaveTypes = ref([]);
const submitting = ref(false);
const error = ref(null);

onMounted(async () => {
  try {
    // Assuming an endpoint to get all available leave types for the company
    const response = await api.get('/api/leave-types'); 
    leaveTypes.value = response.data;
    if (leaveTypes.value.length > 0) {
      form.value.leaveType = leaveTypes.value[0]._id;
    }
  } catch (err) {
    console.error('İzin türleri yüklenemedi:', err);
    error.value = 'Form yüklenemedi.';
  }
});

const submitRequest = async () => {
  if (!form.value.leaveType || !form.value.startDate || !form.value.endDate) {
    error.value = 'Lütfen tüm zorunlu alanları doldurun.';
    return;
  }

  submitting.value = true;
  error.value = null;

  try {
    await api.post('/mobile/leave-requests', form.value);
    router.push('/mobile/leaves');
  } catch (err) {
    error.value = err.response?.data?.message || 'Talep oluşturulamadı.';
  } finally {
    submitting.value = false;
  }
};
</script>
