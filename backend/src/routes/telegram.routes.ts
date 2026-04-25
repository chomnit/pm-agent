import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import {
  agentChat,
  disconnectSession,
  downloadMedia,
  getAgentChat,
  getStatus,
  listConversations,
  listMessages,
  sendMessage,
  startQrSse,
} from '../controllers/telegram.controller'
import { asyncHandler } from '../utils/async-handler'

const router = Router()

router.use(requireAuth)

router.get('/status', asyncHandler(getStatus))
router.get('/qr', asyncHandler(startQrSse))
router.delete('/session', asyncHandler(disconnectSession))

router.get('/conversations', asyncHandler(listConversations))
router.get('/conversations/:id/messages', asyncHandler(listMessages))
router.post('/conversations/:id/send', asyncHandler(sendMessage))

router.get('/conversations/:id/agent', asyncHandler(getAgentChat))
router.post('/conversations/:id/agent/chat', asyncHandler(agentChat))

router.get('/media/:messageId', asyncHandler(downloadMedia))

export default router
