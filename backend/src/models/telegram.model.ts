import { RowDataPacket } from 'mysql2'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/db'

// ─── Sessions ────────────────────────────────────────────────────────────────

type SessionRow = RowDataPacket & {
  id: string
  user_id: string
  telegram_user_id: number
  telegram_username: string | null
  phone_number: string | null
  session_string: string
  status: 'connected' | 'disconnected'
  connected_at: string
  updated_at: string
}

export type TelegramSession = {
  id: string
  userId: string
  telegramUserId: number
  telegramUsername: string | null
  phoneNumber: string | null
  sessionString: string
  status: 'connected' | 'disconnected'
  connectedAt: string
  updatedAt: string
}

const mapSession = (row: SessionRow): TelegramSession => ({
  id: row.id,
  userId: row.user_id,
  telegramUserId: row.telegram_user_id,
  telegramUsername: row.telegram_username,
  phoneNumber: row.phone_number,
  sessionString: row.session_string,
  status: row.status,
  connectedAt: row.connected_at,
  updatedAt: row.updated_at,
})

export const findSessionByUserId = async (userId: string): Promise<TelegramSession | null> => {
  const [rows] = await pool.query<SessionRow[]>(
    'SELECT * FROM telegram_sessions WHERE user_id = ? LIMIT 1',
    [userId]
  )
  return rows.length ? mapSession(rows[0]) : null
}

export const findAllConnectedSessions = async (): Promise<TelegramSession[]> => {
  const [rows] = await pool.query<SessionRow[]>(
    "SELECT * FROM telegram_sessions WHERE status = 'connected'"
  )
  return rows.map(mapSession)
}

export const saveSession = async (
  userId: string,
  data: {
    telegramUserId: number
    telegramUsername: string | null
    phoneNumber: string | null
    sessionString: string
  }
): Promise<void> => {
  await pool.query(
    `INSERT INTO telegram_sessions
       (id, user_id, telegram_user_id, telegram_username, phone_number, session_string, status)
     VALUES (?, ?, ?, ?, ?, ?, 'connected')
     ON DUPLICATE KEY UPDATE
       telegram_user_id = VALUES(telegram_user_id),
       telegram_username = VALUES(telegram_username),
       phone_number = VALUES(phone_number),
       session_string = VALUES(session_string),
       status = 'connected',
       updated_at = CURRENT_TIMESTAMP`,
    [uuidv4(), userId, data.telegramUserId, data.telegramUsername, data.phoneNumber, data.sessionString]
  )
}

export const updateSessionString = async (userId: string, sessionString: string): Promise<void> => {
  await pool.query(
    'UPDATE telegram_sessions SET session_string = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
    [sessionString, userId]
  )
}

export const markSessionDisconnected = async (userId: string): Promise<void> => {
  await pool.query(
    "UPDATE telegram_sessions SET status = 'disconnected', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
    [userId]
  )
}

export const deleteSession = async (userId: string): Promise<void> => {
  await pool.query('DELETE FROM telegram_sessions WHERE user_id = ?', [userId])
}

// ─── Conversations ────────────────────────────────────────────────────────────

type ConversationRow = RowDataPacket & {
  id: string
  user_id: string
  telegram_peer_id: number
  peer_type: 'user' | 'group' | 'channel'
  peer_name: string
  peer_username: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  custom_instruction: string | null
  project_ids: string | null
  auto_response: number
  updated_at: string
}

export type TelegramConversation = {
  id: string
  userId: string
  telegramPeerId: number
  peerType: 'user' | 'group' | 'channel'
  peerName: string
  peerUsername: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  customInstruction: string | null
  projectIds: string[]
  autoResponse: boolean
  updatedAt: string
}

/** Safely parse a DB value that may be a JSON string, a pre-parsed array (mysql2
 *  auto-casts JSON columns), null, or an invalid string. Always returns string[]. */
