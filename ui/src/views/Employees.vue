<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Çalışanlar</h1>
      <div class="flex gap-2">
        <Button variant="secondary" @click="showImportModal = true">Excel'den İçe Aktar</Button>
        <Button @click="showModal = true">Yeni Çalışan Ekle</Button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan Sıra No</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personel Numarası</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adı Soyadı</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TC Kimlik No</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Görevi</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departman</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşe Giriş Tarihi</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durumu</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(employee, index) in sortedEmployees" :key="employee._id">
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                <span class="font-medium">{{ employee.employeeNumber || '-' }}</span>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                <input
                  v-model="employee.personelNumarasi"
                  @blur="updatePersonelNumarasi(employee)"
                  type="text"
                  class="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="A100, 2025-01..."
                />
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{{ employee.firstName }} {{ employee.lastName }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ employee.tcKimlik || '-' }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ employee.position || '-' }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ employee.department?.name }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ employee.phone || '-' }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ employee.email }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ employee.hireDate ? formatDate(employee.hireDate) : '-' }}
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm">
                <span v-if="employee.status === 'separated'" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                  (Ayrılmış) — {{ employee.separationDate ? formatDate(employee.separationDate) : '' }} — {{ employee.separationReason || employee.exitReason || 'İstifa' }}
                </span>
                <span v-else-if="employee.status === 'active'" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Aktif
                </span>
                <button
                  v-if="!employee.isActivated"
                  @click="sendActivationLink(employee._id)"
                  :disabled="sendingActivation === employee._id"
                  class="text-blue-600 hover:text-blue-900 text-xs disabled:opacity-50 underline"
                >
                  {{ sendingActivation === employee._id ? 'Gönderiliyor...' : 'Aktivasyon Email Gönder' }}
                </button>
                <span v-else class="text-green-600 text-xs font-medium">Aktif</span>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm font-medium">
                <button @click="editEmployee(employee)" class="text-indigo-600 hover:text-indigo-900 mr-4">Düzenle</button>
                <button @click="showLeaveRequestModal(employee)" class="text-green-600 hover:text-green-900 mr-4">İzin Talebi Ekle</button>
                <button @click="deleteEmployee(employee._id)" class="text-red-600 hover:text-red-900">Sil</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Toplu Aktivasyon Butonu -->
      <div v-if="inactiveEmployees.length > 0" class="p-4 bg-gray-50 border-t">
        <div class="flex justify-between items-center">
          <p class="text-sm text-gray-600">
            {{ inactiveEmployees.length }} çalışan için aktivasyon linki gönderilebilir
          </p>
          <Button
            @click="sendBulkActivationLinks"
            :disabled="sendingBulkActivation"
            variant="secondary"
          >
            {{ sendingBulkActivation ? 'Gönderiliyor...' : 'Toplu Aktivasyon Linki Gönder' }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Employee Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">{{ editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle' }}</h2>
        <form @submit.prevent="saveEmployee">
          <div class="space-y-4">
            <div v-if="isSuperAdmin || isBayiAdmin">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Şirket <span class="text-red-500">*</span>
              </label>
              <select 
                v-model="form.company" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
                @change="loadDepartmentsForCompany"
              >
                <option value="">Seçiniz</option>
                <option v-for="comp in companies" :key="comp._id" :value="comp._id">{{ comp.name }}</option>
              </select>
              <p v-if="isBayiAdmin && !form.company" class="mt-1 text-xs text-yellow-600">
                Lütfen işlem yapmak istediğiniz şirketi seçiniz.
              </p>
            </div>
            <!-- Çalışan Sıra No (Read-only, gösterim amaçlı) -->
            <div v-if="editingEmployee">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Çalışan Sıra No
              </label>
              <input
                :value="editingEmployee.employeeNumber || '-'"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p class="mt-1 text-xs text-gray-500">
                Çalışan sıra numarası otomatik atanır ve değiştirilemez.
              </p>
            </div>
            
            <Input v-model="form.firstName" label="Ad" required />
            <Input v-model="form.lastName" label="Soyad" required />
            <Input v-model="form.email" type="email" label="Email" required />
            
            <!-- Personel Numarası (Manuel, opsiyonel) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Personel Numarası (Opsiyonel)
              </label>
              <input
                v-model="form.personelNumarasi"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A100, 2025-01, MHSB-07..."
              />
              <p class="mt-1 text-xs text-gray-500">
                İsterseniz manuel personel numarası girebilirsiniz. Alfanumerik format kabul edilir.
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">TC Kimlik No</label>
              <input
                v-model="form.tcKimlik"
                @input="formatTCKimlik"
                type="text"
                maxlength="11"
                placeholder="11 haneli TC Kimlik No"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p v-if="form.tcKimlik && form.tcKimlik.replace(/\D/g, '').length !== 11" class="mt-1 text-xs text-red-600">
                TC Kimlik No 11 haneli olmalıdır
              </p>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-sm font-medium text-gray-700">Görevi (mesleği) <span class="text-red-500">*</span></label>
                <a
                  href="https://www.turmob.org.tr/arsiv/mbs/resmigazete/-MeslekAd%C4%B1veKodralri.pdf"
                  target="_blank"
                  class="text-xs text-blue-600 hover:text-blue-800 underline"
                  download
                >
                  📥 SGK Meslek Kodları Listesi İndir
                </a>
              </div>
              <input
                v-model="form.position"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Görevi (mesleği) giriniz"
              />
              <p class="mt-1 text-xs text-gray-500">
                İndirilen meslek kodlarından uygun olanı yazabilirsiniz.
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cep Numarası</label>
              <input
                v-model="form.phone"
                @input="formatPhone"
                type="text"
                maxlength="15"
                placeholder="0 555 555 55 55"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p v-if="form.phone && form.phone.replace(/\s/g, '').replace(/\D/g, '').length !== 0 && form.phone.replace(/\s/g, '').replace(/\D/g, '').length !== 11" class="mt-1 text-xs text-red-600">
                Cep numarası 11 haneli olmalıdır (0 555 555 55 55)
              </p>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  İşe Başlama Tarihi <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.hireDate"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="mt-1 text-xs text-yellow-600" v-if="!form.hireDate">
                  ⚠️ Bu bilgi olmadan yıllık izin gün sayıları hesaplanamaz
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Doğum Tarihi <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.birthDate"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="mt-1 text-xs text-yellow-600" v-if="!form.birthDate">
                  ⚠️ Bu bilgi olmadan yıllık izin gün sayıları hesaplanamaz
                </p>
              </div>
            </div>
            <!-- Workplace (SGK İşyeri) - Zorunlu -->
            <div v-if="showWorkplaceField || (form.company && workplaces.length > 0)">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                SGK İşyeri <span class="text-red-500">*</span>
              </label>
              <select 
                v-model="form.workplace" 
                @change="loadSectionsForWorkplace"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required
                :disabled="!form.company && (isSuperAdmin || isBayiAdmin)"
              >
                <option value="">Seçiniz</option>
                <option v-for="wp in workplaces" :key="wp._id" :value="wp._id">
                  {{ wp.name }}
                </option>
              </select>
              <p v-if="isBayiAdmin && form.company && workplaces.length > 1 && !form.workplace" class="mt-1 text-xs text-yellow-600">
                Bu şirket birden fazla SGK işyerine sahiptir. Lütfen SGK işyerini seçiniz.
              </p>
            </div>
            
            <!-- WorkplaceSection (İşyeri Bölümü) - Opsiyonel -->
            <div v-if="showWorkplaceSectionField || (form.workplace && workplaceSections.length > 0)">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Bölüm / Kısım 
                <span v-if="workplaceSections.length > 1" class="text-red-500">*</span>
              </label>
              <select 
                v-model="form.workplaceSection" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                :required="workplaceSections.length > 1"
                :disabled="!form.workplace"
              >
                <option value="">Seçiniz</option>
                <option v-for="section in workplaceSections" :key="section._id" :value="section._id">
                  {{ section.name }}
                </option>
              </select>
              <p v-if="isBayiAdmin && form.workplace && workplaceSections.length > 1 && !form.workplaceSection" class="mt-1 text-xs text-yellow-600">
                Bu SGK işyerinde birden fazla bölüm bulunmaktadır. Lütfen bölüm seçiniz.
              </p>
            </div>
            
            <!-- Department (Departman) - Opsiyonel -->
            <div v-if="showDepartmentField">
              <label class="block text-sm font-medium text-gray-700 mb-1">Departman</label>
              <select 
                v-model="form.department" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                :disabled="!form.company && (isSuperAdmin || isBayiAdmin)"
              >
                <option value="">Seçiniz (Opsiyonel)</option>
                <option v-for="dept in departments" :key="dept._id" :value="dept._id">{{ dept.name }}</option>
              </select>
            </div>
            
            <!-- Manager (Üst Yönetici) - Opsiyonel -->
            <div v-if="form.company">
              <label class="block text-sm font-medium text-gray-700 mb-1">Üst Yönetici (Opsiyonel)</label>
              <select 
                v-model="form.manager" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                :disabled="!form.company"
              >
                <option value="">Seçiniz (Opsiyonel)</option>
                <option v-for="emp in availableManagers" :key="emp._id" :value="emp._id">
                  {{ emp.firstName }} {{ emp.lastName }} {{ emp.position ? `(${emp.position})` : '' }}
                </option>
              </select>
              <p class="mt-1 text-xs text-gray-500">
                Çalışanın direkt üst yöneticisini seçin. Departman yöneticisi otomatik olarak belirlenir.
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

    <!-- Leave Request Modal -->
    <div v-if="showLeaveRequestModalFlag" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">İzin Talebi Ekle - {{ selectedEmployeeForLeave ? `${selectedEmployeeForLeave.firstName} ${selectedEmployeeForLeave.lastName}` : '' }}</h2>
        <form @submit.prevent="saveLeaveRequest">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">İzin Türü <span class="text-red-500">*</span></label>
              <select
                v-model="leaveRequestForm.companyLeaveType"
                @change="handleLeaveTypeChange"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option v-for="type in leaveTypes" :key="type._id" :value="type._id">
                  {{ type.name }}
                </option>
              </select>
            </div>
            
            <!-- Alt izin türü -->
            <div v-if="selectedLeaveType?.isOtherCategory && filteredLeaveSubTypes.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1">Alt İzin Türü <span class="text-red-500">*</span></label>
              <select
                v-model="leaveRequestForm.leaveSubType"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçiniz</option>
                <option v-for="subType in filteredLeaveSubTypes" :key="subType._id" :value="subType._id">
                  {{ subType.name }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi <span class="text-red-500">*</span></label>
                <input
                  v-model="leaveRequestForm.startDate"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi <span class="text-red-500">*</span></label>
                <input
                  v-model="leaveRequestForm.endDate"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                v-model="leaveRequestForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <div class="flex gap-2 justify-end">
              <Button type="button" variant="secondary" @click="closeLeaveRequestModal">İptal</Button>
              <Button type="submit" :disabled="savingLeaveRequest">
                {{ savingLeaveRequest ? 'Kaydediliyor...' : 'Kaydet' }}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">Excel'den İçe Aktar</h2>
        <div class="space-y-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-blue-800 mb-2">Şablon Excel Dosyası İndir</h3>
            <Button @click="downloadTemplate" variant="secondary" class="w-full">
              📥 Şablon Excel Dosyasını İndir
            </Button>
          </div>
          
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-yellow-800 mb-2">Zorunlu Alanlar:</h3>
            <ul class="text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Adı</li>
              <li>Soyadı</li>
              <li>TC Kimlik No</li>
              <li>İşe Giriş Tarihi</li>
              <li>Doğum Tarihi</li>
              <li>Görevi</li>
              <li>Email Adresi</li>
              <li>Telefon Numarası</li>
            </ul>
            <p class="text-xs text-yellow-600 mt-2">
              ⚠️ Bu alanlar eksik ise yükleme içeri aktarılmaz.
            </p>
          </div>

          <form @submit.prevent="importEmployees">
            <div class="space-y-4">
              <div v-if="isSuperAdmin || isBayiAdmin">
                <label class="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
                <select v-model="importCompany" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Seçiniz</option>
                  <option v-for="comp in companies" :key="comp._id" :value="comp._id">{{ comp.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Excel Dosyası</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  @change="handleFileChange"
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
              </div>
              <div class="flex gap-2 justify-end">
                <Button variant="secondary" @click="showImportModal = false">İptal</Button>
                <Button type="submit" :disabled="importing">{{ importing ? 'İçe Aktarılıyor...' : 'İçe Aktar' }}</Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

const router = useRouter()

const authStore = useAuthStore()
const employees = ref([])
const departments = ref([])
const companies = ref([])
const workplaces = ref([])
const workplaceSections = ref([])
const allEmployees = ref([]) // Tüm çalışanlar (manager seçimi için)
const showModal = ref(false)
const showImportModal = ref(false)
const editingEmployee = ref(null)
const importing = ref(false)
const importFile = ref(null)
const importCompany = ref('')
const sendingActivation = ref(null)
const sendingBulkActivation = ref(false)
const showLeaveRequestModalFlag = ref(false)
const selectedEmployeeForLeave = ref(null)
const savingLeaveRequest = ref(false)
const leaveTypes = ref([])
const leaveSubTypes = ref([])
const leaveRequestForm = ref({
  companyLeaveType: '',
  leaveSubType: '',
  startDate: '',
  endDate: '',
  description: ''
})
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  tcKimlik: '',
  position: '',
  workplace: '',
  workplaceSection: '',
  department: '',
  company: '',
  manager: '',
  hireDate: '',
  birthDate: ''
})
// #region agent log
fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:form-init',message:'Form initialized',data:{formValue:form.value,hasPosition:!!form.value.position,positionValue:form.value.position,positionType:typeof form.value.position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
// #endregion

const isSuperAdmin = computed(() => authStore.user?.role === 'super_admin')
const isBayiAdmin = computed(() => authStore.user?.role === 'bayi_admin')
const inactiveEmployees = computed(() => employees.value.filter(emp => !emp.isActivated))

// Sıra numarasına göre sıralanmış çalışanlar (employeeNumber yoksa createdAt'e göre)
const sortedEmployees = computed(() => {
  return [...employees.value].sort((a, b) => {
    // Önce employeeNumber'a göre sırala (varsa)
    if (a.employeeNumber && b.employeeNumber) {
      return a.employeeNumber.localeCompare(b.employeeNumber, undefined, { numeric: true, sensitivity: 'base' })
    }
    if (a.employeeNumber) return -1
    if (b.employeeNumber) return 1
    // employeeNumber yoksa createdAt'e göre sırala
    return new Date(a.createdAt) - new Date(b.createdAt)
  })
})

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const updatePersonelNumarasi = async (employee) => {
  try {
    await api.put(`/employees/${employee._id}`, {
      personelNumarasi: employee.personelNumarasi || undefined
    })
    // Başarılı güncelleme için liste yenilenmez, sadece local state güncellenir
  } catch (error) {
    console.error('Personel numarası güncellenemedi:', error)
    alert(error.response?.data?.message || 'Personel numarası güncellenemedi')
    // Hata durumunda listeyi yeniden yükle
    loadEmployees()
  }
}

const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    employees.value = response.data
    // Manager seçimi için de kullanılacak
    allEmployees.value = response.data
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
  }
}

