import { RowDataPacket } from 'mysql2'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/db'
import { encrypt, decrypt } from '../utils/crypto'

type UserRow = RowDataPacket & {
  id: string
  google_id: string
  email: string
  name: string
  avatar_url: string | null
  anthropic_api_key: string | null
  is_active: number
  created_at: string
}

export type User = {
  id: string
  googleId: string
  email: string
  name: string
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
}

const mapUser = (row: UserRow): User => ({
  id: row.id,
  googleId: row.google_id,
  email: row.email,
  name: row.name,
  avatarUrl: row.avatar_url,
  isActive: Boolean(row.is_active),
  createdAt: row.created_at
})

export const findById = async (id: string): Promise<User | null> => {
  const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
  return rows.length ? mapUser(rows[0]) : null
}

export const findByGoogleId = async (googleId: string): Promise<User | null> => {
  const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE google_id = ? LIMIT 1', [googleId])
  return rows.length ? mapUser(rows[0]) : null
}

export const findByEmail = async (email: string): Promise<User | null> => {
  const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email])
  return rows.length ? mapUser(rows[0]) : null
}

export const create = async (input: {
  googleId: string
  email: string
  name: string
  avatarUrl: string | null
}): Promise<User> => {
  const id = uuidv4()
  await pool.query(
    'INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)',
    [id, input.googleId, input.email, input.name, input.avatarUrl]
  )
  const user = await findById(id)
  if (!user) {
    throw new Error('Failed to create user')
  }
  return user
}

export const update = async (
  id: string,
  input: {
    name?: string
    avatarUrl?: string | null
  }
): Promise<User | null> => {
  const fields: string[] = []
  const params: Array<string | null> = []

  if (typeof input.name !== 'undefined') {
    fields.push('name = ?')
    params.push(input.name)
  }

  if (typeof input.avatarUrl !== 'undefined') {
    fields.push('avatar_url = ?')
    params.push(input.avatarUrl)
  }

  if (fields.length === 0) {
    return findById(id)
  }

  params.push(id)
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

/**
 * Returns the decrypted Anthropic API key for the given user.
 * Only used internally by the agent — never exposed via API responses.
 */
export const getApiKey = async (userId: string): Promise<string | null> => {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT anthropic_api_key FROM users WHERE id = ? LIMIT 1',
    [userId]
  )
  if (!rows.length || !rows[0].anthropic_api_key) return null
  return decrypt(rows[0].anthropic_api_key)
}

/** Encrypts and persists the user's Anthropic API key. */
export const saveApiKey = async (userId: string, apiKey: string): Promise<void> => {
  const encrypted = encrypt(apiKey)
  await pool.query('UPDATE users SET anthropic_api_key = ? WHERE id = ?', [encrypted, userId])
}

/** Removes the user's stored Anthropic API key. */
export const clearApiKey = async (userId: string): Promise<void> => {
  await pool.query('UPDATE users SET anthropic_api_key = NULL WHERE id = ?', [userId])
}

/** Returns key status and a masked preview — never the raw key. */
export const getApiKeyStatus = async (userId: string): Promise<{ isSet: boolean; preview: string | null }> => {
  const key = await getApiKey(userId)
  if (!key) return { isSet: false, preview: null }
  // Show first 16 chars + bullets
  const preview = key.length > 16 ? `${key.slice(0, 16)}${'•'.repeat(8)}` : `${'•'.repeat(8)}`
  return { isSet: true, preview }
}
