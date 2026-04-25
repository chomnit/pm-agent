<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[200] flex"
        role="dialog"
        aria-modal="true"
        @keydown.esc="emit('close')"
      >
        <!-- Backdrop -->
        <div class="flex-1 bg-black/40" @click="emit('close')" />

        <!-- Panel -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <div
            v-if="open"
            class="h-full flex flex-col shadow-xl"
            :class="widthClass"
            style="background: var(--color-card)"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style="border-color: var(--color-border)">
              <h2 class="font-semibold" style="color: var(--color-text)">{{ title }}</h2>
              <button class="text-gray-400 hover:text-gray-600 transition-colors" :aria-label="'Close ' + title" @click="emit('close')">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto">
              <slot />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  width?: 'sm' | 'md' | 'lg'
}>(), {
  width: 'md'
})

const emit = defineEmits<{
  close: []
}>()

const widthClass = computed(() => ({
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[480px]'
}[props.width]))
</script>
