<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Yeni Avans Talebi</h1>
    <form @submit.prevent="submitRequest" class="space-y-4">
      <div>
        <label for="amount" class="block text-sm font-medium text-gray-700">Tutar (₺)</label>
        <input
          type="number"
          v-model.number="form.amount"
          id="amount"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          placeholder="örn: 1500"
        />
      </div>

      <div>
        <label for="repaymentType" class="block text-sm font-medium text-gray-700">Geri Ödeme Şekli</label>
        <select
          v-model="form.repaymentType"
          id="repaymentType"
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="payroll">İlk maaşımdan kesilsin</option>
          <option value="date">Belirli bir tarihte</option>
          <option value="installment">Taksitli</option>
        </select>
      </div>

      <div v-if="form.repaymentType === 'date'">
        <label for="repaymentDate" class="block text-sm font-medium text-gray-700">Geri Ödeme Tarihi</label>
        <input
          type="date"
          v-model="form.repaymentDate"
          id="repaymentDate"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div v-if="form.repaymentType === 'installment'">
        <label for="installmentCount" class="block text-sm font-medium text-gray-700">Taksit Sayısı (Ay)</label>
        <input
          type="number"
          v-model.number="installmentCount"
          @input="calculateInstallments"
          id="installmentCount"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          min="2"
          placeholder="örn: 3"
        />
      </div>

      <div v-if="form.repaymentType === 'installment' && form.installments.length > 0" class="mt-4 space-y-2">
        <h3 class="font-semibold">Ödeme Planı:</h3>
        <div v-for="(inst, index) in form.installments" :key="index" class="text-sm p-2 bg-gray-100 rounded-md">
           {{ formatDate(inst.dueDate) }}: {{ inst.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) }}
        </div>
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
  amount: null,
  repaymentType: 'payroll',
  repaymentDate: null,
  installments: [],
});
const installmentCount = ref(2);
const submitting = ref(false);
const error = ref(null);

const calculateInstallments = () => {
  if (form.repaymentType !== 'installment' || !form.amount || installmentCount.value < 2) {
    form.installments = [];
    return;
  }
  
  const amount = form.amount;
  const count = installmentCount.value;
  const monthlyAmount = parseFloat((amount / count).toFixed(2));
  const newInstallments = [];
  
  let remainder = amount;

  for (let i = 0; i < count; i++) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    
    let currentInstallmentAmount = monthlyAmount;
    if(i === count - 1) { // Last installment gets the remainder
        currentInstallmentAmount = parseFloat(remainder.toFixed(2));
    }

    newInstallments.push({
      amount: currentInstallmentAmount,
      dueDate: dueDate.toISOString().slice(0, 10),
    });

    remainder -= currentInstallmentAmount;
  }
  form.installments = newInstallments;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'long' };
  return new Date(dateString).toLocaleDateString('tr-TR', options);
};

const submitRequest = async () => {
  if (!form.amount) {
    error.value = 'Lütfen tutar girin.';
    return;
  }
  
  // Reset fields that are not relevant
  if (form.repaymentType !== 'date') form.repaymentDate = null;
  if (form.repaymentType !== 'installment') form.installments = [];

  submitting.value = true;
  error.value = null;

  try {
    await api.post('/mobile/advance-requests', form);
    router.push('/mobile/advances');
  } catch (err) {
    error.value = err.response?.data?.message || 'Talep oluşturulamadı.';
  } finally {
    submitting.value = false;
  }
};
</script>