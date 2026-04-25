<template>
  <div class="flex h-screen overflow-hidden" style="background-color: var(--color-bg)">
    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out"
      :class="sidebarOpen ? 'w-64' : 'w-14'"
      style="background-color: var(--color-sidebar)"
    >
      <!-- Logo -->
      <div class="px-3 py-4 border-b border-white/10 flex items-center" :class="sidebarOpen ? 'justify-start' : 'justify-center'">
        <button
          class="flex items-center gap-2 overflow-hidden cursor-pointer group"
          :title="sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'"
          @click="sidebarOpen = !sidebarOpen"
        >
          <div class="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500 transition-colors">
            <Icon name="heroicons:cpu-chip" class="w-4 h-4 text-white" />
          </div>
          <span v-if="sidebarOpen" class="font-semibold text-white text-sm whitespace-nowrap">PM Agents</span>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <NuxtLink
          to="/dashboard"
          class="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors"
          :class="[
            isActive('/dashboard') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5',
            !sidebarOpen && 'justify-center'
          ]"
          :title="!sidebarOpen ? 'Projects' : undefined"
        >
          <Icon name="heroicons:squares-2x2" class="w-4 h-4 flex-shrink-0" />
          <span v-if="sidebarOpen">Projects</span>
        </NuxtLink>
        <NuxtLink
          to="/knowledge"
          class="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors"
          :class="[
            isActive('/knowledge') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5',
            !sidebarOpen && 'justify-center'
          ]"
          :title="!sidebarOpen ? 'Org Library' : undefined"
        >
          <Icon name="heroicons:building-library" class="w-4 h-4 flex-shrink-0" />
          <span v-if="sidebarOpen">Org Library</span>
        </NuxtLink>
        <NuxtLink
          to="/telegram"
          class="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors"
          :class="[
            isActive('/telegram') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5',
            !sidebarOpen && 'justify-center'
          ]"
          :title="!sidebarOpen ? 'Telegram' : undefined"
        >
          <Icon name="heroicons:paper-airplane" class="w-4 h-4 flex-shrink-0" />
          <span v-if="sidebarOpen">Telegram</span>
        </NuxtLink>
        <NuxtLink
          to="/settings"
          class="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors"
          :class="[
            isActive('/settings') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5',
            !sidebarOpen && 'justify-center'
          ]"
          :title="!sidebarOpen ? 'Settings' : undefined"
        >
          <Icon name="heroicons:cog-6-tooth" class="w-4 h-4 flex-shrink-0" />
          <span v-if="sidebarOpen">Settings</span>
        </NuxtLink>
      </nav>

      <!-- Bottom -->
      <div class="px-2 py-4 border-t border-white/10 space-y-1">
        <div v-if="sessionUser" class="flex items-center gap-3 px-2.5 py-2" :class="!sidebarOpen && 'justify-center px-0'">
          <img
            v-if="sessionUser.avatarUrl"
            :src="sessionUser.avatarUrl"
            :alt="sessionUser.name"
            class="w-7 h-7 rounded-full flex-shrink-0 object-cover"
            :title="!sidebarOpen ? sessionUser.name : undefined"
          />
          <div v-else class="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0" :title="!sidebarOpen ? sessionUser.name : undefined">
            <span class="text-xs font-medium text-white">{{ sessionUser.name[0] }}</span>
          </div>
          <div v-if="sidebarOpen" class="flex-1 min-w-0">
            <p class="text-xs text-white truncate font-medium">{{ sessionUser.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ sessionUser.email }}</p>
          </div>
        </div>
        <button
          class="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          :class="!sidebarOpen && 'justify-center'"
          :title="!sidebarOpen ? 'Sign out' : undefined"
          @click="signOut"
        >
          <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4 flex-shrink-0" />
          <span v-if="sidebarOpen">Sign out</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div
      class="flex-1 flex flex-col min-h-screen overflow-y-auto transition-all duration-300 ease-in-out"
      :class="sidebarOpen ? 'ml-64' : 'ml-14'"
    >
      <slot />
    </div>

    <!-- API Key Required Modal (blocking) -->
    <Teleport to="body">
      <div
        v-if="showApiKeyModal"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px)"
      >
        <div class="w-full max-w-md rounded-2xl p-8 shadow-2xl" style="background: var(--color-card)">
          <!-- Icon -->
          <div class="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-5">
            <Icon name="heroicons:key" class="w-6 h-6 text-violet-600" />
          </div>

          <h2 class="text-xl font-semibold mb-1" style="color: var(--color-text)">Configure your API key</h2>
          <p class="text-sm mb-6" style="color: var(--color-muted)">
            PM Agents uses your personal Anthropic API key to run AI agents. Your key is encrypted and stored securely.
          </p>

          <div class="mb-4">
            <label class="block text-xs font-medium mb-1.5" style="color: var(--color-text)">Anthropic API Key</label>
            <input
              v-model="modalApiKey"
              type="password"
              placeholder="sk-ant-api03-..."
              autocomplete="off"
              class="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              style="border-color: var(--color-border); color: var(--color-text); background: var(--color-bg)"
              @keydown.enter="saveModalApiKey"
            />
            <p v-if="modalError" class="mt-1.5 text-xs text-red-500">{{ modalError }}</p>
            <p class="mt-1.5 text-xs" style="color: var(--color-muted)">
              Get your key at
              <a href="https://console.anthropic.com/settings/keys" target="_blank" class="text-violet-600 hover:underline">console.anthropic.com</a>
            </p>
          </div>

          <button
            :disabled="modalSaving || !modalApiKey.trim()"
            class="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :class="modalSaving || !modalApiKey.trim() ? 'bg-violet-400' : 'bg-violet-600 hover:bg-violet-700'"
            @click="saveModalApiKey"
          >
            <span v-if="modalSaving">Saving...</span>
            <span v-else>Save & Continue</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { navigateTo, useRoute, useRuntimeConfig, useState, useUserSession } from '#imports'

