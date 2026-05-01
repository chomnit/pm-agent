<template>
  <div class="px-6 py-6 h-full overflow-y-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-sm mb-4">
      <NuxtLink to="/dashboard" class="transition-colors hover:underline" style="color: var(--color-muted)">Projects</NuxtLink>
      <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
      <NuxtLink :to="`/projects/${projectId}`" class="transition-colors hover:underline" style="color: var(--color-muted)">{{ currentProject?.name ?? 'Project' }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
      <NuxtLink :to="`/projects/${projectId}?tab=knowledge`" class="transition-colors hover:underline" style="color: var(--color-muted)">Knowledge Base</NuxtLink>
      <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
      <span class="font-medium" style="color: var(--color-text)">{{ isNew ? 'New Feature' : 'Edit Feature' }}</span>
    </nav>

    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <h1 class="font-semibold text-lg" style="color: var(--color-text)">{{ isNew ? 'New Feature' : 'Edit Feature' }}</h1>
      <div class="flex-1" />
      <button v-if="!isNew" class="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors" @click="confirmDelete = true">Delete</button>
      <button type="button" class="px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" style="border-color: var(--color-border)" @click="goBack">Cancel</button>
      <button :disabled="saving" class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50" @click="save">
        {{ saving ? 'Saving...' : 'Save Feature' }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loadingFeature" class="grid grid-cols-5 gap-5 items-start">
      <div class="col-span-3 space-y-4">
        <div class="rounded-xl border p-6 space-y-4" style="background: var(--color-card); border-color: var(--color-border)">
          <div class="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div class="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
          <div class="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
      </div>
      <div class="col-span-2 space-y-4">
        <div v-for="n in 3" :key="n" class="rounded-xl border p-6 space-y-3 animate-pulse" style="background: var(--color-card); border-color: var(--color-border)">
          <div class="h-4 bg-gray-200 rounded w-24"></div>
          <div class="h-10 bg-gray-100 rounded-lg"></div>
          <div class="h-10 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    </div>

    <!-- Two-column layout -->
    <div v-else class="grid grid-cols-5 gap-5 items-start">

      <!-- LEFT: Context (3/5) -->
      <form class="col-span-3" @submit.prevent="save">
        <div class="rounded-xl border p-6" style="background: var(--color-card); border-color: var(--color-border)">
          <h2 class="text-xs font-semibold uppercase tracking-wide mb-5" style="color: var(--color-muted)">Context</h2>
          <div class="space-y-4">
            <!-- Feature Name -->
            <div>
              <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Feature Name <span class="text-red-500">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g. QR Code Payment"
                class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
                style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text)"
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Description <span class="text-red-500">*</span></label>
              <p class="text-xs mb-1.5" style="color: var(--color-muted)">1–3 sentence summary. Agents use this for quick context.</p>
              <textarea
                v-model="form.description"
                rows="3"
                required
                placeholder="e.g. Allows merchants to generate a KHQR code that customers can scan to initiate a payment."
                class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none transition-shadow"
                style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text)"
              ></textarea>
            </div>

            <!-- Functionality -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-sm font-medium" style="color: var(--color-text)">Functionality</label>
                <div class="flex items-center gap-0.5 p-0.5 rounded-lg" style="background: var(--color-border)">
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                    :class="functionalityMode === 'edit' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'"
                    @click="functionalityMode = 'edit'"
                  >Edit</button>
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                    :class="functionalityMode === 'preview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'"
                    @click="functionalityMode = 'preview'"
                  >Preview</button>
                </div>
              </div>
              <p class="text-xs mb-1.5" style="color: var(--color-muted)">Step-by-step breakdown of flows, edge cases, business rules, and API behaviour. The more detail, the better agents avoid duplication.</p>
              <textarea
                v-if="functionalityMode === 'edit'"
                v-model="form.functionality"
                rows="16"
                placeholder="## How it works&#10;1. Merchant requests a QR code via POST /api/qr/generate&#10;2. Backend calls NBC KHQR SDK to produce a base64-encoded QR image&#10;&#10;## Edge cases&#10;- Dynamic QR codes expire after 15 minutes&#10;- Static QR codes have no expiry&#10;&#10;## Business rules&#10;- Minimum transaction: 100 KHR / 0.25 USD"
                class="w-full rounded-lg border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-violet-500 resize-y transition-shadow"
                style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text); min-height: 280px"
              ></textarea>
              <div
                v-else
                class="w-full rounded-lg border px-4 py-3 md-preview"
                style="border-color: var(--color-border); background: var(--color-bg); min-height: 280px"
              >
                <MDC v-if="form.functionality" :value="form.functionality" tag="div" />
                <p v-else class="text-sm" style="color: var(--color-muted)">Nothing to preview yet.</p>
              </div>
            </div>
          </div>
        </div>
      </form>

      <!-- RIGHT: Identity + Technical + Discovery (2/5) -->
      <div class="col-span-2 space-y-4 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">

        <!-- Card: Identity -->
        <div class="rounded-xl border p-5" style="background: var(--color-card); border-color: var(--color-border)">
          <h2 class="text-xs font-semibold uppercase tracking-wide mb-4" style="color: var(--color-muted)">Identity</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Category <span class="text-red-500">*</span></label>
              <input
                v-model="form.category"
                type="text"
                placeholder="e.g. Payments"
                class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
                style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text)"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Status</label>
              <div class="flex gap-1.5">
                <button
                  v-for="s in statuses"
                  :key="s.value"
                  type="button"
                  class="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                  :class="form.status === s.value ? s.activeClass : 'border-gray-200 text-gray-500 hover:border-gray-300'"
                  @click="form.status = s.value"
                >
                  {{ s.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Card: Technical -->
        <div class="rounded-xl border p-5" style="background: var(--color-card); border-color: var(--color-border)">
          <h2 class="text-xs font-semibold uppercase tracking-wide mb-4" style="color: var(--color-muted)">Technical</h2>
          <div class="space-y-4">
            <!-- User Roles -->
            <div>
              <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">User Roles</label>
              <div v-if="form.userRoles.length" class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="role in form.userRoles" :key="role" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                  {{ role }}
                  <button type="button" @click="removeTag('userRoles', role)"><Icon name="heroicons:x-mark" class="w-3 h-3" /></button>
                </span>
              </div>
              <input
                v-model="userRoleInput"
                type="text"
                placeholder="Merchant, Admin — press Enter"
                class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
                style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text)"
                @keydown.enter.prevent="addTag('userRoles', userRoleInput)"
                @keydown.comma.prevent="addTag('userRoles', userRoleInput)"
                @blur="addTag('userRoles', userRoleInput)"
              />
            </div>
            <!-- Integrations -->
            <div>
              <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Integrations</label>
              <div v-if="form.integrations.length" class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="item in form.integrations" :key="item" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  {{ item }}
                  <button type="button" @click="removeTag('integrations', item)"><Icon name="heroicons:x-mark" class="w-3 h-3" /></button>
                </span>
              </div>
              <input
                v-model="integrationInput"
                type="text"
                placeholder="NBC KHQR SDK, Core Banking API — press Enter"
                class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
                style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text)"
                @keydown.enter.prevent="addTag('integrations', integrationInput)"
                @keydown.comma.prevent="addTag('integrations', integrationInput)"
                @blur="addTag('integrations', integrationInput)"
              />
            </div>
            <!-- Limitations -->
            <div>
              <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Limitations</label>
              <textarea
                v-model="form.limitations"
                rows="3"
                placeholder="e.g. Does not support batch QR generation."
                class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none transition-shadow"
                style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text)"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Card: Discovery -->
        <div class="rounded-xl border p-5" style="background: var(--color-card); border-color: var(--color-border)">
          <h2 class="text-xs font-semibold uppercase tracking-wide mb-4" style="color: var(--color-muted)">Discovery</h2>
          <div>
            <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Tags</label>
            <div v-if="form.tags.length" class="flex flex-wrap gap-1.5 mb-2">
              <span v-for="tag in form.tags" :key="tag" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                {{ tag }}
                <button type="button" @click="removeTag('tags', tag)"><Icon name="heroicons:x-mark" class="w-3 h-3" /></button>
              </span>
            </div>
            <input
              v-model="tagInput"
              type="text"
              placeholder="khqr, mobile, mvp — press Enter"
              class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
              style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text)"
              @keydown.enter.prevent="addTag('tags', tagInput)"
              @keydown.comma.prevent="addTag('tags', tagInput)"
              @blur="addTag('tags', tagInput)"
            />
          </div>
        </div>

      </div>
    </div>

    <!-- Delete confirmation -->
    <AppModal :open="confirmDelete" title="Delete Feature" size="sm" @close="confirmDelete = false">
      <div class="px-6 py-5">
        <p class="text-sm mb-5" style="color: var(--color-muted)">This will permanently delete "{{ form.name }}". This action cannot be undone.</p>
        <div class="flex justify-end gap-3">
          <button type="button" class="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors" style="color: var(--color-muted)" @click="confirmDelete = false">Cancel</button>
          <button type="button" :disabled="deleting" class="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors" @click="deleteFeature">
            <span v-if="deleting">Deleting...</span><span v-else>Delete</span>
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import type { ProjectFeature } from '@pm-agents/shared'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = route.params.id as string
const featureId = route.params.featureId as string
const currentProject = useState<{ id: string; name: string } | null>('currentProject')
const isNew = featureId === 'new'
const config = useRuntimeConfig()
const base = config.public.apiBase
const apiFetch = useApiFetch()
const toast = useToast()

