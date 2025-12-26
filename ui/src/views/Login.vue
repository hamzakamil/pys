<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <h1 class="text-2xl font-bold text-center mb-6 text-gray-800">Giriş Yap</h1>
      <form @submit.prevent="handleLogin">
        <div class="space-y-4">
          <Input
            v-model="email"
            type="email"
            label="Email"
            placeholder="Email adresiniz"
            required
          />
          <Input
            v-model="password"
            type="password"
            label="Şifre"
            placeholder="Şifreniz"
            required
          />
          <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
          <Button type="submit" :disabled="loading" class="w-full">
            {{ loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Input from '@/components/Input.vue'
import Button from '@/components/Button.vue'

const router = useRouter()
const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  error.value = ''
  loading.value = true

  const result = await authStore.login(email.value, password.value)

  if (result.success) {
    router.push('/')
  } else {
    error.value = result.message
  }

  loading.value = false
}
</script>

