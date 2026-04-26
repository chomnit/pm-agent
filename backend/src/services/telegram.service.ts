import bigInt from 'big-integer'
import { TelegramClient } from 'telegram'
import { NewMessage, NewMessageEvent } from 'telegram/events'
import { Dialog } from 'telegram/tl/custom/dialog'
import { StringSession } from 'telegram/sessions'
import { Api } from 'telegram'
import {
  findSessionByUserId,
  findAllConnectedSessions,
  saveSession,
  deleteSession,
  markSessionDisconnected,
  updateSessionString,
  upsertConversation,
  findConversationById,
  findConversationsByUserId,
  findRecentMessagesByConversationId,
  findMessagesByConversationId,
  upsertMessage,
} from '../models/telegram.model'
import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import { getOrgKnowledge, getProjectKnowledge } from './context.service'

const API_ID = Number(process.env.TELEGRAM_API_ID || '0')
const API_HASH = process.env.TELEGRAM_API_HASH || ''

const clients = new Map<string, TelegramClient>()
// Track per-client-instance so a new TelegramClient always gets its handler,
// even if the same userId reconnects without a server restart.
const autoResponseAttached = new WeakSet<TelegramClient>()
const autoResponseTimers = new Map<string, ReturnType<typeof setTimeout>>()

// ─── Cooldown: at most 1 auto-reply per conversation per 60 s ────────────────
const lastAutoReplyAt = new Map<string, number>()
const AUTO_REPLY_COOLDOWN_MS = 15_000

// ─── Conversation cache: avoid a DB hit on every incoming message ─────────────
import type { TelegramConversation } from '../models/telegram.model'
type ConvCacheEntry = { data: TelegramConversation[]; expiresAt: number }
const convCache = new Map<string, ConvCacheEntry>()
const CONV_CACHE_TTL_MS = 30_000

const getCachedConversations = async (userId: string): Promise<TelegramConversation[]> => {
  const entry = convCache.get(userId)
  if (entry && Date.now() < entry.expiresAt) return entry.data
  const data = await findConversationsByUserId(userId)
  convCache.set(userId, { data, expiresAt: Date.now() + CONV_CACHE_TTL_MS })
  return data
}

export const invalidateConvCache = (userId: string): void => {
  convCache.delete(userId)
}

/**
 * Sends a message with Telegram flood-wait protection.
 * If Telegram returns FLOOD_WAIT, waits the required seconds then retries once.
 * Returns true on success, false if the send ultimately failed.
 */
const sendWithFloodProtection = async (
  client: TelegramClient,
  peer: Api.TypeEntityLike,
  message: string
): Promise<boolean> => {
  const trySend = async () => client.sendMessage(peer, { message })
  try {
    await trySend()
    return true
  } catch (err: any) {
    const isFlood =
      err?.errorMessage === 'FLOOD' ||
      String(err?.message ?? '').includes('FLOOD_WAIT') ||
      err?.seconds != null
    if (isFlood) {
      const waitSecs = Math.min(Number(err.seconds ?? 30), 60)
      console.warn(`[auto-response] FLOOD_WAIT ${waitSecs}s — pausing before retry`)
      await new Promise((r) => setTimeout(r, waitSecs * 1000))
      try {
        await trySend()
        return true
      } catch (retryErr) {
        console.error('[auto-response] retry after flood wait failed:', retryErr)
        return false
      }
    }
    throw err
  }
}

