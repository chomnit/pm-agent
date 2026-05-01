<template>
  <div class="flex h-full overflow-hidden">
    <!-- Left: Editor -->
    <div class="w-3/5 flex flex-col border-r overflow-y-auto" style="border-color: var(--color-border)">

      <!-- Sticky header -->
      <div class="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b" style="border-color: var(--color-border); background: var(--color-bg)">
        <div class="flex items-center gap-3">
          <NuxtLink to="/knowledge" class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
          </NuxtLink>
          <div>
            <h1 class="font-semibold text-sm" style="color: var(--color-text)">{{ isNew ? 'New Document' : 'Edit Document' }}</h1>
            <p v-if="!isNew && form.title" class="text-xs mt-0.5 truncate max-w-xs" style="color: var(--color-muted)">{{ form.title }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="!isNew"
            class="px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
            @click="confirmDelete = true"
          >
            Delete
          </button>
          <button
            :disabled="saving"
            class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
            @click="save"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin" />
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loadingDoc" class="flex-1 px-8 py-6 space-y-8 animate-pulse">
        <div class="space-y-4">
          <div class="h-3 bg-gray-200 rounded w-16"></div>
          <div class="h-10 bg-gray-200 rounded-lg"></div>
          <div class="grid grid-cols-2 gap-4">
            <div class="h-10 bg-gray-200 rounded-lg"></div>
            <div class="h-10 bg-gray-200 rounded-lg"></div>
          </div>
          <div class="flex gap-2">
            <div class="h-8 bg-gray-200 rounded-lg flex-1"></div>
            <div class="h-8 bg-gray-200 rounded-lg flex-1"></div>
            <div class="h-8 bg-gray-200 rounded-lg flex-1"></div>
          </div>
        </div>
        <div class="space-y-4">
          <div class="h-3 bg-gray-200 rounded w-16"></div>
          <div class="h-10 bg-gray-200 rounded-lg"></div>
          <div class="h-10 bg-gray-100 rounded-lg"></div>
        </div>
        <div class="space-y-4">
          <div class="h-3 bg-gray-200 rounded w-24"></div>
          <div class="flex gap-2">
            <div class="h-8 bg-gray-200 rounded-lg w-24"></div>
            <div class="h-8 bg-gray-100 rounded-lg w-24"></div>
          </div>
        </div>
        <div class="space-y-4">
          <div class="h-3 bg-gray-200 rounded w-16"></div>
          <div class="h-64 bg-gray-100 rounded-lg"></div>
        </div>
      </div>

      <!-- Form -->
      <div v-else class="flex-1 px-8 py-6 space-y-8">

        <!-- Section: Identity -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <p class="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style="color: var(--color-muted)">Identity</p>
            <div class="flex-1 h-px" style="background: var(--color-border)"></div>
          </div>

          <div>
            <label class="block text-xs font-medium mb-1.5" style="color: var(--color-muted)">Title <span class="text-red-400">*</span></label>
            <input
              v-model="form.title"
              type="text"
              placeholder="e.g. Merchant Onboarding Contract v3"
              class="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              style="border-color: var(--color-border); color: var(--color-text)"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1.5" style="color: var(--color-muted)">Category <span class="text-red-400">*</span></label>
              <div class="relative">
                <select
                  v-model="form.category"
                  class="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 appearance-none pr-8 transition-colors"
                  style="border-color: var(--color-border); color: var(--color-text)"
                >
                  <option value="" disabled>Select category</option>
                  <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
                <Icon name="heroicons:chevron-down" class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1.5" style="color: var(--color-muted)">Version</label>
              <input
                v-model="form.version"
                type="text"
                placeholder="e.g. 1.0"
                class="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                style="border-color: var(--color-border); color: var(--color-text)"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium mb-2" style="color: var(--color-muted)">Status</label>
            <div class="flex gap-2">
              <button
                v-for="s in statuses"
                :key="s.value"
                type="button"
                class="flex-1 py-2 rounded-lg text-xs font-medium border transition-all"
                :class="form.status === s.value ? s.activeClass : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'"
                @click="form.status = s.value"
              >
                <span class="flex items-center justify-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full" :class="form.status === s.value ? s.dotClass : 'bg-gray-300'"></span>
                  {{ s.label }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Section: Source -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <p class="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style="color: var(--color-muted)">Source</p>
            <div class="flex-1 h-px" style="background: var(--color-border)"></div>
          </div>

          <div>
            <label class="block text-xs font-medium mb-1.5" style="color: var(--color-muted)">Source File Name</label>
            <input
              v-model="form.sourceFile"
              type="text"
              placeholder="e.g. merchant-contract-v3.pdf"
              class="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              style="border-color: var(--color-border); color: var(--color-text)"
            />
          </div>

          <div>
            <label class="block text-xs font-medium mb-1.5" style="color: var(--color-muted)">Import from File</label>
            <div class="flex items-center gap-3">
              <label
                class="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer hover:bg-gray-50 transition-colors"
                style="border-color: var(--color-border)"
              >
                <Icon name="heroicons:arrow-up-tray" class="w-4 h-4 text-gray-400" />
                <span class="text-sm" style="color: var(--color-muted)">{{ uploadFileName || 'Upload PDF or DOCX...' }}</span>
                <input type="file" accept=".pdf,.docx" class="hidden" @change="handleUpload" />
              </label>
              <div v-if="uploading" class="flex items-center gap-1.5 text-xs text-violet-600">
                <Icon name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin" />
                Extracting text...
              </div>
              <div v-else-if="uploadFileName" class="flex items-center gap-1.5 text-xs text-emerald-600">
                <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" />
                Imported
              </div>
            </div>
            <p class="text-xs mt-1.5" style="color: var(--color-muted)">Text will be extracted and placed in the content editor below</p>
          </div>
        </div>

        <!-- Section: Distribution -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <p class="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style="color: var(--color-muted)">Distribution</p>
            <div class="flex-1 h-px" style="background: var(--color-border)"></div>
          </div>

          <div>
            <label class="block text-xs font-medium mb-2" style="color: var(--color-muted)">Available to Agents</label>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                :class="form.usedByAll ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600'"
                @click="form.usedByAll = !form.usedByAll"
              >
                All Agents
              </button>
              <template v-if="!form.usedByAll">
                <button
                  v-for="agent in agentOptions"
                  :key="agent.value"
                  type="button"
                  class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                  :class="form.agentTypes.includes(agent.value) ? agent.activeClass : 'border-gray-200 text-gray-600 hover:border-gray-300'"
                  @click="toggleAgent(agent.value)"
                >
                  {{ agent.label }}
                </button>
              </template>
            </div>
            <p class="text-xs mt-2" style="color: var(--color-muted)">Select which AI agents can reference this document when generating outputs</p>
          </div>
        </div>

        <!-- Section: Content -->
        <div class="space-y-4 pb-8">
          <div class="flex items-center gap-3">
            <p class="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style="color: var(--color-muted)">Content <span class="text-red-400">*</span></p>
            <div class="flex-1 h-px" style="background: var(--color-border)"></div>
          </div>

          <div class="rounded-lg border overflow-hidden" style="border-color: var(--color-border)">
            <!-- Toolbar -->
            <div class="flex items-center gap-0.5 px-2 py-1.5 border-b" style="border-color: var(--color-border); background: var(--color-bg)">
              <button
                v-for="tool in editorTools"
                :key="tool.label"
                type="button"
                class="px-2.5 py-1 rounded text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                :class="tool.mono ? 'font-mono' : ''"
                @click="insertMarkdown(tool)"
              >{{ tool.label }}</button>
              <div class="flex-1"></div>
              <span class="text-xs px-2 py-0.5 rounded font-mono" style="color: var(--color-muted); background: var(--color-border)">MD</span>
            </div>

            <textarea
              ref="contentRef"
              v-model="form.content"
              rows="22"
              :placeholder="contentPlaceholder"
              class="w-full px-4 py-3 text-sm font-mono outline-none resize-none leading-relaxed"
              style="color: var(--color-text); background: var(--color-card)"
            ></textarea>

            <div class="flex items-center justify-between px-3 py-1.5 border-t" style="border-color: var(--color-border); background: var(--color-bg)">
              <p class="text-xs" style="color: var(--color-muted)">Supports GitHub Flavored Markdown</p>
              <p class="text-xs font-mono" style="color: var(--color-muted)">{{ wordCount }} words</p>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Right: Preview -->
    <div class="w-2/5 flex flex-col overflow-y-auto" style="background: var(--color-bg)">
      <div class="sticky top-0 px-6 py-4 border-b z-10" style="border-color: var(--color-border); background: var(--color-bg)">
        <p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--color-muted)">Preview</p>
      </div>

      <!-- Metadata card -->
      <div v-if="form.title || form.category" class="px-6 pt-5">
        <div class="flex items-start gap-3 p-4 rounded-xl border" style="border-color: var(--color-border); background: var(--color-card)">
          <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon name="heroicons:document-text" class="w-4 h-4 text-blue-600" />
          </div>
          <div class="flex-1 min-w-0 space-y-1.5">
            <p class="text-sm font-medium" style="color: var(--color-text)">{{ form.title || 'Untitled Document' }}</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-if="form.category" class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{{ categoryLabel(form.category) }}</span>
              <span v-if="form.version" class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">v{{ form.version }}</span>
              <span class="text-xs px-1.5 py-0.5 rounded flex items-center gap-1" :class="statusBadgeClass">
                <span class="w-1 h-1 rounded-full" :class="statusDotClass"></span>
                {{ form.status }}
              </span>
            </div>
            <div v-if="form.usedByAll || form.agentTypes.length" class="flex flex-wrap gap-1">
              <span v-if="form.usedByAll" class="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">All Agents</span>
              <template v-else>
                <span v-for="a in form.agentTypes" :key="a" class="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">{{ agentLabel(a) }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Rendered markdown -->
      <div class="flex-1 px-6 py-5 prose prose-sm max-w-none" style="color: var(--color-text)">
        <MDC :value="form.content || '*Nothing to preview yet. Start writing in the editor.*'" />
      </div>
    </div>

    <!-- Delete confirmation -->
    <AppModal :open="confirmDelete" title="Delete Document" size="sm" @close="confirmDelete = false">
      <div class="px-6 py-5">
        <p class="text-sm mb-5" style="color: var(--color-muted)">This will permanently delete "<strong style="color: var(--color-text)">{{ form.title }}</strong>". This action cannot be undone.</p>
        <div class="flex justify-end gap-3">
          <button type="button" class="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors" style="color: var(--color-muted)" @click="confirmDelete = false">Cancel</button>
          <button type="button" :disabled="deleting" class="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors" @click="deleteItem">
            <span v-if="deleting">Deleting...</span><span v-else>Delete</span>
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import type { OrgKnowledgeItem, AgentType } from '@pm-agents/shared'

definePageMeta({ middleware: ['auth', 'superadmin'] })

const route = useRoute()
const config = useRuntimeConfig()
const base = config.public.apiBase
const apiFetch = useApiFetch()
const toast = useToast()

const itemId = route.params.id as string
const isNew = itemId === 'new'

const form = reactive({
  title: '',
  category: '' as string,
  status: 'draft' as string,
  sourceFile: '',
  version: '',
  usedByAll: false,
  agentTypes: [] as AgentType[],
  content: ''
})

const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const uploading = ref(false)
const uploadFileName = ref('')
const loadingDoc = ref(!isNew)
const contentRef = ref<HTMLTextAreaElement>()

const categories = [
  { value: 'legal_contracts', label: 'Legal Contracts' },
  { value: 'procedures', label: 'Procedures' },
  { value: 'templates', label: 'Templates' },
  { value: 'system_architecture', label: 'System Architecture' },
  { value: 'payment_flows', label: 'Payment Flows' }
]

const statuses = [
  { value: 'draft', label: 'Draft', activeClass: 'bg-amber-50 border-amber-300 text-amber-700', dotClass: 'bg-amber-400' },
  { value: 'active', label: 'Active', activeClass: 'bg-emerald-50 border-emerald-300 text-emerald-700', dotClass: 'bg-emerald-500' },
  { value: 'inactive', label: 'Inactive', activeClass: 'bg-gray-100 border-gray-300 text-gray-600', dotClass: 'bg-gray-400' }
]

const agentOptions = [
  { value: 'analysis', label: 'PDD Agent', activeClass: 'bg-violet-600 border-violet-600 text-white' }
]

const editorTools = [
  { label: 'B', prefix: '**', suffix: '**', mono: false },
  { label: 'I', prefix: '_', suffix: '_', mono: false },
  { label: 'H1', prefix: '# ', suffix: '', mono: true },
  { label: 'H2', prefix: '## ', suffix: '', mono: true },
  { label: 'H3', prefix: '### ', suffix: '', mono: true },
  { label: 'List', prefix: '- ', suffix: '', mono: false },
  { label: 'Code', prefix: '`', suffix: '`', mono: true },
  { label: 'Link', prefix: '[', suffix: '](url)', mono: false }
]

const contentPlaceholder = `Write document content in Markdown...\n\n## Section 1\nYour content here...\n\n## Section 2\nMore content...`

const wordCount = computed(() =>
  form.content.trim() ? form.content.trim().split(/\s+/).length : 0
)

const categoryLabel = (v: string) => categories.find(c => c.value === v)?.label ?? v
const agentLabel = (v: string) => agentOptions.find(a => a.value === v)?.label ?? v

const statusBadgeClass = computed(() => {
  if (form.status === 'active') return 'bg-emerald-100 text-emerald-700'
  if (form.status === 'draft') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600'
})

const statusDotClass = computed(() => {
  if (form.status === 'active') return 'bg-emerald-500'
  if (form.status === 'draft') return 'bg-amber-400'
  return 'bg-gray-400'
})

const toggleAgent = (agent: AgentType) => {
  const idx = form.agentTypes.indexOf(agent)
  if (idx >= 0) form.agentTypes.splice(idx, 1)
  else form.agentTypes.push(agent)
}

const insertMarkdown = (tool: { prefix: string; suffix: string }) => {
  const el = contentRef.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = form.content.slice(start, end)
  form.content = form.content.slice(0, start) + tool.prefix + selected + tool.suffix + form.content.slice(end)
  nextTick(() => {
    el.focus()
    const pos = start + tool.prefix.length + selected.length + tool.suffix.length
    el.setSelectionRange(pos, pos)
  })
}

const handleUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadFileName.value = file.name
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await apiFetch<{ data: { text: string } }>(`${base}/api/knowledge/upload`, {
      method: 'POST',
      body: fd
    })
    form.content = res.data.text
    form.sourceFile = file.name
  } catch (e: any) {
    toast.add({ title: 'Upload failed', description: e?.data?.error || 'Could not extract text', color: 'error' })
    uploadFileName.value = ''
  } finally {
    uploading.value = false
  }
}

