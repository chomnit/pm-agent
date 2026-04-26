<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- Header -->
    <div class="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b" style="background: var(--color-card); border-color: var(--color-border)">
      <div class="flex items-center gap-2">
        <Icon name="heroicons:paper-airplane" class="w-5 h-5 text-violet-600" />
        <h1 class="text-base font-semibold" style="color: var(--color-text)">Telegram Messenger</h1>
      </div>
      <div v-if="status?.connected" class="flex items-center gap-3">
        <span class="flex items-center gap-1.5 text-sm" style="color: var(--color-muted)">
          <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          {{ status.username ? '@' + status.username : status.phone }}
        </span>
        <button
          class="text-xs px-3 py-1.5 rounded-lg border text-red-500 hover:bg-red-50 transition-colors"
          style="border-color: var(--color-border)"
          @click="disconnect"
        >
          Disconnect
        </button>
      </div>
    </div>

    <!-- QR Login Screen -->
    <div v-if="!status?.connected" class="flex-1 flex items-center justify-center p-8">
      <div class="text-center max-w-sm">
        <div class="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-5">
          <Icon name="heroicons:qr-code" class="w-7 h-7 text-violet-600" />
        </div>
        <h2 class="text-lg font-semibold mb-2" style="color: var(--color-text)">Connect Telegram</h2>
        <p class="text-sm mb-6" style="color: var(--color-muted)">
          Scan the QR code below with your Telegram mobile app to link your account.
        </p>

        <div v-if="qrError" class="mb-4 text-sm text-red-500">{{ qrError }}</div>

        <div v-if="!qrUrl && !qrLoading" class="mb-6">
          <button
            class="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
            @click="startQr"
          >
            Generate QR Code
          </button>
        </div>

        <div v-if="qrLoading && !qrUrl" class="mb-6 flex justify-center">
          <div class="w-48 h-48 rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
            <Icon name="heroicons:arrow-path" class="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        </div>

        <div v-if="qrUrl" class="mb-6 flex justify-center">
          <div class="p-3 rounded-xl border" style="border-color: var(--color-border)">
            <canvas ref="qrCanvas" class="w-48 h-48 block" />
          </div>
        </div>

        <p v-if="qrUrl" class="text-xs" style="color: var(--color-muted)">
          Open Telegram → Settings → Devices → Scan QR Code
        </p>
      </div>
    </div>

    <!-- Three-panel Messenger -->
    <div v-else class="flex-1 flex overflow-hidden">
      <!-- Left: Conversations -->
      <div class="w-72 flex-shrink-0 flex flex-col border-r overflow-hidden" style="background: var(--color-card); border-color: var(--color-border)">
        <div class="p-3 border-b" style="border-color: var(--color-border)">
          <div class="relative">
            <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              v-model="convSearch"
              type="text"
              placeholder="Search conversations..."
              class="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none"
              style="border-color: var(--color-border)"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="convsLoading" class="p-3 space-y-2">
            <div v-for="n in 8" :key="n" class="flex items-center gap-3 animate-pulse">
              <div class="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
              <div class="flex-1">
                <div class="h-3 bg-gray-200 rounded w-3/4 mb-1.5"></div>
                <div class="h-2.5 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          </div>

          <template v-else>
            <div v-if="filteredConvs.length === 0 && contactResults.length === 0 && !contactSearchLoading" class="p-6 text-center text-sm" style="color: var(--color-muted)">
              No conversations found
            </div>

            <button
              v-for="conv in filteredConvs"
              :key="conv.id"
              class="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left border-b"
              :class="selectedConv?.id === conv.id ? 'bg-violet-50 border-l-2 border-l-violet-500' : ''"
              style="border-color: var(--color-border)"
              @click="selectConversation(conv)"
            >
              <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white"
                :class="peerColor(conv.peerType)"
              >
                {{ conv.peerName[0]?.toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium truncate" style="color: var(--color-text)">{{ conv.peerName }}</span>
                  <span v-if="conv.unreadCount > 0" class="ml-1 flex-shrink-0 min-w-[1.25rem] h-5 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center px-1">
                    {{ conv.unreadCount }}
                  </span>
                </div>
                <p class="text-xs truncate mt-0.5" style="color: var(--color-muted)">{{ conv.lastMessage || 'No messages yet' }}</p>
              </div>
            </button>

            <!-- Contact search loading -->
            <div v-if="contactSearchLoading" class="px-4 py-3 flex items-center gap-2 text-xs border-t" style="color: var(--color-muted); border-color: var(--color-border)">
              <Icon name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin" />
              Searching Telegram...
            </div>

            <!-- Global contact results -->
            <template v-if="contactResults.length > 0">
              <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wide border-t" style="color: var(--color-muted); border-color: var(--color-border)">
                Telegram Contacts
              </div>
              <button
                v-for="contact in contactResults"
                :key="contact.peerId"
                class="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left border-b"
                style="border-color: var(--color-border)"
                @click="openContact(contact)"
              >
                <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white"
                  :class="peerColor(contact.peerType)"
                >
                  {{ contact.peerName[0]?.toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-medium truncate block" style="color: var(--color-text)">{{ contact.peerName }}</span>
                  <p class="text-xs truncate mt-0.5" style="color: var(--color-muted)">
                    {{ contact.peerUsername ? '@' + contact.peerUsername : contact.peerType }}
                  </p>
                </div>
                <Icon name="heroicons:plus-circle" class="w-4 h-4 flex-shrink-0 text-violet-400" />
              </button>
            </template>
          </template>
        </div>
      </div>

      <!-- Center: Message Thread -->
      <div class="flex-1 flex flex-col overflow-hidden" style="background: var(--color-bg)">
        <div v-if="!selectedConv" class="flex-1 flex items-center justify-center text-sm" style="color: var(--color-muted)">
          Select a conversation
        </div>

        <template v-else>
          <!-- Thread header -->
          <div class="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b" style="background: var(--color-card); border-color: var(--color-border)">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
              :class="peerColor(selectedConv.peerType)"
            >
              {{ selectedConv.peerName[0]?.toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate" style="color: var(--color-text)">{{ selectedConv.peerName }}</p>
              <p v-if="selectedConv.peerUsername" class="text-xs" style="color: var(--color-muted)">@{{ selectedConv.peerUsername }}</p>
            </div>
            <button
              class="flex-shrink-0 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
              @click="openSettings"
            >
              Setting
            </button>
          </div>

          <!-- Messages -->
          <div ref="messagesEl" class="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            <div v-if="msgsLoading" class="space-y-3">
              <div v-for="n in 6" :key="n" class="flex" :class="n % 3 === 0 ? 'justify-end' : 'justify-start'">
                <div class="rounded-2xl px-4 py-2.5 animate-pulse" :class="n % 3 === 0 ? 'bg-violet-200 w-40' : 'bg-white w-56 border'" style="border-color: var(--color-border)">
                  <div class="h-3 bg-gray-300 rounded w-full mb-1"></div>
                  <div class="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>

            <div
              v-for="msg in messages"
              :key="msg.id"
              class="flex"
              :class="msg.isOutgoing ? 'justify-end' : 'justify-start'"
            >
              <div class="max-w-[70%]">
                <p v-if="!msg.isOutgoing && msg.senderName" class="text-xs mb-1 ml-1" style="color: var(--color-muted)">
                  {{ msg.senderName }}
                </p>

                <!-- Text message -->
                <div
                  v-if="msg.mediaType === 'none' || msg.text"
                  class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                  :class="msg.isOutgoing
                    ? 'bg-violet-600 text-white rounded-br-md'
                    : 'border rounded-bl-md'"
                  :style="!msg.isOutgoing ? 'background: var(--color-card); border-color: var(--color-border); color: var(--color-text)' : ''"
                >
                  {{ msg.text }}
                </div>

                <!-- Photo -->
                <div v-if="msg.mediaType === 'photo'" class="rounded-2xl overflow-hidden">
                  <div v-if="!mediaBlobUrls[msg.id]" class="w-48 h-36 bg-gray-200 animate-pulse rounded-2xl flex items-center justify-center">
                    <Icon name="heroicons:photo" class="w-6 h-6 text-gray-400" />
                  </div>
                  <img
                    v-else
                    :src="mediaBlobUrls[msg.id]"
                    class="max-w-full max-h-64 object-cover rounded-2xl"
                    alt="Photo"
                  />
                </div>

                <!-- Voice note -->
                <div v-if="msg.mediaType === 'voice'"
                  class="rounded-2xl px-4 py-3 border flex items-center gap-3"
                  :class="msg.isOutgoing ? 'bg-violet-600 border-violet-500' : ''"
                  :style="!msg.isOutgoing ? 'background: var(--color-card); border-color: var(--color-border)' : ''"
                >
                  <Icon name="heroicons:microphone" class="w-4 h-4 flex-shrink-0" :class="msg.isOutgoing ? 'text-white' : 'text-violet-600'" />
                  <audio
                    v-if="mediaBlobUrls[msg.id]"
                    controls
                    class="h-8 w-48"
                    :src="mediaBlobUrls[msg.id]"
                  />
                  <span v-else class="text-xs animate-pulse" :class="msg.isOutgoing ? 'text-violet-200' : 'text-gray-400'">Loading…</span>
                </div>

                <!-- Document -->
                <div v-if="msg.mediaType === 'document'"
                  class="rounded-2xl px-4 py-3 border flex items-center gap-3"
                  :style="'background: var(--color-card); border-color: var(--color-border)'"
                >
                  <Icon name="heroicons:document" class="w-5 h-5 text-violet-600 flex-shrink-0" />
                  <span class="text-sm truncate" style="color: var(--color-text)">{{ msg.mediaMime || 'File' }}</span>
                </div>

                <p class="text-xs mt-1 px-1" :class="msg.isOutgoing ? 'text-right' : 'text-left'" style="color: var(--color-muted)">
                  {{ formatTime(msg.sentAt) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Reply input -->
          <div class="flex-shrink-0 px-4 py-3 border-t" style="background: var(--color-card); border-color: var(--color-border)">
            <div v-if="replyIsFormatted" class="flex items-center gap-1.5 mb-2">
              <span class="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium flex items-center gap-1">
                <Icon name="heroicons:code-bracket" class="w-3 h-3" />
                Telegram HTML
              </span>
              <button class="text-xs text-gray-400 hover:text-gray-600" @click="replyIsFormatted = false">clear format</button>
            </div>
            <div class="flex gap-2 items-end">
              <textarea
                v-model="replyText"
                rows="2"
                placeholder="Type a message..."
                class="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
                style="border-color: var(--color-border)"
                @keydown.enter.exact.prevent="sendReply"
              />
              <button
                :disabled="!replyText.trim() || sending"
                class="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                @click="sendReply"
              >
                <Icon v-if="sending" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                <Icon v-else name="heroicons:paper-airplane" class="w-4 h-4" />
              </button>
            </div>
            <p v-if="replyIsFormatted" class="text-xs mt-1.5" style="color: var(--color-muted)">Enter to send · Shift+Enter for new line</p>
          </div>
        </template>
      </div>

      <!-- Right: AI Agent Panel -->
      <div class="w-80 flex-shrink-0 flex flex-col border-l overflow-hidden" style="background: var(--color-card); border-color: var(--color-border)">

        <!-- AI Agent header -->
        <div class="flex-shrink-0 px-4 py-3 border-b" style="border-color: var(--color-border)">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
              <Icon name="heroicons:cpu-chip" class="w-3.5 h-3.5 text-violet-600" />
            </div>
            <span class="text-sm font-semibold" style="color: var(--color-text)">AI Agent</span>
          </div>
        </div>

        <!-- Agent chat messages -->
        <div ref="agentMessagesEl" class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div v-if="!selectedConv" class="text-xs text-center pt-4" style="color: var(--color-muted)">
            Select a conversation to start
          </div>

          <div v-else-if="agentMessages.length === 0" class="text-xs text-center pt-4" style="color: var(--color-muted)">
            Ask the AI agent to help draft a reply
          </div>

          <div
            v-for="(msg, i) in agentMessages"
            :key="i"
            class="flex"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <!-- User bubble -->
            <div
              v-if="msg.role === 'user'"
              class="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed bg-violet-600 text-white rounded-br-md"
            >
              {{ msg.content }}
            </div>

            <!-- Assistant bubble with markdown -->
            <div
              v-else
              class="max-w-[95%] rounded-2xl px-4 py-3 text-sm border rounded-bl-md agent-prose"
              style="background: var(--color-bg); border-color: var(--color-border); color: var(--color-text)"
            >
              <MDC :value="msg.content" />
              <div class="mt-2 pt-2 border-t flex justify-end" style="border-color: var(--color-border)">
                <button
                  class="text-xs text-violet-600 hover:text-violet-700 font-medium"
                  @click="useAsReply(msg.content)"
                >
                  Use as reply →
                </button>
              </div>
            </div>
          </div>

          <!-- Streaming bubble -->
          <div v-if="agentStreaming" class="flex justify-start">
            <div class="max-w-[95%] rounded-2xl px-4 py-3 text-sm border rounded-bl-md agent-prose" style="background: var(--color-bg); border-color: var(--color-border); color: var(--color-text)">
              <MDC v-if="agentStreamBuffer" :value="agentStreamBuffer" />
              <span v-else class="flex items-center gap-1.5 text-gray-400">
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 0ms" />
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 150ms" />
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 300ms" />
              </span>
            </div>
          </div>
        </div>

        <!-- Agent input -->
        <div class="flex-shrink-0 px-4 py-3 border-t" style="border-color: var(--color-border)">
          <div class="flex gap-2">
            <input
              v-model="agentInput"
              type="text"
              placeholder="Ask the agent..."
              class="flex-1 px-3 py-2 rounded-xl border text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              style="border-color: var(--color-border)"
              :disabled="agentStreaming || !selectedConv"
              @keydown.enter="sendAgentMessage"
            />
            <button
              :disabled="!agentInput.trim() || agentStreaming || !selectedConv"
              class="px-3 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              @click="sendAgentMessage"
            >
              <Icon v-if="agentStreaming" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
              <Icon v-else name="heroicons:sparkles" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Contact Settings Modal -->
  <Teleport to="body">
    <div
      v-if="showSettings"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(0,0,0,0.45)"
      @click.self="showSettings = false"
    >
      <div class="w-full max-w-md rounded-2xl shadow-xl overflow-hidden" style="background: var(--color-card)">
        <!-- Modal header -->
        <div class="flex items-start justify-between px-6 py-4 border-b" style="border-color: var(--color-border)">
          <div>
            <h2 class="text-sm font-semibold" style="color: var(--color-text)">Contact Settings</h2>
            <p class="text-xs mt-0.5" style="color: var(--color-muted)">
              {{ selectedConv?.peerName }}
              <span v-if="selectedConv?.peerUsername"> · @{{ selectedConv?.peerUsername }}</span>
            </p>
          </div>
          <button class="text-gray-400 hover:text-gray-600 transition-colors" @click="showSettings = false">
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal body -->
        <div class="px-6 py-5 space-y-5">
          <!-- Projects checklist -->
          <div>
            <label class="block text-xs font-semibold mb-2" style="color: var(--color-text)">Projects</label>
            <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              <label
                v-for="p in projects"
                :key="p.id"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                :class="settingsForm.projectIds.includes(p.id) ? 'bg-violet-50' : ''"
              >
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded accent-violet-600 cursor-pointer"
                  :checked="settingsForm.projectIds.includes(p.id)"
                  @change="toggleProject(p.id)"
                />
                <span class="text-sm" style="color: var(--color-text)">{{ p.name }}</span>
              </label>
              <p v-if="projects.length === 0" class="text-xs px-3 py-2" style="color: var(--color-muted)">No projects available</p>
            </div>
          </div>

          <!-- Auto Response -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium" style="color: var(--color-text)">Auto Response</p>
              <p class="text-xs mt-0.5" style="color: var(--color-muted)">AI replies automatically to incoming messages</p>
            </div>
            <button
              class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              :class="settingsForm.autoResponse ? 'bg-violet-600' : 'bg-gray-200'"
              @click="settingsForm.autoResponse = !settingsForm.autoResponse"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                :class="settingsForm.autoResponse ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Instruction -->
          <div>
            <label class="block text-xs font-semibold mb-2" style="color: var(--color-text)">Instruction</label>
            <textarea
              v-model="settingsForm.instruction"
              rows="4"
              placeholder="e.g. Always reply in Khmer, keep it short and friendly..."
              class="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
              style="border-color: var(--color-border); color: var(--color-text); background: var(--color-bg)"
            />
          </div>
        </div>

        <!-- Modal footer -->
        <div class="px-6 py-4 border-t" style="border-color: var(--color-border); background: var(--color-bg)">
          <p v-if="settingsError" class="text-xs text-red-500 mb-3">{{ settingsError }}</p>
          <div class="flex items-center justify-end gap-3">
          <button
            class="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
            style="border-color: var(--color-border); color: var(--color-muted)"
            @click="showSettings = false"
          >
            Cancel
          </button>
          <button
            :disabled="settingsSaving"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
            @click="saveSettings"
          >
            {{ settingsSaving ? 'Saving…' : 'Save' }}
          </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'

definePageMeta({ middleware: 'auth', layout: 'default' })

const config = useRuntimeConfig()
const base = config.public.apiBase

// ─── Status & QR ─────────────────────────────────────────────────────────────

interface TelegramStatus { connected: boolean; username?: string; phone?: string }
const status = ref<TelegramStatus | null>(null)
const qrUrl = ref('')
const qrLoading = ref(false)
const qrError = ref('')
const qrCanvas = ref<HTMLCanvasElement | null>(null)

const fetchStatus = async () => {
  try {
    const data = await $fetch<TelegramStatus>(`${base}/api/telegram/status`, { credentials: 'include' })
    status.value = data
  } catch {
    status.value = { connected: false }
  }
}

const startQr = async () => {
  qrLoading.value = true
  qrError.value = ''
  qrUrl.value = ''

  const es = new EventSource(`${base}/api/telegram/qr`, { withCredentials: true })

  es.onmessage = async (e) => {
    try {
      const payload = JSON.parse(e.data)
      if (payload.type === 'qr') {
        qrUrl.value = payload.url
        qrLoading.value = false
        await nextTick()
        if (qrCanvas.value) {
          await QRCode.toCanvas(qrCanvas.value, payload.url, { width: 192, margin: 1 })
        }
      } else if (payload.type === 'done') {
        es.close()
        await fetchStatus()
        if (status.value?.connected) await loadConversations()
      } else if (payload.type === 'error') {
        qrError.value = payload.message || 'Login failed'
        qrLoading.value = false
        es.close()
      }
    } catch {
      // ignore parse errors
    }
  }

  es.onerror = () => {
    qrError.value = 'Connection error. Please try again.'
    qrLoading.value = false
    es.close()
  }
}

const disconnect = async () => {
  await $fetch(`${base}/api/telegram/session`, { method: 'DELETE', credentials: 'include' })
  status.value = { connected: false }
  conversations.value = []
  selectedConv.value = null
  messages.value = []
  agentMessages.value = []
}

// ─── Conversations ────────────────────────────────────────────────────────────

interface TelegramConversation {
  id: string
  userId: string
  telegramPeerId: number
  peerType: 'user' | 'group' | 'channel'
  peerName: string
  peerUsername: string | null
  lastMessage: string | null
  unreadCount: number
  customInstruction: string | null
  projectIds: string[]
  autoResponse: boolean
  updatedAt: string
}

const conversations = ref<TelegramConversation[]>([])
const convsLoading = ref(false)
const convSearch = ref('')
const selectedConv = ref<TelegramConversation | null>(null)

const filteredConvs = computed(() => {
  const q = convSearch.value.toLowerCase()
  if (!q) return conversations.value
  return conversations.value.filter((c) =>
    c.peerName.toLowerCase().includes(q) ||
    (c.peerUsername?.toLowerCase().includes(q))
  )
})

interface ContactResult {
  peerId: number
  peerType: 'user' | 'group' | 'channel'
  peerName: string
  peerUsername: string | null
}

const contactResults = ref<ContactResult[]>([])
const contactSearchLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(convSearch, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (q.trim().length < 2) {
    contactResults.value = []
    contactSearchLoading.value = false
    return
  }
  contactSearchLoading.value = true
  searchTimer = setTimeout(async () => {
    try {
      const res = await $fetch<{ data: ContactResult[] }>(
        `${base}/api/telegram/contacts/search?q=${encodeURIComponent(q.trim())}`,
        { credentials: 'include' }
      )
      contactResults.value = res.data
    } catch {
      contactResults.value = []
    } finally {
      contactSearchLoading.value = false
    }
  }, 400)
})

const openContact = async (contact: ContactResult) => {
  try {
    const res = await $fetch<{ data: TelegramConversation }>(
      `${base}/api/telegram/conversations/open`,
      {
        method: 'POST',
        credentials: 'include',
        body: {
          peerId: contact.peerId,
          peerType: contact.peerType,
          peerName: contact.peerName,
          peerUsername: contact.peerUsername,
        },
      }
    )
    const exists = conversations.value.find((c) => c.telegramPeerId === contact.peerId)
    if (!exists) conversations.value = [res.data, ...conversations.value]
    convSearch.value = ''
    contactResults.value = []
    await selectConversation(res.data)
  } catch {
    // ignore
  }
}

// ─── Contact Settings Modal ───────────────────────────────────────────────────

const showSettings = ref(false)
const settingsForm = reactive({ instruction: '', projectIds: [] as string[], autoResponse: false })
const settingsSaving = ref(false)
const settingsError = ref('')

const openSettings = () => {
  settingsForm.instruction  = selectedConv.value?.customInstruction ?? ''
  settingsForm.projectIds   = [...(selectedConv.value?.projectIds ?? [])]
  settingsForm.autoResponse = selectedConv.value?.autoResponse ?? false
  settingsError.value = ''
  showSettings.value = true
}

const toggleProject = (id: string) => {
  const idx = settingsForm.projectIds.indexOf(id)
  if (idx === -1) settingsForm.projectIds.push(id)
  else settingsForm.projectIds.splice(idx, 1)
}

const saveSettings = async () => {
  if (!selectedConv.value) return
  settingsSaving.value = true
  try {
    await $fetch(`${base}/api/telegram/conversations/${selectedConv.value.id}/config`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        customInstruction: settingsForm.instruction.trim() || null,
        projectIds: settingsForm.projectIds,
        autoResponse: settingsForm.autoResponse,
      },
    })
    selectedConv.value = {
      ...selectedConv.value,
      customInstruction: settingsForm.instruction.trim() || null,
      projectIds: [...settingsForm.projectIds],
      autoResponse: settingsForm.autoResponse,
    }
    showSettings.value = false
  } catch (err: any) {
    console.error('saveSettings error:', err?.data || err)
    settingsError.value = err?.data?.details || err?.data?.error || err?.message || 'Failed to save. Please try again.'
  } finally {
    settingsSaving.value = false
  }
}

const loadConversations = async () => {
  convsLoading.value = true
  try {
    const res = await $fetch<{ data: TelegramConversation[] }>(`${base}/api/telegram/conversations`, { credentials: 'include' })
    conversations.value = res.data
  } catch {
    // ignore
  } finally {
    convsLoading.value = false
  }
}

const selectConversation = async (conv: TelegramConversation) => {
  selectedConv.value = conv
  messages.value = []
  agentMessages.value = []
  agentStreamBuffer.value = ''
  replyText.value = ''
  replyIsFormatted.value = false
  await Promise.all([loadMessages(conv.id), loadAgentChat(conv.id)])
}

// ─── Messages ─────────────────────────────────────────────────────────────────

interface TelegramMessage {
  id: string
  conversationId: string
  telegramMessageId: number
  isOutgoing: boolean
  senderName: string | null
  text: string | null
  mediaType: 'none' | 'photo' | 'voice' | 'document'
  mediaMime: string | null
  telegramMediaId: number | null
  sentAt: string
}

const messages = ref<TelegramMessage[]>([])
const msgsLoading = ref(false)
const messagesEl = ref<HTMLElement | null>(null)
const replyText = ref('')
const replyIsFormatted = ref(false)
const sending = ref(false)

// Convert markdown (as produced by the AI agent) to Telegram HTML parse mode.
// Telegram supports: <b>, <i>, <u>, <s>, <code>, <pre>, <a href="">
const convertToTelegramHtml = (md: string): string => {
  return md
    // Fenced code blocks → <pre><code>
    .replace(/```(?:\w+)?\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/__(.+?)__/g, '<b>$1</b>')
    // Italic *text* or _text_ (single, not double)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<i>$1</i>')
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<i>$1</i>')
    // Strikethrough ~~text~~
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    // Headings → bold on its own line
    .replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>')
    // Horizontal rules → remove
    .replace(/^---+$/gm, '')
    // Unordered list items → bullet
    .replace(/^\s*[-*+]\s+(.+)$/gm, '• $1')
    // Ordered list items → keep number
    .replace(/^\s*(\d+)\.\s+(.+)$/gm, '$1. $2')
    // Trim excess blank lines (3+ → 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Blob URL cache for authenticated media (photos, voice notes).
// Using fetch() with credentials ensures the session cookie is sent.
const mediaBlobUrls = reactive<Record<string, string>>({})

const fetchMediaBlob = async (messageId: string, convId: string) => {
  if (mediaBlobUrls[messageId]) return
  try {
    const res = await fetch(
      `${base}/api/telegram/media/${messageId}?conversationId=${convId}`,
      { credentials: 'include' }
    )
    if (!res.ok) return
    const blob = await res.blob()
    mediaBlobUrls[messageId] = URL.createObjectURL(blob)
  } catch {
    // ignore — image stays as placeholder
  }
}

watch(messages, (msgs) => {
  if (!selectedConv.value) return
  const convId = selectedConv.value.id
  for (const msg of msgs) {
    if (msg.mediaType === 'photo' || msg.mediaType === 'voice') {
      fetchMediaBlob(msg.id, convId)
    }
  }
}, { immediate: true })

const loadMessages = async (convId: string, silent = false) => {
  if (!silent) msgsLoading.value = true
  try {
    const res = await $fetch<{ data: TelegramMessage[] }>(`${base}/api/telegram/conversations/${convId}/messages`, { credentials: 'include' })
    messages.value = res.data
    await nextTick()
    scrollToBottom(messagesEl.value)
  } catch {
    // ignore
  } finally {
    msgsLoading.value = false
  }
}

const sendReply = async () => {
  if (!replyText.value.trim() || !selectedConv.value || sending.value) return
  const text = replyText.value.trim()
  replyText.value = ''
  sending.value = true

  // Optimistic: show the message immediately (stays permanently like iMessage/WhatsApp)
  const optimisticId = `optimistic-${Date.now()}`
  const optimistic: TelegramMessage = {
    id: optimisticId,
    conversationId: selectedConv.value.id,
    telegramMessageId: 0,
    isOutgoing: true,
    senderName: null,
    text,
    mediaType: 'none',
    mediaMime: null,
    telegramMediaId: null,
    sentAt: new Date().toISOString(),
  }
  messages.value = [...messages.value, optimistic]
  await nextTick()
  scrollToBottom(messagesEl.value)

  const isFormatted = replyIsFormatted.value
  replyIsFormatted.value = false

  try {
    await $fetch(`${base}/api/telegram/conversations/${selectedConv.value.id}/send`, {
      method: 'POST',
      credentials: 'include',
      body: { text, ...(isFormatted ? { parseMode: 'html' } : {}) },
    })
    // Delayed silent refresh — gives Telegram time to index the sent message,
    // then merges so the optimistic entry is replaced by the real one.
    setTimeout(async () => {
      if (!selectedConv.value) return
      try {
        const res = await $fetch<{ data: TelegramMessage[] }>(
          `${base}/api/telegram/conversations/${selectedConv.value.id}/messages`,
          { credentials: 'include' }
        )
        // Only replace if the real message made it into the list
        const hasReal = res.data.some((m) => m.isOutgoing && m.text === text)
        if (hasReal) {
          messages.value = res.data
        } else {
          // Replace without the optimistic but re-append it so it stays visible
          messages.value = [...res.data, { ...optimistic }]
        }
        await nextTick()
        scrollToBottom(messagesEl.value)
      } catch {
        // keep optimistic visible on refresh error
      }
    }, 2000)
  } catch {
    // Remove the optimistic message if the send itself failed
    messages.value = messages.value.filter((m) => m.id !== optimisticId)
    replyText.value = text
  } finally {
    sending.value = false
  }
}

const extractDraftBody = (text: string): string => {
  const lines = text.split('\n')

  // Strip leading preamble line if it ends with ":" (e.g. "Here's a draft message to X:")
  let start = 0
  if (lines[0]?.trim().endsWith(':')) {
    start = 1
    while (start < lines.length && lines[start].trim() === '') start++
  }

  // Strip trailing meta-comment lines (AI sign-offs / instructions)
  const trailingPatterns = [
    /^feel free/i,
    /^let me know/i,
    /^you can (adjust|modify|change|edit|shorten|tweak)/i,
    /^please (feel free|let me know|adjust)/i,
    /^hope this/i,
    /^note:/i,
    /^i('ve| have) (drafted|written|prepared)/i,
  ]

  let end = lines.length
  while (end > start) {
    const trimmed = lines[end - 1].trim()
    if (trimmed === '' || trailingPatterns.some((p) => p.test(trimmed))) {
      end--
    } else {
      break
    }
  }

  return lines.slice(start, end).join('\n').trim()
}

const useAsReply = (text: string) => {
  replyText.value = convertToTelegramHtml(extractDraftBody(text))
  replyIsFormatted.value = true
}

// ─── Agent Chat ───────────────────────────────────────────────────────────────

interface AgentMessage { role: 'user' | 'assistant'; content: string }

const agentMessages = ref<AgentMessage[]>([])
const agentInput = ref('')
const agentStreaming = ref(false)
const agentStreamBuffer = ref('')
const agentMessagesEl = ref<HTMLElement | null>(null)

const loadAgentChat = async (convId: string) => {
  try {
    const res = await $fetch<{ data: { messages: AgentMessage[] } | null }>(`${base}/api/telegram/conversations/${convId}/agent`, { credentials: 'include' })
    agentMessages.value = res.data?.messages ?? []
  } catch {
    agentMessages.value = []
  }
}

const sendAgentMessage = async () => {
  if (!agentInput.value.trim() || agentStreaming.value || !selectedConv.value) return

  const userMsg = agentInput.value.trim()
  agentInput.value = ''
  agentMessages.value.push({ role: 'user', content: userMsg })
  agentStreaming.value = true
  agentStreamBuffer.value = ''

  await nextTick()
  scrollToBottom(agentMessagesEl.value)

  const url = `${base}/api/telegram/conversations/${selectedConv.value.id}/agent/chat`

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMsg, projectIds: selectedConv.value?.projectIds }),
  })

  if (!res.body) {
    agentStreaming.value = false
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const payload = JSON.parse(line.slice(6))
        if (payload.type === 'chunk') {
          agentStreamBuffer.value += payload.text
          await nextTick()
          scrollToBottom(agentMessagesEl.value)
        } else if (payload.type === 'done') {
          agentMessages.value.push({ role: 'assistant', content: agentStreamBuffer.value })
          agentStreamBuffer.value = ''
          agentStreaming.value = false
          await nextTick()
          scrollToBottom(agentMessagesEl.value)
        }
      } catch {
        // ignore
      }
    }
  }

  agentStreaming.value = false
}

// ─── Projects ─────────────────────────────────────────────────────────────────

interface Project { id: string; name: string }
const projects = ref<Project[]>([])

const loadProjects = async () => {
  try {
    const res = await $fetch<{ data: Project[] }>(`${base}/api/projects`, { credentials: 'include' })
    projects.value = res.data
  } catch {
    // ignore
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const peerColor = (type: string) => {
  if (type === 'channel') return 'bg-blue-500'
  if (type === 'group') return 'bg-emerald-500'
  return 'bg-violet-500'
}

const formatTime = (dateStr: string) => {
  // MySQL DATETIME comes as "2024-01-15 10:30:00" — normalize to ISO 8601
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T')
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = (el: HTMLElement | null) => {
  if (el) el.scrollTop = el.scrollHeight
}

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await fetchStatus()
  if (status.value?.connected) {
    await Promise.all([loadConversations(), loadProjects()])
  }
  await loadProjects()
})
</script>

<style scoped>
/* Markdown prose styles for agent bubbles */
.agent-prose :deep(p) {
  margin-bottom: 0.6em;
  line-height: 1.6;
}
.agent-prose :deep(p:last-child) {
  margin-bottom: 0;
}
.agent-prose :deep(strong) {
  font-weight: 600;
  color: var(--color-text);
}
.agent-prose :deep(em) {
  font-style: italic;
}
.agent-prose :deep(ul),
.agent-prose :deep(ol) {
  margin: 0.5em 0 0.5em 1.2em;
  line-height: 1.6;
}
.agent-prose :deep(ul) {
  list-style-type: disc;
}
.agent-prose :deep(ol) {
  list-style-type: decimal;
}
.agent-prose :deep(li) {
  margin-bottom: 0.25em;
}
.agent-prose :deep(h1),
.agent-prose :deep(h2),
.agent-prose :deep(h3) {
  font-weight: 600;
  margin-top: 0.75em;
  margin-bottom: 0.25em;
  color: var(--color-text);
}
.agent-prose :deep(h1) { font-size: 1rem; }
.agent-prose :deep(h2) { font-size: 0.9375rem; }
.agent-prose :deep(h3) { font-size: 0.875rem; }
.agent-prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0.6em 0;
}
.agent-prose :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  background: #f1f0ed;
  border-radius: 4px;
  padding: 0.1em 0.35em;
}
.agent-prose :deep(blockquote) {
  border-left: 3px solid #d4d0c8;
  padding-left: 0.75em;
  color: var(--color-muted);
  margin: 0.5em 0;
}
</style>
