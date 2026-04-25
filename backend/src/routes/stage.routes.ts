import { Router } from 'express'
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

router.use(requireAuth)

router.get('/:id', asyncHandler(getStage))
router.get('/:id/stream', asyncHandler(streamStageOutput))
router.get('/:id/download', asyncHandler(downloadStageDraft))
router.post('/:id/assign', asyncHandler(assignStageReviewer))
router.post('/:id/run', asyncHandler(runStageAgent))
router.post('/:id/feedback', asyncHandler(submitStageFeedback))
router.post('/:id/approve', asyncHandler(approveStageByReviewer))
router.get('/:id/drafts', asyncHandler(listStageDrafts))
router.get('/:id/diagrams', asyncHandler(getStageDiagrams))

export default router
