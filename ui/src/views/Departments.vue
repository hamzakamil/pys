<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Departmanlar</h1>
      <Button @click="showModal = true">Yeni Departman Ekle</Button>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="p-6">
        <!-- Merkez departmanı özel gösterim (Varsayılan, Aktif) -->
        <div v-if="merkezDepartment" class="mb-6">
          <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg mb-2 border-2 border-green-200">
            <div class="flex items-center">
              <span class="text-lg font-semibold text-gray-800">{{ merkezDepartment.name }}</span>
              <span class="ml-3 text-sm text-gray-600">(Varsayılan departman - aktif)</span>
              <span v-if="merkezDepartment.workingHours" class="ml-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Mesai: {{ merkezDepartment.workingHours.name }}
              </span>
              <span v-if="merkezDepartment.manager" class="ml-3 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                Yönetici: {{ merkezDepartment.manager.firstName }} {{ merkezDepartment.manager.lastName }}
              </span>
            </div>
            <div class="flex gap-2">
              <button @click="editDepartment(merkezDepartment)" class="text-indigo-600 hover:text-indigo-900 text-sm">Düzenle</button>
              <!-- Merkez silinemez -->
            </div>
          </div>
          <!-- Merkez alt departmanlar (aktif) -->
          <div v-if="getActiveChildDepartments(merkezDepartment._id).length > 0" class="ml-6 space-y-2">
            <div
              v-for="childDept in getActiveChildDepartments(merkezDepartment._id)"
              :key="childDept._id"
              class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
            >
              <div class="flex items-center">
                <span class="text-gray-700">└─ {{ childDept.name }}</span>
                <span v-if="childDept.description" class="ml-3 text-sm text-gray-500">({{ childDept.description }})</span>
                <span v-if="childDept.workingHours" class="ml-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Mesai: {{ childDept.workingHours.name }}
                </span>
                <span v-if="childDept.manager" class="ml-3 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  Yönetici: {{ childDept.manager.firstName }} {{ childDept.manager.lastName }}
                </span>
              </div>
              <div class="flex gap-2">
                <button @click="editDepartment(childDept)" class="text-indigo-600 hover:text-indigo-900 text-sm">Düzenle</button>
                <button @click="deleteDepartment(childDept._id)" class="text-red-600 hover:text-red-900 text-sm">Sil</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Aktif ana departmanlar (Merkez hariç) -->
        <div v-for="parentDept in activeParentDepartments" :key="parentDept._id" class="mb-6">
          <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg mb-2 border border-green-200">
            <div class="flex items-center">
              <span class="text-lg font-semibold text-gray-800">{{ parentDept.name }}</span>
              <span v-if="parentDept.description" class="ml-3 text-sm text-gray-600">({{ parentDept.description }})</span>
              <span v-if="parentDept.workingHours" class="ml-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Mesai: {{ parentDept.workingHours.name }}
              </span>
              <span v-if="parentDept.manager" class="ml-3 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                Yönetici: {{ parentDept.manager.firstName }} {{ parentDept.manager.lastName }}
              </span>
            </div>
            <div class="flex gap-2">
              <button @click="editDepartment(parentDept)" class="text-indigo-600 hover:text-indigo-900 text-sm">Düzenle</button>
              <button @click="deleteDepartment(parentDept._id)" class="text-red-600 hover:text-red-900 text-sm">Sil</button>
            </div>
          </div>
          <!-- Alt departmanlar (aktif) -->
          <div v-if="getActiveChildDepartments(parentDept._id).length > 0" class="ml-6 space-y-2">
            <div
              v-for="childDept in getActiveChildDepartments(parentDept._id)"
              :key="childDept._id"
              class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
            >
              <div class="flex items-center">
                <span class="text-gray-700">└─ {{ childDept.name }}</span>
                <span v-if="childDept.description" class="ml-3 text-sm text-gray-500">({{ childDept.description }})</span>
                <span v-if="childDept.workingHours" class="ml-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Mesai: {{ childDept.workingHours.name }}
                </span>
                <span v-if="childDept.manager" class="ml-3 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  Yönetici: {{ childDept.manager.firstName }} {{ childDept.manager.lastName }}
                </span>
              </div>
              <div class="flex gap-2">
                <button @click="editDepartment(childDept)" class="text-indigo-600 hover:text-indigo-900 text-sm">Düzenle</button>
                <button @click="deleteDepartment(childDept._id)" class="text-red-600 hover:text-red-900 text-sm">Sil</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pasif departmanlar (Örnek) -->
        <div v-if="inactiveDepartments.length > 0" class="mt-8">
          <h3 class="text-md font-semibold text-gray-700 mb-3">Örnek Departmanlar (Pasif)</h3>
          <div class="space-y-2">
            <div
              v-for="dept in inactiveDepartments"
              :key="dept._id"
              class="flex items-center justify-between p-3 rounded-lg"
              :class="dept.parentDepartment ? 'ml-6 bg-blue-50 border border-blue-200' : 'bg-blue-50 border border-blue-200'"
            >
              <div class="flex items-center">
                <span v-if="dept.parentDepartment" class="text-gray-600 mr-2">└─</span>
                <span class="text-gray-700">{{ dept.name }}</span>
                <span v-if="dept.description" class="ml-3 text-sm text-gray-500">({{ dept.description }})</span>
              </div>
              <div class="flex gap-2">
                <button @click="activateDepartment(dept._id)" class="text-green-600 hover:text-green-900 text-sm">Aktif Et</button>
                <button @click="editDepartment(dept)" class="text-indigo-600 hover:text-indigo-900 text-sm">Düzenle</button>
                <button @click="deleteDepartment(dept._id)" class="text-red-600 hover:text-red-900 text-sm">Sil</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Parent olmayan departmanlar (top-level) -->
        <div v-if="topLevelDepartments.length > 0" class="mt-6">
          <h3 class="text-md font-semibold text-gray-700 mb-3">Diğer Departmanlar</h3>
          <div class="space-y-2">
            <div
              v-for="dept in topLevelDepartments"
              :key="dept._id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center">
                <span class="text-gray-700">{{ dept.name }}</span>
                <span v-if="dept.description" class="ml-3 text-sm text-gray-500">({{ dept.description }})</span>
                <span v-if="dept.workingHours" class="ml-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Mesai: {{ dept.workingHours.name }}
                </span>
                <span v-if="dept.manager" class="ml-3 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  Yönetici: {{ dept.manager.firstName }} {{ dept.manager.lastName }}
                </span>
              </div>
              <div class="flex gap-2">
                <button @click="editDepartment(dept)" class="text-indigo-600 hover:text-indigo-900 text-sm">Düzenle</button>
                <button @click="deleteDepartment(dept._id)" class="text-red-600 hover:text-red-900 text-sm">Sil</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Boş durum -->
        <div v-if="departments.length === 0" class="text-center py-8 text-gray-500">
          Henüz departman eklenmemiş
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">{{ editingDepartment ? 'Departman Düzenle' : 'Yeni Departman Ekle' }}</h2>
        <form @submit.prevent="saveDepartment">
          <div class="space-y-4">
            <Input v-model="form.name" label="Departman Adı" required />
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Üst Departman (Opsiyonel)</label>
              <select
                v-model="form.parent"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                :disabled="editingDepartment && editingDepartment.name === 'Merkez'"
              >
                <option value="">Üst departman yok (Ana departman)</option>
                <option
                  v-for="dept in availableParents"
                  :key="dept._id"
                  :value="dept._id"
                >
                  {{ dept.name }}
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                <span v-if="editingDepartment && editingDepartment.name === 'Merkez'">
                  Merkez departmanı ana departmandır, üst departman seçilemez.
                </span>
                <span v-else>
                  Boş bırakılırsa ana departman olarak oluşturulur. Merkez departmanı altına da departman ekleyebilirsiniz.
                </span>
              </p>
            </div>
            <Textarea v-model="form.description" label="Açıklama" />
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Mesai Saatleri (Opsiyonel)</label>
              <select
                v-model="form.workingHours"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Mesai saati seçilmedi</option>
                <option
                  v-for="wh in availableWorkingHours"
                  :key="wh._id"
                  :value="wh._id"
                >
                  {{ wh.name }}
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Bu departman altındaki çalışanlar seçilen mesai saatlerine göre çalışacak</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Departman Yöneticisi (Opsiyonel)</label>
              <select
                v-model="form.manager"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Yönetici seçilmedi</option>
                <option
                  v-for="emp in availableEmployees"
                  :key="emp._id"
                  :value="emp._id"
                >
                  {{ emp.firstName }} {{ emp.lastName }} {{ emp.position ? `(${emp.position})` : '' }}
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                Bu departman ve alt departmanlardaki çalışanların izin talepleri bu yöneticiye iletilecektir.
              </p>
            </div>
            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="closeModal">İptal</Button>
              <Button type="submit">Kaydet</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'

