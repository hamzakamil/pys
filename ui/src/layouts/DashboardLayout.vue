<template>
  <div class="min-h-screen bg-gray-50">
    <div class="flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-white shadow-sm min-h-screen">
        <div class="p-6 border-b">
          <h1 class="text-xl font-bold text-gray-800">{{ companyTitle }}</h1>
        </div>
        <nav class="mt-4">
          <router-link
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
            :class="{ 'bg-blue-50 text-blue-600 border-r-2 border-blue-600': $route.path === item.path }"
          >
            <span class="ml-3">{{ item.name }}</span>
          </router-link>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="flex-1">
        <header class="bg-white shadow-sm border-b">
          <div class="px-6 py-4 flex justify-between items-center">
            <h2 class="text-lg font-semibold text-gray-800">{{ currentPageTitle }}</h2>
            <div class="flex items-center gap-4">
              <span class="text-sm text-gray-600">{{ user?.email }}</span>
              <Button variant="secondary" @click="handleLogout">Çıkış</Button>
            </div>
          </div>
        </header>
        <div class="p-6">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/Button.vue'
import api from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()
const companyTitle = ref('Personel Yönetim Sistemi')

const user = computed(() => authStore.user)

const menuItems = computed(() => {
  const role = user.value?.role
  const items = []
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DashboardLayout.vue:54',message:'menuItems computed',data:{role:role,userId:user.value?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  if (role === 'super_admin') {
    items.push({ path: '/', name: 'Dashboard' })
    items.push({ path: '/dealers', name: 'Bayiler' })
    items.push({ path: '/companies', name: 'Şirketler' })
    items.push({ path: '/working-permits', name: 'Çalışan İzinleri' })
      } else if (role === 'bayi_admin') {
        items.push({ path: '/', name: 'Dashboard' })
        items.push({ path: '/companies', name: 'Şirketler' })
        items.push({ path: '/departments', name: 'Departmanlar' })
        items.push({ path: '/working-hours', name: 'Çalışma Saatleri' })
        items.push({ path: '/employees', name: 'Çalışanlar' })
        items.push({ path: '/attendance-calendar', name: 'Puantaj Takvimi' })
        items.push({ path: '/employment/list', name: 'İşe Giriş & Çıkış İşlemleri' })
      } else if (['company_admin', 'resmi_muhasebe_ik'].includes(role)) {
        items.push({ path: '/', name: 'Dashboard' })
        items.push({ path: '/settings', name: 'Ayarlar' })
        items.push({ path: '/holiday-calendar', name: 'Resmi Tatiller' })
        items.push({ path: '/working-permits', name: 'Çalışan İzinleri' })
        items.push({ path: '/departments', name: 'Departmanlar' })
        items.push({ path: '/working-hours', name: 'Çalışma Saatleri' })
        items.push({ path: '/employees', name: 'Çalışanlar' })
        items.push({ path: '/attendance-templates', name: 'Puantaj Şablonları' })
        items.push({ path: '/attendance-calendar', name: 'Puantaj Takvimi' })
        items.push({ path: '/leave-requests', name: 'İzin Talepleri' })
        items.push({ path: '/approvals', name: 'Onaylar' })
        items.push({ path: '/leave-balances', name: 'İzin Bakiyeleri' })
        items.push({ path: '/weekend-settings', name: 'Hafta Tatili Ayarları' })
        items.push({ path: '/employment/list', name: 'İşe Giriş & Çıkış İşlemleri' })
      } else if (role === 'employee') {
        items.push({ path: '/', name: 'Dashboard' })
        items.push({ path: '/my-leaves', name: 'İzin Taleplerim' })
        items.push({ path: '/leave-balances', name: 'İzin Bakiyem' })
      }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DashboardLayout.vue:88',message:'menuItems result',data:{items:items.map(i=>({path:i.path,name:i.name})),role:role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  return items
})

const currentPageTitle = computed(() => {
  const route = router.currentRoute.value
  const item = menuItems.value.find(item => item.path === route.path)
  return item?.name || 'Dashboard'
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

onMounted(async () => {
  if (user.value?.company) {
    try {
      const response = await api.get(`/companies/${user.value.company}`)
      if (response.data.title) {
        companyTitle.value = response.data.title
      }
    } catch (error) {
      console.error('Şirket bilgisi alınamadı:', error)
    }
  }
})
</script>

