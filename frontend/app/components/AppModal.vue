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
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        @keydown.esc="emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')" />

        <!-- Panel -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-1"
        >
          <div
            v-if="open"
            class="relative w-full rounded-xl shadow-xl flex flex-col"
            :class="sizeClass"
            style="background: var(--color-card); max-height: 90vh"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style="border-color: var(--color-border)">
              <h2 class="text-base font-semibold" style="color: var(--color-text)">{{ title }}</h2>
              <button
                class="rounded-md p-1 hover:bg-gray-100 transition-colors flex-shrink-0"
                :aria-label="'Close ' + title"
                @click="emit('close')"
              >
                <svg class="w-4 h-4" style="color: var(--color-muted)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="overflow-y-auto flex-1">
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
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md'
})

const emit = defineEmits<{
  close: []
}>()

const sizeClass = computed(() => ({
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg'
}[props.size]))
</script>