const loadDepartments = async () => {
  try {
    const response = await api.get('/departments')
    departments.value = response.data
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error)
  }
}

const loadDepartmentsForCompany = async () => {
  if (form.value.company) {
    try {
      const response = await api.get(`/departments?company=${form.value.company}`)
      departments.value = response.data
    } catch (error) {
      console.error('Departmanlar yüklenemedi:', error)
      departments.value = []
    }
    // Workplace'leri yükle
    await loadWorkplacesForCompany()
    // Çalışanları yükle (manager seçimi için)
    await loadEmployeesForCompany()
  } else {
    departments.value = []
    workplaces.value = []
    workplaceSections.value = []
    allEmployees.value = []
  }
  form.value.department = '' // Reset department when company changes
  form.value.workplace = '' // Reset workplace when company changes
  form.value.workplaceSection = '' // Reset section when company changes
  form.value.manager = '' // Reset manager when company changes
}

const loadEmployeesForCompany = async () => {
  if (form.value.company) {
    try {
      const response = await api.get(`/employees?company=${form.value.company}`)
      allEmployees.value = response.data || []
    } catch (error) {
      console.error('Çalışanlar yüklenemedi:', error)
      allEmployees.value = []
    }
  }
}

const loadWorkplacesForCompany = async () => {
  if (form.value.company) {
    try {
      const response = await api.get(`/workplaces?company=${form.value.company}`)
      workplaces.value = response.data || []
      
      // Eğer sadece 1 workplace varsa otomatik seç
      if (workplaces.value.length === 1) {
        form.value.workplace = workplaces.value[0]._id
        await loadSectionsForWorkplace()
      } else {
        form.value.workplace = ''
        workplaceSections.value = []
        form.value.workplaceSection = ''
      }
    } catch (error) {
      console.error('İşyerleri yüklenemedi:', error)
      workplaces.value = []
    }
  }
}