const route = useRoute()
const config = useRuntimeConfig()
const base = config.public.apiBase

const { user: sessionUser, clear } = useUserSession()
const currentProject = useState<{ id: string; name: string } | null>('currentProject', () => null)

const sidebarOpen = ref(true)

// API key modal state
const showApiKeyModal = ref(false)
const modalApiKey = ref('')
const modalError = ref('')
const modalSaving = ref(false)

onMounted(async () => {
  const stored = localStorage.getItem('sidebarOpen')
  if (stored !== null) sidebarOpen.value = stored === 'true'

  // Check if user has an API key configured
  try {
    const result = await $fetch<{ data: { isSet: boolean } }>(`${base}/api/users/me/api-key/status`, {
      credentials: 'include'
    })
    if (!result.data.isSet) {
      showApiKeyModal.value = true
    }
  } catch {
    // If check fails (e.g. network error), don't block the user
  }
})

watch(sidebarOpen, (val) => {
  localStorage.setItem('sidebarOpen', String(val))
})

const isActive = (path: string) => {
  if (path === `/projects/${currentProject.value?.id}`) {
    return route.path === path
  }
  return route.path.startsWith(path)
}

const saveModalApiKey = async () => {
  modalError.value = ''
  if (!modalApiKey.value.trim()) return

  modalSaving.value = true
  try {
    await $fetch(`${base}/api/users/me/api-key`, {
      method: 'PATCH',
      credentials: 'include',
      body: { apiKey: modalApiKey.value.trim() }
    })
    showApiKeyModal.value = false
    modalApiKey.value = ''
  } catch (err: any) {
    modalError.value = err?.data?.error ?? 'Failed to save API key. Please try again.'
  } finally {
    modalSaving.value = false
  }
}

const signOut = async () => {
  try {
    await $fetch(`${base}/auth/logout`, { method: 'POST', credentials: 'include' })
  } catch {
    // ignore backend errors
  }
  await clear()
  navigateTo('/login')
}
</script>
