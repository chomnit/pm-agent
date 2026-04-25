<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="px-8 pt-8 pb-0">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-1.5 text-sm mb-4">
        <NuxtLink to="/dashboard" class="transition-colors hover:underline" style="color: var(--color-muted)">Projects</NuxtLink>
        <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
        <span class="font-medium" style="color: var(--color-text)">{{ project?.name }}</span>
      </nav>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold" style="color: var(--color-text)">{{ project?.name }}</h1>
          <p v-if="project?.description" class="text-sm mt-0.5" style="color: var(--color-muted)">{{ project.description }}</p>
        </div>
        <button
          v-if="activeTab === 'board'"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
          @click="showTicketModal = true"
        >
          <Icon name="heroicons:plus" class="w-4 h-4" />
          New Ticket
        </button>
        <button
          v-if="activeTab === 'knowledge'"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
          @click="navigateTo(`/projects/${projectId}/knowledge/new`)"
        >
          <Icon name="heroicons:plus" class="w-4 h-4" />
          Add Feature
        </button>
        <button
          v-if="activeTab === 'members' && isOwner"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
          @click="showInviteModal = true"
        >
          <Icon name="heroicons:user-plus" class="w-4 h-4" />
          Invite Member
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-0 border-b" style="border-color: var(--color-border)">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px"
          :class="activeTab === tab.key
            ? 'border-violet-600 text-violet-600'
            : 'border-transparent hover:text-gray-700'"
          :style="activeTab !== tab.key ? `color: var(--color-muted)` : ''"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-hidden">
      <!-- BOARD TAB -->
      <div v-if="activeTab === 'board'" class="h-full flex gap-5 px-8 py-6 overflow-x-auto">
        <div
          v-for="col in columns"
          :key="col.status"
          class="flex-shrink-0 w-72 flex flex-col gap-3"
        >
          <!-- Column header -->
          <div class="flex items-center gap-2 px-1">
            <span class="w-2 h-2 rounded-full flex-shrink-0" :class="col.dotClass"></span>
            <span class="text-xs font-semibold tracking-wide uppercase" style="color: var(--color-muted)">{{ col.label }}</span>
            <span class="ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100" style="color: var(--color-muted)">
              {{ ticketsByStatus(col.status).length }}
            </span>
          </div>

          <!-- Cards -->
          <div class="flex flex-col gap-3 min-h-20">
            <div
              v-if="loadingTickets"
              v-for="n in 2"
              :key="n"
              class="rounded-xl border p-4 animate-pulse"
              style="background: var(--color-card); border-color: var(--color-border)"
            >
              <div class="h-3 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div class="h-4 bg-gray-100 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-gray-100 rounded w-full"></div>
            </div>

            <div
              v-else
              v-for="ticket in ticketsByStatus(col.status)"
              :key="ticket.id"
              class="rounded-xl border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
              style="background: var(--color-card); border-color: var(--color-border)"
              @click="navigateTo(`/projects/${projectId}/tickets/${ticket.id}`)"
            >
              <!-- Ticket number + priority -->
              <div class="flex items-center justify-between mb-2">
                <span class="mono text-xs" style="color: var(--color-muted)">TICKET-{{ String(ticket.ticketNumber).padStart(3, '0') }}</span>
                <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="priorityClass(ticket.priority)">
                  {{ ticket.priority.toUpperCase() }}
                </span>
              </div>

              <!-- Title -->
              <p class="text-sm font-medium mb-1.5 line-clamp-2" style="color: var(--color-text)">{{ ticket.title }}</p>

              <!-- Description -->
              <p v-if="ticket.description" class="text-xs line-clamp-2 mb-3" style="color: var(--color-muted)">{{ ticket.description }}</p>

              <!-- Running state -->
              <div v-if="isRunning(ticket)" class="flex items-center gap-1.5 mb-2">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span class="text-xs text-blue-500 font-medium">Agent running...</span>
              </div>

              <!-- Stage pill -->
              <div class="flex items-center justify-between mt-2">
                <span v-if="ticket.status !== 'backlog'" class="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  PDD
                </span>
                <span v-else class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not started</span>
              </div>
            </div>

            <!-- Empty column -->
            <div
              v-if="!loadingTickets && ticketsByStatus(col.status).length === 0"
              class="rounded-xl border border-dashed p-4 flex items-center justify-center"
              style="border-color: var(--color-border)"
            >
              <p class="text-xs" style="color: var(--color-muted)">No tickets</p>
            </div>
          </div>
        </div>
      </div>

      <!-- KNOWLEDGE TAB -->
      <div v-if="activeTab === 'knowledge'" class="px-8 py-6 overflow-y-auto h-full">
        <!-- Org Library Banner -->
        <div class="rounded-xl p-4 mb-6 flex items-center gap-3 bg-blue-50 border border-blue-100">
          <Icon name="heroicons:building-library" class="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div class="flex-1">
            <span class="text-sm font-medium text-blue-800">Org Knowledge Library is always active</span>
            <span class="text-sm text-blue-600 ml-1">({{ orgKnowledgeCount }} docs)</span>
          </div>
          <NuxtLink to="/knowledge" class="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Manage <Icon name="heroicons:arrow-right" class="w-3 h-3" />
          </NuxtLink>
        </div>

        <!-- Features -->
        <div v-if="loadingFeatures" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="n in 4" :key="n" class="rounded-xl border p-5 animate-pulse" style="background: var(--color-card); border-color: var(--color-border)">
            <div class="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div class="h-3 bg-gray-100 rounded w-3/4"></div>
          </div>
        </div>
        <div v-else-if="features.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <Icon name="heroicons:puzzle-piece" class="w-6 h-6 text-emerald-500" />
          </div>
          <h3 class="font-medium mb-1" style="color: var(--color-text)">No features documented</h3>
          <p class="text-sm mb-4" style="color: var(--color-muted)">Document existing features so agents have context</p>
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
            @click="navigateTo(`/projects/${projectId}/knowledge/new`)"
          >
            <Icon name="heroicons:plus" class="w-4 h-4" />
            Add first feature
          </button>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NuxtLink
            v-for="feature in features"
            :key="feature.id"
            :to="`/projects/${projectId}/knowledge/${feature.id}`"
            class="rounded-xl border p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style="background: var(--color-card); border-color: var(--color-border)"
          >
            <div class="flex items-start justify-between mb-2">
              <p class="font-medium text-sm" style="color: var(--color-text)">{{ feature.name }}</p>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0" :class="featureStatusClass(feature.status)">
                {{ feature.status.replace('_', ' ') }}
              </span>
            </div>
            <p class="text-xs mb-2" style="color: var(--color-muted)">{{ feature.category }}</p>
            <p class="text-sm line-clamp-2" style="color: var(--color-muted)">{{ feature.description }}</p>
            <div v-if="feature.tags?.length" class="flex flex-wrap gap-1 mt-3">
              <span v-for="tag in feature.tags.slice(0, 4)" :key="tag" class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{{ tag }}</span>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- MEMBERS TAB -->
      <div v-if="activeTab === 'members'" class="px-8 py-6 overflow-y-auto h-full max-w-2xl">
        <div v-if="loadingMembers" class="space-y-3">
          <div v-for="n in 3" :key="n" class="rounded-xl border p-4 flex items-center gap-3 animate-pulse" style="background: var(--color-card); border-color: var(--color-border)">
            <div class="w-9 h-9 rounded-full bg-gray-200"></div>
            <div class="flex-1">
              <div class="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div class="h-3 bg-gray-100 rounded w-1/4"></div>
            </div>
          </div>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="member in members"
            :key="member.id"
            class="rounded-xl border p-4 flex items-center gap-3"
            style="background: var(--color-card); border-color: var(--color-border)"
          >
            <img v-if="member.user?.avatarUrl" :src="member.user.avatarUrl" class="w-9 h-9 rounded-full" />
            <div v-else class="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
              <span class="text-sm font-medium text-violet-600">{{ member.user?.name?.[0] ?? '?' }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium" style="color: var(--color-text)">{{ member.user?.name }}</p>
              <p class="text-xs" style="color: var(--color-muted)">{{ member.user?.email }}</p>
            </div>
            <span class="text-xs font-medium px-2.5 py-1 rounded-full" :class="member.role === 'owner' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'">
              {{ member.role }}
            </span>
            <button
              v-if="isOwner && member.role !== 'owner'"
              class="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
              title="Remove member"
              @click="removeMember(member.userId)"
            >
              <Icon name="heroicons:x-mark" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- New Ticket Slide-over -->
    <AppSlideOver :open="showTicketModal" title="New Ticket" @close="showTicketModal = false">
      <form class="flex-1 overflow-y-auto px-6 py-5 space-y-4" @submit.prevent="createTicket">
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Title <span class="text-red-500">*</span></label>
          <input
            v-model="ticketForm.title"
            type="text"
            placeholder="e.g. QR Code payment for merchants"
            class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
            style="border-color: var(--color-border); color: var(--color-text)"
            required
            autofocus
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Description</label>
          <textarea
            v-model="ticketForm.description"
            placeholder="Describe the idea or feature request..."
            rows="4"
            class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            style="border-color: var(--color-border); color: var(--color-text)"
          ></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Priority</label>
          <div class="flex gap-2">
            <button
              v-for="p in ['low', 'medium', 'high']"
              :key="p"
              type="button"
              class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              :class="ticketForm.priority === p ? priorityActiveClass(p) : 'border-gray-200 text-gray-500 hover:border-gray-300'"
              @click="ticketForm.priority = p"
            >
              {{ p.toUpperCase() }}
            </button>
          </div>
        </div>
        <div class="pt-4 border-t flex gap-3" style="border-color: var(--color-border)">
          <button type="button" class="flex-1 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" style="border-color: var(--color-border)" @click="showTicketModal = false">Cancel</button>
          <button type="submit" :disabled="creatingTicket" class="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
            {{ creatingTicket ? 'Creating...' : 'Create Ticket' }}
          </button>
        </div>
      </form>
    </AppSlideOver>

    <!-- Invite Modal -->
    <AppModal :open="showInviteModal" title="Invite Member" size="sm" @close="showInviteModal = false">
      <form class="px-6 py-5 space-y-4" @submit.prevent="inviteMember">
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color: var(--color-text)">Email Address <span class="text-red-500">*</span></label>
          <input v-model="inviteEmail" type="email" placeholder="team@example.com" autofocus required class="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-violet-500" style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text)" />
        </div>
        <div class="flex justify-end gap-3 pt-1">
          <button type="button" class="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors" style="color: var(--color-muted)" @click="showInviteModal = false">Cancel</button>
          <button type="submit" :disabled="inviting" class="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 transition-colors">
            <span v-if="inviting">Sending...</span><span v-else>Send Invite</span>
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import type { Ticket, ProjectMember, ProjectFeature } from '@pm-agents/shared'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { definePageMeta, navigateTo, useRoute, useRuntimeConfig, useToast, useUserSession } from '#imports'
import { useProjectStore } from '~/stores/project.store'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = route.params.id as string
const config = useRuntimeConfig()
const base = config.public.apiBase
const apiFetch = useApiFetch()
const toast = useToast()
const store = useProjectStore()
const { currentProject: project } = storeToRefs(store)