const loadSectionsForWorkplace = async () => {
  if (form.value.workplace) {
    try {
      const response = await api.get(`/workplaces/${form.value.workplace}/sections`)
      workplaceSections.value = response.data || []
      
      // Eğer sadece 1 section varsa otomatik seç
      if (workplaceSections.value.length === 1) {
        form.value.workplaceSection = workplaceSections.value[0]._id
      } else {
        form.value.workplaceSection = ''
      }
    } catch (error) {
      console.error('İşyeri bölümleri yüklenemedi:', error)
      workplaceSections.value = []
    }
  } else {
    workplaceSections.value = []
    form.value.workplaceSection = ''
  }
}

// Computed properties for form visibility
const showWorkplaceField = computed(() => {
  // Bayi admin veya super admin için şirket seçilmişse ve birden fazla workplace varsa göster
  if ((isSuperAdmin.value || isBayiAdmin.value) && form.value.company) {
    return workplaces.value.length > 1
  }
  // Company admin için her zaman göster (tek olsa bile)
  return workplaces.value.length > 0
})

const showWorkplaceSectionField = computed(() => {
  // İşyeri seçilmişse ve birden fazla bölüm varsa göster
  if (form.value.workplace) {
    return workplaceSections.value.length > 1
  }
  return false
})

const showDepartmentField = computed(() => {
  return departments.value.length > 0
})

