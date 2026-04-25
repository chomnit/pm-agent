<template>
  <div class="p-8 max-w-2xl">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold" style="color: var(--color-text)">Settings</h1>
      <p class="text-sm mt-0.5" style="color: var(--color-muted)">Manage your account preferences</p>
    </div>

    <!-- API Key Section -->
    <div class="rounded-xl border p-6" style="background: var(--color-card); border-color: var(--color-border)">
      <div class="flex items-start gap-4 mb-6">
        <div class="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Icon name="heroicons:key" class="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h2 class="font-semibold text-base" style="color: var(--color-text)">Anthropic API Key</h2>
          <p class="text-sm mt-0.5" style="color: var(--color-muted)">
            Your personal API key is used to run AI agents. It's encrypted at rest and never shared.
          </p>
        </div>
      </div>

      <!-- Key status indicator -->
      <div v-if="!loadingStatus" class="mb-5">
        <div
          v-if="keyStatus?.isSet"
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
          <span class="text-sm font-medium text-emerald-700">Key configured</span>
          <code class="ml-auto text-xs text-emerald-600 font-mono">{{ keyStatus.preview }}</code>
        </div>
        <div
          v-else
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100"
        >
          <span class="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
          <span class="text-sm font-medium text-amber-700">No API key configured — agents cannot run</span>
        </div>
      </div>
      <div v-else class="mb-5 h-10 rounded-lg bg-gray-100 animate-pulse"></div>

      <!-- Input -->
      <div class="mb-4">
        <label class="block text-xs font-medium mb-1.5" style="color: var(--color-text)">
          {{ keyStatus?.isSet ? 'Replace API key' : 'Enter API key' }}
        </label>
        <input
          v-model="apiKeyInput"
          type="password"
          placeholder="sk-ant-api03-..."
          autocomplete="off"
          class="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          style="border-color: var(--color-border); color: var(--color-text); background: var(--color-bg)"
          @keydown.enter="saveKey"
        />
        <p class="mt-1.5 text-xs" style="color: var(--color-muted)">
          Get your key at
          <a href="https://console.anthropic.com/settings/keys" target="_blank" class="text-violet-600 hover:underline">console.anthropic.com</a>
        </p>
      </div>

      <p v-if="saveError" class="mb-3 text-xs text-red-500">{{ saveError }}</p>
      <p v-if="saveSuccess" class="mb-3 text-xs text-emerald-600">API key saved successfully.</p>

      <!-- Actions -->
      <div class="flex items-center gap-3">
        <button
          :disabled="saving || !apiKeyInput.trim()"
          class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="saving || !apiKeyInput.trim() ? 'bg-violet-400' : 'bg-violet-600 hover:bg-violet-700'"
          @click="saveKey"
        >
          {{ saving ? 'Saving...' : 'Save key' }}
        </button>
        <button
          v-if="keyStatus?.isSet"
          :disabled="removing"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          style="border-color: var(--color-border); color: var(--color-muted)"
          @click="removeKey"
        >
          {{ removing ? 'Removing...' : 'Remove key' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const config = useRuntimeConfig()
const base = config.public.apiBase

const loadingStatus = ref(true)
const keyStatus = ref<{ isSet: boolean; preview: string | null } | null>(null)
const apiKeyInput = ref('')
const saving = ref(false)
const removing = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

const fetchStatus = async () => {
  loadingStatus.value = true
  try {
    const result = await $fetch<{ data: { isSet: boolean; preview: string | null } }>(
      `${base}/api/users/me/api-key/status`,
      { credentials: 'include' }
    )
    keyStatus.value = result.data
  } finally {
    loadingStatus.value = false
  }
}

const saveKey = async () => {
  saveError.value = ''
  saveSuccess.value = false
  if (!apiKeyInput.value.trim()) return

  saving.value = true
  try {
    const result = await $fetch<{ data: { isSet: boolean; preview: string | null } }>(
      `${base}/api/users/me/api-key`,
      { method: 'PATCH', credentials: 'include', body: { apiKey: apiKeyInput.value.trim() } }
    )
    keyStatus.value = result.data
    apiKeyInput.value = ''
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 4000)
  } catch (err: any) {
    saveError.value = err?.data?.error ?? 'Failed to save API key.'
  } finally {
    saving.value = false
  }
}

const removeKey = async () => {
  removing.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch(`${base}/api/users/me/api-key`, { method: 'DELETE', credentials: 'include' })
    keyStatus.value = { isSet: false, preview: null }
    apiKeyInput.value = ''
  } catch (err: any) {
    saveError.value = err?.data?.error ?? 'Failed to remove API key.'
  } finally {
    removing.value = false
  }
}

onMounted(fetchStatus)
</script>