const handleAutoResponse = async (
  userId: string,
  client: TelegramClient,
  event: NewMessageEvent
): Promise<void> => {
  const msg = event.message
  if (!msg || msg.out === true || !msg.message) return

  // Resolve numeric peer ID from the incoming message
  const peerId = msg.peerId
  let numericPeerId: number | null = null
  let isGroupMessage = false
  if (peerId instanceof Api.PeerUser) numericPeerId = Number(peerId.userId)
  else if (peerId instanceof Api.PeerChat) { numericPeerId = Number(peerId.chatId); isGroupMessage = true }
  else if (peerId instanceof Api.PeerChannel) { numericPeerId = Number(peerId.channelId); isGroupMessage = true }
  if (!numericPeerId) return

  // In group / channel chats, only respond when the logged-in user is explicitly
  // mentioned. Replying to every group message would be extremely spammy and
  // could get the account flagged by Telegram.
  if (isGroupMessage && !msg.mentioned) return

  // Use cached conversation list — avoids a DB hit on every incoming message
  const conversations = await getCachedConversations(userId)
  const conv = conversations.find(
    (c) => c.telegramPeerId === numericPeerId && c.autoResponse
  )
  if (!conv) return

  console.log(`[auto-response] triggered for "${conv.peerName}" — debouncing 2s`)

  // Debounce per conversation — wait 2 s after the last message before replying
  const timerKey = `${userId}:${conv.id}`
  const existing = autoResponseTimers.get(timerKey)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(async () => {
    autoResponseTimers.delete(timerKey)
    try {
      // ── 60-second cooldown: at most 1 auto-reply per conversation per minute ──
      const lastReply = lastAutoReplyAt.get(conv.id) ?? 0
      if (Date.now() - lastReply < AUTO_REPLY_COOLDOWN_MS) {
        console.log(`[auto-response] cooldown active for "${conv.peerName}", skipping`)
        return
      }

      // Load org knowledge and project knowledge in parallel.
      // Project features are only fetched for the projects selected for this conversation.
      const [orgKnowledge, projectFeatures] = await Promise.all([
        getOrgKnowledge(),
        conv.projectIds.length
          ? Promise.all(conv.projectIds.map((pid) => getProjectKnowledge(pid))).then((r) => r.flat())
          : Promise.resolve([]),
      ])

      const orgText = orgKnowledge
        .map((item) => `--- ${item.title} (${item.category}) ---\n${item.content}`)
        .join('\n\n')

      const featureText = projectFeatures
        .map((f: any) => {
          const lines = [
            `--- ${f.name} [${f.status}] ---`,
            `Category: ${f.category}`,
            f.description   ? `Description: ${f.description}`           : null,
            f.functionality ? `Functionality: ${f.functionality}`        : null,
            f.userRoles?.length   ? `User Roles: ${f.userRoles.join(', ')}`     : null,
            f.integrations?.length ? `Integrations: ${f.integrations.join(', ')}` : null,
          ]
          return lines.filter(Boolean).join('\n')
        })
        .join('\n\n')

      const hasKnowledge = !!(orgText || featureText)

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentMessages = await findRecentMessagesByConversationId(conv.id, since, 20)
      const historyText = recentMessages
        .filter((m) => m.text)
        .map((m) => `${m.isOutgoing ? 'Me' : conv.peerName}: ${m.text}`)
        .join('\n')

      const systemPrompt =
        `You are an AI assistant that automatically replies to Telegram messages on behalf of the user.\n\n` +
        `STRICT RULE: Answer using ONLY the knowledge provided below. ` +
        `Do not use any general knowledge or information from your training data. ` +
        `If the question cannot be answered from the provided knowledge base, reply politely that you don't have that information — ` +
        `for example: "I'm sorry, I don't have information on that topic."\n\n` +
        (conv.customInstruction ? `[INSTRUCTION]\n${conv.customInstruction}\n\n` : '') +
        (orgText    ? `[ORGANIZATIONAL KNOWLEDGE]\n${orgText}\n\n`    : '') +
        (featureText ? `[PROJECT KNOWLEDGE]\n${featureText}\n\n`       : '') +
        (!hasKnowledge
          ? `[NOTE] No knowledge base is configured for this conversation. ` +
            `Politely tell the sender you don't have information to help with their query.\n\n`
          : '') +
        (historyText ? `[RECENT CONVERSATION]\n${historyText}\n\n` : '') +
        `[MESSAGE FROM ${conv.peerName}]\n${msg.message}\n\n` +
        `Output ONLY the reply text. No preamble, no labels, no explanation.`

      // Re-load .env with override so the key is available even if the shell
      // had the var set to empty string before the process started.
      dotenv.config({ override: true })
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY
      if (!anthropicApiKey) {
        console.error('[auto-response] ANTHROPIC_API_KEY not set, skipping')
        return
      }
      const anthropic = new Anthropic({ apiKey: anthropicApiKey })
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Send the reply now.' }],
      })

      const replyText =
        response.content[0].type === 'text' ? response.content[0].text.trim() : null
      if (!replyText) return

      // ── Send with flood-wait protection ───────────────────────────────────────
      const peer = makePeer(conv.telegramPeerId, conv.peerType)
      const sent = await sendWithFloodProtection(client, peer, replyText)
      if (!sent) return

      // Record the reply time for cooldown tracking
      lastAutoReplyAt.set(conv.id, Date.now())
      console.log(`[auto-response] sent reply to "${conv.peerName}"`)

      // ── Persist reply to DB without an extra Telegram round-trip ─────────────
      // We already have the message in memory — no need to call getMessages again.
      await upsertMessage(conv.id, {
        telegramMessageId: 0,   // 0 = placeholder; overwritten on next real sync
        isOutgoing: true,
        senderName: null,
        text: replyText,
        mediaType: 'none',
        mediaMime: null,
        telegramMediaId: null,
        sentAt: new Date(),
      })
    } catch (err) {
      console.error('[auto-response] error:', err)
    }
  }, 2000)

  autoResponseTimers.set(timerKey, timer)
}

