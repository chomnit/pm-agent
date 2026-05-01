<template>
  <div class="px-6 py-6 h-full overflow-y-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-sm mb-4">
      <NuxtLink to="/dashboard" class="hover:underline transition-colors" style="color: var(--color-muted)">Projects</NuxtLink>
      <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
      <NuxtLink :to="`/projects/${projectId}`" class="hover:underline transition-colors" style="color: var(--color-muted)">{{ currentProject?.name ?? 'Project' }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
      <NuxtLink :to="`/projects/${projectId}?tab=knowledge`" class="hover:underline transition-colors" style="color: var(--color-muted)">Knowledge Base</NuxtLink>
      <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
      <span class="font-medium" style="color: var(--color-text)">Sync from Jira</span>
    </nav>

    <!-- ── STEP 1: UPLOAD ─────────────────────────────────────────────────── -->
    <div v-if="step === 'upload'" class="max-w-2xl">
      <div class="mb-6">
        <h1 class="text-lg font-semibold mb-1" style="color: var(--color-text)">Sync Knowledge Base from Jira</h1>
        <p class="text-sm" style="color: var(--color-muted)">Paste your Jira release tickets and AI will classify them against existing features, then propose field-level updates for your review.</p>
      </div>

      <!-- Format tabs -->
      <div class="flex gap-1 mb-4 p-1 rounded-lg w-fit" style="background: var(--color-border)">
        <button
          v-for="fmt in formats"
          :key="fmt.key"
          class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          :class="inputFormat === fmt.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'"
          @click="inputFormat = fmt.key"
        >{{ fmt.label }}</button>
      </div>

      <div class="rounded-xl border p-6 space-y-4" style="background: var(--color-card); border-color: var(--color-border)">
        <!-- CSV upload -->
        <div v-if="inputFormat === 'csv'">
          <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Upload CSV file</label>
          <p class="text-xs mb-3" style="color: var(--color-muted)">CSV must have a <code class="bg-gray-100 px-1 rounded">title</code> column and optionally a <code class="bg-gray-100 px-1 rounded">description</code> column. First row is the header.</p>
          <label class="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:bg-gray-50" style="border-color: var(--color-border)">
            <Icon name="heroicons:arrow-up-tray" class="w-6 h-6 mb-2 text-gray-400" />
            <span class="text-sm text-gray-500">{{ csvFileName || 'Click to upload CSV' }}</span>
            <span v-if="parsedTickets.length" class="text-xs text-emerald-600 mt-1">{{ parsedTickets.length }} tickets loaded</span>
            <input type="file" accept=".csv,text/csv" class="hidden" @change="handleCsvUpload" />
          </label>
        </div>

        <!-- Paste mode -->
        <div v-else>
          <label class="block text-sm font-medium mb-1" style="color: var(--color-text)">Paste tickets</label>
          <p class="text-xs mb-3" style="color: var(--color-muted)">
            <span v-if="inputFormat === 'lines'">One ticket per line. Format: <code class="bg-gray-100 px-1 rounded">Title | Description</code> (description optional).</span>
            <span v-else>Paste raw JSON array: <code class="bg-gray-100 px-1 rounded">[{"title":"…","description":"…"},…]</code></span>
          </p>
          <textarea
            v-model="pasteText"
            rows="12"
            class="w-full rounded-lg border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-violet-500 resize-y"
            style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text); min-height: 200px"
            :placeholder="pastePlaceholder"
            @input="parsePasteText"
          ></textarea>
          <p v-if="parsedTickets.length" class="text-xs mt-1.5 text-emerald-600">{{ parsedTickets.length }} tickets parsed</p>
          <p v-if="parseError" class="text-xs mt-1.5 text-red-500">{{ parseError }}</p>
        </div>

        <!-- Preview -->
        <div v-if="parsedTickets.length" class="rounded-lg border p-3 space-y-1.5" style="border-color: var(--color-border); background: var(--color-bg)">
          <p class="text-xs font-medium mb-2" style="color: var(--color-muted)">Preview (first 5)</p>
          <div v-for="(t, i) in parsedTickets.slice(0, 5)" :key="i" class="text-xs flex gap-2">
            <span class="font-mono text-gray-400 flex-shrink-0">{{ i + 1 }}.</span>
            <div>
              <span class="font-medium" style="color: var(--color-text)">{{ t.title }}</span>
              <span v-if="t.description" class="ml-1" style="color: var(--color-muted)">— {{ t.description.slice(0, 80) }}{{ t.description.length > 80 ? '…' : '' }}</span>
            </div>
          </div>
          <p v-if="parsedTickets.length > 5" class="text-xs" style="color: var(--color-muted)">… and {{ parsedTickets.length - 5 }} more</p>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <NuxtLink :to="`/projects/${projectId}?tab=knowledge`" class="px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" style="border-color: var(--color-border)">Cancel</NuxtLink>
          <button
            :disabled="parsedTickets.length === 0 || starting"
            class="px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
            @click="startSync"
          >
            {{ starting ? 'Starting…' : `Sync ${parsedTickets.length} tickets` }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── STEP 2: PROCESSING ─────────────────────────────────────────────── -->
    <div v-else-if="step === 'processing'" class="max-w-md mx-auto mt-16 text-center">
      <div class="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-5">
        <Icon name="heroicons:cpu-chip" class="w-8 h-8 text-violet-600 animate-pulse" />
      </div>
      <h2 class="text-lg font-semibold mb-2" style="color: var(--color-text)">AI is analysing your tickets</h2>
      <p class="text-sm mb-1" style="color: var(--color-muted)">Classifying {{ session?.ticketCount }} tickets against your feature library…</p>
      <p class="text-xs" style="color: var(--color-muted)">This usually takes 30–90 seconds. You can leave this page and come back.</p>
      <div class="mt-6 flex justify-center gap-1">
        <span v-for="n in 3" :key="n" class="w-2 h-2 rounded-full bg-violet-400 animate-bounce" :style="`animation-delay: ${(n - 1) * 150}ms`"></span>
      </div>
    </div>

    <!-- ── STEP 3: REVIEW ─────────────────────────────────────────────────── -->
    <div v-else-if="step === 'review'">
      <!-- Summary bar -->
      <div class="flex items-center gap-4 mb-6">
        <div>
          <h1 class="text-lg font-semibold" style="color: var(--color-text)">Review AI Proposals</h1>
          <p class="text-sm" style="color: var(--color-muted)">
            {{ pendingProposals.length }} feature{{ pendingProposals.length !== 1 ? 's' : '' }} to review
            <span v-if="session?.unmatchedCount" class="ml-2">· {{ session.unmatchedCount }} unmatched ticket{{ session.unmatchedCount !== 1 ? 's' : '' }}</span>
          </p>
        </div>
        <div class="flex-1" />
        <NuxtLink :to="`/projects/${projectId}?tab=knowledge`" class="px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" style="border-color: var(--color-border)">
          Done
        </NuxtLink>
      </div>

      <!-- Failed state -->
      <div v-if="session?.status === 'failed'" class="rounded-xl border p-6 text-center" style="background: var(--color-card); border-color: var(--color-border)">
        <Icon name="heroicons:x-circle" class="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p class="font-medium text-red-600 mb-1">Sync failed</p>
        <p class="text-sm" style="color: var(--color-muted)">{{ session.errorMessage || 'An unknown error occurred.' }}</p>
      </div>

      <!-- No proposals -->
      <div v-else-if="pendingProposals.length === 0 && acceptedCount === 0" class="rounded-xl border p-10 text-center" style="background: var(--color-card); border-color: var(--color-border)">
        <Icon name="heroicons:check-circle" class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="font-medium mb-1" style="color: var(--color-text)">No updates needed</p>
        <p class="text-sm" style="color: var(--color-muted)">The AI found no changes to existing features from these tickets.</p>
      </div>

      <div v-else class="grid grid-cols-5 gap-5 items-start">
        <!-- Proposal list (3/5) -->
        <div class="col-span-3 space-y-4">
          <!-- Proposal card -->
          <div
            v-for="proposal in proposals"
            :key="proposal.id"
            class="rounded-xl border overflow-hidden transition-opacity"
            :class="proposal.status !== 'pending' ? 'opacity-50' : ''"
            style="background: var(--color-card); border-color: var(--color-border)"
          >
            <!-- Card header -->
            <div class="flex items-center gap-3 px-5 py-4 border-b" style="border-color: var(--color-border)">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-medium text-sm truncate" style="color: var(--color-text)">{{ proposal.featureName }}</p>
                  <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0" :class="confidenceClass(proposal.confidence)">{{ proposal.confidence }}</span>
                  <span v-if="proposal.status !== 'pending'" class="text-xs px-2 py-0.5 rounded-full flex-shrink-0" :class="proposal.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'">
                    {{ proposal.status }}
                  </span>
                </div>
                <p v-if="proposal.reasoning" class="text-xs mt-0.5 line-clamp-1" style="color: var(--color-muted)">{{ proposal.reasoning }}</p>
              </div>
              <div v-if="proposal.status === 'pending'" class="flex gap-2 flex-shrink-0">
                <button
                  :disabled="!hasAnyAccepted(proposal)"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-40"
                  @click="applyProposal(proposal)"
                >Apply</button>
                <button
                  class="px-3 py-1.5 rounded-lg text-xs font-medium border text-gray-500 hover:bg-gray-50 transition-colors"
                  style="border-color: var(--color-border)"
                  @click="rejectProposal(proposal)"
                >Reject all</button>
              </div>
            </div>

            <!-- Matched tickets (collapsed) -->
            <div class="px-5 py-2 border-b flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors" style="border-color: var(--color-border)" @click="toggleTickets(proposal.id)">
              <Icon name="heroicons:ticket" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
              <span class="text-xs" style="color: var(--color-muted)">{{ proposal.matchedTickets.length }} ticket{{ proposal.matchedTickets.length !== 1 ? 's' : '' }} matched</span>
              <Icon :name="expandedTickets.has(proposal.id) ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-3.5 h-3.5 ml-auto" style="color: var(--color-muted)" />
            </div>
            <div v-if="expandedTickets.has(proposal.id)" class="px-5 py-3 space-y-1.5 border-b" style="border-color: var(--color-border); background: var(--color-bg)">
              <p v-for="(t, i) in proposal.matchedTickets" :key="i" class="text-xs">
                <span class="font-mono text-gray-400">{{ i + 1 }}.</span>
                <span class="font-medium ml-1" style="color: var(--color-text)">{{ t.title }}</span>
                <span v-if="t.description" class="ml-1" style="color: var(--color-muted)">— {{ t.description.slice(0, 100) }}</span>
              </p>
            </div>

            <!-- Field-level diff -->
            <div class="divide-y" style="border-color: var(--color-border)">
              <div
                v-for="field in proposedFields(proposal)"
                :key="field"
                class="px-5 py-4 transition-colors"
                :class="fieldDecision(proposal, field) === 'accepted' ? 'bg-emerald-50' : fieldDecision(proposal, field) === 'rejected' ? 'bg-gray-50' : ''"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-semibold uppercase tracking-wide" style="color: var(--color-muted)">{{ fieldLabel(field) }}</span>
                  <div v-if="proposal.status === 'pending'" class="flex gap-1.5">
                    <button
                      class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
                      :class="fieldDecision(proposal, field) === 'accepted' ? 'border-emerald-400 bg-emerald-100 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600'"
                      @click="toggleField(proposal, field, 'accepted')"
                    >
                      <Icon name="heroicons:check" class="w-3 h-3" /> Accept
                    </button>
                    <button
                      class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
                      :class="fieldDecision(proposal, field) === 'rejected' ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'"
                      @click="toggleField(proposal, field, 'rejected')"
                    >
                      <Icon name="heroicons:x-mark" class="w-3 h-3" /> Reject
                    </button>
                  </div>
                  <span v-else class="text-xs capitalize" :class="fieldDecision(proposal, field) === 'accepted' ? 'text-emerald-600' : 'text-gray-400'">{{ fieldDecision(proposal, field) || '—' }}</span>
                </div>

                <!-- Array fields -->
                <div v-if="isArrayField(field)" class="space-y-2">
                  <div>
                    <p class="text-xs mb-1" style="color: var(--color-muted)">Current</p>
                    <div class="flex flex-wrap gap-1">
                      <span v-for="item in currentValue(proposal, field) as string[]" :key="item" class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 line-through opacity-60">{{ item }}</span>
                      <span v-if="!(currentValue(proposal, field) as string[]).length" class="text-xs" style="color: var(--color-muted)">—</span>
                    </div>
                  </div>
                  <div>
                    <p class="text-xs mb-1 text-emerald-600">Proposed</p>
                    <div class="flex flex-wrap gap-1">
                      <span v-for="item in proposedValue(proposal, field) as string[]" :key="item" class="text-xs px-2 py-0.5 rounded-full" :class="fieldPillClass(field)">{{ item }}</span>
                    </div>
                  </div>
                </div>

                <!-- Text fields -->
                <div v-else class="space-y-2">
                  <div v-if="currentValue(proposal, field)">
                    <p class="text-xs mb-1" style="color: var(--color-muted)">Current</p>
                    <p class="text-xs leading-relaxed line-clamp-3 opacity-60 line-through" style="color: var(--color-text)">{{ currentValue(proposal, field) }}</p>
                  </div>
                  <div>
                    <p class="text-xs mb-1 text-emerald-600">Proposed</p>
                    <p class="text-xs leading-relaxed" :class="field === 'functionality' ? 'font-mono' : ''" style="color: var(--color-text)">{{ (proposedValue(proposal, field) as string).slice(0, 400) }}{{ (proposedValue(proposal, field) as string).length > 400 ? '…' : '' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right sidebar (2/5) -->
        <div class="col-span-2 sticky top-0 space-y-4">
          <!-- Progress card -->
          <div class="rounded-xl border p-5" style="background: var(--color-card); border-color: var(--color-border)">
            <h3 class="text-xs font-semibold uppercase tracking-wide mb-4" style="color: var(--color-muted)">Review Progress</h3>
            <div class="space-y-3">
              <div class="flex justify-between text-sm">
                <span style="color: var(--color-muted)">Total proposals</span>
                <span class="font-medium" style="color: var(--color-text)">{{ proposals.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-emerald-600">Applied</span>
                <span class="font-medium text-emerald-600">{{ acceptedCount }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span style="color: var(--color-muted)">Rejected</span>
                <span class="font-medium" style="color: var(--color-muted)">{{ rejectedCount }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span style="color: var(--color-muted)">Pending</span>
                <span class="font-medium" style="color: var(--color-text)">{{ pendingProposals.length }}</span>
              </div>
              <div class="w-full rounded-full bg-gray-100 h-1.5 mt-1">
                <div
                  class="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                  :style="`width: ${proposals.length ? Math.round(((acceptedCount + rejectedCount) / proposals.length) * 100) : 0}%`"
                ></div>
              </div>
            </div>
          </div>

          <!-- Unmatched tickets -->
          <div v-if="session?.unmatchedTickets?.length" class="rounded-xl border overflow-hidden" style="background: var(--color-card); border-color: var(--color-border)">
            <div class="px-5 py-3 border-b flex items-center gap-2" style="border-color: var(--color-border)">
              <Icon name="heroicons:question-mark-circle" class="w-4 h-4 text-amber-500" />
              <span class="text-xs font-semibold uppercase tracking-wide text-amber-600">Unmatched — New Features?</span>
            </div>
            <div class="px-5 py-4 space-y-2 max-h-64 overflow-y-auto">
              <p class="text-xs mb-3" style="color: var(--color-muted)">These tickets didn't match any existing feature. Create features manually if needed.</p>
              <div v-for="(t, i) in session.unmatchedTickets" :key="i" class="text-xs py-2 border-b last:border-0" style="border-color: var(--color-border)">
                <p class="font-medium" style="color: var(--color-text)">{{ t.title }}</p>
                <p v-if="t.description" class="mt-0.5 line-clamp-2" style="color: var(--color-muted)">{{ t.description }}</p>
              </div>
            </div>
            <div class="px-5 py-3 border-t" style="border-color: var(--color-border)">
              <NuxtLink
                :to="`/projects/${projectId}/knowledge/new`"
                class="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-medium border text-violet-600 border-violet-200 hover:bg-violet-50 transition-colors"
              >
                <Icon name="heroicons:plus" class="w-3.5 h-3.5" /> Add new feature manually
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = route.params.id as string
const currentProject = useState<{ id: string; name: string } | null>('currentProject')
const config = useRuntimeConfig()
const base = config.public.apiBase
const apiFetch = useApiFetch()
const toast = useToast()

// ── Types ────────────────────────────────────────────────────────────────────

interface Ticket { title: string; description: string }
interface Proposal {
  id: string
  featureId: string | null
  featureName: string
  status: 'pending' | 'accepted' | 'rejected'
  currentSnapshot: Record<string, any> | null
  proposedChanges: Record<string, any>
  fieldDecisions: Record<string, 'accepted' | 'rejected'>
  matchedTickets: Ticket[]
  reasoning: string | null
  confidence: 'high' | 'medium' | 'low'
}
interface Session {
  id: string
  status: 'processing' | 'completed' | 'failed'
  ticketCount: number
  proposalCount: number
  unmatchedCount: number
  unmatchedTickets: Ticket[] | null
  errorMessage: string | null
  proposals?: Proposal[]
}

// ── State ────────────────────────────────────────────────────────────────────

const step = ref<'upload' | 'processing' | 'review'>('upload')
const inputFormat = ref<'lines' | 'csv' | 'json'>('lines')
const formats = [
  { key: 'lines', label: 'Paste (lines)' },
  { key: 'csv',   label: 'CSV upload' },
  { key: 'json',  label: 'JSON' },
]
const pastePlaceholder = computed(() => {
  if (inputFormat.value === 'lines') {
    return 'Add batch QR code generation | Allow merchants to generate multiple QR codes at once\nFix webhook retry logic\nUSD currency display on QR receipt | Show KHR and USD side by side'
  }
  return '[{"title":"Add batch QR generation","description":"Allow merchants to generate multiple QR codes"},{"title":"Fix webhook retry"}]'
})
const pasteText = ref('')
const csvFileName = ref('')
const parsedTickets = ref<Ticket[]>([])
const parseError = ref('')
const starting = ref(false)
const session = ref<Session | null>(null)
const proposals = ref<Proposal[]>([])
const expandedTickets = ref(new Set<string>())
let pollTimer: ReturnType<typeof setInterval> | null = null

// ── Computed ─────────────────────────────────────────────────────────────────

const pendingProposals = computed(() => proposals.value.filter(p => p.status === 'pending'))
const acceptedCount   = computed(() => proposals.value.filter(p => p.status === 'accepted').length)
const rejectedCount   = computed(() => proposals.value.filter(p => p.status === 'rejected').length)

// ── Parsing ──────────────────────────────────────────────────────────────────

const parsePasteText = () => {
  parseError.value = ''
  const text = pasteText.value.trim()
  if (!text) { parsedTickets.value = []; return }

  if (inputFormat.value === 'json') {
    try {
      const arr = JSON.parse(text)
      if (!Array.isArray(arr)) throw new Error('Expected a JSON array')
      parsedTickets.value = arr
        .filter((t: any) => t?.title)
        .map((t: any) => ({ title: String(t.title).trim(), description: String(t.description || '').trim() }))
    } catch (e: any) {
      parseError.value = e.message || 'Invalid JSON'
      parsedTickets.value = []
    }
    return
  }

  // lines mode: "Title | Description" or just "Title"
  parsedTickets.value = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const sep = line.indexOf(' | ')
      if (sep !== -1) return { title: line.slice(0, sep).trim(), description: line.slice(sep + 3).trim() }
      return { title: line, description: '' }
    })
    .filter(t => t.title.length > 0)
}

const handleCsvUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  csvFileName.value = file.name
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (!lines.length) return

    const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase())
    const titleIdx = header.findIndex(h => h === 'title' || h === 'summary')
    const descIdx  = header.findIndex(h => h === 'description' || h === 'desc')

    if (titleIdx === -1) {
      toast.add({ title: 'CSV missing title column', color: 'error' })
      return
    }

    parsedTickets.value = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim())
      return {
        title: cols[titleIdx] || '',
        description: descIdx !== -1 ? (cols[descIdx] || '') : '',
      }
    }).filter(t => t.title.length > 0)
  }
  reader.readAsText(file)
}

