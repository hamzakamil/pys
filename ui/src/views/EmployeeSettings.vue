<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Personel Ayarları</h1>
      <Button @click="goBack">Geri Dön</Button>
    </div>

    <div class="bg-white rounded-lg shadow p-6 max-w-4xl">
      <form @submit.prevent="saveEmployee" @input="hasChanges = true">
        <div class="space-y-6">
          <!-- Genel Bilgiler -->
          <div>
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Genel Bilgiler</h2>
            <div class="grid grid-cols-2 gap-4">
              <Input v-model="form.firstName" label="Ad" required />
              <Input v-model="form.lastName" label="Soyad" required />
              <Input v-model="form.email" type="email" label="Email" required />
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
                  <label class="block text-sm font-medium text-gray-700">Görevi (mesleği)</label>
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Görevi (mesleği) giriniz"
                />
                <p class="mt-1 text-xs text-gray-500">
                  İndirilen meslek kodlarından uygun olanı yazabilirsiniz.
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Doğum Tarihi</label>
                <input
                  v-model="form.birthDate"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">İşe Başlama Tarihi</label>
                <input
                  v-model="form.hireDate"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">İşten Çıkış Tarihi</label>
                <input
                  v-model="form.exitDate"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="mt-1 text-xs text-red-600" v-if="form.exitDate">
                  ⚠️ İşten çıkış tarihi girildiğinde çalışan pasif olacak ve giriş yapamayacak
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">İşten Ayrılış Nedeni</label>
                <div class="relative">
                  <select
                    v-model="form.exitReasonCode"
                    @change="handleExitReasonChange"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    <template v-if="!showAllExitReasons">
                      <option v-for="reason in commonExitReasons" :key="reason.code" :value="reason.code">
                        {{ reason.code }} - {{ reason.name }}
                      </option>
                      <option value="__show_all__">📋 Tüm Liste</option>
                    </template>
                    <template v-else>
                      <option v-for="reason in allExitReasons" :key="reason.code" :value="reason.code">
                        {{ reason.code }} - {{ reason.name }}
                      </option>
                      <option value="__hide_all__">⬆️ Yaygın Olanları Göster</option>
                    </template>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Ücret Bilgileri -->
          <div class="border-t pt-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Ücret Bilgileri</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Ücret
                  <span v-if="!form.salary" class="text-gray-400 text-xs ml-2">(Asgari ücretli)</span>
                  <span v-else class="text-gray-600 text-xs ml-2">
                    ({{ form.isNetSalary ? 'Net' : 'Brüt' }} ücret)
                  </span>
                </label>
                <input
                  v-model="form.salaryDisplay"
                  @input="formatSalary"
                  type="text"
                  placeholder="Ücret giriniz (örn: 15.000)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p v-if="!form.salary" class="mt-1 text-xs text-gray-500">Boş bırakılırsa "asgari ücretli" olarak görünecektir</p>
                <p v-else class="mt-1 text-xs text-gray-600">
                  {{ formatNumber(form.salary) }} {{ form.isNetSalary ? 'Net' : 'Brüt' }} ücret
                </p>
              </div>
              <div class="flex items-center pt-6">
                <input
                  type="checkbox"
                  v-model="form.isNetSalary"
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label class="text-sm font-medium text-gray-700">Net ücret</label>
                <p class="ml-2 text-xs text-gray-500">
                  ({{ form.isNetSalary ? 'Net' : 'Brüt' }} ücret olarak işaretlendi)
                </p>
              </div>
            </div>
          </div>

          <!-- Kimlik Bilgileri -->
          <div class="border-t pt-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Kimlik Bilgileri</h2>
            <div class="grid grid-cols-2 gap-4">
              <Input v-model="form.birthPlace" label="Doğum Yeri" />
              <Input v-model="form.passportNumber" label="Pasaport No" />
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Kan Grubu</label>
                <select
                  v-model="form.bloodType"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçiniz</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="0+">0+</option>
                  <option value="0-">0-</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Askerlik Durumu</label>
                <select
                  v-model="form.militaryStatus"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçiniz</option>
                  <option value="Yapıldı">Yapıldı</option>
                  <option value="Tecilli">Tecilli</option>
                  <option value="Muaf">Muaf</option>
                  <option value="Yapılmadı">Yapılmadı</option>
                </select>
              </div>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  v-model="form.hasCriminalRecord"
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label class="text-sm font-medium text-gray-700">Sabıkalı mı?</label>
              </div>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  v-model="form.hasDrivingLicense"
                  class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label class="text-sm font-medium text-gray-700">Ehliyet var mı?</label>
              </div>
            </div>
          </div>

          <!-- Özel Alanlar -->
          <div class="border-t pt-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Özel Alanlar</h2>
            <div v-for="(field, index) in form.customFields" :key="index" class="flex gap-2 mb-2">
              <Input v-model="field.name" :label="`Alan Adı ${index + 1}`" class="flex-1" />
              <Input v-model="field.value" :label="`Değer ${index + 1}`" class="flex-1" />
              <button
                type="button"
                @click="removeCustomField(index)"
                class="mt-6 px-3 py-2 text-red-600 hover:text-red-900"
              >
                Sil
              </button>
            </div>
            <Button type="button" variant="secondary" @click="addCustomField" class="mt-2">
              Yeni Alan Ekle
            </Button>
          </div>

          <!-- Departman -->
          <div class="border-t pt-6">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Departman</label>
                <select
                  v-model="form.department"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçiniz (Opsiyonel)</option>
                  <option v-for="dept in departments" :key="dept._id" :value="dept._id">{{ dept.name }}</option>
                </select>
              </div>
              
              <!-- Manager (Üst Yönetici) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Üst Yönetici (Opsiyonel)</label>
                <select
                  v-model="form.manager"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <Button variant="secondary" @click="goBack">İptal</Button>
            <Button type="submit" :disabled="saving">{{ saving ? 'Kaydediliyor...' : 'Kaydet' }}</Button>
          </div>
        </div>
      </form>
    </div>

    <!-- İzin Talepleri Bölümü -->
    <div class="bg-white rounded-lg shadow p-6 mt-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-gray-800">İzin Talepleri</h2>
        <Button @click="showLeaveRequestModal = true">Yeni İzin Talebi Ekle</Button>
      </div>

      <!-- Filtreler -->
      <div class="mb-4 flex gap-2">
        <select
          v-model="leaveFilterStatus"
          @change="loadLeaveRequests"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm Durumlar</option>
          <option value="PENDING">Bekleyen</option>
          <option value="IN_PROGRESS">Onay Sürecinde</option>
          <option value="APPROVED">Onaylanan</option>
          <option value="REJECTED">Reddedilen</option>
        </select>
      </div>

      <!-- İzin Talepleri Listesi -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İzin Türü</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlangıç</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bitiş</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gün</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="request in leaveRequests" :key="request._id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ request.leaveSubType?.name || request.companyLeaveType?.name || request.type }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(request.startDate) }}
                <span v-if="request.startTime" class="text-gray-400"> ({{ request.startTime }})</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(request.endDate) }}
                <span v-if="request.endTime" class="text-gray-400"> ({{ request.endTime }})</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ request.totalDays }} {{ request.isHourly ? 'saat' : 'gün' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="{
                    'bg-yellow-100 text-yellow-800': request.status === 'PENDING' || request.status === 'IN_PROGRESS',
                    'bg-green-100 text-green-800': request.status === 'APPROVED',
                    'bg-red-100 text-red-800': request.status === 'REJECTED'
                  }"
                  class="px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ getLeaveStatusText(request.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="viewLeaveRequest(request)"
                  class="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Görüntüle
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="leaveRequests.length === 0" class="text-center py-8 text-gray-500">
          Henüz izin talebi bulunmamaktadır.
        </div>
      </div>
    </div>

    <!-- İzin Talebi Ekleme Modal -->
    <div v-if="showLeaveRequestModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 class="text-xl font-bold mb-4">Yeni İzin Talebi</h2>
        <form @submit.prevent="createLeaveRequest">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                İzin Türü <span class="text-red-500">*</span>
              </label>
              <select
                v-model="leaveRequestForm.companyLeaveType"
                @change="handleLeaveTypeChange"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seçiniz</option>
                <option
                  v-for="type in leaveTypes"
                  :key="type._id"
                  :value="type._id"
                >
                  {{ type.name }}
                </option>
              </select>
            </div>

            <div v-if="selectedLeaveType?.isOtherCategory && filteredSubTypes.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1">Alt İzin Türü *</label>
              <select
                v-model="leaveRequestForm.leaveSubType"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seçiniz</option>
                <option v-for="subType in filteredSubTypes" :key="subType._id" :value="subType._id">
                  {{ subType.name }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Başlangıç Tarihi <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="leaveRequestForm.startDate"
                  type="date"
                  @change="calculateLeaveDays"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Bitiş Tarihi <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="leaveRequestForm.endDate"
                  type="date"
                  @change="calculateLeaveDays"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                v-model="leaveRequestForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="İzin talebi açıklaması"
              ></textarea>
            </div>

            <div class="flex gap-2 justify-end">
              <Button variant="secondary" @click="showLeaveRequestModal = false" type="button">İptal</Button>
              <Button type="submit" :disabled="savingLeaveRequest">
                {{ savingLeaveRequest ? 'Gönderiliyor...' : 'Gönder' }}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const employee = ref(null)
const departments = ref([])
const allEmployees = ref([]) // Tüm çalışanlar (manager seçimi için)
const saving = ref(false)
const hasChanges = ref(false)

// İzin talepleri için
const leaveRequests = ref([])
const leaveTypes = ref([])
const leaveSubTypes = ref([])
const showLeaveRequestModal = ref(false)
const leaveFilterStatus = ref('')
const savingLeaveRequest = ref(false)

const leaveRequestForm = ref({
  companyLeaveType: '',
  leaveSubType: '',
  startDate: '',
  endDate: '',
  description: ''
})

const selectedLeaveType = computed(() => {
  return leaveTypes.value.find(t => t._id === leaveRequestForm.value.companyLeaveType)
})

const filteredSubTypes = computed(() => {
  if (!selectedLeaveType.value?.isOtherCategory) {
    return []
  }
  return leaveSubTypes.value.filter(st => 
    st.parentLeaveType && 
    st.parentLeaveType.toString() === selectedLeaveType.value._id.toString()
  )
})

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  tcKimlik: '',
  position: '',
  birthDate: '',
  hireDate: '',
  exitDate: '',
  exitReason: '',
  exitReasonCode: '',
  salary: null,
  salaryDisplay: '',
  isNetSalary: true,
  birthPlace: '',
  passportNumber: '',
  bloodType: '',
  militaryStatus: '',
  hasCriminalRecord: false,
  hasDrivingLicense: false,
  customFields: [],
  department: '',
  manager: ''
})

