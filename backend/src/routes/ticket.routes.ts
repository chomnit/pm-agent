import { Router } from 'express'
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

router.use(requireAuth)

router.get('/', asyncHandler(requireProjectMember), asyncHandler(listTickets))
router.post('/', asyncHandler(createTicket))
router.get('/:id', asyncHandler(getTicket))
router.patch('/:id', asyncHandler(updateTicket))
router.patch('/:id/status', asyncHandler(patchTicketStatus))
router.post('/:id/run', asyncHandler(runAllTicketAgents))
router.patch('/:id/review-notes', asyncHandler(updateTicketReviewNotes))
router.delete('/:id', asyncHandler(archiveTicket))

export default router