const activeTab = ref('board')
const tabs = [
  { key: 'board', label: 'Board' },
  { key: 'knowledge', label: 'Knowledge Base' },
  { key: 'members', label: 'Members' }
]

// Tickets
const tickets = ref<Ticket[]>([])
const loadingTickets = ref(false)
const showTicketModal = ref(false)
const creatingTicket = ref(false)
const ticketForm = reactive({ title: '', description: '', priority: 'medium' })

// Features
const features = ref<ProjectFeature[]>([])
const loadingFeatures = ref(false)
const orgKnowledgeCount = ref(0)

// Members
const members = ref<ProjectMember[]>([])
const loadingMembers = ref(false)
const showInviteModal = ref(false)
const inviteEmail = ref('')
const inviting = ref(false)

const { user } = useUserSession()
const isOwner = computed(() => members.value.find(m => m.userId === (user.value as any)?.id)?.role === 'owner')

const columns = [
  { status: 'backlog', label: 'Backlog', dotClass: 'bg-gray-400' },
  { status: 'in_progress', label: 'In Progress', dotClass: 'bg-blue-500' },
  { status: 'review', label: 'Review', dotClass: 'bg-amber-500' },
  { status: 'approved', label: 'Approved', dotClass: 'bg-emerald-500' }
]

const ticketsByStatus = (status: string) => tickets.value.filter(t => t.status === status && !t.isArchived)
const isRunning = (ticket: Ticket) => ticket.stages?.some(s => s.status === 'running')