// Manager seçimi için mevcut çalışanlar (düzenleme sırasında kendisi hariç)
const availableManagers = computed(() => {
  if (!form.value.company) return []
  return allEmployees.value.filter(emp => {
    // Aynı şirkette olmalı
    if (emp.company?._id !== form.value.company && emp.company !== form.value.company) return false
    // Düzenleme sırasında kendisi hariç
    if (editingEmployee.value && emp._id === editingEmployee.value._id) return false
    return true
  })
})

// İzin talebi için computed properties
const selectedLeaveType = computed(() => {
  return leaveTypes.value.find(t => t._id === leaveRequestForm.value.companyLeaveType)
})

const filteredLeaveSubTypes = computed(() => {
  if (!selectedLeaveType.value?.isOtherCategory) {
    return []
  }
  return leaveSubTypes.value.filter(st => 
    st.parentLeaveType && 
    st.parentLeaveType.toString() === selectedLeaveType.value._id.toString()
  )
})

const loadCompanies = async () => {
  if (isSuperAdmin.value || isBayiAdmin.value) {
    try {
      const response = await api.get('/companies')
      companies.value = response.data
    } catch (error) {
      console.error('Şirketler yüklenemedi:', error)
    }
  }
}

const saveEmployee = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:378',message:'saveEmployee entry',data:{formValue:form.value,formPosition:form.value.position,formPositionType:typeof form.value.position,formPositionUndefined:form.value.position===undefined,formPositionNull:form.value.position===null,editingEmployee:editingEmployee.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:383',message:'Before validation checks',data:{hasFirstName:!!form.value.firstName,hasLastName:!!form.value.lastName,hasEmail:!!form.value.email,hasPosition:!!form.value.position,positionValue:form.value.position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Validation
    if (!form.value.firstName || form.value.firstName.trim() === '') {
      alert('Ad gereklidir')
      return
    }
    if (!form.value.lastName || form.value.lastName.trim() === '') {
      alert('Soyad gereklidir')
      return
    }
    if (!form.value.email || form.value.email.trim() === '') {
      alert('Email gereklidir')
      return
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:396',message:'Before position validation',data:{positionExists:!!form.value.position,positionType:typeof form.value.position,positionValue:form.value.position,willCallTrim:!!form.value.position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!form.value.position || (form.value.position && form.value.position.trim() === '')) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:397',message:'Position validation failed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      alert('Görevi gereklidir')
      return
    }
    
    // Bayi admin için şirket kontrolü
    if (isBayiAdmin.value && !form.value.company) {
      alert('Lütfen işlem yapmak istediğiniz şirketi seçiniz.')
      return
    }
    
    // Workplace zorunlu kontrolü
    let finalWorkplace = form.value.workplace
    if (!finalWorkplace) {
      // Eğer tek workplace varsa otomatik seçilmiş olmalı, kontrol et
      if (workplaces.value.length === 1) {
        finalWorkplace = workplaces.value[0]._id
      } else if (workplaces.value.length > 1) {
        if (isBayiAdmin.value) {
          alert('Bu şirket birden fazla SGK işyerine sahiptir. Lütfen SGK işyerini seçiniz.')
        } else {
          alert('SGK İşyeri seçilmelidir')
        }
        return
      } else {
        alert('SGK İşyeri seçilmelidir')
        return
      }
    }
    
    // WorkplaceSection kontrolü - birden fazla bölüm varsa zorunlu
    if (form.value.workplace && workplaceSections.value.length > 1 && !form.value.workplaceSection) {
      if (isBayiAdmin.value) {
        alert('Bu SGK işyerinde birden fazla bölüm bulunmaktadır. Lütfen bölüm seçiniz.')
      } else {
        alert('İşyeri bölümü seçilmelidir')
      }
      return
    }
    
    if ((isSuperAdmin.value || isBayiAdmin.value) && !form.value.company) {
      alert('Şirket seçilmelidir')
      return
    }
    if (!form.value.hireDate) {
      if (!confirm('İşe başlama tarihi girilmedi. Bu bilgi olmadan yıllık izin gün sayıları hesaplanamaz. Devam etmek istiyor musunuz?')) {
        return
      }
    }
    if (!form.value.birthDate) {
      if (!confirm('Doğum tarihi girilmedi. Bu bilgi olmadan yıllık izin gün sayıları hesaplanamaz. Devam etmek istiyor musunuz?')) {
        return
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:419',message:'Before payload creation',data:{positionExists:!!form.value.position,positionType:typeof form.value.position,positionValue:form.value.position,willCallTrim:!!form.value.position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const positionValue = form.value.position ? form.value.position.trim() : ''
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:421',message:'After position trim',data:{positionValue:positionValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const payload = { 
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone?.replace(/\s/g, '') || '', // Boşlukları kaldır
      tcKimlik: form.value.tcKimlik?.replace(/\D/g, '') || undefined, // Sadece rakam
      position: positionValue,
      workplace: finalWorkplace, // Zorunlu
      workplaceSection: form.value.workplaceSection || undefined, // Opsiyonel
      department: form.value.department || undefined, // Opsiyonel
      manager: form.value.manager || undefined, // Opsiyonel
      hireDate: form.value.hireDate || undefined,
      birthDate: form.value.birthDate || undefined,
      personelNumarasi: form.value.personelNumarasi?.trim() || undefined // Personel numarası (opsiyonel)
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:432',message:'Payload created',data:{payload:payload,payloadPosition:payload.position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    if (isSuperAdmin.value || isBayiAdmin.value) {
      payload.company = form.value.company
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:195',message:'Payload before API call',data:{payload:payload,method:editingEmployee.value?'PUT':'POST'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    if (editingEmployee.value) {
      await api.put(`/employees/${editingEmployee.value._id}`, payload)
    } else {
      await api.post('/employees', payload)
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:177',message:'API call success',data:{method:editingEmployee.value?'PUT':'POST'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    closeModal()
    loadEmployees()
  } catch (error) {
    console.error('Çalışan kaydetme hatası:', error)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:185',message:'saveEmployee error',data:{error:error.message,responseStatus:error.response?.status,responseData:error.response?.data,responseMessage:error.response?.data?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    alert(error.response?.data?.message || error.message || 'Hata oluştu')
  }
}

const editEmployee = (employee) => {
  // Personel ayarları sayfasına yönlendir
  router.push(`/employee-settings/${employee._id}`)
}

const showLeaveRequestModal = async (employee) => {
  selectedEmployeeForLeave.value = employee
  showLeaveRequestModalFlag.value = true
  await loadLeaveTypes()
  // Şirket seçilmişse alt izin türlerini yükle
  if (employee.company?._id || employee.company) {
    await loadLeaveSubTypes(employee.company?._id || employee.company)
  }
}

const closeLeaveRequestModal = () => {
  showLeaveRequestModalFlag.value = false
  selectedEmployeeForLeave.value = null
  leaveRequestForm.value = {
    companyLeaveType: '',
    leaveSubType: '',
    startDate: '',
    endDate: '',
    description: ''
  }
}

const loadLeaveTypes = async () => {
  try {
    const response = await api.get('/leave-types')
    if (response.data.success) {
      leaveTypes.value = response.data.data || []
    }
  } catch (error) {
    console.error('İzin türleri yüklenemedi:', error)
  }
}

const loadLeaveSubTypes = async (companyId) => {
  try {
    const params = {}
    if (selectedLeaveType.value?.isOtherCategory && selectedLeaveType.value._id) {
      params.parentLeaveType = selectedLeaveType.value._id
    }
    if (companyId) {
      params.companyId = companyId
    } else if (authStore.user?.company) {
      params.companyId = authStore.user.company
    }
    const response = await api.get('/leave-types/sub-types', { params })
    if (response.data.success) {
      leaveSubTypes.value = response.data.data || []
    }
  } catch (error) {
    console.error('Alt izin türleri yüklenemedi:', error)
  }
}

const handleLeaveTypeChange = async () => {
  if (!selectedLeaveType.value?.isOtherCategory) {
    leaveRequestForm.value.leaveSubType = ''
    leaveSubTypes.value = []
  } else {
    const companyId = selectedEmployeeForLeave.value?.company?._id || selectedEmployeeForLeave.value?.company
    await loadLeaveSubTypes(companyId)
  }
}

const saveLeaveRequest = async () => {
  if (!selectedEmployeeForLeave.value) {
    alert('Çalışan seçilmedi')
    return
  }

  // Diğer kategorisi seçildiyse alt izin türü zorunlu
  if (selectedLeaveType.value?.isOtherCategory && !leaveRequestForm.value.leaveSubType) {
    alert('Alt izin türü seçilmelidir')
    return
  }

  savingLeaveRequest.value = true
  try {
    const formData = new FormData()
    formData.append('employee', selectedEmployeeForLeave.value._id)
    formData.append('companyLeaveType', leaveRequestForm.value.companyLeaveType)
    if (leaveRequestForm.value.leaveSubType) {
      formData.append('leaveSubType', leaveRequestForm.value.leaveSubType)
    }
    formData.append('startDate', leaveRequestForm.value.startDate)
    formData.append('endDate', leaveRequestForm.value.endDate)
    if (leaveRequestForm.value.description) {
      formData.append('description', leaveRequestForm.value.description)
    }

    await api.post('/leave-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    alert('İzin talebi başarıyla oluşturuldu')
    closeLeaveRequestModal()
  } catch (error) {
    console.error('İzin talebi oluşturma hatası:', error)
    alert(error.response?.data?.message || 'İzin talebi oluşturulamadı')
  } finally {
    savingLeaveRequest.value = false
  }
}

const deleteEmployee = async (id) => {
  if (confirm('Bu çalışanı silmek istediğinize emin misiniz?')) {
    try {
      await api.delete(`/employees/${id}`)
      loadEmployees()
    } catch (error) {
      alert(error.response?.data?.message || 'Hata oluştu')
    }
  }
}


const handleFileChange = (event) => {
  importFile.value = event.target.files[0]
}

const downloadTemplate = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:422',message:'downloadTemplate entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T'})}).catch(()=>{});
  // #endregion
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:425',message:'Before api.get /employees/template',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T'})}).catch(()=>{});
    // #endregion
    
    const response = await api.get('/employees/template', {
      responseType: 'blob'
    })
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:432',message:'Response received',data:{status:response.status,statusText:response.statusText,dataType:typeof response.data,dataSize:response.data?.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T'})}).catch(()=>{});
    // #endregion
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'personel_sablon.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:443',message:'Download completed successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:446',message:'downloadTemplate error',data:{error:error.message,errorResponse:error.response?.data,errorStatus:error.response?.status,errorStatusText:error.response?.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T'})}).catch(()=>{});
    // #endregion
    console.error('Şablon indirme hatası:', error)
    alert('Şablon indirilemedi: ' + (error.response?.data?.message || error.message))
  }
}

