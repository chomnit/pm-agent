<template>
  <div class="p-8 max-w-3xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-sm mb-6">
      <NuxtLink to="/dashboard" class="transition-colors hover:underline" style="color: var(--color-muted)">Projects</NuxtLink>
      <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
      <NuxtLink :to="`/projects/${projectId}`" class="transition-colors hover:underline" style="color: var(--color-muted)">{{ currentProject?.name ?? 'Project' }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
      <NuxtLink :to="`/projects/${projectId}?tab=knowledge`" class="transition-colors hover:underline" style="color: var(--color-muted)">Knowledge Base</NuxtLink>
      <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
      <span class="font-medium" style="color: var(--color-text)">{{ isNew ? 'New Feature' : 'Edit Feature' }}</span>
    </nav>
    <!-- Header -->
    <div class="flex items-center gap-3 mb-8">
      <h1 class="font-semibold text-lg" style="color: var(--color-text)">{{ isNew ? 'New Feature' : 'Edit Feature' }}</h1>
      <div class="flex-1"></div>
      <button v-if="!isNew" class="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors" @click="confirmDelete = true">Delete</button>
    </div>

    <form class="space-y-6" @submit.prevent="save">
      <!-- Name -->
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Feature Name <span class="text-red-500">*</span></label>
        <p class="text-xs mb-1.5" style="color: var(--color-muted)">The official name of the feature as it appears in the product (e.g. "QR Code Payment", "Recurring Transfer").</p>
        <input v-model="form.name" type="text" placeholder="e.g. QR Code Payment" class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border)" required />
      </div>

      <!-- Category + Status -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Category <span class="text-red-500">*</span></label>
          <p class="text-xs mb-1.5" style="color: var(--color-muted)">Group this feature belongs to (e.g. Payments, Auth, Reports, Notifications).</p>
          <input v-model="form.category" type="text" placeholder="e.g. Payments, Auth, Reports" class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border)" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Status</label>
          <p class="text-xs mb-1.5" style="color: var(--color-muted)">Current deployment state of this feature.</p>
          <select v-model="form.status" class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border)">
            <option value="live">Live — available to users in production</option>
            <option value="in_development">In Development — being built or not yet released</option>
            <option value="deprecated">Deprecated — retired or replaced</option>
          </select>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Description <span class="text-red-500">*</span></label>
        <p class="text-xs mb-1.5" style="color: var(--color-muted)">1–3 sentence summary of what this feature does and the problem it solves. Agents use this for quick context.</p>
        <textarea v-model="form.description" rows="3" placeholder="e.g. Allows merchants to generate a static or dynamic KHQR code that customers can scan to initiate a payment from any NBC-compliant banking app." class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none" style="border-color: var(--color-border)" required></textarea>
      </div>

      <!-- Functionality -->
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Functionality</label>
        <p class="text-xs mb-1.5" style="color: var(--color-muted)">Detailed step-by-step breakdown of how this feature works — flows, edge cases, business rules, API behaviour, and data handling. Markdown supported. The more detail here, the better agents can avoid duplicating or conflicting with this feature.</p>
        <textarea v-model="form.functionality" rows="14" placeholder="## How it works&#10;1. Merchant requests a QR code via POST /api/qr/generate with amount and reference&#10;2. Backend calls NBC KHQR SDK to produce a base64-encoded QR image&#10;3. Customer scans with any NBC-compliant banking app&#10;4. Payment notification arrives via webhook POST /webhooks/payment&#10;&#10;## Edge cases&#10;- Dynamic QR codes expire after 15 minutes&#10;- Static QR codes have no expiry but cannot carry a fixed amount&#10;&#10;## Business rules&#10;- Minimum transaction: 100 KHR / 0.25 USD&#10;- Dual-currency (KHR + USD) displayed side by side" class="w-full rounded-lg border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-violet-500 resize-y" style="border-color: var(--color-border); min-height: 240px"></textarea>
      </div>

      <!-- Integrations -->
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Integrations</label>
        <p class="text-xs mb-1.5" style="color: var(--color-muted)">External systems, APIs, SDKs, or internal services this feature depends on or connects to (e.g. NBC KHQR SDK, Stripe, AWS S3, Core Banking API). Add each and press Enter or comma.</p>
        <div class="flex flex-wrap gap-2 mb-2">
          <span v-for="item in form.integrations" :key="item" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            {{ item }}
            <button type="button" @click="removeTag('integrations', item)"><Icon name="heroicons:x-mark" class="w-3 h-3" /></button>
          </span>
        </div>
        <input
          v-model="integrationInput"
          type="text"
          placeholder="e.g. NBC KHQR SDK, Core Banking API, AWS S3..."
          class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          style="border-color: var(--color-border)"
          @keydown.enter.prevent="addTag('integrations', integrationInput)"
          @keydown.comma.prevent="addTag('integrations', integrationInput)"
        />
      </div>

      <!-- Limitations -->
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Limitations</label>
        <p class="text-xs mb-1.5" style="color: var(--color-muted)">Known constraints, technical debt, compliance restrictions, or missing capabilities agents should be aware of to avoid recommending out-of-scope changes.</p>
        <textarea v-model="form.limitations" rows="3" placeholder="e.g. Does not support batch QR generation. Only works with NBC-registered banks. No refund flow implemented yet." class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none" style="border-color: var(--color-border)"></textarea>
      </div>

      <!-- Tags -->
      <div>
        <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Tags</label>
        <p class="text-xs mb-1.5" style="color: var(--color-muted)">Free-form labels for filtering and discovery (e.g. khqr, mobile, offline, mvp). Add each tag and press Enter or comma.</p>
        <div class="flex flex-wrap gap-2 mb-2">
          <span v-for="tag in form.tags" :key="tag" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
            {{ tag }}
            <button type="button" @click="removeTag('tags', tag)"><Icon name="heroicons:x-mark" class="w-3 h-3" /></button>
          </span>
        </div>
        <input
          v-model="tagInput"
          type="text"
          placeholder="e.g. khqr, mobile, mvp..."
          class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          style="border-color: var(--color-border)"
          @keydown.enter.prevent="addTag('tags', tagInput)"
          @keydown.comma.prevent="addTag('tags', tagInput)"
        />
      </div>

      <!-- Save -->
      <div class="flex justify-end gap-3 pt-4 border-t" style="border-color: var(--color-border)">
        <button type="button" class="px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" style="border-color: var(--color-border)" @click="goBack">Cancel</button>
        <button type="submit" :disabled="saving" class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
          {{ saving ? 'Saving...' : 'Save Feature' }}
        </button>
      </div>
    </form>

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

