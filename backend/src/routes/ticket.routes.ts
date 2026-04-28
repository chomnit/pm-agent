import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  archiveTicket,
  createTicket,
  getTicket,
  listTickets,
  patchTicketStatus,
  runAllTicketAgents,
  updateTicket,
  updateTicketReviewNotes
} from '../controllers/ticket.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { requireProjectMember } from '../middleware/role.middleware'
import { asyncHandler } from '../utils/async-handler'

const router = Router()

// Limit full-pipeline runs to 5 per user per minute
const pipelineLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req) => (req.user as any)?.id ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many pipeline runs. Please wait before trying again.' }
})

router.use(requireAuth)

router.get('/', asyncHandler(requireProjectMember), asyncHandler(listTickets))
router.post('/', asyncHandler(createTicket))
router.get('/:id', asyncHandler(getTicket))
router.patch('/:id', asyncHandler(updateTicket))
router.patch('/:id/status', asyncHandler(patchTicketStatus))
router.post('/:id/run', pipelineLimiter, asyncHandler(runAllTicketAgents))
router.patch('/:id/review-notes', asyncHandler(updateTicketReviewNotes))
router.delete('/:id', asyncHandler(archiveTicket))

export default router
