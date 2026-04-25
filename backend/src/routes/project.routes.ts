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
import { requireAuth } from '../middleware/auth.middleware'
import { requireProjectMember } from '../middleware/role.middleware'
import { asyncHandler } from '../utils/async-handler'

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

export default router