const attachAutoResponseHandler = (userId: string, client: TelegramClient): void => {
  if (autoResponseAttached.has(client)) return
  autoResponseAttached.add(client)
  client.addEventHandler(
    (event: NewMessageEvent) => handleAutoResponse(userId, client, event),
    new NewMessage({ incoming: true })
  )
  console.log(`[auto-response] handler attached for user ${userId}`)
}

const makeClient = (sessionString = '') => {
  const session = new StringSession(sessionString)
  return new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 3,
  })
}

export const getClient = async (userId: string): Promise<TelegramClient> => {
  const existing = clients.get(userId)
  if (existing?.connected) {
    // Defensively ensure the auto-response handler is attached even if we return early
    try { attachAutoResponseHandler(userId, existing) } catch { /* already attached */ }
    return existing
  }

  const stored = await findSessionByUserId(userId)
  if (!stored) throw new Error('No Telegram session for user')

  const client = makeClient(stored.sessionString)
  await client.connect()

  if (!(await client.isUserAuthorized())) {
    // Mark disconnected in DB so the next GET /status call returns { connected: false }
    // and the frontend shows the QR re-connect screen automatically.
    await markSessionDisconnected(userId)
    throw new Error('Telegram session expired')
  }

  clients.set(userId, client)
  try {
    attachAutoResponseHandler(userId, client)
  } catch (err) {
    console.error('[auto-response] attach failed:', err)
  }
  return client
}

export const startQrLogin = async (
  userId: string,
  onQr: (url: string) => void,
  onDone: () => void
): Promise<void> => {
  const client = makeClient()
  await client.connect()
  clients.set(userId, client)

  await client.signInUserWithQrCode(
    { apiId: API_ID, apiHash: API_HASH },
    {
      qrCode: async (qrCode) => {
        const token = Buffer.from(qrCode.token).toString('base64url')
        onQr(`tg://login?token=${token}`)
      },
      onError: async (err) => {
        console.error('QR login error:', err)
        return true
      },
    }
  )

  const me = (await client.getMe()) as Api.User
  const sessionString = (client.session as StringSession).save()

  await saveSession(userId, {
    telegramUserId: Number(me.id),
    telegramUsername: me.username ?? null,
    phoneNumber: me.phone ?? null,
    sessionString,
  })

  attachAutoResponseHandler(userId, client)
  onDone()
}

export const disconnectUser = async (userId: string): Promise<void> => {
  const client = clients.get(userId)
  if (client) {
    try {
      await client.destroy()
    } catch {
      // ignore
    }
    clients.delete(userId)
    // WeakSet auto-cleans when the client is GC'd; no manual removal needed
  }
  await deleteSession(userId)
}

const classifyDialog = (dialog: Dialog): 'user' | 'group' | 'channel' => {
  if (dialog.isChannel) return 'channel'
  if (dialog.isGroup) return 'group'
  return 'user'
}

export const syncConversations = async (userId: string, limit = 30): Promise<void> => {
  const client = await getClient(userId)
  const dialogs = await client.getDialogs({ limit })

  for (const dialog of dialogs) {
    if (!dialog.entity) continue
    const entity = dialog.entity

    let peerId: number
    let peerName: string
    let peerUsername: string | null = null

    if (entity instanceof Api.User) {
      peerId = Number(entity.id)
      peerName = [entity.firstName, entity.lastName].filter(Boolean).join(' ') || 'Unknown'
      peerUsername = entity.username ?? null
    } else if (entity instanceof Api.Chat) {
      peerId = Number(entity.id)
      peerName = entity.title || 'Group'
    } else if (entity instanceof Api.Channel) {
      peerId = Number(entity.id)
      peerName = entity.title || 'Channel'
      peerUsername = entity.username ?? null
    } else {
      continue
    }

    const lastMsg = dialog.message
    let lastMessageText: string | null = null
    let lastMessageAt: Date | null = null

    if (lastMsg && lastMsg instanceof Api.Message) {
      lastMessageText = lastMsg.message || null
      lastMessageAt = new Date((lastMsg.date ?? 0) * 1000)
    }

    await upsertConversation(userId, {
      telegramPeerId: peerId,
      peerType: classifyDialog(dialog),
      peerName,
      peerUsername,
      lastMessage: lastMessageText,
      lastMessageAt,
      unreadCount: dialog.unreadCount ?? 0,
    })
  }
}

