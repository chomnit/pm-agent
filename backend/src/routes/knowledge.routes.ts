import { Router } from 'express'
import multer from 'multer'
import {
  createKnowledge,
  deleteKnowledge,
  getKnowledge,
  listKnowledge,
  patchKnowledge,
  uploadKnowledgeFile
} from '../controllers/knowledge.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/async-handler'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.use(requireAuth)

router.get('/', asyncHandler(listKnowledge))
router.post('/', asyncHandler(createKnowledge))
router.post('/upload', upload.single('file'), asyncHandler(uploadKnowledgeFile))
router.get('/:id', asyncHandler(getKnowledge))
router.patch('/:id', asyncHandler(patchKnowledge))
router.delete('/:id', asyncHandler(deleteKnowledge))

export default router
