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
      path: '/activate-company',
      name: 'ActivateCompany',
      component: () => import('@/views/ActivateCompany.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/activate-employee',
      name: 'ActivateEmployee',
      component: () => import('@/views/ActivateEmployee.vue'),
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
          path: 'whatsapp-settings',
          name: 'WhatsAppSettings',
          component: () => import('@/views/WhatsAppSettings.vue'),
          meta: { roles: ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'] }
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
        },
        {
          path: 'employee-settings/:id',
          name: 'EmployeeSettings',
          component: () => import('@/views/EmployeeSettings.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'attendance-templates',
          name: 'AttendanceTemplates',
          component: () => import('@/views/AttendanceTemplates.vue'),
          meta: { roles: ['super_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'attendance-calendar',
          name: 'AttendanceCalendar',
          component: () => import('@/views/AttendanceCalendar.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'leave-requests',
          name: 'LeaveRequests',
          component: () => import('@/views/LeaveRequests.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'] }
        },
        {
          path: 'my-leaves',
          name: 'MyLeaves',
          component: () => import('@/views/MyLeaves.vue'),
          meta: { roles: ['employee'] }
        },
        {
          path: 'approvals',
          name: 'Approvals',
          component: () => import('@/views/Approvals.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'] }
        },
        {
          path: 'leave-balances',
          name: 'LeaveBalances',
          component: () => import('@/views/LeaveBalances.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'] }
        },
        {
          path: 'leave-summary',
          name: 'LeaveSummary',
          component: () => import('@/views/LeaveSummary.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'] }
        },
        {
          path: 'employee-leave-types',
          name: 'EmployeeLeaveTypes',
          component: () => import('@/views/EmployeeLeaveTypes.vue'),
          meta: { roles: ['employee'] }
        },
        {
          path: 'leaves/employee-summary',
          name: 'EmployeeLeavesSummary',
          component: () => import('@/views/Leaves/EmployeeLeavesSummary.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'leaves/annual-calculation',
          name: 'AnnualLeaveCalculation',
          component: () => import('@/views/Leaves/AnnualLeaveCalculation.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'] }
        },
        {
          path: 'weekend-settings',
          name: 'WeekendSettings',
          component: () => import('@/views/WeekendSettings.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'holiday-calendar',
          name: 'HolidayCalendar',
          component: () => import('@/views/HolidayCalendar.vue'),
          meta: { roles: ['company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'employment/hire',
          name: 'HireEmployee',
          component: () => import('@/views/employment/HireEmployee.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'employment/terminate',
          name: 'TerminateEmployee',
          component: () => import('@/views/employment/TerminateEmployee.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        },
        {
          path: 'employment/list',
          name: 'EmploymentList',
          component: () => import('@/views/employment/EmploymentList.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] }
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // Allow activation pages without auth
  if (to.name === 'ActivateCompany' || to.name === 'ActivateEmployee') {
    next()
    return
  }
  
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

