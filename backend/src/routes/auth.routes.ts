import { Router } from 'express'
import passport from 'passport'
import { getCurrentUser, logout } from '../controllers/auth.controller'

const router = Router()

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failed', session: true }),
  (_req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3010'
    res.redirect(`${frontendUrl}/api/auth/callback`)
  }
)

router.get('/me', getCurrentUser)
router.post('/logout', logout)

export default router
