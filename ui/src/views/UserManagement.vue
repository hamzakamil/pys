<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Kullanıcı Yönetimi & Yetkilendirme</h1>
      <Button v-if="canCreateUser" @click="showUserModal = true">Yeni Kullanıcı</Button>
    </div>

    <!-- Filtreler -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div v-if="userRole === 'super_admin'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Bayi</label>
          <select
            v-model="filters.dealerId"
            @change="loadUsers"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Bayiler</option>
            <option v-for="dealer in dealers" :key="dealer._id" :value="dealer._id">
              {{ dealer.name }}
            </option>
          </select>
        </div>
        <div v-if="userRole === 'super_admin' || userRole === 'bayi_admin'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
          <select
            v-model="filters.companyId"
            @change="loadUsers"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Şirketler</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            v-model="filters.role"
            @change="loadUsers"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Roller</option>
            <option v-for="role in availableRoles" :key="role.name" :value="role.name">
              {{ role.description }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Arama</label>
          <input
            v-model="filters.search"
            @input="debounceSearch"
            type="text"
            placeholder="Email ile ara..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Hierarchical View (Super Admin için) -->
    <div v-if="userRole === 'super_admin' && !filters.dealerId && !filters.companyId && hierarchicalData" class="mb-6">
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="p-4 border-b">
          <h2 class="text-lg font-semibold text-gray-800">Hiyerarşik Görünüm</h2>
        </div>
        <div class="p-4 space-y-4 max-h-96 overflow-y-auto">
          <div v-for="dealerGroup in hierarchicalData" :key="dealerGroup.dealer._id" class="border-l-4 border-blue-500 pl-4">
            <h3 class="font-semibold text-gray-800 mb-2">
              🏢 {{ dealerGroup.dealer.name }}
              <span class="text-sm text-gray-500 ml-2">({{ dealerGroup.dealerUsers.length }} kullanıcı)</span>
            </h3>
            
            <!-- Bayi seviyesindeki kullanıcılar -->
            <div v-if="dealerGroup.dealerUsers.length > 0" class="ml-4 mb-3">
              <div v-for="user in dealerGroup.dealerUsers" :key="user._id" class="text-sm text-gray-600 mb-1">
                • {{ user.email }} - {{ user.role?.description }}
              </div>
            </div>

            <!-- Şirketler -->
            <div v-for="companyGroup in dealerGroup.companies" :key="companyGroup.company._id" class="ml-4 mt-3 border-l-2 border-gray-300 pl-4">
              <h4 class="font-medium text-gray-700 mb-1">
                📦 {{ companyGroup.company.name }}
                <span class="text-xs text-gray-500">({{ companyGroup.users.length }} kullanıcı)</span>
              </h4>
              <div v-for="user in companyGroup.users" :key="user._id" class="text-sm text-gray-600 mb-1 ml-2">
                • {{ user.email }} - {{ user.role?.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kullanıcı Tablosu -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bayi</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şirket</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in users" :key="user._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ user.email }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ user.role?.description || user.role?.name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ user.dealer?.name || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ user.company?.name || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                class="px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ user.isActive ? 'Aktif' : 'Pasif' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click="editUser(user)"
                class="text-blue-600 hover:text-blue-900 mr-4"
              >
                Düzenle
              </button>
              <button
                @click="manageRolePermissions(user)"
                class="text-green-600 hover:text-green-900 mr-4"
              >
                Rol & Yetki
              </button>
              <button
                v-if="canDeleteUser(user)"
                @click="deleteUser(user)"
                class="text-red-600 hover:text-red-900"
              >
                Sil
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Sayfalama -->
      <div v-if="pagination.pages > 1" class="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
        <div class="text-sm text-gray-700">
          Toplam {{ pagination.total }} kullanıcıdan {{ (pagination.page - 1) * pagination.limit + 1 }} - 
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }} arası gösteriliyor
        </div>
        <div class="flex gap-2">
          <Button
            variant="secondary"
            :disabled="pagination.page === 1"
            @click="changePage(pagination.page - 1)"
          >
            Önceki
          </Button>
          <Button
            variant="secondary"
            :disabled="pagination.page === pagination.pages"
            @click="changePage(pagination.page + 1)"
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>

    <!-- Rol & Yetki Yönetim Modal -->
    <div v-if="showRolePermissionModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
        <h2 class="text-xl font-bold mb-4">{{ selectedUser?.email }} - Rol & Yetki Yönetimi</h2>
        
        <div class="space-y-6">
          <!-- Rol Seçimi -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Rol</label>
            <select
              v-model="rolePermissionForm.roleId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Mevcut Rol: {{ selectedUser?.role?.description }}</option>
              <option
                v-for="role in availableRolesForAssignment"
                :key="role._id"
                :value="role._id"
              >
                {{ role.description }}
              </option>
            </select>
          </div>

          <!-- Yetki Seçimi -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Yetkiler</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
              <label
                v-for="permission in permissions"
                :key="permission._id"
                class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                :class="{ 'bg-blue-50 border-blue-300': rolePermissionForm.permissionIds.includes(permission._id) }"
              >
                <input
                  type="checkbox"
                  :value="permission._id"
                  v-model="rolePermissionForm.permissionIds"
                  class="mr-2"
                />
                <div class="flex-1">
                  <div class="font-medium text-sm text-gray-900">{{ permission.description }}</div>
                  <div class="text-xs text-gray-500">{{ permission.name }}</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Şirket Seçimi (Bayi Admin için) -->
          <div v-if="userRole === 'bayi_admin' && companies.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">Geçerli Şirketler (Yetkilerin geçerli olacağı şirketler)</label>
            <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
              <label
                v-for="company in companies"
                :key="company._id"
                class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                :class="{ 'bg-blue-50 border-blue-300': rolePermissionForm.companies.includes(company._id) }"
              >
                <input
                  type="checkbox"
                  :value="company._id"
                  v-model="rolePermissionForm.companies"
                  class="mr-2"
                />
                <span class="text-sm text-gray-900">{{ company.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-6 flex gap-2 justify-end">
          <Button variant="secondary" @click="closeRolePermissionModal">İptal</Button>
          <Button @click="saveRolePermissions" :disabled="savingRolePermissions">
            {{ savingRolePermissions ? 'Kaydediliyor...' : 'Kaydet' }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Kullanıcı Oluştur/Düzenle Modal -->
    <div v-if="showUserModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">{{ editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı' }}</h2>
        <form @submit.prevent="saveUser">
          <div class="space-y-4">
            <Input
              v-model="userForm.email"
              label="Email"
              type="email"
              required
              :disabled="!!editingUser"
            />
            
            <div v-if="!editingUser">
              <Input
                v-model="userForm.password"
                label="Şifre"
                type="password"
                :required="!editingUser"
              />
              <p class="text-xs text-gray-500 mt-1">Boş bırakılırsa kullanıcı ilk girişte şifre belirleyecektir</p>
            </div>
            <div v-else>
              <Input
                v-model="userForm.password"
                label="Yeni Şifre (Opsiyonel)"
                type="password"
              />
              <p class="text-xs text-gray-500 mt-1">Sadece değiştirmek istiyorsanız doldurun</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Rol <span class="text-red-500">*</span></label>
              <select
                v-model="userForm.roleName"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option
                  v-for="role in availableRolesForAssignment"
                  :key="role.name"
                  :value="role.name"
                >
                  {{ role.description }}
                </option>
              </select>
            </div>

            <div v-if="userRole === 'super_admin'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Bayi</label>
              <select
                v-model="userForm.dealerId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Bayi Seçiniz (Opsiyonel)</option>
                <option v-for="dealer in dealers" :key="dealer._id" :value="dealer._id">
                  {{ dealer.name }}
                </option>
              </select>
            </div>

            <div v-if="userRole === 'super_admin' || userRole === 'bayi_admin'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
              <select
                v-model="userForm.companyId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Şirket Seçiniz (Opsiyonel)</option>
                <option v-for="company in companies" :key="company._id" :value="company._id">
                  {{ company.name }}
                </option>
              </select>
            </div>

            <div class="flex items-center">
              <input
                v-model="userForm.isActive"
                type="checkbox"
                id="isActive"
                class="mr-2"
              />
              <label for="isActive" class="text-sm text-gray-700">Hesap Aktif</label>
            </div>

            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeUserModal">İptal</Button>
              <Button type="submit" :disabled="saving">{{ saving ? 'Kaydediliyor...' : 'Kaydet' }}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

const authStore = useAuthStore()
const users = ref([])
const dealers = ref([])
const companies = ref([])
const roles = ref([])
const permissions = ref([])
const hierarchicalData = ref(null)
const showUserModal = ref(false)
const showRolePermissionModal = ref(false)
const selectedUser = ref(null)
const editingUser = ref(null)
const saving = ref(false)
const savingRolePermissions = ref(false)
const pagination = ref({
  total: 0,
  page: 1,
  limit: 50,
  pages: 1
})

const filters = ref({
  dealerId: '',
  companyId: '',
  role: '',
  search: ''
})

const userForm = ref({
  email: '',
  password: '',
  roleName: '',
  dealerId: '',
  companyId: '',
  isActive: true
})

const rolePermissionForm = ref({
  roleId: '',
  permissionIds: [],
  companies: []
})

const userRole = computed(() => authStore.user?.role)

const canCreateUser = computed(() => {
  return ['super_admin', 'bayi_admin', 'company_admin'].includes(userRole.value)
})

const availableRoles = computed(() => {
  return roles.value.filter(r => r.isSystemRole)
})

const availableRolesForAssignment = computed(() => {
  if (!userRole.value) return []
  
  const roleHierarchy = {
    'super_admin': 1,
    'bayi_admin': 2,
    'bayi_yetkilisi': 3,
    'company_admin': 4,
    'resmi_muhasebe_ik': 5,
    'employee': 6
  }
  
  const currentLevel = roleHierarchy[userRole.value] || 999
  
  return roles.value.filter(role => {
    const roleLevel = roleHierarchy[role.name] || 999
    return role.isSystemRole && roleLevel > currentLevel
  })
})

const canDeleteUser = (user) => {
  if (!userRole.value) return false
  if (user._id === authStore.user?.id) return false // Kendini silemez
  
  const roleHierarchy = {
    'super_admin': 1,
    'bayi_admin': 2,
    'bayi_yetkilisi': 3,
    'company_admin': 4,
    'resmi_muhasebe_ik': 5,
    'employee': 6
  }
  
  const currentLevel = roleHierarchy[userRole.value] || 999
  const userRoleLevel = roleHierarchy[user.role?.name] || 999
  
  return userRoleLevel > currentLevel
}

let searchTimeout = null
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadUsers()
  }, 500)
}

const loadDealers = async () => {
  if (userRole.value !== 'super_admin') return
  
  try {
    const response = await api.get('/dealers')
    dealers.value = response.data || []
  } catch (error) {
    console.error('Bayiler yüklenemedi:', error)
  }
}

const loadCompanies = async () => {
  if (!['super_admin', 'bayi_admin'].includes(userRole.value)) return
  
  try {
    const response = await api.get('/companies')
    companies.value = response.data || []
    
    // Filtreleme: Bayi admin sadece kendi şirketlerini görür
    if (userRole.value === 'bayi_admin') {
      companies.value = companies.value.filter(c => c.dealer === authStore.user?.dealer)
    }
  } catch (error) {
    console.error('Şirketler yüklenemedi:', error)
  }
}

const loadRoles = async () => {
  try {
    const response = await api.get('/roles')
    if (response.data.success) {
      roles.value = response.data.data.filter(r => r.isSystemRole)
    }
  } catch (error) {
    console.error('Roller yüklenemedi:', error)
  }
}

const loadPermissions = async () => {
  if (!['super_admin', 'bayi_admin', 'company_admin'].includes(userRole.value)) return
  
  try {
    const response = await api.get('/permissions')
    if (response.data.success) {
      permissions.value = response.data.data
    }
  } catch (error) {
    console.error('Yetkiler yüklenemedi:', error)
  }
}

const loadUsers = async () => {
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    
    if (filters.value.dealerId) params.dealerId = filters.value.dealerId
    if (filters.value.companyId) params.companyId = filters.value.companyId
    if (filters.value.role) params.role = filters.value.role
    if (filters.value.search) params.search = filters.value.search
    
    const response = await api.get('/users', { params })
    
    if (response.data.success) {
      users.value = response.data.data
      hierarchicalData.value = response.data.hierarchical
      pagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('Kullanıcılar yüklenemedi:', error)
    alert(error.response?.data?.message || 'Kullanıcılar yüklenemedi')
  }
}

const changePage = (page) => {
  pagination.value.page = page
  loadUsers()
}

const editUser = (user) => {
  editingUser.value = user
  userForm.value = {
    email: user.email,
    password: '',
    roleName: user.role?.name || '',
    dealerId: user.dealer?._id || '',
    companyId: user.company?._id || '',
    isActive: user.isActive
  }
  showUserModal.value = true
}

const saveUser = async () => {
  saving.value = true
  try {
    const payload = {
      email: userForm.value.email,
      roleName: userForm.value.roleName,
      isActive: userForm.value.isActive
    }
    
    if (userForm.value.password) {
      payload.password = userForm.value.password
    }
    
    if (userRole.value === 'super_admin' && userForm.value.dealerId) {
      payload.dealerId = userForm.value.dealerId
    }
    
    if ((userRole.value === 'super_admin' || userRole.value === 'bayi_admin') && userForm.value.companyId) {
      payload.companyId = userForm.value.companyId
    }
    
    if (editingUser.value) {
      await api.put(`/users/${editingUser.value._id}`, payload)
    } else {
      await api.post('/users', payload)
    }
    
    closeUserModal()
    loadUsers()
  } catch (error) {
    console.error('Kullanıcı kaydetme hatası:', error)
    alert(error.response?.data?.message || 'Kullanıcı kaydedilemedi')
  } finally {
    saving.value = false
  }
}

const deleteUser = async (user) => {
  if (!confirm(`"${user.email}" kullanıcısını silmek istediğinizden emin misiniz?`)) {
    return
  }
  
  try {
    await api.delete(`/users/${user._id}`)
    loadUsers()
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error)
    alert(error.response?.data?.message || 'Kullanıcı silinemedi')
  }
}

const manageRolePermissions = async (user) => {
  selectedUser.value = user
  rolePermissionForm.value = {
    roleId: user.role?._id || '',
    permissionIds: [],
    companies: []
  }
  
  // Kullanıcının mevcut yetkilerini yükle
  try {
    const roleResponse = await api.get(`/roles/${user.role?._id}`)
    if (roleResponse.data.success && roleResponse.data.data.permissions) {
      rolePermissionForm.value.permissionIds = roleResponse.data.data.permissions
        .map(p => p.permission._id)
        .filter(id => id)
    }
  } catch (error) {
    console.error('Rol yetkileri yüklenemedi:', error)
  }
  
  showRolePermissionModal.value = true
}

const saveRolePermissions = async () => {
  savingRolePermissions.value = true
  try {
    await api.post(`/users/${selectedUser.value._id}/assign-role-permissions`, {
      roleId: rolePermissionForm.value.roleId || null,
      permissionIds: rolePermissionForm.value.permissionIds,
      companies: rolePermissionForm.value.companies
    })
    
    closeRolePermissionModal()
    loadUsers()
  } catch (error) {
    console.error('Rol ve yetki kaydetme hatası:', error)
    alert(error.response?.data?.message || 'Rol ve yetkiler kaydedilemedi')
  } finally {
    savingRolePermissions.value = false
  }
}

const closeRolePermissionModal = () => {
  showRolePermissionModal.value = false
  selectedUser.value = null
  rolePermissionForm.value = {
    roleId: '',
    permissionIds: [],
    companies: []
  }
}

const closeUserModal = () => {
  showUserModal.value = false
  editingUser.value = null
  userForm.value = {
    email: '',
    password: '',
    roleName: '',
    dealerId: '',
    companyId: '',
    isActive: true
  }
}

watch(() => filters.value.dealerId, () => {
  if (userRole.value === 'super_admin') {
    loadCompanies()
  }
})

onMounted(async () => {
  await loadRoles()
  await loadPermissions()
  await loadDealers()
  await loadCompanies()
  await loadUsers()
})
</script>

<style scoped>
</style>