const statuses = [
  { value: 'live', label: 'Live', activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { value: 'in_development', label: 'In Dev', activeClass: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'deprecated', label: 'Deprecated', activeClass: 'border-gray-300 bg-gray-100 text-gray-600' }
]

const form = reactive({
  name: '',
  category: '',
  status: 'in_development' as string,
  description: '',
  functionality: '',
  userRoles: [] as string[],
  integrations: [] as string[],
  limitations: '',
  tags: [] as string[]
})


const functionalityMode = ref<'edit' | 'preview'>('edit')
const userRoleInput = ref('')
const integrationInput = ref('')
const tagInput = ref('')
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const loadingFeature = ref(!isNew)

const addTag = (field: 'userRoles' | 'integrations' | 'tags', val: string) => {
  const v = val.trim().replace(/,$/, '')
  if (v && !form[field].includes(v)) form[field].push(v)
  if (field === 'userRoles') userRoleInput.value = ''
  if (field === 'integrations') integrationInput.value = ''
  if (field === 'tags') tagInput.value = ''
}

const removeTag = (field: 'userRoles' | 'integrations' | 'tags', val: string) => {
  form[field] = form[field].filter(v => v !== val)
}

const goBack = () => navigateTo(`/projects/${projectId}?tab=knowledge`)

const save = async () => {
  if (!form.name.trim() || !form.category.trim() || !form.description.trim()) {
    toast.add({ title: 'Required fields missing', description: 'Name, category, and description are required.', color: 'error' })
    return
  }
  saving.value = true
  try {
    if (isNew) {
      const res = await apiFetch<{ data: ProjectFeature }>(`${base}/api/projects/${projectId}/features`, {
        method: 'POST', body: form
      })
      toast.add({ title: 'Feature created', color: 'success' })
      await navigateTo(`/projects/${projectId}/knowledge/${res.data.id}`)
    } else {
      await apiFetch(`${base}/api/projects/${projectId}/features/${featureId}`, {
        method: 'PATCH', body: form
      })
      toast.add({ title: 'Saved', color: 'success' })
    }
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.error || 'Something went wrong', color: 'error' })
  } finally {
    saving.value = false
  }
}

