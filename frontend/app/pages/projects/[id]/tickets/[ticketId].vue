<template>
  <div class="flex flex-col h-full overflow-y-auto" ref="pageScrollEl">
    <div class="px-8 py-6 flex-1">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-1.5 text-sm mb-6">
        <NuxtLink to="/dashboard" class="transition-colors hover:underline" style="color: var(--color-muted)">Projects</NuxtLink>
        <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
        <NuxtLink :to="`/projects/${projectId}`" class="transition-colors hover:underline" style="color: var(--color-muted)">Board</NuxtLink>
        <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-muted)" />
        <span class="font-medium" style="color: var(--color-text)">{{ ticket ? `TICKET-${String(ticket.ticketNumber).padStart(3, '0')}` : '...' }}</span>
      </nav>

      <!-- Loading -->
      <div v-if="loading" class="animate-pulse space-y-4">
        <div class="h-6 bg-gray-200 rounded w-1/4"></div>
        <div class="h-8 bg-gray-100 rounded w-2/3"></div>
      </div>

      <template v-else-if="ticket">
        <!-- Ticket header -->
        <div class="flex items-start justify-between gap-4 mb-6">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="mono text-sm" style="color: var(--color-muted)">TICKET-{{ String(ticket.ticketNumber).padStart(3, '0') }}</span>
              <span class="text-sm font-medium px-2 py-0.5 rounded-full" :class="priorityClass(ticket.priority)">{{ ticket.priority.toUpperCase() }}</span>
              <span class="text-sm font-medium px-2 py-0.5 rounded-full" :class="ticketStatusClass(ticket.status)">{{ ticket.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) }}</span>
            </div>
            <h1 class="text-2xl font-semibold leading-tight" style="color: var(--color-text)">{{ ticket.title }}</h1>
            <div v-if="ticket.description" class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="item in ticket.description.split(/\s*[-–]\s+/).filter(s => s.trim())"
                :key="item"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                style="background: var(--color-bg); border-color: var(--color-border); color: var(--color-muted)"
              >
                <span class="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                {{ item.trim() }}
              </span>
            </div>
            <p class="text-sm mt-2" style="color: var(--color-muted)">
              Created by {{ ticket.createdByUser?.name ?? 'Unknown' }} · {{ formatDate(ticket.createdAt) }}
            </p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0 mt-1">
            <!-- Edit button -->
            <button
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-gray-50"
              style="border-color: var(--color-border); color: var(--color-text)"
              @click="openEditModal"
            >
              <Icon name="heroicons:pencil" class="w-4 h-4" />
              Edit
            </button>

            <!-- Run Agent -->
            <button
              :disabled="!canRun || isRunning"
              class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              :class="canRun && !isRunning ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-gray-100 text-gray-500'"
              @click="runAgents"
            >
              <span v-if="isRunning" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <Icon v-else name="heroicons:sparkles" class="w-4 h-4" />
              {{ isRunning ? 'Running...' : '✦ Generate PDD' }}
            </button>

            <!-- Approve Ticket (only when review) -->
            <button
              v-if="ticket.status === 'review'"
              :disabled="approvingTicket"
              class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40"
              @click="approveTicket"
            >
              <Icon name="heroicons:check-circle" class="w-4 h-4" />
              {{ approvingTicket ? 'Approving...' : 'Approve' }}
            </button>
          </div>
        </div>

        <!-- Main content -->
        <div>
          <div class="space-y-4">

            <!-- Running indicator banner -->
            <div v-if="isRunning" class="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
              <span class="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></span>
              <div>
                <p class="text-sm font-medium text-blue-700">Agent is writing PDD</p>
                <p class="text-xs text-blue-500 mt-0.5">{{ streamingContent ? 'Writing document...' : 'Preparing context...' }}</p>
              </div>
              <span v-if="streamingContent" class="ml-auto text-xs text-blue-400 mono">{{ streamingContent.length }} chars</span>
            </div>

            <!-- Consolidated output document -->
            <div
              v-if="ticket.status !== 'backlog'"
              class="rounded-xl border overflow-hidden"
              style="background: var(--color-card); border-color: var(--color-border)"
            >
              <template v-for="stage in ticket.stages" :key="stage.id">
                <template v-if="stage.latestDraft || stage.status === 'running'">
                  <!-- Stage divider header -->
                  <div
                    class="flex items-center gap-3 px-5 py-3 border-b"
                    :class="stage.status === 'running' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'"
                    :style="stage.status !== 'running' ? 'border-color: var(--color-border)' : ''"
                  >
                    <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :class="historyDotClass(stage.status)">
                      <Icon v-if="stage.status === 'approved'" name="heroicons:check" class="w-3 h-3" />
                      <span v-else-if="stage.status === 'running'" class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    </div>
                    <span class="text-xs font-semibold uppercase tracking-wide" :style="stage.status === 'running' ? 'color: #2563eb' : stage.status === 'approved' ? 'color: #059669' : 'color: var(--color-muted)'">
                      Product Description Document
                    </span>
                    <div class="flex items-center gap-1.5 ml-auto">
                      <span v-if="stage.latestDraft" class="text-xs mono" style="color: var(--color-muted)">v{{ stage.latestDraft.versionNumber }}</span>
                      <template v-if="stage.latestDraft && stage.status !== 'running'">
                        <button
                          title="Download as Markdown"
                          class="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors hover:bg-gray-100"
                          style="border-color: var(--color-border); color: var(--color-muted)"
                          @click.stop="downloadDraft(stage, 'md')"
                        >
                          <Icon name="heroicons:arrow-down-tray" class="w-3 h-3" />
                          .md
                        </button>
                        <button
                          title="Download as PDF"
                          class="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors hover:bg-gray-100"
                          style="border-color: var(--color-border); color: var(--color-muted)"
                          @click.stop="downloadDraft(stage, 'pdf')"
                        >
                          <Icon name="heroicons:arrow-down-tray" class="w-3 h-3" />
                          PDF
                        </button>
                      </template>
                    </div>
                  </div>

                  <!-- Streaming live preview — plain pre to avoid MDC re-parsing on every token -->
                  <div v-if="stage.status === 'running' && streamingContent" class="px-6 py-5">
                    <pre class="whitespace-pre-wrap text-sm font-sans leading-relaxed" style="color: var(--color-text)">{{ streamingContent }}<span class="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle rounded-full"></span></pre>
                  </div>

                  <!-- Fallback shimmer (before first chunk arrives) -->
                  <div v-else-if="stage.status === 'running'" class="p-6 space-y-3">
                    <div class="h-4 bg-blue-100 rounded animate-pulse w-full"></div>
                    <div class="h-4 bg-blue-100 rounded animate-pulse w-5/6"></div>
                    <div class="h-4 bg-blue-100 rounded animate-pulse w-4/6"></div>
                    <div class="h-4 bg-gray-100 rounded animate-pulse w-full mt-4"></div>
                    <div class="h-4 bg-gray-100 rounded animate-pulse w-3/4"></div>
                    <div class="h-4 bg-gray-100 rounded animate-pulse w-5/6"></div>
                  </div>

                  <!-- Draft content — side-by-side: doc pane (65%) + comment rail (35%) -->
                  <div v-else-if="stage.latestDraft" class="flex">
                    <!-- LEFT: document pane -->
                    <div class="w-[65%] border-r" style="border-color: var(--color-border)" :ref="setDocPaneEl">
                      <template v-for="section in parsedSections" :key="section.slug">
                        <div
                          class="group relative px-6 py-5 transition-colors duration-150"
                          :class="ticket.status === 'review' ? 'hover:bg-amber-50/30' : ''"
                          :ref="el => setSectionEl(section.slug, el)"
                          @mouseup="handleSectionMouseUp(section.slug, $event)"
                        >
                          <!-- Markdown content -->
                          <div class="prose prose-sm max-w-none">
                            <MDC :value="section.content" />
                          </div>
                        </div>
                      </template>
                    </div>

                    <!-- RIGHT: comment rail -->
                    <div class="w-[35%] relative flex-shrink-0 bg-amber-50/20" :ref="setRailEl">
                      <div :style="{ minHeight: docPaneHeight + 'px' }">
                        <template v-for="(comments, slug) in inlineComments" :key="slug">
                          <PddCommentCard
                            v-for="comment in comments"
                            :key="comment.id"
                            :comment="comment"
                            :is-active="activeCommentId === comment.id"
                            :is-hovered="hoveredCommentId === comment.id"
                            :top="commentPositions.anchors.get(comment.id)?.resolvedTop ?? 0"
                            @activate="activeCommentId = comment.id; activeCommentSlug = String(slug)"
                            @update:text="v => onCommentTextUpdate(String(slug), comment.id, v)"
                            @done="closeCommentForm"
                            @delete="removeComment(String(slug), comment.id)"
                            @resize="h => commentPositions.setCardHeight(comment.id, h)"
                          />
                        </template>
                        <PddCommentCard
                          v-if="pendingComment"
                          key="__pending__"
                          :comment="pendingComment"
                          :is-active="true"
                          :is-hovered="false"
                          :top="commentPositions.anchors.get(pendingComment.id)?.resolvedTop ?? 0"
                          @update:text="onPendingTextUpdate"
                          @done="commitPendingComment"
                          @delete="cancelPendingComment"
                          @resize="h => { if (pendingComment) commentPositions.setCardHeight(pendingComment.id, h) }"
                        />
                      </div>
                    </div>
                  </div>
                </template>
              </template>
            </div>

            <!-- Process Diagrams -->
            <div
              v-if="ticket.status !== 'backlog' && ticket.stages?.[0]?.latestDraft"
              class="rounded-xl border overflow-hidden"
              style="background: var(--color-card); border-color: var(--color-border)"
            >
              <div
                class="flex items-center gap-2.5 px-5 py-3 border-b bg-gray-50"
                style="border-color: var(--color-border)"
              >
                <div class="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="heroicons:squares-2x2" class="w-3 h-3 text-indigo-600" />
                </div>
                <span class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Process Diagrams</span>
                <span v-if="diagrams.length" class="ml-auto mono text-xs" style="color: var(--color-muted)">
                  {{ diagrams.length }} diagram{{ diagrams.length !== 1 ? 's' : '' }}
                </span>
              </div>

              <div v-if="diagramsLoading && !diagrams.length" class="px-6 py-5">
                <div class="flex items-center gap-2 mb-4">
                  <span class="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></span>
                  <p class="text-sm font-medium text-indigo-600">Generating process diagrams...</p>
                  <p class="text-xs ml-1" style="color: var(--color-muted)">This may take up to a minute.</p>
                </div>
                <div class="h-48 bg-indigo-50 rounded-lg animate-pulse"></div>
              </div>

              <div v-else-if="diagrams.length" class="divide-y" style="border-color: var(--color-border)">
                <div v-for="diagram in diagrams" :key="diagram.id" class="p-5">
                  <div class="flex items-center gap-2 mb-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mono uppercase tracking-wide"
                      style="background: #EEF2FF; color: #4F46E5;"
                    >{{ diagram.diagramType }}</span>
                    <span class="text-sm font-medium" style="color: var(--color-text)">{{ diagram.title }}</span>
                  </div>
                  <iframe
                    :srcdoc="diagram.htmlContent"
                    class="w-full rounded-lg overflow-hidden"
                    style="border: 1px solid var(--color-border); min-height: 400px;"
                    @load="resizeIframe"
                  />
                </div>
              </div>

              <div v-else class="px-6 py-5 text-center">
                <p class="text-sm" style="color: var(--color-muted)">No diagrams generated yet.</p>
              </div>
            </div>

            <!-- Sticky review action bar -->
            <div
              class="sticky bottom-4 rounded-xl border shadow-lg p-4"
              style="background: var(--color-card); border-color: var(--color-border)"
            >
              <div class="flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium" style="color: var(--color-text)">
                    <template v-if="commentCount > 0">
                      <span class="inline-flex items-center gap-1.5">
                        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{{ commentCount }}</span>
                        inline comment{{ commentCount > 1 ? 's' : '' }} added
                      </span>
                    </template>
                    <template v-else>Review the document above</template>
                  </p>
                  <p class="text-xs mt-0.5" style="color: var(--color-muted)">
                    {{ commentCount > 0 ? 'Comments will be sent to the agent on re-run.' : 'Select text in any section to comment, or hover a section to add a general note.' }}
                  </p>
                </div>
                <button
                  :disabled="isRunning || commentCount === 0"
                  class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  @click="rerunWithFeedback"
                >
                  <Icon name="heroicons:arrow-path" class="w-4 h-4" />
                  Re-run with Feedback
                </button>
                <button
                  :disabled="approvingTicket"
                  class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40"
                  @click="approveTicket"
                >
                  <Icon name="heroicons:check-circle" class="w-4 h-4" />
                  {{ approvingTicket ? 'Approving...' : 'Approve PDD ✓' }}
                </button>
              </div>
            </div>

            <!-- Approved state -->
            <div v-if="ticket.status === 'approved'" class="rounded-xl border p-5 bg-emerald-50 border-emerald-200">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Icon name="heroicons:check" class="w-4 h-4 text-white" />
                </div>
                <div>
                  <p class="text-sm font-semibold text-emerald-700">PDD Approved</p>
                  <p class="text-xs text-emerald-600 mt-0.5">Product description document approved and ready for development.</p>
                </div>
              </div>
            </div>

            <!-- Backlog empty state -->
            <div v-if="ticket.status === 'backlog'" class="rounded-xl border p-8 flex flex-col items-center text-center" style="background: var(--color-card); border-color: var(--color-border)">
              <div class="w-14 h-14 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
                <Icon name="heroicons:cpu-chip" class="w-7 h-7 text-violet-400" />
              </div>
              <p class="text-sm font-medium mb-1" style="color: var(--color-text)">Ready to run</p>
              <p class="text-xs mb-4 max-w-sm" style="color: var(--color-muted)">Click "✦ Generate PDD" to run the AI agent. It will produce a complete Product Description Document covering problem analysis, requirements, and delivery plan.</p>
              <button
                class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                @click="runAgents"
              >
                <Icon name="heroicons:sparkles" class="w-4 h-4" />
                ✦ Generate PDD
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Ticket not found -->
      <div v-else-if="!loading" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="heroicons:ticket" class="w-12 h-12 text-gray-300 mb-3" />
        <p class="font-medium" style="color: var(--color-text)">Ticket not found</p>
        <NuxtLink :to="`/projects/${projectId}`" class="text-sm text-violet-600 mt-2">← Back to Board</NuxtLink>
      </div>
    </div>

    <!-- Edit Ticket Modal -->
    <AppModal :open="editModalOpen" title="Edit Ticket" @close="editModalOpen = false">
      <div class="px-6 py-5 space-y-4">
        <!-- Title -->
        <div>
          <label class="block text-xs font-medium mb-1.5" style="color: var(--color-text)">Title <span class="text-red-500">*</span></label>
          <input
            v-model="editForm.title"
            type="text"
            class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
            style="border-color: var(--color-border)"
            placeholder="Ticket title"
          />
        </div>

        <!-- Description -->
        <div>
          <label class="block text-xs font-medium mb-1.5" style="color: var(--color-text)">Description</label>
          <textarea
            v-model="editForm.description"
            rows="4"
            class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            style="border-color: var(--color-border)"
            placeholder="Optional description..."
          ></textarea>
        </div>

        <!-- Priority -->
        <div>
          <label class="block text-xs font-medium mb-1.5" style="color: var(--color-text)">Priority</label>
          <div class="flex gap-2">
            <button
              v-for="p in ['low', 'medium', 'high']" :key="p"
              class="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
              :class="editForm.priority === p ? priorityClass(p) + ' border-transparent' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
              @click="editForm.priority = p as 'low' | 'medium' | 'high'"
            >
              {{ p.charAt(0).toUpperCase() + p.slice(1) }}
            </button>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t" style="border-color: var(--color-border)">
          <button
            class="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
            style="border-color: var(--color-border)"
            @click="editModalOpen = false"
          >
            Cancel
          </button>
          <button
            :disabled="savingEdit || !editForm.title.trim()"
            class="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            @click="saveEdit"
          >
            {{ savingEdit ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Text-selection comment bubble (Teleported to body to avoid overflow clipping) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-150 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition-all duration-100 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 -translate-y-1"
      >
        <div
          v-if="pendingSelection"
          id="selection-bubble"
          class="fixed z-[300] -translate-x-1/2 -translate-y-full pointer-events-auto"
          :style="{ left: pendingSelection.x + 'px', top: pendingSelection.y + 'px' }"
        >
          <!-- @mousedown.prevent: prevents the document mousedown listener from clearing pendingSelection before this fires -->
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium shadow-xl hover:bg-gray-700 transition-colors whitespace-nowrap"
            @mousedown.prevent="commitSelectionComment"
          >
            <Icon name="heroicons:chat-bubble-oval-left" class="w-3.5 h-3.5" />
            Comment
          </button>
          <!-- Downward caret -->
          <div
            class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style="border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #111827;"
          ></div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { StageDiagram, Ticket } from '@pm-agents/shared'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = route.params.id as string
const ticketId = route.params.ticketId as string
const config = useRuntimeConfig()
const base = config.public.apiBase
const apiFetch = useApiFetch()
const toast = useToast()
const agent = useAgent()

// ─── Download PDD ─────────────────────────────────────────────────
const downloadDraft = async (stage: any, format: 'md' | 'pdf') => {
  const draft = stage.latestDraft
  if (!draft) return

  const slug = (ticket.value?.title ?? 'pdd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const filename = `${slug}-pdd.${format}`

  if (format === 'md') {
    const blob = new Blob([draft.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  } else {
    try {
      const blob = await $fetch<Blob>(`${base}/api/stages/${stage.id}/download?format=pdf`, {
        credentials: 'include',
        responseType: 'blob'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.add({ title: 'Failed to generate PDF', color: 'error' })
    }
  }
}

const ticket = ref<Ticket | null>(null)
const loading = ref(false)
const approvingTicket = ref(false)
const streamingContent = ref('')
let stopPolling: (() => void) | null = null
let stopStream: (() => void) | null = null

// ─── Diagrams ─────────────────────────────────────────────────────
const diagrams = ref<StageDiagram[]>([])
const diagramsLoading = ref(false)
let stopDiagramsPoll: (() => void) | null = null

const resizeIframe = (event: Event) => {
  const iframe = event.target as HTMLIFrameElement
  if (iframe.contentDocument) {
    iframe.style.height = iframe.contentDocument.documentElement.scrollHeight + 'px'
  }
}

const fetchDiagramsOnce = async (stageId: string) => {
  try {
    const res = await agent.fetchDiagrams(stageId)
    diagrams.value = (res as any).data ?? []
  } catch { /* silently ignore */ }
}

const startDiagramsPolling = (stageId: string) => {
  stopDiagramsPoll?.()
  diagrams.value = []
  diagramsLoading.value = true
  stopDiagramsPoll = agent.pollDiagrams(stageId, (result: StageDiagram[]) => {
    diagrams.value = result
    diagramsLoading.value = false
    stopDiagramsPoll = null
  })
}

// ─── Inline comments ─────────────────────────────────────────────
interface SectionComment { id: string; quote: string; text: string }
const inlineComments = reactive<Record<string, SectionComment[]>>({})
const activeCommentSlug = ref<string | null>(null)
const activeCommentId = ref<string | null>(null)
const hoveredCommentId = ref<string | null>(null)

// ─── Comment rail layout ──────────────────────────────────────────
const pageScrollEl = ref<HTMLElement | null>(null)
const docPaneEl = ref<HTMLElement | null>(null)
const railEl = ref<HTMLElement | null>(null)
const docPaneHeight = ref(0)
const sectionEls = reactive<Record<string, HTMLElement>>({})
const pendingComment = ref<{ id: string; slug: string; quote: string; text: string } | null>(null)
const commentPositions = useCommentPositions()

useResizeObserver(docPaneEl, (entries) => { if (entries[0]) docPaneHeight.value = entries[0].contentRect.height })

// Hover over a highlighted mark → light up its comment card in the rail
useEventListener(docPaneEl, 'mouseover', (e: MouseEvent) => {
  const mark = (e.target as HTMLElement).closest?.('mark.comment-highlight') as HTMLElement | null
  hoveredCommentId.value = mark?.dataset.commentId ?? null
})

const setDocPaneEl = (el: unknown) => { docPaneEl.value = el as HTMLElement | null }
const setRailEl = (el: unknown) => { railEl.value = el as HTMLElement | null }
const setSectionEl = (slug: string, el: unknown) => { if (el) sectionEls[slug] = el as HTMLElement }

// Explicit script-scope handlers so Vue doesn't auto-unwrap the ref
const onPendingTextUpdate = (v: string) => { if (pendingComment.value) pendingComment.value.text = v }
const onCommentTextUpdate = (slug: string, id: string, v: string) => {
  const arr = inlineComments[slug]
  if (!arr) return
  const c = arr.find(c => c.id === id)
  if (c) c.text = v
}

// ─── Selection bubble ─────────────────────────────────────────────
interface SelectionState { slug: string; quote: string; x: number; y: number; anchorY: number; range: Range }
const pendingSelection = ref<SelectionState | null>(null)

// ─── Edit modal ───────────────────────────────────────────────────
const editModalOpen = ref(false)
const savingEdit = ref(false)
const editForm = reactive({ title: '', description: '', priority: 'medium' as 'low' | 'medium' | 'high' })

const openEditModal = () => {
  if (!ticket.value) return
  editForm.title = ticket.value.title
  editForm.description = ticket.value.description ?? ''
  editForm.priority = ticket.value.priority
  editModalOpen.value = true
}

const saveEdit = async () => {
  if (!ticket.value || !editForm.title.trim()) return
  savingEdit.value = true
  try {
    const res = await apiFetch<{ data: Ticket }>(`${base}/api/tickets/${ticketId}`, {
      method: 'PATCH',
      body: {
        title: editForm.title.trim(),
        description: editForm.description || null,
        priority: editForm.priority
      }
    })
    ticket.value = { ...ticket.value, ...res.data }
    editModalOpen.value = false
    toast.add({ title: 'Ticket updated', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Failed to save', description: e?.data?.error ?? 'Unknown error', color: 'error' })
  } finally {
    savingEdit.value = false
  }
}

const isRunning = computed(() => ticket.value?.status === 'in_progress')
const canRun = computed(() => ticket.value?.status === 'backlog' || ticket.value?.status === 'review')
const currentRunningStage = computed(() =>
  ticket.value?.stages?.find(s => s.status === 'running')?.stageType ?? ticket.value?.currentStage ?? null
)

// ─── Section parsing ──────────────────────────────────────────────
const parsedSections = computed(() => {
  const content = ticket.value?.stages?.[0]?.latestDraft?.content ?? ''
  if (!content.trim()) return []
  const lines = content.split('\n')
  const sections: Array<{ heading: string; slug: string; content: string }> = []
  let current: string[] = []
  let currentHeading = ''
  let currentSlug = '__intro__'
  for (const line of lines) {
    const h2 = line.match(/^## (.+)/)
    if (h2) {
      if (current.length > 0) {
        sections.push({ heading: currentHeading, slug: currentSlug, content: current.join('\n').trim() })
      }
      currentHeading = h2[1]!.trim()
      currentSlug = currentHeading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      current = [line]
    } else if (/^---+$/.test(line.trim())) {
      // skip horizontal rule separators between sections
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) {
    sections.push({ heading: currentHeading, slug: currentSlug, content: current.join('\n').trim() })
  }
  return sections.filter(s => s.content.trim())
})

const commentCount = computed(() =>
  Object.values(inlineComments).reduce((acc, arr) => acc + (arr?.length ?? 0), 0)
)

// ─── Selection handling ───────────────────────────────────────────
const handleSectionMouseUp = (slug: string, event: MouseEvent) => {
  if (ticket.value?.status !== 'review') return
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) { pendingSelection.value = null; return }
  const selectedText = sel.toString().trim()
  if (!selectedText || selectedText.length < 3) { pendingSelection.value = null; return }
  const range = sel.getRangeAt(0)
  const el = event.currentTarget as HTMLElement
  // Reject cross-section selections
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) {
    pendingSelection.value = null; return
  }
  const rect = range.getBoundingClientRect()
  pendingSelection.value = {
    slug,
    quote: selectedText,
    x: rect.left + rect.width / 2,
    y: rect.top - 8,
    anchorY: rect.top,
    range: range.cloneRange()
  }
}

// Called by the bubble button (@mousedown.prevent to beat the dismiss listener)
const commitSelectionComment = () => {
  if (!pendingSelection.value) return
  const { slug, quote, anchorY, range } = pendingSelection.value
  const id = crypto.randomUUID()
  let anchorTop = Math.max(0, anchorY - (railEl.value?.getBoundingClientRect().top ?? 0))

  // Inject the highlight immediately using the live Range — this handles cross-element
  // selections (bullet lists, bold/italic boundaries) that the TreeWalker can't match.
  const mark = highlightRange(range, id)
  if (mark && railEl.value) {
    anchorTop = Math.max(0, mark.getBoundingClientRect().top - railEl.value.getBoundingClientRect().top)
  }

  commentPositions.addComment(id, anchorTop)
  pendingComment.value = { id, slug, quote, text: '' }
  activeCommentSlug.value = slug
  activeCommentId.value = null
  window.getSelection()?.removeAllRanges()
  pendingSelection.value = null
}

// ─── Free-form (no-selection) comments ───────────────────────────
const openFreeComment = (slug: string) => {
  const id = crypto.randomUUID()
  let anchorTop = 0
  const sectionEl = sectionEls[slug]
  if (sectionEl && railEl.value) {
    anchorTop = Math.max(0, sectionEl.getBoundingClientRect().top - railEl.value.getBoundingClientRect().top)
  }
  commentPositions.addComment(id, anchorTop)
  pendingComment.value = { id, slug, quote: '', text: '' }
  activeCommentSlug.value = slug
  activeCommentId.value = null
}

const commitPendingComment = () => {
  if (!pendingComment.value) return
  const { id, slug, quote, text } = pendingComment.value
  if (!text.trim()) { cancelPendingComment(); return }
  if (!inlineComments[slug]) inlineComments[slug] = []
  inlineComments[slug].push({ id, quote, text: text.trim() })
  pendingComment.value = null
  activeCommentSlug.value = null
  activeCommentId.value = null
  // Measure anchor after MDC re-renders with the new highlight
  nextTick().then(() => nextTick()).then(measureAnchors)
}

const cancelPendingComment = () => {
  if (pendingComment.value) commentPositions.removeComment(pendingComment.value.id)
  pendingComment.value = null
  activeCommentSlug.value = null
  activeCommentId.value = null
}

const closeCommentForm = () => {
  activeCommentSlug.value = null
  activeCommentId.value = null
}

const removeComment = (slug: string, id: string) => {
  // Unwrap all marks for this id — multi-segment highlights create multiple <mark> elements
  const sectionEl = sectionEls[slug]
  if (sectionEl) {
    sectionEl.querySelectorAll(`[data-comment-id="${id}"]`).forEach(mark => {
      mark.replaceWith(...Array.from(mark.childNodes))
    })
  }
  commentPositions.removeComment(id)
  const arr = inlineComments[slug]
  if (!arr) return
  const idx = arr.findIndex(c => c.id === id)
  if (idx !== -1) arr.splice(idx, 1)
  if (!arr.length) delete inlineComments[slug]
  if (activeCommentId.value === id) closeCommentForm()
}

const buildFeedbackFromComments = (): string =>
  Object.entries(inlineComments)
    .filter(([, arr]) => arr?.some(c => c.text.trim()))
    .map(([slug, comments]) => {
      const label = parsedSections.value.find(s => s.slug === slug)?.heading || slug
      const lines = comments
        .filter(c => c.text.trim())
        .map(c => (c.quote ? `> "${c.quote}"\n` : '') + c.text.trim())
        .join('\n\n')
      return `[${label}]:\n${lines}`
    })
    .join('\n\n')

const clearComments = () => {
  // Restore all highlighted text in the DOM
  for (const [slug, comments] of Object.entries(inlineComments)) {
    const sectionEl = sectionEls[slug]
    if (sectionEl) {
      for (const c of comments) {
        sectionEl.querySelectorAll(`[data-comment-id="${c.id}"]`).forEach(mark => {
          mark.replaceWith(...Array.from(mark.childNodes))
        })
      }
    }
  }
  commentPositions.clear()
  Object.keys(inlineComments).forEach(k => delete inlineComments[k])
  localStorage.removeItem(storageKey)
  pendingComment.value = null
  activeCommentSlug.value = null
  activeCommentId.value = null
  pendingSelection.value = null
}

// ─── Highlight injection + anchor measurement ─────────────────────

// Range-based highlight: works for any selection including cross-element (bold, list items).
// Used for freshly-created comments while the live Range is still available.
const highlightRange = (range: Range, id: string): HTMLElement | null => {
  const mark = document.createElement('mark')
  mark.dataset.commentId = id
  mark.className = 'comment-highlight'
  try {
    // Simple path: range stays within a single element boundary
    range.surroundContents(mark)
    return mark
  } catch {
    // Cross-element path (e.g. multi-bullet selection): wrap each text node segment individually.
    // Using extractContents() would break the DOM structure (partial <li> nodes etc.), so instead
    // we find all text nodes within the range and wrap each one in its own <mark>.
    const ancestor = range.commonAncestorContainer
    const root = ancestor.nodeType === Node.TEXT_NODE
      ? (ancestor as Text).parentElement!
      : ancestor as Element

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const segments: Array<{ node: Text; start: number; end: number }> = []

    let textNode: Node | null
    while ((textNode = walker.nextNode())) {
      const t = textNode as Text
      let start = 0
      let end = t.length
      let inRange = false

      if (t === range.startContainer) {
        start = range.startOffset
        inRange = true
      } else if (t === range.endContainer) {
        end = range.endOffset
        inRange = true
      } else {
        try { inRange = range.comparePoint(t, 0) === 0 } catch { inRange = false }
      }

      if (inRange && start < end) segments.push({ node: t, start, end })
    }

    if (segments.length === 0) return null

    let firstMark: HTMLElement | null = null
    // Process last-to-first so earlier text-node offsets stay valid
    for (let i = segments.length - 1; i >= 0; i--) {
      const { node, start, end } = segments[i]!
      const m = document.createElement('mark')
      m.dataset.commentId = id
      m.className = 'comment-highlight'
      // Split: node=[0..end], rest=[end..]; then node=[0..start], wrapping=[start..end]
      node.splitText(end)
      const wrapping = node.splitText(start)
      wrapping.parentNode!.replaceChild(m, wrapping)
      m.appendChild(wrapping)
      if (i === 0) firstMark = m
    }
    return firstMark
  }
}

// Maps a flat textContent character index to the exact Text node + offset in the live DOM.
// Traverses into mark elements so it works correctly after partial highlights are injected.
const flatIndexToNode = (container: HTMLElement, charIdx: number): { node: Text; offset: number } | null => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let pos = 0
  let n: Node | null
  while ((n = walker.nextNode())) {
    const t = n as Text
    if (pos + t.length > charIdx) return { node: t, offset: charIdx - pos }
    pos += t.length
  }
  return null
}

// Text-search highlight: used when restoring comments from localStorage (no Range available).
// Uses container.textContent for matching so it works across inline elements (bold, italic, etc.)
// and falls back to a per-line multi-segment approach for multi-bullet selections.
const injectHighlight = (container: HTMLElement, id: string, quote: string): HTMLElement | null => {
  const flatText = container.textContent ?? ''

  // Direct match: the quote appears verbatim in the flat text (handles cross-inline-element too)
  const startIdx = flatText.indexOf(quote)
  if (startIdx !== -1) {
    const start = flatIndexToNode(container, startIdx)
    const end = flatIndexToNode(container, startIdx + quote.length)
    if (start && end) {
      const range = document.createRange()
      range.setStart(start.node, start.offset)
      range.setEnd(end.node, end.offset)
      return highlightRange(range, id)
    }
  }

  // Multi-segment path: quote has \n (multi-bullet / multi-block selection).
  // Find each line in the flat text and highlight it using flatIndexToNode.
  const lines = quote.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  let firstMark: HTMLElement | null = null
  let searchFrom = 0
  for (const line of lines) {
    const lineIdx = flatText.indexOf(line, searchFrom)
    if (lineIdx === -1) continue
    const start = flatIndexToNode(container, lineIdx)
    const end = flatIndexToNode(container, lineIdx + line.length)
    if (start && end) {
      const range = document.createRange()
      range.setStart(start.node, start.offset)
      range.setEnd(end.node, end.offset)
      const mark = highlightRange(range, id)
      if (mark && !firstMark) firstMark = mark
    }
    searchFrom = lineIdx + line.length
  }
  return firstMark
}

const measureAnchors = () => {
  if (!railEl.value) return
  const railTop = railEl.value.getBoundingClientRect().top
  for (const [slug, comments] of Object.entries(inlineComments)) {
    const sectionEl = sectionEls[slug]
    if (!sectionEl) continue
    for (const comment of comments ?? []) {
      if (comment.quote) {
        const existing = sectionEl.querySelector(`[data-comment-id="${comment.id}"]`) as HTMLElement | null
        if (!existing) {
          const mark = injectHighlight(sectionEl, comment.id, comment.quote)
          if (mark) commentPositions.setAnchorTop(comment.id, mark.getBoundingClientRect().top - railTop)
        } else {
          commentPositions.setAnchorTop(comment.id, existing.getBoundingClientRect().top - railTop)
        }
      } else {
        commentPositions.setAnchorTop(comment.id, sectionEl.getBoundingClientRect().top - railTop)
      }
    }
  }
}

// Retry measureAnchors until all quote marks are injected (MDC renders async)
const scheduleMeasureAnchors = () => {
  const INTERVAL = 150
  const MAX_ATTEMPTS = 20 // ~3 s ceiling
  let attempts = 0
  const attempt = () => {
    measureAnchors()
    // Keep retrying while ANY comment either lacks a section element (MDC not yet rendered)
    // OR has a quote but no <mark> in the DOM yet.
    const hasUninjected = Object.entries(inlineComments).some(([slug, arr]) => {
      const el = sectionEls[slug]
      return (arr ?? []).some(c => c.quote && (!el || !el.querySelector(`[data-comment-id="${c.id}"]`)))
    })
    if (hasUninjected && ++attempts < MAX_ATTEMPTS) setTimeout(attempt, INTERVAL)
  }
  setTimeout(attempt, INTERVAL)
}

const storageKey = `pdd-comments-${ticketId}`
let restoringFromStorage = false

watch(inlineComments, async () => {
  // Persist to localStorage
  const entries = Object.entries(inlineComments).filter(([, arr]) => arr?.length)
  if (entries.length === 0) {
    localStorage.removeItem(storageKey)
  } else {
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(entries)))
  }
  // Skip measuring during localStorage restore — fetchTicket schedules its own delayed measure
  if (restoringFromStorage) return
  await nextTick()
  await nextTick()
  measureAnchors()
}, { deep: true })

// ─── Data fetching & streaming ────────────────────────────────────
const fetchTicket = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    const res = await apiFetch<{ data: Ticket }>(`${base}/api/tickets/${ticketId}`)
    ticket.value = res.data
    if (res.data.status === 'in_progress') {
      startStream()
    }
    // Load any existing diagrams when the ticket already has a draft
    const stageId = res.data.stages?.[0]?.id
    if (stageId && res.data.stages?.[0]?.latestDraft && !diagrams.value.length) {
      fetchDiagramsOnce(stageId)
    }
    // Restore saved comments from localStorage (only when ticket has a draft to comment on)
    if (!silent && res.data.stages?.[0]?.latestDraft) {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, SectionComment[]>
          // Suppress the inlineComments watcher's premature measureAnchors call
          restoringFromStorage = true
          for (const [slug, comments] of Object.entries(parsed)) {
            if (Array.isArray(comments) && comments.length > 0) {
              inlineComments[slug] = comments
              for (const c of comments) commentPositions.addComment(c.id, 0)
            }
          }
          restoringFromStorage = false
          // Retry until MDC finishes async rendering and all marks are injected
          await nextTick()
          scheduleMeasureAnchors()
        }
      } catch {
        localStorage.removeItem(storageKey)
      }
    }
  } finally {
    if (!silent) loading.value = false
  }
}

const startPolling = () => {
  stopPolling?.()
  stopPolling = agent.pollTicketStatus(
    ticketId,
    (t: Ticket) => { ticket.value = t },
    (t: Ticket) => {
      ticket.value = t
      if (t.status === 'review') {
        toast.add({ title: 'PDD ready for review', description: 'Select text in any section to leave targeted feedback.', color: 'success' })
      }
    }
  )
}

const startStream = () => {
  const stageId = ticket.value?.stages?.[0]?.id
  if (!stageId) { startPolling(); return }
  stopStream?.()
  stopPolling?.()
  streamingContent.value = ''
  stopStream = agent.connectStream(
    stageId,
    (text) => { streamingContent.value += text },
    (error?: string) => {
      stopStream = null
      if (error) {
        toast.add({ title: 'Agent failed', description: error, color: 'error', duration: 8000 })
      }
      fetchTicket(true).then(() => {
        const sid = ticket.value?.stages?.[0]?.id
        if (sid) startDiagramsPolling(sid)
      })
    }
  )
}

const runAgents = async () => {
  if (!canRun.value || isRunning.value) return
  try {
    await agent.runAllAgents(ticketId)
    if (ticket.value) ticket.value = { ...ticket.value, status: 'in_progress' }
    startStream()
  } catch (e: any) {
    toast.add({ title: 'Failed to start pipeline', description: e?.data?.error ?? 'Unknown error', color: 'error' })
  }
}

const rerunWithFeedback = async () => {
  if (isRunning.value || commentCount.value === 0) return
  try {
    const feedback = buildFeedbackFromComments()
    await agent.saveReviewNotes(ticketId, feedback)
    if (ticket.value) ticket.value = { ...ticket.value, reviewNotes: feedback }
    clearComments()
    await agent.runAllAgents(ticketId)
    if (ticket.value) ticket.value = { ...ticket.value, status: 'in_progress' }
    startStream()
  } catch (e: any) {
    toast.add({ title: 'Failed to re-run', description: e?.data?.error ?? 'Unknown error', color: 'error' })
  }
}

const approveTicket = async () => {
  if (!ticket.value) return
  approvingTicket.value = true
  try {
    await apiFetch(`${base}/api/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: { status: 'approved' }
    })
    toast.add({ title: 'Ticket approved!', color: 'success' })
    await fetchTicket()
  } catch (e: any) {
    toast.add({ title: 'Failed to approve', description: e?.data?.error, color: 'error' })
  } finally {
    approvingTicket.value = false
  }
}

// ─── Helpers ──────────────────────────────────────────────────────
const priorityClass = (p: string) => ({
  high: 'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  low: 'bg-green-100 text-green-700'
}[p] || '')

const ticketStatusClass = (s: string) => ({
  backlog: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-blue-100 text-blue-600',
  review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700'
}[s] || '')

const historyDotClass = (s: string) => ({
  approved: 'bg-emerald-500 text-white',
  running: 'bg-blue-100 border-2 border-blue-500',
  in_review: 'bg-amber-400 text-white',
  needs_revision: 'bg-red-400 text-white',
  pending: 'bg-gray-100'
}[s] || 'bg-gray-100')

const formatDate = (d: string) => {
  const date = new Date(d)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

// ─── Lifecycle ────────────────────────────────────────────────────
onMounted(async () => {
  await fetchTicket()

  // Dismiss selection bubble when clicking outside it
  useEventListener(document, 'mousedown', (e: MouseEvent) => {
    if (document.getElementById('selection-bubble')?.contains(e.target as Node)) return
    if (!window.getSelection() || window.getSelection()!.isCollapsed) {
      pendingSelection.value = null
    }
  })
})

onUnmounted(() => {
  stopPolling?.()
  stopStream?.()
  stopDiagramsPoll?.()
})
</script>