// ── Sync start ───────────────────────────────────────────────────────────────

const startSync = async () => {
  if (parsedTickets.value.length === 0) return
  starting.value = true
  try {
    const res = await apiFetch<{ data: Session }>(`${base}/api/projects/${projectId}/knowledge/sync`, {
      method: 'POST',
      body: { tickets: parsedTickets.value },
    })
    session.value = res.data
    step.value = 'processing'
    startPolling(res.data.id)
  } catch (e: any) {
    toast.add({ title: 'Failed to start sync', description: e?.data?.error || 'Something went wrong', color: 'error' })
  } finally {
    starting.value = false
  }
}

// ── Polling ──────────────────────────────────────────────────────────────────

const startPolling = (sessionId: string) => {
  pollTimer = setInterval(async () => {
    try {
      const res = await apiFetch<{ data: Session & { proposals: Proposal[] } }>(
        `${base}/api/projects/${projectId}/knowledge/sync/${sessionId}`
      )
      session.value = res.data
      if (res.data.status !== 'processing') {
        clearInterval(pollTimer!)
        proposals.value = res.data.proposals ?? []
        step.value = 'review'
      }
    } catch {}
  }, 3000)
}

// ── Review actions ───────────────────────────────────────────────────────────

const toggleTickets = (id: string) => {
  if (expandedTickets.value.has(id)) expandedTickets.value.delete(id)
  else expandedTickets.value.add(id)
  expandedTickets.value = new Set(expandedTickets.value)
}