const showAllExitReasons = ref(false)

// En çok kullanılan çıkış nedenleri
const commonExitReasons = [
  { code: '3', name: 'İstifa - Belirsiz süreli iş sözleşmesinin işçi tarafından feshi (istifa)' },
  { code: '4', name: 'İşveren Feshi (Genel) - Belirsiz süreli iş sözleşmesinin işveren tarafından haklı sebep bildirilmeden feshi' },
  { code: '1', name: 'Deneme Süresinde İşveren Çıkışı - Deneme süreli iş sözleşmesinin işverence feshi' },
  { code: '2', name: 'Deneme Süresinde İstifa - Deneme süreli iş sözleşmesinin işçi tarafından feshi' },
  { code: '5', name: 'Süreli Sözleşme Sona Erdi - Belirli süreli iş sözleşmesinin sona ermesi' },
  { code: '8', name: 'Emeklilik (Yaşlılık) - Emeklilik (yaşlılık) veya toptan ödeme nedeniyle' },
  { code: '10', name: 'Ölüm' },
  { code: '12', name: 'Askerlik' }
]

// Tüm çıkış nedenleri
const allExitReasons = [
  { code: '1', name: 'Deneme Süresinde İşveren Çıkışı - Deneme süreli iş sözleşmesinin işverence feshi' },
  { code: '2', name: 'Deneme Süresinde İstifa - Deneme süreli iş sözleşmesinin işçi tarafından feshi' },
  { code: '3', name: 'İstifa - Belirsiz süreli iş sözleşmesinin işçi tarafından feshi (istifa)' },
  { code: '4', name: 'İşveren Feshi (Genel) - Belirsiz süreli iş sözleşmesinin işveren tarafından haklı sebep bildirilmeden feshi' },
  { code: '5', name: 'Süreli Sözleşme Sona Erdi - Belirli süreli iş sözleşmesinin sona ermesi' },
  { code: '8', name: 'Emeklilik (Yaşlılık) - Emeklilik (yaşlılık) veya toptan ödeme nedeniyle' },
  { code: '9', name: 'Malulen Emeklilik - Malulen emeklilik nedeniyle' },
  { code: '10', name: 'Ölüm' },
  { code: '12', name: 'Askerlik' },
  { code: '13', name: 'Kadın İşçinin Evlenmesi' },
  { code: '23', name: 'İşçi Haklı Nedenle Fesih (Zorunlu) - İşçi tarafından zorunlu nedenle fesih' },
  { code: '24', name: 'İşçi Sağlık Nedeniyle Fesih - İşçi tarafından sağlık nedeniyle fesih' },
  { code: '42-4857/25-II-A', name: 'İşveren Haklı Nedenle Fesih - Sağlık Nedeni (Uzun Süreli Hastalık) - İşçinin, tutulduğu hastalık nedeniyle doğrudan işe gelmesinin imkânsız olması ve bu halin 6 haftayı (42 iş gününü) geçmesi' },
  { code: '43-4857/25-II-B', name: 'İşveren Haklı Nedenle Fesih - Sağlık Nedeni (Hastalığı Gizleme) - İşçinin, işe girerken işvereni yanıltması (sözleşmenin esaslı noktalarından birinde yanlış beyanda bulunması)' },
  { code: '44-4857/25-II-C', name: 'İşveren Haklı Nedenle Fesih - Ahlak & İyiniyete Aykırılık - İşçinin, işverene veya ailesine veya işyerindeki diğer bir işçiye sataşması, gözdağı vermesi veya onların şeref ve namusuna dokunacak sözler sarf etmesi ya da davranışlarda bulunması' },
  { code: '45-4857/25-II-D', name: 'İşveren Haklı Nedenle Fesih - Cinsel Taciz - İşçinin, işverene veya işyerindeki diğer bir işçiye cinsel tacizde bulunması' },
  { code: '46-4857/25-II-E', name: 'İşveren Haklı Nedenle Fesih - Saldırı veya Sarhoşluk - İşçinin, işverene veya işyerindeki diğer bir işçiye saldırması veya işyerine sarhoş ya da uyuşturucu madde almış olarak gelmesi' },
  { code: '47-4857/25-II-F', name: 'İşveren Haklı Nedenle Fesih - Güveni Kötüye Kullanma & Suç - İşçinin, işverenin güvenini kötüye kullanması, hırsızlık yapması, işverenin meslek sırlarını ifşa etmesi veya işyerinde suç işlemesi' },
  { code: '48-4857/25-II-G', name: 'İşveren Haklı Nedenle Fesih - İşi Savsaklama - İşçinin, işini yedi iş günü üst üste veya bir ay içinde toplam on iş günü yapmadan kendi isteğiyle terk etmesi' },
  { code: '49-4857/25-II-H', name: 'İşveren Haklı Nedenle Fesih - İş Güvenliğini İhlal - İşçinin, işin güvenliğini tehlikeye düşürmesi, işyerinin malına kasıtlı olarak veya ağır ihmal sonucu önemli ölçüde zarar vermesi' },
  { code: '50-4857/25-II-I', name: 'İşveren Haklı Nedenle Fesih - Zorlayıcı Sebep - İşçiyi işyerinde bir haftadan fazla süreyle çalışmaktan alıkoyan zorlayıcı bir sebebin ortaya çıkması (örneğin: işçinin tutuklanması veya gözaltına alınması)' }
]

