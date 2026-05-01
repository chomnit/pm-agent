import { NextFunction, Request, Response } from 'express'
import { isMember } from '../models/project.model'

type Role = 'superadmin' | 'admin' | 'manager'

const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 3,
  admin: 2,
  manager: 1,
}

export const requireRole = (minimum: Role) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any
    const userRole: Role = user?.role ?? 'manager'
    if (ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimum]) return next()
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

export const requireSuperAdmin = requireRole('superadmin')
export const requireAdmin      = requireRole('admin')

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