const departments = ref([])
const workingHoursList = ref([])
const employees = ref([]) // Tüm çalışanlar (manager seçimi için)
const showModal = ref(false)
const editingDepartment = ref(null)
const form = ref({
  name: '',
  parentDepartment: '',
  description: '',
  workingHours: '',
  manager: ''
})

// Hiyerarşik görünüm için computed properties
const parentDepartments = computed(() => {
  return departments.value.filter(dept => !dept.parent)
})

const merkezDepartment = computed(() => {
  return departments.value.find(dept => dept.isDefault === true)
})

const activeParentDepartments = computed(() => {
  // Aktif, Merkez olmayan, parent olmayan departmanlar
  return departments.value.filter(dept => 
    dept.isActive === true &&
    !dept.isDefault &&
    (!dept.parentDepartment || (typeof dept.parentDepartment === 'object' && !dept.parentDepartment._id))
  )
})

const inactiveDepartments = computed(() => {
  // Pasif departmanlar (ağaç yapısı korunarak)
  return departments.value.filter(dept => dept.isActive === false)
})

const getActiveChildDepartments = (parentId) => {
  return departments.value.filter(dept => {
    if (!dept.isActive) return false
    const parent = dept.parentDepartment || dept.parent
    if (!parent) return false
    const parentIdValue = typeof parent === 'object' ? parent._id : parent
    return parentIdValue === parentId || parentIdValue === parentId.toString()
  })
}