const loadEmployee = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadEmployee',message:'loadEmployee entry',data:{routeId:route.params.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'N'})}).catch(()=>{});
  // #endregion
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadEmployee',message:'Before API call',data:{endpoint:`/employees/${route.params.id}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'O'})}).catch(()=>{});
    // #endregion
    const response = await api.get(`/employees/${route.params.id}`)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadEmployee',message:'API response received',data:{status:response.status,hasData:!!response.data,employeeId:response.data?._id,companyId:response.data?.company?._id||response.data?.company},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'P'})}).catch(()=>{});
    // #endregion
    employee.value = response.data
    
    // Format dates for input
    const formatDateForInput = (date) => {
      if (!date) return ''
      const d = new Date(date)
      return d.toISOString().split('T')[0]
    }

    // Reset showAllExitReasons when loading employee
    showAllExitReasons.value = false

    form.value = {
      firstName: employee.value.firstName || '',
      lastName: employee.value.lastName || '',
      email: employee.value.email || '',
      phone: employee.value.phone || '',
      tcKimlik: employee.value.tcKimlik || '',
      position: employee.value.position || '',
      birthDate: formatDateForInput(employee.value.birthDate),
      hireDate: formatDateForInput(employee.value.hireDate),
      exitDate: formatDateForInput(employee.value.exitDate),
      exitReason: employee.value.exitReason || '',
      exitReasonCode: employee.value.exitReasonCode || '',
      salary: employee.value.salary || null,
      salaryDisplay: employee.value.salary ? formatNumber(employee.value.salary) : '',
      isNetSalary: employee.value.isNetSalary !== undefined ? employee.value.isNetSalary : true,
      birthPlace: employee.value.birthPlace || '',
      passportNumber: employee.value.passportNumber || '',
      bloodType: employee.value.bloodType || '',
      militaryStatus: employee.value.militaryStatus || '',
      hasCriminalRecord: employee.value.hasCriminalRecord || false,
      hasDrivingLicense: employee.value.hasDrivingLicense || false,
      customFields: employee.value.customFields || [],
      department: employee.value.department?._id || '',
      manager: employee.value.manager?._id || employee.value.manager || ''
    }
    hasChanges.value = false
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadEmployee',message:'Before loading leave requests and types',data:{employeeId:employee.value._id,companyId:employee.value.company?._id||employee.value.company},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'Q'})}).catch(()=>{});
    // #endregion
    // İzin talepleri ve izin türlerini yükle
    await loadLeaveRequests()
    await loadLeaveTypes()
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadEmployee',message:'After loading leave requests and types',data:{leaveRequestsCount:leaveRequests.value.length,leaveTypesCount:leaveTypes.value.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'R'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadEmployee',message:'Error loading employee',data:{error:error.message,responseStatus:error.response?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'S'})}).catch(()=>{});
    // #endregion
    console.error('Personel yüklenemedi:', error)
    alert('Personel bilgileri yüklenemedi')
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