const priorityClass = (p: string) => ({
  high: 'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  low: 'bg-green-100 text-green-700'
}[p] || 'bg-gray-100 text-gray-500')

const priorityActiveClass = (p: string) => ({
  high: 'border-red-300 bg-red-50 text-red-600',
  medium: 'border-amber-300 bg-amber-50 text-amber-600',
  low: 'border-green-300 bg-green-50 text-green-700'
}[p] || '')

const featureStatusClass = (s: string) => ({
  live: 'bg-emerald-100 text-emerald-700',
  in_development: 'bg-blue-100 text-blue-700',
  deprecated: 'bg-gray-100 text-gray-500'
}[s] || '')

const fetchTickets = async () => {
  loadingTickets.value = true
  try {
    const res = await apiFetch<{ data: Ticket[] }>(`${base}/api/tickets?projectId=${projectId}`)
    tickets.value = res.data
  } finally {
    loadingTickets.value = false
  }
}

const fetchFeatures = async () => {
  loadingFeatures.value = true
  try {
    const res = await apiFetch<{ data: ProjectFeature[] }>(`${base}/api/projects/${projectId}/features`)
    features.value = res.data
  } finally {
    loadingFeatures.value = false
  }
}

const fetchMembers = async () => {
  loadingMembers.value = true
  try {
    const res = await apiFetch<{ data: ProjectMember[] }>(`${base}/api/projects/${projectId}/members`)
    members.value = res.data
  } finally {
    loadingMembers.value = false
  }
}

