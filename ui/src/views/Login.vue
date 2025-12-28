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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.vue:48',message:'handleLogin entry',data:{email:email.value,hasPassword:!!password.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  error.value = ''
  loading.value = true

  try {
    const result = await authStore.login(email.value, password.value)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.vue:57',message:'authStore.login result',data:{success:result.success,message:result.message,hasUser:!!authStore.user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (result.success) {
      // İlk girişte şifre belirleme zorunlu ise ayarlar sayfasına yönlendir
      if (authStore.user?.mustChangePassword || result.requiresPasswordSetup) {
        router.push('/settings?changePassword=true')
      } else {
        router.push('/')
      }
    } else {
      error.value = result.message || 'Giriş hatası'
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.vue:68',message:'Login failed',data:{errorMessage:error.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.vue:72',message:'handleLogin exception',data:{error:err.message,errorStack:err.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    error.value = err.message || 'Giriş hatası'
  }

  loading.value = false
}
</script>