const makePeer = (peerId: number, peerType: 'user' | 'group' | 'channel'): Api.TypeEntityLike => {
  if (peerType === 'user') return new Api.PeerUser({ userId: bigInt(peerId) })
  if (peerType === 'group') return new Api.PeerChat({ chatId: bigInt(peerId) })
  return new Api.PeerChannel({ channelId: bigInt(peerId) })
}

const upsertTelegramMessage = async (
  conversationId: string,
  client: TelegramClient,
  msg: Api.Message
): Promise<void> => {
  let mediaType: 'none' | 'photo' | 'voice' | 'document' = 'none'
  let mediaMime: string | null = null
  let telegramMediaId: number | null = null

  if (msg.photo) {
    mediaType = 'photo'
    mediaMime = 'image/jpeg'
    telegramMediaId = Number((msg.photo as Api.Photo).id)
  } else if (msg.document) {
    const doc = msg.document as Api.Document
    telegramMediaId = Number(doc.id)
    mediaMime = doc.mimeType ?? null
    const isVoice = doc.attributes?.some(
      (a) => a instanceof Api.DocumentAttributeAudio && a.voice
    )
    mediaType = isVoice ? 'voice' : 'document'
  }

  const senderName = await resolveSenderName(client, msg)

  await upsertMessage(conversationId, {
    telegramMessageId: msg.id,
    isOutgoing: msg.out ?? false,
    senderName,
    text: msg.message || null,
    mediaType,
    mediaMime,
    telegramMediaId,
    sentAt: new Date((msg.date ?? 0) * 1000),
  })
}

// ─── Full-history concurrency guard ──────────────────────────────────────────
// Prevents multiple simultaneous syncs for the same conversation (e.g. user
// opens the same chat twice in quick succession). Each entry is conversationId.
const syncFullHistoryRunning = new Set<string>()

export const syncFullHistory = async (userId: string, conversationId: string): Promise<void> => {
  // Skip if a sync is already in progress for this conversation.
  if (syncFullHistoryRunning.has(conversationId)) {
    console.log(`[syncFullHistory] already running for ${conversationId}, skipping`)
    return
  }
  syncFullHistoryRunning.add(conversationId)

  try {
    const client = await getClient(userId)
    const conversation = await findConversationById(conversationId)
    if (!conversation) throw new Error('Conversation not found')

    const peer = makePeer(conversation.telegramPeerId, conversation.peerType)
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const batchSize = 100
    const maxTotal = 500

    let offsetId = 0
    let totalFetched = 0
    let reachedCutoff = false

    while (!reachedCutoff && totalFetched < maxTotal) {
      const batch = await client.getMessages(peer, {
        limit: batchSize,
        ...(offsetId ? { offsetId } : {}),
      })

      if (!batch.length) break

      for (const msg of batch) {
        if (!(msg instanceof Api.Message)) continue
        const msgDate = new Date((msg.date ?? 0) * 1000)
        if (msgDate < since) {
          reachedCutoff = true
          break
        }
        await upsertTelegramMessage(conversationId, client, msg)
        totalFetched++
      }

      // offsetId for next page = ID of the oldest message in this batch
      const validBatch = batch.filter((m): m is Api.Message => m instanceof Api.Message)
      const oldestMsg = validBatch[validBatch.length - 1]
      if (!oldestMsg || reachedCutoff) break
      offsetId = oldestMsg.id

      // Pace batch requests so we don't burst 5 getMessages calls back-to-back.
      await new Promise((r) => setTimeout(r, 300))
    }
  } finally {
    syncFullHistoryRunning.delete(conversationId)
  }
}

export const syncMessages = async (
  userId: string,
  conversationId: string,
  limit = 50
): Promise<void> => {
  const client = await getClient(userId)
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('Conversation not found')

  const peer = makePeer(conversation.telegramPeerId, conversation.peerType)
  const messages = await client.getMessages(peer, { limit })

  for (const msg of messages) {
    if (!(msg instanceof Api.Message)) continue
    await upsertTelegramMessage(conversationId, client, msg)
  }
}

// ─── Entity name cache ────────────────────────────────────────────────────────
// Keyed by string senderId. Persists for the server lifetime so the same sender
// is never resolved more than once, regardless of how many syncs run.
// Stores null for senders whose name couldn't be resolved (avoids retrying).
const entityNameCache = new Map<string, string | null>()