const parseJsonArray = (val: string | null | unknown): string[] => {
  if (!val) return []
  if (Array.isArray(val)) return val as string[]
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const mapConversation = (row: ConversationRow): TelegramConversation => ({
  id: row.id,
  userId: row.user_id,
  telegramPeerId: row.telegram_peer_id,
  peerType: row.peer_type,
  peerName: row.peer_name,
  peerUsername: row.peer_username,
  lastMessage: row.last_message,
  lastMessageAt: row.last_message_at,
  unreadCount: row.unread_count,
  customInstruction: row.custom_instruction,
  projectIds: parseJsonArray(row.project_ids),
  autoResponse: Boolean(row.auto_response),
  updatedAt: row.updated_at,
})

export const findConversationsByUserId = async (userId: string): Promise<TelegramConversation[]> => {
  const [rows] = await pool.query<ConversationRow[]>(
    'SELECT * FROM telegram_conversations WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  )
  return rows.map(mapConversation)
}

export const findConversationById = async (id: string): Promise<TelegramConversation | null> => {
  const [rows] = await pool.query<ConversationRow[]>(
    'SELECT * FROM telegram_conversations WHERE id = ? LIMIT 1',
    [id]
  )
  return rows.length ? mapConversation(rows[0]) : null
}

export const upsertConversation = async (
  userId: string,
  data: {
    telegramPeerId: number
    peerType: 'user' | 'group' | 'channel'
    peerName: string
    peerUsername: string | null
    lastMessage: string | null
    lastMessageAt: Date | null
    unreadCount: number
  }
): Promise<TelegramConversation> => {
  const id = uuidv4()
  await pool.query(
    `INSERT INTO telegram_conversations
       (id, user_id, telegram_peer_id, peer_type, peer_name, peer_username,
        last_message, last_message_at, unread_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       peer_name = VALUES(peer_name),
       peer_username = VALUES(peer_username),
       last_message = VALUES(last_message),
       last_message_at = VALUES(last_message_at),
       unread_count = VALUES(unread_count),
       updated_at = CURRENT_TIMESTAMP`,
    [
      id, userId, data.telegramPeerId, data.peerType, data.peerName,
      data.peerUsername, data.lastMessage, data.lastMessageAt, data.unreadCount,
    ]
  )
  const [rows] = await pool.query<ConversationRow[]>(
    'SELECT * FROM telegram_conversations WHERE user_id = ? AND telegram_peer_id = ? LIMIT 1',
    [userId, data.telegramPeerId]
  )
  return mapConversation(rows[0])
}

export const updateConversationConfig = async (
  id: string,
  data: { customInstruction: string | null; projectIds: string[]; autoResponse: boolean }
): Promise<void> => {
  await pool.query(
    `UPDATE telegram_conversations
     SET custom_instruction = ?, project_ids = ?, auto_response = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [data.customInstruction, JSON.stringify(data.projectIds), data.autoResponse ? 1 : 0, id]
  )
}

// ─── Messages ─────────────────────────────────────────────────────────────────

type MessageRow = RowDataPacket & {
  id: string
  conversation_id: string
  telegram_message_id: number
  is_outgoing: number
  sender_name: string | null
  text: string | null
  media_type: 'none' | 'photo' | 'voice' | 'document'
  media_mime: string | null
  telegram_media_id: number | null
  sent_at: string
  created_at: string
}

export type TelegramMessage = {
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
  createdAt: string
}

const mapMessage = (row: MessageRow): TelegramMessage => ({
  id: row.id,
  conversationId: row.conversation_id,
  telegramMessageId: row.telegram_message_id,
  isOutgoing: Boolean(row.is_outgoing),
  senderName: row.sender_name,
  text: row.text,
  mediaType: row.media_type,
  mediaMime: row.media_mime,
  telegramMediaId: row.telegram_media_id,
  sentAt: row.sent_at,
  createdAt: row.created_at,
})

export const findMessagesByConversationId = async (
  conversationId: string,
  limit = 50
): Promise<TelegramMessage[]> => {
  // Fetch newest N messages (DESC), then reverse so they display oldest→newest in the UI
  const [rows] = await pool.query<MessageRow[]>(
    'SELECT * FROM (SELECT * FROM telegram_messages WHERE conversation_id = ? ORDER BY sent_at DESC LIMIT ?) sub ORDER BY sent_at ASC',
    [conversationId, limit]
  )
  return rows.map(mapMessage)
}

export const findRecentMessagesByConversationId = async (
  conversationId: string,
  since: Date,
  limit = 500
): Promise<TelegramMessage[]> => {
  const [rows] = await pool.query<MessageRow[]>(
    'SELECT * FROM telegram_messages WHERE conversation_id = ? AND sent_at >= ? ORDER BY sent_at ASC LIMIT ?',
    [conversationId, since, limit]
  )
  return rows.map(mapMessage)
}

export const findMessageById = async (id: string): Promise<TelegramMessage | null> => {
  const [rows] = await pool.query<MessageRow[]>(
    'SELECT * FROM telegram_messages WHERE id = ? LIMIT 1',
    [id]
  )
  return rows.length ? mapMessage(rows[0]) : null
}

export const upsertMessage = async (
  conversationId: string,
  data: {
    telegramMessageId: number
    isOutgoing: boolean
    senderName: string | null
    text: string | null
    mediaType: 'none' | 'photo' | 'voice' | 'document'
    mediaMime: string | null
    telegramMediaId: number | null
    sentAt: Date
  }
): Promise<void> => {
  await pool.query(
    `INSERT INTO telegram_messages
       (id, conversation_id, telegram_message_id, is_outgoing, sender_name,
        text, media_type, media_mime, telegram_media_id, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       text = VALUES(text),
       media_type = VALUES(media_type),
       media_mime = VALUES(media_mime),
       telegram_media_id = VALUES(telegram_media_id)`,
    [
      uuidv4(), conversationId, data.telegramMessageId, data.isOutgoing,
      data.senderName, data.text, data.mediaType, data.mediaMime,
      data.telegramMediaId, data.sentAt,
    ]
  )
}

// ─── Agent chats ──────────────────────────────────────────────────────────────

type AgentChatRow = RowDataPacket & {
  id: string
  user_id: string
  conversation_id: string
  project_id: string | null
  messages: string
  created_at: string
  updated_at: string
}

export type AgentChatMessage = { role: 'user' | 'assistant'; content: string }

export type MessengerAgentChat = {
  id: string
  userId: string
  conversationId: string
  projectId: string | null
  messages: AgentChatMessage[]
  createdAt: string
  updatedAt: string
}

const mapAgentChat = (row: AgentChatRow): MessengerAgentChat => ({
  id: row.id,
  userId: row.user_id,
  conversationId: row.conversation_id,
  projectId: row.project_id,
  messages: typeof row.messages === 'string' ? (() => { try { return JSON.parse(row.messages) } catch { return [] } })() : (row.messages ?? []),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const findAgentChat = async (
  userId: string,
  conversationId: string
): Promise<MessengerAgentChat | null> => {
  const [rows] = await pool.query<AgentChatRow[]>(
    'SELECT * FROM messenger_agent_chats WHERE user_id = ? AND conversation_id = ? LIMIT 1',
    [userId, conversationId]
  )
  return rows.length ? mapAgentChat(rows[0]) : null
}

export const upsertAgentChat = async (
  userId: string,
  conversationId: string,
  projectId: string | null,
  messages: AgentChatMessage[]
): Promise<MessengerAgentChat> => {
  const id = uuidv4()
  const messagesJson = JSON.stringify(messages)
  await pool.query(
    `INSERT INTO messenger_agent_chats
       (id, user_id, conversation_id, project_id, messages)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       project_id = VALUES(project_id),
       messages = VALUES(messages),
       updated_at = CURRENT_TIMESTAMP`,
    [id, userId, conversationId, projectId, messagesJson]
  )
  const chat = await findAgentChat(userId, conversationId)
  return chat!
}