const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    allEmployees.value = response.data.filter(emp => emp._id !== route.params.id) // Kendisini hariç tut
  } catch (error) {
    console.error('Çalışanlar yüklenemedi:', error)
  }
}

const availableManagers = computed(() => {
  return allEmployees.value.filter(emp => emp.isActive !== false)
})


const formatTCKimlik = (event) => {
  let value = event.target.value.replace(/\D/g, '')
  if (value.length > 11) {
    value = value.substring(0, 11)
  }
  form.value.tcKimlik = value
  hasChanges.value = true
}

const formatPhone = (event) => {
  let value = event.target.value.replace(/\D/g, '')
  
  // 5 ile başlıyorsa başına 0 ekle
  if (value.length > 0 && value[0] === '5') {
    value = '0' + value
  }
  
  // Format: 0 555 555 55 55 (11 hane - 15 karakter toplam: 11 hane + 4 boşluk)
  // 11 haneden fazla girilemez
  if (value.length > 11) {
    value = value.substring(0, 11)
  }
  
  if (value.length > 0) {
    let formatted = value[0]
    if (value.length > 1) {
      formatted += ' ' + value.substring(1, 4)
    }
    if (value.length > 4) {
      formatted += ' ' + value.substring(4, 7)
    }
    if (value.length > 7) {
      formatted += ' ' + value.substring(7, 9)
    }
    if (value.length > 9) {
      formatted += ' ' + value.substring(9, 11)
    }
    form.value.phone = formatted
  } else {
    form.value.phone = ''
  }
  hasChanges.value = true
}