const resolveSenderName = async (
  client: TelegramClient,
  msg: Api.Message
): Promise<string | null> => {
  // Outgoing messages are always from the logged-in user — no API call needed.
  if (msg.out) return null
  if (!msg.senderId) return null

  const key = String(msg.senderId)

  // Return cached result (including null) without hitting Telegram.
  if (entityNameCache.has(key)) return entityNameCache.get(key) ?? null

  try {
    const sender = await client.getEntity(msg.senderId)
    const name =
      sender instanceof Api.User
        ? [sender.firstName, sender.lastName].filter(Boolean).join(' ') || null
        : null
    entityNameCache.set(key, name)
    return name
  } catch {
    // Cache null so we don't retry a failing entity on the next sync.
    entityNameCache.set(key, null)
    return null
  }
}

export const sendMessage = async (
  userId: string,
  conversationId: string,
  text: string,
  parseMode?: string
): Promise<void> => {
  const client = await getClient(userId)
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('Conversation not found')

  const peer = makePeer(conversation.telegramPeerId, conversation.peerType)
  await client.sendMessage(peer, {
    message: text,
    ...(parseMode ? { parseMode } : {}),
  })
}

export interface ContactResult {
  peerId: number
  peerType: 'user' | 'group' | 'channel'
  peerName: string
  peerUsername: string | null
}

export const searchContacts = async (userId: string, query: string): Promise<ContactResult[]> => {
  const client = await getClient(userId)
  const result = await client.invoke(
    new Api.contacts.Search({ q: query, limit: 20 })
  )

  const contacts: ContactResult[] = []

  for (const user of result.users) {
    if (!(user instanceof Api.User)) continue
    contacts.push({
      peerId: Number(user.id),
      peerType: 'user',
      peerName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown',
      peerUsername: user.username ?? null,
    })
  }

  for (const chat of result.chats) {
    if (chat instanceof Api.Chat) {
      contacts.push({
        peerId: Number(chat.id),
        peerType: 'group',
        peerName: chat.title || 'Group',
        peerUsername: null,
      })
    } else if (chat instanceof Api.Channel) {
      contacts.push({
        peerId: Number(chat.id),
        peerType: chat.megagroup ? 'group' : 'channel',
        peerName: chat.title || 'Channel',
        peerUsername: chat.username ?? null,
      })
    }
  }

  return contacts
}

export const downloadMedia = async (
  userId: string,
  conversationId: string,
  messageId: string
): Promise<{ buffer: Buffer; mime: string }> => {
  const client = await getClient(userId)
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('Conversation not found')

  const messages = await findMessagesByConversationId(conversationId, 500)
  const dbMsg = messages.find((m) => m.id === messageId)
  if (!dbMsg) throw new Error('Message not found')
  if (!dbMsg.telegramMediaId) throw new Error('Message has no media')

  const peer = makePeer(conversation.telegramPeerId, conversation.peerType)
  const [telegramMsg] = await client.getMessages(peer, { ids: [dbMsg.telegramMessageId] })

  if (!telegramMsg || !(telegramMsg instanceof Api.Message)) {
    throw new Error('Telegram message not found')
  }

  const downloaded = await client.downloadMedia(telegramMsg, {})
  if (!downloaded) throw new Error('Failed to download media')

  const buffer = Buffer.isBuffer(downloaded)
    ? downloaded
    : Buffer.from(downloaded as unknown as Uint8Array)
  const mime = dbMsg.mediaMime || 'application/octet-stream'

  return { buffer, mime }
}

// ─── Startup reconnection ─────────────────────────────────────────────────────
// Called once on server boot. Re-establishes Telegram connections for every
// user whose session is marked connected in the DB, so auto-response resumes
// immediately without anyone needing to open the browser.
export const reconnectAllSessions = async (): Promise<void> => {
  const sessions = await findAllConnectedSessions()
  if (!sessions.length) return
  console.log(`[startup] Reconnecting ${sessions.length} Telegram session(s)...`)
  for (const s of sessions) {
    try {
      await getClient(s.userId)
      console.log(`[startup] ✓ Reconnected user ${s.userId} (${s.telegramUsername ?? s.phoneNumber ?? 'unknown'})`)
    } catch (err) {
      // Session may be expired — getClient already marks it disconnected in DB.
      console.warn(`[startup] ✗ Could not reconnect user ${s.userId}:`, err instanceof Error ? err.message : err)
    }
  }
}
