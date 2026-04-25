<template>
  <div class="flex h-full overflow-hidden">
    <!-- Left: Editor -->
    <div class="w-3/5 flex flex-col border-r overflow-y-auto" style="border-color: var(--color-border)">
      <div class="flex items-center justify-between px-8 py-5 border-b" style="border-color: var(--color-border)">
        <div class="flex items-center gap-3">
          <NuxtLink to="/knowledge" class="text-gray-400 hover:text-gray-600 transition-colors">
            <Icon name="heroicons:arrow-left" class="w-5 h-5" />
          </NuxtLink>
          <h1 class="font-semibold" style="color: var(--color-text)">{{ isNew ? 'New Document' : 'Edit Document' }}</h1>
        </div>
        <div class="flex gap-2">
          <button
            v-if="!isNew"
            class="px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
            @click="confirmDelete = true"
          >
            Delete
          </button>
          <button
            :disabled="saving"
            class="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
            @click="save"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>

      <div class="flex-1 px-8 py-6 space-y-5">
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Title</label>
          <input v-model="form.title" type="text" placeholder="Document title..." class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border)" />
        </div>

        <!-- Category + Status -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Category</label>
            <select v-model="form.category" class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border)">
              <option value="">Select category</option>
              <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Status</label>
            <select v-model="form.status" class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border)">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <!-- Source File + Version -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Source File</label>
            <input v-model="form.sourceFile" type="text" placeholder="e.g. contract-v2.pdf" class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border)" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Version</label>
            <input v-model="form.version" type="text" placeholder="e.g. 1.0" class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border)" />
          </div>
        </div>

        <!-- Agent Types -->
        <div>
          <label class="block text-sm font-medium mb-2" style="color: var(--color-text)">Available to Agents</label>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
              :class="form.usedByAll ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
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
        </div>

        <!-- Upload -->
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Upload PDF/DOCX</label>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer hover:bg-gray-50 transition-colors" style="border-color: var(--color-border)">
              <Icon name="heroicons:paper-clip" class="w-4 h-4 text-gray-400" />
              <span style="color: var(--color-muted)">{{ uploadFileName || 'Choose file...' }}</span>
              <input type="file" accept=".pdf,.docx" class="hidden" @change="handleUpload" />
            </label>
            <span v-if="uploading" class="text-xs text-violet-600">Extracting text...</span>
          </div>
        </div>

        <!-- Content Editor -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-sm font-medium" style="color: var(--color-text)">Content</label>
            <div class="flex gap-1">
              <button v-for="tool in editorTools" :key="tool.label" type="button" class="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 font-mono transition-colors" @click="insertMarkdown(tool)">{{ tool.label }}</button>
            </div>
          </div>
          <textarea
            ref="contentRef"
            v-model="form.content"
            rows="20"
            placeholder="Write markdown content here..."
            class="w-full rounded-lg border px-3 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            style="border-color: var(--color-border)"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Right: Preview -->
    <div class="w-2/5 flex flex-col overflow-y-auto">
      <div class="px-6 py-5 border-b" style="border-color: var(--color-border)">
        <p class="text-sm font-medium" style="color: var(--color-muted)">Preview</p>
      </div>
      <div class="flex-1 px-6 py-5 prose prose-sm max-w-none">
        <MDC :value="form.content || '*Nothing to preview yet.*'" />
      </div>
    </div>

    <!-- Delete confirmation -->
    <AppModal :open="confirmDelete" title="Delete Document" size="sm" @close="confirmDelete = false">
      <div class="px-6 py-5">
        <p class="text-sm mb-5" style="color: var(--color-muted)">This will permanently delete "{{ form.title }}". This action cannot be undone.</p>
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

definePageMeta({ middleware: 'auth' })

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
const contentRef = ref<HTMLTextAreaElement>()

const categories = [
  { value: 'legal_contracts', label: 'Legal Contracts' },
  { value: 'procedures', label: 'Procedures' },
  { value: 'templates', label: 'Templates' },
  { value: 'system_architecture', label: 'System Architecture' },
  { value: 'payment_flows', label: 'Payment Flows' }
]

const agentOptions = [
  { value: 'analysis', label: 'PDD Agent', activeClass: 'bg-violet-600 border-violet-600 text-white' }
]

const editorTools = [
  { label: 'B', prefix: '**', suffix: '**' },
  { label: 'I', prefix: '_', suffix: '_' },
  { label: 'H1', prefix: '# ', suffix: '' },
  { label: 'H2', prefix: '## ', suffix: '' },
  { label: 'List', prefix: '- ', suffix: '' },
  { label: 'Code', prefix: '`', suffix: '`' }
]

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
    }
  }
})
</script>
