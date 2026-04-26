import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import pool from './config/db'
import session from 'express-session'
import helmet from 'helmet'
import morgan from 'morgan'
import './config/google-oauth'
import passport from 'passport'
import authRoutes from './routes/auth.routes'
import knowledgeRoutes from './routes/knowledge.routes'
import projectRoutes from './routes/project.routes'
import stageRoutes from './routes/stage.routes'
import ticketRoutes from './routes/ticket.routes'
import userRoutes from './routes/user.routes'
import telegramRoutes from './routes/telegram.routes'
import { reconnectAllSessions } from './services/telegram.service'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 5001)
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3010'

app.use(helmet({
  // Allow cross-origin embedding of media (images, audio) served from this API.
  // Required because the frontend (localhost:3010) loads media from the API (localhost:5001).
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(
  cors({
    origin: frontendUrl,
    credentials: true
  })
)
app.use(morgan('dev'))
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  })
)

app.use(passport.initialize())
app.use(passport.session())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/stages', stageRoutes)
app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/telegram', telegramRoutes)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({
    error: 'Internal server error',
    details: err instanceof Error ? err.message : 'Unknown error'
  })
})

app.listen(port, async () => {
  // Reset any stages left in 'running' by a previous crashed/restarted server
  try {
    const [result] = await pool.query<import('mysql2').ResultSetHeader>(
      "UPDATE ticket_stages SET status = 'needs_revision' WHERE status = 'running'"
    )
    if (result.affectedRows > 0) {
      console.log(`Reset ${result.affectedRows} orphaned running stage(s) to needs_revision`)
    }
  } catch (err) {
    console.warn('Could not reset orphaned running stages:', err)
  }

  // Re-establish Telegram connections for all users who were connected before
  // the server restarted, so auto-response resumes without browser interaction.
  reconnectAllSessions().catch((err) => {
    console.warn('reconnectAllSessions error:', err)
  })

  console.log(`Backend API listening on http://localhost:${port}`)
})
