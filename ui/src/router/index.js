import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue')
        },
        {
          path: 'dealers',
          name: 'Dealers',
          component: () => import('@/views/Dealers.vue'),
          meta: { roles: ['super_admin'] }
        },
        {
          path: 'companies',
          name: 'Companies',
          component: () => import('@/views/Companies.vue'),
          meta: { roles: ['super_admin', 'bayi_admin'] }
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/views/Settings.vue'),
          meta: { roles: ['company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'working-permits',
          name: 'WorkingPermits',
          component: () => import('@/views/WorkingPermits.vue'),
          meta: { roles: ['super_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'departments',
          name: 'Departments',
          component: () => import('@/views/Departments.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'working-hours',
          name: 'WorkingHours',
          component: () => import('@/views/WorkingHours.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'employees',
          name: 'Employees',
          component: () => import('@/views/Employees.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresAuth === false && authStore.isAuthenticated) {
    next('/')
  } else if (to.meta.roles && !to.meta.roles.includes(authStore.user?.role)) {
    next('/')
  } else {
    next()
  }
})

export default router