const formatSalary = (event) => {
  let value = event.target.value.replace(/[^\d]/g, '')
  if (value) {
    form.value.salary = parseFloat(value)
    form.value.salaryDisplay = formatNumber(parseFloat(value))
  } else {
    form.value.salary = null
    form.value.salaryDisplay = ''
  }
  hasChanges.value = true
}

const formatNumber = (num) => {
  if (!num && num !== 0) return ''
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Exit reason dropdown handler
const handleExitReasonChange = () => {
  if (form.value.exitReasonCode === '__show_all__') {
    showAllExitReasons.value = true
    form.value.exitReasonCode = ''
    hasChanges.value = false // Bu bir UI değişikliği, kaydetmeyi tetiklemesin
  } else if (form.value.exitReasonCode === '__hide_all__') {
    showAllExitReasons.value = false
    form.value.exitReasonCode = ''
    hasChanges.value = false // Bu bir UI değişikliği, kaydetmeyi tetiklemesin
  } else if (form.value.exitReasonCode) {
    const selectedReason = allExitReasons.find(r => r.code === form.value.exitReasonCode)
    if (selectedReason) {
      form.value.exitReason = selectedReason.name
    }
    hasChanges.value = true
  } else {
    form.value.exitReason = ''
    form.value.exitReasonCode = ''
    hasChanges.value = true
  }
}

const addCustomField = () => {
  form.value.customFields.push({ name: '', value: '' })
  hasChanges.value = true
}

const removeCustomField = (index) => {
  form.value.customFields.splice(index, 1)
  hasChanges.value = true
}

const saveEmployee = async () => {
  if (!hasChanges.value) {
    return
  }

  if (!confirm('Değişiklikleri kaydetmek istiyor musunuz?')) {
    return
  }

  saving.value = true
  try {
    // TC Kimlik validation
    if (form.value.tcKimlik && form.value.tcKimlik.length !== 11) {
      alert('TC Kimlik No 11 haneli olmalıdır')
      return
    }

    // Format dates
    const payload = {
      ...form.value,
      birthDate: form.value.birthDate ? new Date(form.value.birthDate) : null,
      hireDate: form.value.hireDate ? new Date(form.value.hireDate) : null,
      exitDate: form.value.exitDate ? new Date(form.value.exitDate) : null,
      exitReason: form.value.exitReason || undefined,
      exitReasonCode: form.value.exitReasonCode || undefined,
      salary: form.value.salary || null,
      isNetSalary: form.value.isNetSalary !== undefined ? form.value.isNetSalary : true,
      phone: form.value.phone.replace(/\s/g, ''), // Remove spaces before sending
      tcKimlik: form.value.tcKimlik || undefined
    }
    
    // Remove salaryDisplay from payload
    delete payload.salaryDisplay

    await api.put(`/employees/${route.params.id}`, payload)
    alert('Personel bilgileri kaydedildi')
    hasChanges.value = false
    loadEmployee()
  } catch (error) {
    alert(error.response?.data?.message || 'Hata oluştu')
  } finally {
    saving.value = false
  }
}

const goBack = async () => {
  if (hasChanges.value) {
    if (!confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?')) {
      return
    }
  }
  router.push('/employees')
}

// Warn before leaving page with unsaved changes
const beforeUnload = (e) => {
  if (hasChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const getLeaveStatusText = (status) => {
  const statusMap = {
    'PENDING': 'Bekleyen',
    'IN_PROGRESS': 'Onay Sürecinde',
    'APPROVED': 'Onaylanan',
    'REJECTED': 'Reddedilen'
  }
  return statusMap[status] || status
}

const loadLeaveRequests = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveRequests',message:'loadLeaveRequests entry',data:{employeeId:employee.value?._id,hasEmployee:!!employee.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  if (!employee.value?._id) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveRequests',message:'No employee ID, returning early',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return
  }
  
  try {
    const params = { employee: employee.value._id }
    if (leaveFilterStatus.value) {
      params.status = leaveFilterStatus.value
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveRequests',message:'Before API call',data:{params,employeeId:employee.value._id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const response = await api.get('/leave-requests', { params })
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveRequests',message:'API response received',data:{status:response.status,dataLength:response.data?.length,dataType:Array.isArray(response.data)?'array':'other'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    leaveRequests.value = response.data || []
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveRequests',message:'Leave requests set',data:{count:leaveRequests.value.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveRequests',message:'Error loading leave requests',data:{error:error.message,responseStatus:error.response?.status,responseData:error.response?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    console.error('İzin talepleri yüklenemedi:', error)
    leaveRequests.value = []
  }
}

const loadLeaveTypes = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveTypes',message:'loadLeaveTypes entry',data:{hasCompany:!!employee.value?.company,companyId:employee.value?.company?._id||employee.value?.company},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  if (!employee.value?.company) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveTypes',message:'No company, returning early',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    return
  }
  
  try {
    const companyId = employee.value.company._id || employee.value.company
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveTypes',message:'Before API call',data:{companyId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    const response = await api.get('/leave-types', {
      params: { companyId }
    })
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveTypes',message:'API response received',data:{status:response.status,success:response.data?.success,dataLength:response.data?.data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    if (response.data.success) {
      leaveTypes.value = response.data.data || []
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveTypes',message:'Leave types set',data:{count:leaveTypes.value.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
      // #endregion
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:loadLeaveTypes',message:'Error loading leave types',data:{error:error.message,responseStatus:error.response?.status,responseData:error.response?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'L'})}).catch(()=>{});
    // #endregion
    console.error('İzin türleri yüklenemedi:', error)
  }
}