const fetchOrgKnowledgeCount = async () => {
  try {
    const res = await apiFetch<{ data: any[] }>(`${base}/api/knowledge`)
    orgKnowledgeCount.value = res.data.filter((k: any) => k.status === 'active').length
  } catch {}
}

const createTicket = async () => {
  if (!ticketForm.title.trim()) return
  creatingTicket.value = true
  try {
    const res = await apiFetch<{ data: Ticket }>(`${base}/api/tickets`, {
      method: 'POST',
      body: { projectId, ...ticketForm }
    })
    tickets.value.unshift(res.data)
    showTicketModal.value = false
    ticketForm.title = ''
    ticketForm.description = ''
    ticketForm.priority = 'medium'
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.error || 'Failed to create ticket', color: 'error' })
  } finally {
    creatingTicket.value = false
  }
}

const inviteMember = async () => {
  if (!inviteEmail.value.trim()) return
  inviting.value = true
  try {
    await apiFetch(`${base}/api/projects/${projectId}/members`, {
      method: 'POST',
      body: { email: inviteEmail.value }
    })
    toast.add({ title: 'Member invited', color: 'success' })
    showInviteModal.value = false
    inviteEmail.value = ''
    await fetchMembers()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.error || 'Failed to invite member', color: 'error' })
  } finally {
    inviting.value = false
  }
}

const removeMember = async (userId: string) => {
  try {
    await apiFetch(`${base}/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE'
    })
    members.value = members.value.filter(m => m.userId !== userId)
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.error || 'Failed to remove member', color: 'error' })
  }
}

watch(activeTab, (tab) => {
  if (tab === 'knowledge' && features.value.length === 0) fetchFeatures()
  if (tab === 'members' && members.value.length === 0) fetchMembers()
})

watch(() => route.query.tab, (tab) => {
  if (tab === 'knowledge' || tab === 'members' || tab === 'board') {
    activeTab.value = tab as string
  }
})

onMounted(async () => {
  if (route.query.tab === 'knowledge' || route.query.tab === 'members') {
    activeTab.value = route.query.tab as string
  }
  await Promise.all([store.fetchProject(projectId), fetchTickets(), fetchMembers()])
  fetchOrgKnowledgeCount()
})
</script>