const deleteFeature = async () => {
  deleting.value = true
  try {
    await apiFetch(`${base}/api/projects/${projectId}/features/${featureId}`, { method: 'DELETE' })
    goBack()
  } catch (e: any) {
    toast.add({ title: 'Delete failed', description: e?.data?.error, color: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  if (!isNew) {
    try {
      const res = await apiFetch<{ data: ProjectFeature }>(`${base}/api/projects/${projectId}/features/${featureId}`)
      const d = res.data
      form.name = d.name
      form.category = d.category
      form.status = d.status
      form.description = d.description
      form.functionality = d.functionality ?? ''
      form.userRoles = [...(d.userRoles ?? [])]
      form.integrations = [...(d.integrations ?? [])]
      form.limitations = d.limitations ?? ''
      form.tags = [...(d.tags ?? [])]
    } catch {
      toast.add({ title: 'Not found', color: 'error' })
      goBack()
    } finally {
      loadingFeature.value = false
    }
  }
})
</script>

<style scoped>
.md-preview :deep(h1) { font-size: 1.125rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--color-text); }
.md-preview :deep(h2) { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--color-text); }
.md-preview :deep(h3) { font-size: 0.875rem; font-weight: 600; margin: 0.75rem 0 0.375rem; color: var(--color-text); }
.md-preview :deep(p) { font-size: 0.875rem; line-height: 1.6; margin: 0.375rem 0; color: var(--color-text); }
.md-preview :deep(ul), .md-preview :deep(ol) { padding-left: 1.25rem; margin: 0.375rem 0; }
.md-preview :deep(li) { font-size: 0.875rem; line-height: 1.6; margin: 0.2rem 0; color: var(--color-text); }
.md-preview :deep(code) { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; background: #f3f4f6; padding: 0.1rem 0.35rem; border-radius: 0.25rem; color: #4b5563; }
.md-preview :deep(pre) { background: #f3f4f6; border-radius: 0.5rem; padding: 0.75rem 1rem; overflow-x: auto; margin: 0.5rem 0; }
.md-preview :deep(pre code) { background: none; padding: 0; font-size: 0.75rem; }
.md-preview :deep(blockquote) { border-left: 3px solid var(--color-border); padding-left: 0.75rem; margin: 0.5rem 0; color: var(--color-muted); font-style: italic; }
.md-preview :deep(hr) { border-color: var(--color-border); margin: 0.75rem 0; }
.md-preview :deep(strong) { font-weight: 600; }
</style>
