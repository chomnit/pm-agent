import { Request, Response } from 'express'
import {
  addMember,
  archive,
  create,
  findById,
  findByUserId,
  getMemberRole,
  getMembers,
  removeMember,
  update
} from '../models/project.model'
import { findByEmail } from '../models/user.model'

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const requireOwner = async (projectId: string, userId: string): Promise<boolean> => {
  const role = await getMemberRole(projectId, userId)
  return role === 'owner'
}

export const listProjects = async (req: Request, res: Response) => {
  const userId = (req.user as any).id
  const projects = await findByUserId(userId)
  return res.json({ data: projects })
}

export const createProject = async (req: Request, res: Response) => {
  const { name, description } = req.body as { name?: string; description?: string }

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Project name is required' })
  }

  const project = await create({
    name: name.trim(),
    description: description?.trim() || null,
    slug: toSlug(name),
    createdBy: (req.user as any).id
  })

  return res.status(201).json({ data: project })
}

export const getProject = async (req: Request, res: Response) => {
  const project = await findById(String(req.params.id))
  if (!project || project.isArchived) {
    return res.status(404).json({ error: 'Project not found' })
  }

  const members = await getMembers(project.id)
  return res.json({ data: { ...project, members } })
}

export const updateProject = async (req: Request, res: Response) => {
  const { name, description } = req.body as { name?: string; description?: string | null }
  const project = await update(String(req.params.id), {
    name: typeof name === 'string' ? name.trim() : undefined,
    description: typeof description === 'undefined' ? undefined : description
  })

  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  return res.json({ data: project })
}

export const archiveProject = async (req: Request, res: Response) => {
  const projectId = String(req.params.id)
  const userId = (req.user as any).id
  const isOwner = await requireOwner(projectId, userId)

  if (!isOwner) {
    return res.status(403).json({ error: 'Only project owner can archive project' })
  }

  await archive(projectId)
  return res.json({ data: true })
}

export const addProjectMember = async (req: Request, res: Response) => {
  const projectId = String(req.params.id)
  const userId = (req.user as any).id

  const isOwner = await requireOwner(projectId, userId)
  if (!isOwner) {
    return res.status(403).json({ error: 'Only project owner can add members' })
  }

  const { email, role } = req.body as { email?: string; role?: string }
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  const validRoles = ['owner', 'member'] as const
  type MemberRole = typeof validRoles[number]
  const resolvedRole: MemberRole =
    role && (validRoles as readonly string[]).includes(role)
      ? (role as MemberRole)
      : 'member'

  const user = await findByEmail(email)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  await addMember(projectId, user.id, resolvedRole, userId)
  const members = await getMembers(projectId)
  return res.status(201).json({ data: members })
}

export const listProjectMembers = async (req: Request, res: Response) => {
  const projectId = String(req.params.id)
  const members = await getMembers(projectId)
  return res.json({ data: members })
}

export const removeProjectMember = async (req: Request, res: Response) => {
  const projectId = String(req.params.id)
  const actingUserId = (req.user as any).id
  const targetUserId = String(req.params.userId)

  const isOwner = await requireOwner(projectId, actingUserId)
  if (!isOwner) {
    return res.status(403).json({ error: 'Only project owner can remove members' })
  }

  const targetRole = await getMemberRole(projectId, targetUserId)
  if (targetRole === 'owner') {
    return res.status(400).json({ error: 'Owner cannot be removed' })
  }

  await removeMember(projectId, targetUserId)
  return res.json({ data: true })
}
