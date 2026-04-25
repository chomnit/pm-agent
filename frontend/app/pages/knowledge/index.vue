<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-semibold" style="color: var(--color-text)">Org Knowledge Library</h1>
        <p class="text-sm mt-0.5" style="color: var(--color-muted)">Documents available to all agents across projects</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        @click="navigateTo('/knowledge/new')"
      >
        <Icon name="heroicons:plus" class="w-4 h-4" />
        Add Document
      </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-6 flex-wrap">
      <div class="relative">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Search documents..."
          class="pl-9 pr-4 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-violet-500 w-64"
          style="border-color: var(--color-border)"
        />
      </div>
      <select v-model="filterCategory" class="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border)">
        <option value="">All Categories</option>
        <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
      </select>
      <select v-model="filterAgent" class="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border)">
        <option value="">All Agents</option>
        <option value="analysis">PDD Agent</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="rounded-xl border p-5 animate-pulse" style="background: var(--color-card); border-color: var(--color-border)">
        <div class="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
        <div class="h-3 bg-gray-100 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredItems.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
        <Icon name="heroicons:document-text" class="w-7 h-7 text-blue-500" />
      </div>
      <h3 class="font-semibold mb-1" style="color: var(--color-text)">No documents found</h3>
      <p class="text-sm mb-5" style="color: var(--color-muted)">{{ search || filterCategory || filterAgent ? 'Try adjusting your filters' : 'Add your first knowledge document' }}</p>
      <button
        v-if="!search && !filterCategory && !filterAgent"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        @click="navigateTo('/knowledge/new')"
      >
        <Icon name="heroicons:plus" class="w-4 h-4" />
        Add document
      </button>
    </div>

    <!-- Grouped by category -->
    <div v-else class="space-y-8">
      <div v-for="group in groupedItems" :key="group.category">
        <button
          class="flex items-center gap-2 mb-3 w-full text-left"
          @click="toggleGroup(group.category)"
        >
          <Icon :name="collapsedGroups.has(group.category) ? 'heroicons:chevron-right' : 'heroicons:chevron-down'" class="w-4 h-4 text-gray-400" />
          <span class="text-sm font-semibold uppercase tracking-wide" style="color: var(--color-muted)">{{ categoryLabel(group.category) }}</span>
          <span class="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 ml-1">{{ group.items.length }}</span>
        </button>

        <div v-if="!collapsedGroups.has(group.category)" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <NuxtLink
            v-for="item in group.items"
            :key="item.id"
            :to="`/knowledge/${item.id}`"
            class="rounded-xl border p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style="background: var(--color-card); border-color: var(--color-border)"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Icon name="heroicons:document-text" class="w-5 h-5 text-blue-600" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-medium text-sm truncate" style="color: var(--color-text)">{{ item.title }}</p>
                  <span v-if="item.version" class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">v{{ item.version }}</span>
                </div>
                <p class="text-xs mt-0.5" style="color: var(--color-muted)">{{ categoryLabel(item.category) }}</p>
              </div>
            </div>

            <p class="text-sm line-clamp-3" style="color: var(--color-muted)">{{ item.content.slice(0, 200) }}...</p>

            <!-- Agent tags -->
            <div class="flex flex-wrap gap-1">
              <span v-if="item.usedByAll" class="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">All Agents</span>
              <template v-else>
                <span v-for="agent in item.agentTypes" :key="agent" class="text-xs px-2 py-0.5 rounded-full" :class="agentClass(agent)">
                  {{ capitalize(agent) }}
                </span>
              </template>
            </div>

            <div class="flex items-center justify-between pt-2 border-t" style="border-color: var(--color-border)">
              <div class="flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full" :class="item.status === 'active' ? 'bg-emerald-500' : item.status === 'draft' ? 'bg-amber-400' : 'bg-gray-300'"></span>
                <span class="text-xs capitalize" style="color: var(--color-muted)">{{ item.status }}</span>
              </div>
              <span class="text-xs" style="color: var(--color-muted)">Edit →</span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OrgKnowledgeItem } from '@pm-agents/shared'

definePageMeta({ middleware: 'auth' })

const config = useRuntimeConfig()
const base = config.public.apiBase
const apiFetch = useApiFetch()

const items = ref<OrgKnowledgeItem[]>([])
const loading = ref(false)
const search = ref('')
const filterCategory = ref('')
const filterAgent = ref('')
const collapsedGroups = ref(new Set<string>())

const categories = [
  { value: 'legal_contracts', label: 'Legal Contracts' },
  { value: 'procedures', label: 'Procedures' },
  { value: 'templates', label: 'Templates' },
  { value: 'system_architecture', label: 'System Architecture' },
  { value: 'payment_flows', label: 'Payment Flows' }
]

const categoryLabel = (v: string) => categories.find(c => c.value === v)?.label ?? v

const capitalize = (s: string) => s === 'analysis' ? 'PDD Agent' : s.charAt(0).toUpperCase() + s.slice(1)

const agentClass = (_agent: string) => 'bg-violet-100 text-violet-700'

const filteredItems = computed(() => items.value.filter(item => {
  if (search.value && !item.title.toLowerCase().includes(search.value.toLowerCase())) return false
  if (filterCategory.value && item.category !== filterCategory.value) return false
  if (filterAgent.value && !item.usedByAll && !item.agentTypes.includes(filterAgent.value as any)) return false
  return true
}))

const groupedItems = computed(() => {
  const groups: Record<string, OrgKnowledgeItem[]> = {}
  for (const item of filteredItems.value) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }
  return Object.entries(groups).map(([category, items]) => ({ category, items }))
})

const toggleGroup = (cat: string) => {
  if (collapsedGroups.value.has(cat)) collapsedGroups.value.delete(cat)
  else collapsedGroups.value.add(cat)
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await apiFetch<{ data: OrgKnowledgeItem[] }>(`${base}/api/knowledge`)
    items.value = res.data
  } finally {
    loading.value = false
  }
})
</script>
