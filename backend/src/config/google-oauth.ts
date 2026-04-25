import { RowDataPacket } from 'mysql2'
import dotenv from 'dotenv'
import passport from 'passport'
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20'
import pool from './db'

dotenv.config()

type UserRow = RowDataPacket & {
  id: string
  email: string
  name: string
  avatar_url: string | null
}

const findOrCreateGoogleUser = async (profile: Profile): Promise<Express.User> => {
  const googleId = profile.id
  const email = profile.emails?.[0]?.value
  const name = profile.displayName || email || 'Unknown User'
  const avatarUrl = profile.photos?.[0]?.value || null

  if (!email) {
    throw new Error('Google profile did not include an email address.')
  }

  const [existingRows] = await pool.query<UserRow[]>(
    'SELECT id, email, name, avatar_url FROM users WHERE google_id = ? LIMIT 1',
    [googleId]
  )

  if (existingRows.length > 0) {
    const existing = existingRows[0]
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      avatarUrl: existing.avatar_url
    }
  }

  const [emailRows] = await pool.query<UserRow[]>(
    'SELECT id, email, name, avatar_url FROM users WHERE email = ? LIMIT 1',
    [email]
  )

  if (emailRows.length > 0) {
    const user = emailRows[0]
    await pool.query('UPDATE users SET google_id = ?, avatar_url = ?, name = ? WHERE id = ?', [
      googleId,
      avatarUrl,
      name,
      user.id
    ])

    return {
      id: user.id,
      email,
      name,
      avatarUrl
    }
  }

  const [insertResult] = await pool.query('INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)', [
    googleId,
    email,
    name,
    avatarUrl
  ])

  const insertedId = (insertResult as { insertId?: number }).insertId
  if (insertedId) {
    const [newRows] = await pool.query<UserRow[]>(
      'SELECT id, email, name, avatar_url FROM users WHERE id = ? LIMIT 1',
      [insertedId]
    )
    if (newRows.length > 0) {
      const newUser = newRows[0]
      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatar_url
      }
    }
  }

  const [fallbackRows] = await pool.query<UserRow[]>(
    'SELECT id, email, name, avatar_url FROM users WHERE google_id = ? LIMIT 1',
    [googleId]
  )

  if (fallbackRows.length === 0) {
    throw new Error('Unable to create or load user from Google profile.')
  }

  const fallback = fallbackRows[0]
  return {
    id: fallback.id,
    email: fallback.email,
    name: fallback.name,
    avatarUrl: fallback.avatar_url
  }
}

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/auth/google/callback'

if (!googleClientId || !googleClientSecret) {
  console.warn('Google OAuth is not fully configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.')
}

passport.use(
  new GoogleStrategy(
    {
      clientID: googleClientId || 'missing-client-id',
      clientSecret: googleClientSecret || 'missing-client-secret',
      callbackURL: googleCallbackUrl
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await findOrCreateGoogleUser(profile)
        done(null, user)
      } catch (error) {
        done(error as Error)
      }
    }
  )
)

passport.serializeUser((user, done) => {
  done(null, (user as any).id)
})

passport.deserializeUser(async (id: string, done) => {
  try {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, email, name, avatar_url FROM users WHERE id = ? LIMIT 1',
      [id]
    )

    if (rows.length === 0) {
      return done(null, false)
    }

    const user = rows[0]
    done(null, {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url
    })
  } catch (error) {
    done(error as Error)
  }
})

export default passport
