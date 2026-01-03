<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg p-6 max-w-sm w-full">
      <div class="text-center mb-6">
        <h3 class="text-lg font-bold text-gray-800 mb-2">
          {{ type === 'check-in' ? 'Giriş yapmak üzeresiniz' : 'Çıkış yapmak üzeresiniz' }}
        </h3>
        <p class="text-gray-600">Saat: {{ currentTime }}</p>
      </div>

      <div class="mb-6">
        <button
          @mousedown="startHold"
          @mouseup="stopHold"
          @touchstart="startHold"
          @touchend="stopHold"
          @mouseleave="stopHold"
          :disabled="isProcessing"
          class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-6 px-6 rounded-lg text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden"
          :class="{
            'bg-green-500': holdProgress >= 100,
            'bg-red-500': isProcessing && type === 'check-out'
          }"
        >
          <span v-if="!isProcessing && holdProgress < 100">
            BASILI TUT ({{ Math.ceil(holdProgress) }}%)
          </span>
          <span v-else-if="isProcessing">
            {{ type === 'check-in' ? 'Giriş yapılıyor...' : 'Çıkış yapılıyor...' }}
          </span>
          <span v-else>
            TAMAM
          </span>
          <div
            class="absolute bottom-0 left-0 h-1 bg-white transition-all duration-100"
            :style="{ width: `${holdProgress}%` }"
          ></div>
        </button>
      </div>

      <div v-if="isProcessing" class="text-center mb-4">
        <p class="text-sm text-gray-600">Konum doğrulanıyor...</p>
      </div>

      <button
        @click="$emit('cancel')"
        class="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold"
        :disabled="isProcessing"
      >
        İptal
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['check-in', 'check-out'].includes(value)
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const holdProgress = ref(0)
const isProcessing = ref(false)
const holdInterval = ref(null)
const requiredHoldTime = 2000 // 2 saniye

const currentTime = computed(() => {
  return new Date().toLocaleTimeString('tr-TR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
})

const startHold = () => {
  if (isProcessing.value) return
  
  holdProgress.value = 0
  const startTime = Date.now()
  
  holdInterval.value = setInterval(() => {
    const elapsed = Date.now() - startTime
    holdProgress.value = Math.min((elapsed / requiredHoldTime) * 100, 100)
    
    if (holdProgress.value >= 100) {
      stopHold()
      isProcessing.value = true
      // Kısa bir gecikme sonrası onayla
      setTimeout(() => {
        emit('confirm')
      }, 300)
    }
  }, 50) // Her 50ms'de bir güncelle
}

const stopHold = () => {
  if (holdInterval.value) {
    clearInterval(holdInterval.value)
    holdInterval.value = null
  }
  
  // Eğer %100'e ulaşmadıysa sıfırla
  if (holdProgress.value < 100 && !isProcessing.value) {
    holdProgress.value = 0
  }
}

onUnmounted(() => {
  stopHold()
})
</script>