const importEmployees = async () => {
  if (!importFile.value) {
    alert('Lütfen bir dosya seçin')
    return
  }

  if ((isSuperAdmin.value || isBayiAdmin.value) && !importCompany.value) {
    alert('Lütfen bir şirket seçin')
    return
  }

  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    if (importCompany.value) {
      formData.append('company', importCompany.value)
    }

    const response = await api.post('/employees/bulk-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data.errors && response.data.errors.length > 0) {
      const errorMessage = response.data.errors.slice(0, 10).join('\n') + (response.data.errors.length > 10 ? `\n... ve ${response.data.errors.length - 10} hata daha` : '')
      alert(`${response.data.added} çalışan eklendi.\n\nHatalar:\n${errorMessage}`)
    } else {
      alert(`${response.data.added} çalışan başarıyla eklendi`)
    }
    showImportModal.value = false
    importFile.value = null
    importCompany.value = ''
    loadEmployees()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  } finally {
    importing.value = false
  }
}

const sendActivationLink = async (employeeId) => {
  sendingActivation.value = employeeId
  try {
    await api.post(`/employees/${employeeId}/send-activation-link`)
    alert('Aktivasyon linki gönderildi')
    loadEmployees()
  } catch (error) {
    alert(error.response?.data?.message || 'Link gönderilemedi')
  } finally {
    sendingActivation.value = null
  }
}