const save = async () => {
  if (!form.title.trim() || !form.category || !form.content.trim()) {
    toast.add({ title: 'Required fields missing', description: 'Title, category and content are required', color: 'error' })
    return
  }
  saving.value = true
  try {
    const payload = { ...form, agentTypes: form.usedByAll ? [] : form.agentTypes }
    if (isNew) {
      await apiFetch(`${base}/api/knowledge`, { method: 'POST', body: payload })
      toast.add({ title: 'Document created', color: 'success' })
    } else {
      await apiFetch(`${base}/api/knowledge/${itemId}`, { method: 'PATCH', body: payload })
      toast.add({ title: 'Saved', color: 'success' })
    }
    navigateTo('/knowledge')
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.error || 'Something went wrong', color: 'error' })
  } finally {
    saving.value = false
  }
}

const deleteItem = async () => {
  deleting.value = true
  try {
    await apiFetch(`${base}/api/knowledge/${itemId}`, { method: 'DELETE' })
    navigateTo('/knowledge')
  } catch (e: any) {
    toast.add({ title: 'Delete failed', description: e?.data?.error, color: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  if (!isNew) {
    try {
      const res = await apiFetch<{ data: OrgKnowledgeItem }>(`${base}/api/knowledge/${itemId}`)
      const d = res.data
      form.title = d.title
      form.category = d.category
      form.status = d.status
      form.sourceFile = d.sourceFile ?? ''
      form.version = d.version ?? ''
      form.usedByAll = d.usedByAll
      form.agentTypes = [...d.agentTypes]
      form.content = d.content
    } catch {
      toast.add({ title: 'Not found', color: 'error' })
      navigateTo('/knowledge')
    } finally {
      loadingDoc.value = false
    }
  }
})
</script>
