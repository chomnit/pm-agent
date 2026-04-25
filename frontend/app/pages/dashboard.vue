<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-semibold" style="color: var(--color-text)">Projects</h1>
        <p class="text-sm mt-0.5" style="color: var(--color-muted)">{{ projects.length }} project{{ projects.length !== 1 ? 's' : '' }}</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        @click="showModal = true"
      >
        <Icon name="heroicons:plus" class="w-4 h-4" />
        New Project
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      <div v-for="n in 6" :key="n" class="rounded-xl border p-6 animate-pulse" style="background: var(--color-card); border-color: var(--color-border)">
        <div class="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div class="h-3 bg-gray-100 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-gray-100 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="projects.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
        <Icon name="heroicons:folder-plus" class="w-8 h-8 text-violet-500" />
      </div>
      <h3 class="font-semibold text-lg mb-1" style="color: var(--color-text)">No projects yet</h3>
      <p class="text-sm mb-6" style="color: var(--color-muted)">Create your first project to get started</p>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        @click="showModal = true"
      >
        <Icon name="heroicons:plus" class="w-4 h-4" />
        Create project
      </button>
    </div>

    <!-- Project Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      <NuxtLink
        v-for="project in projects"
        :key="project.id"
        :to="`/projects/${project.id}`"
        class="group rounded-xl border p-6 flex flex-col gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        style="background: var(--color-card); border-color: var(--color-border)"
      >
        <!-- Top row -->
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Icon name="heroicons:folder" class="w-5 h-5 text-violet-600" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate" style="color: var(--color-text)">{{ project.name }}</p>
            <p class="text-xs mt-0.5" style="color: var(--color-muted)">by {{ project.createdBy }}</p>
          </div>
        </div>

        <!-- Description -->
        <p class="text-sm line-clamp-2 flex-1" style="color: var(--color-muted)">
          {{ project.description || 'No description' }}
        </p>

        <!-- Footer -->
        <div class="pt-3 border-t flex items-center justify-between" style="border-color: var(--color-border)">
          <div class="flex items-center gap-3">
            <span class="text-xs flex items-center gap-1" style="color: var(--color-muted)">
              <Icon name="heroicons:users" class="w-3.5 h-3.5" />
              {{ project.members?.length ?? 0 }} member{{ (project.members?.length ?? 0) !== 1 ? 's' : '' }}
            </span>
          </div>
          <span class="text-xs font-medium text-violet-600 group-hover:text-violet-700 flex items-center gap-0.5">
            Open <Icon name="heroicons:arrow-right" class="w-3.5 h-3.5" />
          </span>
        </div>
      </NuxtLink>
    </div>

    <!-- New Project Modal -->
    <AppModal :open="showModal" title="New Project" @close="showModal = false">
      <form class="px-6 py-5 space-y-4" @submit.prevent="createProject">
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">
            Project Name <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. PayWay 2026"
            autofocus
            required
            class="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-violet-500"
            style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Description</label>
          <textarea
            v-model="form.description"
            placeholder="Brief description..."
            rows="3"
            class="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text)"
          />
        </div>
        <div class="flex justify-end gap-3 pt-1">
          <button
            type="button"
            class="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            style="color: var(--color-muted)"
            @click="showModal = false"
          >Cancel</button>
          <button
            type="submit"
            :disabled="creating"
            class="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
          >
            <span v-if="creating">Creating...</span>
            <span v-else>Create Project</span>
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import type { Project } from '@pm-agents/shared'
import { reactive, ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { definePageMeta, navigateTo, useRuntimeConfig, useToast } from '#imports'
import { useProjectStore } from '~/stores/project.store'

definePageMeta({ middleware: 'auth' })

const config = useRuntimeConfig()
const base = config.public.apiBase
const toast = useToast()
const store = useProjectStore()

const { projects, loading } = storeToRefs(store)

const showModal = ref(false)
const creating = ref(false)
const form = reactive({ name: '', description: '' })

onMounted(async () => {
  store.clearCurrentProject()
  await store.fetchProjects()
})

const createProject = async () => {
  if (!form.name.trim()) return
  creating.value = true
  try {
    const project = await store.createProject({ name: form.name, description: form.description || undefined })
    showModal.value = false
    form.name = ''
    form.description = ''
    navigateTo(`/projects/${project.id}`)
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.error || 'Failed to create project', color: 'error' })
  } finally {
    creating.value = false
  }
}
</script>
