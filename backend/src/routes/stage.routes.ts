import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  approveStageByReviewer,
  assignStageReviewer,
  downloadStageDraft,
  getStage,
  getStageDiagrams,
  listStageDrafts,
  runStageAgent,
  streamStageOutput,
  submitStageFeedback
} from '../controllers/stage.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/async-handler'

const router = Router()

// Limit agent runs to 10 per user per minute to prevent API credit abuse
const agentRunLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: (req) => (req.user as any)?.id ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many agent runs. Please wait before trying again.' }
})

router.use(requireAuth)

router.get('/:id', asyncHandler(getStage))
router.get('/:id/stream', asyncHandler(streamStageOutput))
router.get('/:id/download', asyncHandler(downloadStageDraft))
router.post('/:id/assign', asyncHandler(assignStageReviewer))
router.post('/:id/run', agentRunLimiter, asyncHandler(runStageAgent))
router.post('/:id/feedback', asyncHandler(submitStageFeedback))
router.post('/:id/approve', asyncHandler(approveStageByReviewer))
router.get('/:id/drafts', asyncHandler(listStageDrafts))
router.get('/:id/diagrams', asyncHandler(getStageDiagrams))

export default router