const sendBulkActivationLinks = async () => {
  if (inactiveEmployees.value.length === 0) {
    alert('Aktivasyon linki gönderilecek çalışan bulunamadı')
    return
  }

  if (!confirm(`${inactiveEmployees.value.length} çalışan için aktivasyon linki gönderilecek. Devam etmek istiyor musunuz?`)) {
    return
  }

  sendingBulkActivation.value = true
  try {
    const employeeIds = inactiveEmployees.value.map(emp => emp._id)
    await api.post('/employees/bulk-send-activation-links', { employeeIds })
    alert('Aktivasyon linkleri gönderildi')
    loadEmployees()
  } catch (error) {
    alert(error.response?.data?.message || 'Linkler gönderilemedi')
  } finally {
    sendingBulkActivation.value = false
  }
}

const closeModal = () => {
  showModal.value = false
  editingEmployee.value = null
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:closeModal',message:'closeModal called - resetting form',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  form.value = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    tcKimlik: '',
    position: '',
    workplace: '',
    workplaceSection: '',
    department: '',
    company: '',
    hireDate: '',
    birthDate: ''
  }
  workplaces.value = []
  workplaceSections.value = []
  departments.value = []
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Employees.vue:closeModal',message:'Form reset complete',data:{formPosition:form.value.position,formPositionType:typeof form.value.position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
}

onMounted(async () => {
  await loadEmployees()
  if (isSuperAdmin.value || isBayiAdmin.value) {
    await loadCompanies()
  } else {
    await loadDepartments()
    // Eğer company_admin veya resmi_muhasebe_ik ise, şirket için workplace'leri yükle
    if (authStore.user?.company) {
      form.value.company = authStore.user.company
      await loadWorkplacesForCompany()
    }
  }
})
</script>