const toggleField = async (proposal: Proposal, field: string, decision: 'accepted' | 'rejected') => {
  // Toggle off if already set
  const newDecision = proposal.fieldDecisions[field] === decision ? undefined : decision
  const updated = { ...proposal.fieldDecisions }
  if (newDecision) updated[field] = newDecision
  else delete updated[field]

  proposal.fieldDecisions = updated
  try {
    await apiFetch(`${base}/api/projects/${projectId}/knowledge/sync/${session.value!.id}/proposals/${proposal.id}/decisions`, {
      method: 'PATCH',
      body: { fieldDecisions: updated },
    })
  } catch {}
}

const applyProposal = async (proposal: Proposal) => {
  try {
    await apiFetch(`${base}/api/projects/${projectId}/knowledge/sync/${session.value!.id}/proposals/${proposal.id}/apply`, {
      method: 'POST',
    })
    proposal.status = 'accepted'
    toast.add({ title: `"${proposal.featureName}" updated and set to Live`, color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Failed to apply', description: e?.data?.error, color: 'error' })
  }
}

const rejectProposal = async (proposal: Proposal) => {
  try {
    await apiFetch(`${base}/api/projects/${projectId}/knowledge/sync/${session.value!.id}/proposals/${proposal.id}/reject`, {
      method: 'POST',
    })
    proposal.status = 'rejected'
  } catch (e: any) {
    toast.add({ title: 'Failed to reject', description: e?.data?.error, color: 'error' })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const proposedFields = (p: Proposal) => Object.keys(p.proposedChanges)
const fieldDecision  = (p: Proposal, f: string) => p.fieldDecisions[f]
const hasAnyAccepted = (p: Proposal) => Object.values(p.fieldDecisions).some(v => v === 'accepted')
const isArrayField   = (f: string) => ['userRoles', 'integrations', 'tags'].includes(f)
const currentValue   = (p: Proposal, f: string) => p.currentSnapshot?.[f] ?? (isArrayField(f) ? [] : '')
const proposedValue  = (p: Proposal, f: string) => p.proposedChanges[f]

const fieldLabel = (f: string): string => ({
  description: 'Description', functionality: 'Functionality',
  userRoles: 'User Roles', integrations: 'Integrations',
  limitations: 'Limitations', tags: 'Tags',
}[f] ?? f)

const fieldPillClass = (f: string): string => ({
  userRoles:    'bg-violet-100 text-violet-700',
  integrations: 'bg-blue-100 text-blue-700',
  tags:         'bg-gray-100 text-gray-600',
}[f] ?? 'bg-gray-100 text-gray-600')

const confidenceClass = (c: string): string => ({
  high:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-600',
  low:    'bg-gray-100 text-gray-500',
}[c] ?? 'bg-gray-100 text-gray-500')

// ── Resume from URL param ────────────────────────────────────────────────────

onMounted(async () => {
  const sid = route.query.sessionId as string | undefined
  if (sid) {
    try {
      const res = await apiFetch<{ data: Session & { proposals: Proposal[] } }>(
        `${base}/api/projects/${projectId}/knowledge/sync/${sid}`
      )
      session.value = res.data
      proposals.value = res.data.proposals ?? []
      if (res.data.status === 'processing') {
        step.value = 'processing'
        startPolling(sid)
      } else {
        step.value = 'review'
      }
    } catch {
      toast.add({ title: 'Session not found', color: 'error' })
    }
  }
})

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
</script>
