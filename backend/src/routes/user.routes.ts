import { Router } from 'express'
import { getMe, getApiKeyStatusHandler, saveApiKeyHandler, clearApiKeyHandler } from '../controllers/user.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/async-handler'

const router = Router()

router.get('/me', requireAuth, asyncHandler(getMe))
router.get('/me/api-key/status', requireAuth, asyncHandler(getApiKeyStatusHandler))
router.patch('/me/api-key', requireAuth, asyncHandler(saveApiKeyHandler))
router.delete('/me/api-key', requireAuth, asyncHandler(clearApiKeyHandler))

export default router