const getChildDepartments = (parentId) => {
  return departments.value.filter(dept => {
    const parent = dept.parentDepartment || dept.parent
    if (!parent) return false
    const parentIdValue = typeof parent === 'object' ? parent._id : parent
    return parentIdValue === parentId || parentIdValue === parentId.toString()
  })
}

const availableParents = computed(() => {
  // Düzenleme modunda, mevcut departmanı ve alt departmanlarını hariç tut
  if (editingDepartment.value) {
    return departments.value.filter(dept => {
      const parent = dept.parentDepartment || dept.parent
      return dept._id !== editingDepartment.value._id &&
        (!parent || (typeof parent === 'object' ? parent._id : parent) !== editingDepartment.value._id)
    })
  }
  return departments.value.filter(dept => !dept.parentDepartment && !dept.parent)
})

const availableWorkingHours = computed(() => {
  return workingHoursList.value
})

const availableEmployees = computed(() => {
  return employees.value
})

const loadDepartments = async () => {
  try {
    const response = await api.get('/departments')
    departments.value = response.data
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error)
  }
}

const loadWorkingHours = async () => {
  try {
    const response = await api.get('/working-hours')
    workingHoursList.value = response.data
  } catch (error) {
    console.error('Çalışma saatleri yüklenemedi:', error)
  }
}

const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    employees.value = response.data || []
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
  }
}

const saveDepartment = async () => {
  try {
    if (editingDepartment.value) {
      await api.put(`/departments/${editingDepartment.value._id}`, form.value)
    } else {
      await api.post('/departments', form.value)
    }
    closeModal()
    loadDepartments()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  }
}

const editDepartment = (department) => {
  editingDepartment.value = department
  form.value = {
    name: department.name,
    parentDepartment: department.parentDepartment?._id || department.parentDepartment || department.parent?._id || department.parent || '',
    description: department.description || '',
    workingHours: department.workingHours?._id || department.workingHours || '',
    manager: department.manager?._id || department.manager || ''
  }
  showModal.value = true
}

const deleteDepartment = async (id) => {
  const dept = departments.value.find(d => d._id === id)
  if (dept && dept.isDefault) {
    alert('Varsayılan departman (Merkez) silinemez. İsterseniz ismini değiştirebilirsiniz.')
    return
  }
  
  // Alt departman kontrolü
  const children = getChildDepartments(id)
  if (children.length > 0) {
    alert('Bu departmana bağlı alt departmanlar bulunmaktadır. Önce alt departmanları kaldırın.')
    return
  }
  
  if (confirm('Bu departmanı silmek istediğinize emin misiniz? Bu departmandaki çalışanlar üst departmana veya Merkez departmanına taşınacaktır.')) {
    try {
      await api.delete(`/departments/${id}`)
      loadDepartments()
    } catch (error) {
      alert(error.response?.data?.message || 'Hata oluştu')
    }
  }
}

const activateDepartment = async (id) => {
  try {
    await api.post(`/departments/${id}/activate`)
    loadDepartments()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  }
}

const closeModal = () => {
  showModal.value = false
  editingDepartment.value = null
  form.value = {
    name: '',
    parentDepartment: '',
    description: '',
    workingHours: '',
    manager: ''
  }
}

onMounted(() => {
  loadDepartments()
  loadWorkingHours()
  loadEmployees()
})
</script>

