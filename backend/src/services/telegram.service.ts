import bigInt from 'big-integer'
import { TelegramClient } from 'telegram'
import { Dialog } from 'telegram/tl/custom/dialog'
import { StringSession } from 'telegram/sessions'
import { Api } from 'telegram'
import {
  findSessionByUserId,
  saveSession,
  deleteSession,
  updateSessionString,
  upsertConversation,
  findConversationById,
  findMessagesByConversationId,
  upsertMessage,
} from '../models/telegram.model'

const API_ID = Number(process.env.TELEGRAM_API_ID || '0')
const API_HASH = process.env.TELEGRAM_API_HASH || ''

const clients = new Map<string, TelegramClient>()

const makeClient = (sessionString = '') => {
  const session = new StringSession(sessionString)
  return new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 3,
  })
}

export const getClient = async (userId: string): Promise<TelegramClient> => {
  const existing = clients.get(userId)
  if (existing?.connected) return existing

  const stored = await findSessionByUserId(userId)
  if (!stored) throw new Error('No Telegram session for user')

  const client = makeClient(stored.sessionString)
  await client.connect()

  if (!(await client.isUserAuthorized())) {
    throw new Error('Telegram session expired')
  }

  clients.set(userId, client)
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

export const syncFullHistory = async (userId: string, conversationId: string): Promise<void> => {
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

const resolveSenderName = async (
  client: TelegramClient,
  msg: Api.Message
): Promise<string | null> => {
  try {
    if (!msg.senderId) return null
    const sender = await client.getEntity(msg.senderId)
    if (sender instanceof Api.User) {
      return [sender.firstName, sender.lastName].filter(Boolean).join(' ') || null
    }
  } catch {
    // ignore
  }
  return null
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
