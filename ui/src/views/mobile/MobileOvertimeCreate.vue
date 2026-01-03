<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Yeni Fazla Mesai Talebi</h1>
    <form @submit.prevent="submitRequest" class="space-y-4">
      <div>
        <label for="date" class="block text-sm font-medium text-gray-700">Tarih</label>
        <input
          type="date"
          v-model="form.date"
          id="date"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label for="hours" class="block text-sm font-medium text-gray-700">Süre (Saat)</label>
        <input
          type="number"
          v-model.number="form.hours"
          id="hours"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          step="0.5"
          min="0"
          placeholder="örn: 3"
        />
      </div>
      
      <div>
        <label for="description" class="block text-sm font-medium text-gray-700">Açıklama</label>
        <textarea
          v-model="form.description"
          id="description"
          rows="4"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          placeholder="Fazla mesai nedenini kısaca açıklayınız."
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
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();
const form = reactive({
  date: new Date().toISOString().slice(0, 10),
  hours: null,
  description: '',
});
const submitting = ref(false);
const error = ref(null);

const submitRequest = async () => {
  if (!form.date || !form.hours) {
    error.value = 'Lütfen tarih ve süre girin.';
    return;
  }

  submitting.value = true;
  error.value = null;

  try {
    await api.post('/mobile/overtime-requests', form);
    router.push('/mobile/overtimes');
  } catch (err) {
    error.value = err.response?.data?.message || 'Talep oluşturulamadı.';
  } finally {
    submitting.value = false;
  }
};
</script>