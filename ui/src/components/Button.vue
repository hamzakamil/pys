<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[
      'px-4 py-2 rounded-lg font-medium transition-colors',
      variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
      variant === 'secondary' && 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
      'disabled:cursor-not-allowed'
    ]"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'danger'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])
</script>

