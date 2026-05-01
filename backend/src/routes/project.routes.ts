import { Router } from 'express'
import {
  addProjectMember,
  archiveProject,
  createProject,
  getProject,
  listProjectMembers,
  listProjects,
  removeProjectMember,
  updateProject
} from '../controllers/project.controller'
import {
  createFeature,
  deleteFeature,
  getFeature,
  listFeatures,
  updateFeature
} from '../controllers/feature.controller'
import {
  applyProposal,
  getSyncSession,
  listSyncSessions,
  rejectProposal,
  saveFieldDecisions,
  startSync
} from '../controllers/knowledge-sync.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { requireProjectMember } from '../middleware/role.middleware'
import { asyncHandler } from '../utils/async-handler'
import rateLimit from 'express-rate-limit'

const syncLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  keyGenerator: (req) => (req.user as any)?.id ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sync requests. Please wait before trying again.' }
})

const router = Router()

router.use(requireAuth)

router.get('/', asyncHandler(listProjects))
router.post('/', asyncHandler(createProject))
router.get('/:id', asyncHandler(requireProjectMember), asyncHandler(getProject))
router.patch('/:id', asyncHandler(requireProjectMember), asyncHandler(updateProject))
router.delete('/:id', asyncHandler(requireProjectMember), asyncHandler(archiveProject))
router.get('/:id/members', asyncHandler(requireProjectMember), asyncHandler(listProjectMembers))
router.post('/:id/members', asyncHandler(requireProjectMember), asyncHandler(addProjectMember))
router.delete('/:id/members/:userId', asyncHandler(requireProjectMember), asyncHandler(removeProjectMember))

router.get('/:id/features', asyncHandler(requireProjectMember), asyncHandler(listFeatures))
router.post('/:id/features', asyncHandler(requireProjectMember), asyncHandler(createFeature))
router.get('/:id/features/:fid', asyncHandler(requireProjectMember), asyncHandler(getFeature))
router.patch('/:id/features/:fid', asyncHandler(requireProjectMember), asyncHandler(updateFeature))
router.delete('/:id/features/:fid', asyncHandler(requireProjectMember), asyncHandler(deleteFeature))

// Knowledge sync
router.post('/:id/knowledge/sync', asyncHandler(requireProjectMember), syncLimiter, asyncHandler(startSync))
router.get('/:id/knowledge/sync', asyncHandler(requireProjectMember), asyncHandler(listSyncSessions))
router.get('/:id/knowledge/sync/:sessionId', asyncHandler(requireProjectMember), asyncHandler(getSyncSession))
router.patch('/:id/knowledge/sync/:sessionId/proposals/:proposalId/decisions', asyncHandler(requireProjectMember), asyncHandler(saveFieldDecisions))
router.post('/:id/knowledge/sync/:sessionId/proposals/:proposalId/apply', asyncHandler(requireProjectMember), asyncHandler(applyProposal))
router.post('/:id/knowledge/sync/:sessionId/proposals/:proposalId/reject', asyncHandler(requireProjectMember), asyncHandler(rejectProposal))

export default router
