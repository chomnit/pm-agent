import { NextFunction, Request, Response } from 'express'
import { isMember } from '../models/project.model'

export const requireProjectMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId || req.params.id || req.query.projectId
    const userId = (req.user as any)?.id

    if (!projectId || typeof projectId !== 'string' || !userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const member = await isMember(projectId, userId)
    if (!member) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    return next()
  } catch (error) {
    return next(error)
  }
}
