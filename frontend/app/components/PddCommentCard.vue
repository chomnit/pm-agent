<template>
  <div
    class="absolute left-0 right-0 px-3 transition-[top] duration-150 ease-out"
    :style="{ top: `${top}px` }"
    ref="cardEl"
  >
    <div
      class="rounded-lg border bg-amber-50 overflow-hidden transition-all duration-150"
      :class="isHovered && !isActive
        ? 'border-amber-400 shadow-md shadow-amber-200/70 ring-1 ring-amber-400/40'
        : 'border-amber-200 shadow-sm'"
    >
      <!-- Quote blockquote (selection-based only) -->
      <blockquote
        v-if="comment.quote"
        class="mx-2.5 mt-2 border-l-2 border-amber-400 pl-2 text-[11px] text-amber-700 italic leading-snug line-clamp-2"
      >
        "{{ comment.quote }}"
      </blockquote>

      <!-- Edit mode -->
      <div v-if="isActive">
        <textarea
          v-model="localText"
          rows="2"
          autofocus
          placeholder="What should change here?"
          class="w-full px-2.5 py-1.5 text-xs bg-transparent outline-none resize-none text-amber-900 placeholder-amber-400/80"
          @input="emit('update:text', localText)"
        ></textarea>
        <div class="flex items-center justify-end gap-1.5 px-2.5 py-1.5 border-t border-amber-200">
          <button
            class="text-[11px] text-amber-500 hover:text-red-600 transition-colors"
            @click="emit('delete')"
          >
            Delete
          </button>
          <button
            class="px-2.5 py-0.5 rounded-md bg-amber-600 text-white text-[11px] font-medium hover:bg-amber-700 transition-colors"
            @click="emit('done')"
          >
            Done
          </button>
        </div>
      </div>

      <!-- Read mode — click to edit -->
      <div
        v-else
        class="relative px-2.5 py-1.5 cursor-pointer hover:bg-amber-100/60 transition-colors group/card"
        @click="emit('activate')"
      >
        <button
          class="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover/card:opacity-100 text-amber-300 hover:text-red-500 hover:bg-red-50 transition-all"
          @click.stop="emit('delete')"
        >
          <Icon name="heroicons:trash" class="w-3 h-3" />
        </button>
        <p v-if="comment.text.trim()" class="text-xs text-amber-900 leading-snug pr-5">{{ comment.text }}</p>
        <p v-else class="text-[11px] text-amber-400 italic">Click to add your note...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'

interface Comment { id: string; quote: string; text: string }

const props = defineProps<{
  comment: Comment
  isActive: boolean
  isHovered: boolean
  top: number
}>()

const emit = defineEmits<{
  activate: []
  'update:text': [value: string]
  done: []
  delete: []
  resize: [height: number]
}>()

const localText = ref(props.comment.text)

watch(() => props.comment.text, (v) => { localText.value = v })

const cardEl = ref<HTMLElement | null>(null)

useResizeObserver(cardEl, (entries) => {
  const entry = entries[0]
  if (entry) emit('resize', entry.contentRect.height)
})
</script>