const form = reactive({
  name: '',
  category: '',
  status: 'in_development' as string,
  description: '',
  functionality: '',
  integrations: [] as string[],
  limitations: '',
  tags: [] as string[]
})

const integrationInput = ref('')
const tagInput = ref('')
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)

const addTag = (field: 'integrations' | 'tags', val: string) => {
  const v = val.trim().replace(/,$/, '')
  if (v && !form[field].includes(v)) form[field].push(v)
  if (field === 'integrations') integrationInput.value = ''
  if (field === 'tags') tagInput.value = ''
}

const removeTag = (field: 'integrations' | 'tags', val: string) => {
  form[field] = form[field].filter(v => v !== val)
}

const goBack = () => navigateTo(`/projects/${projectId}`)

const save = async () => {
  saving.value = true
  try {
    if (isNew) {
      await apiFetch(`${base}/api/projects/${projectId}/features`, {
        method: 'POST', body: form
      })
      toast.add({ title: 'Feature created', color: 'success' })
    } else {
      await apiFetch(`${base}/api/projects/${projectId}/features/${featureId}`, {
        method: 'PATCH', body: form
      })
      toast.add({ title: 'Saved', color: 'success' })
    }
    goBack()
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.error || 'Something went wrong', color: 'error' })
  } finally {
    saving.value = false
  }
}

const deleteFeature = async () => {
  deleting.value = true
  try {
    await apiFetch(`${base}/api/projects/${projectId}/features/${featureId}`, {
      method: 'DELETE'
    })
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
      form.integrations = [...(d.integrations ?? [])]
      form.limitations = d.limitations ?? ''
      form.tags = [...(d.tags ?? [])]
    } catch {
      toast.add({ title: 'Not found', color: 'error' })
      goBack()
    }
  }
})
</script>