const loadLeaveSubTypes = async () => {
  if (!selectedLeaveType.value?.isOtherCategory || !selectedLeaveType.value._id) {
    leaveSubTypes.value = []
    return
  }
  
  try {
    const params = { parentLeaveType: selectedLeaveType.value._id }
    if (employee.value?.company) {
      params.companyId = employee.value.company._id || employee.value.company
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
  leaveRequestForm.value.leaveSubType = ''
  if (selectedLeaveType.value?.isOtherCategory) {
    await loadLeaveSubTypes()
  }
}

const calculateLeaveDays = () => {
  if (leaveRequestForm.value.startDate && leaveRequestForm.value.endDate) {
    const start = new Date(leaveRequestForm.value.startDate)
    const end = new Date(leaveRequestForm.value.endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    // Backend'de daha detaylı hesaplama yapılacak
  }
}

const createLeaveRequest = async () => {
  if (!employee.value?._id) {
    alert('Çalışan bilgisi bulunamadı')
    return
  }

  savingLeaveRequest.value = true
  try {
    const formData = new FormData()
    formData.append('employee', employee.value._id)
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
    showLeaveRequestModal.value = false
    leaveRequestForm.value = {
      companyLeaveType: '',
      leaveSubType: '',
      startDate: '',
      endDate: '',
      description: ''
    }
    await loadLeaveRequests()
  } catch (error) {
    console.error('İzin talebi oluşturma hatası:', error)
    alert(error.response?.data?.message || 'İzin talebi oluşturulamadı')
  } finally {
    savingLeaveRequest.value = false
  }
}

const viewLeaveRequest = (request) => {
  // Detay sayfasına yönlendir veya modal göster
  router.push(`/leave-requests/${request._id}`)
}

onMounted(async () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:onMounted',message:'onMounted entry',data:{routeId:route.params.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
  // #endregion
  await loadEmployee()
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:onMounted',message:'After loadEmployee',data:{hasEmployee:!!employee.value,employeeId:employee.value?._id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
  // #endregion
  await loadDepartments()
  await loadEmployees()
  window.addEventListener('beforeunload', beforeUnload)
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeeSettings.vue:onMounted',message:'onMounted complete',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
  // #endregion
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>


