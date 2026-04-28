import { Request, Response } from 'express'
import {
  create,
  findById,
  findByProjectId,
  remove,
  update
} from '../models/feature.model'

export const listFeatures = async (req: Request, res: Response) => {
  const features = await findByProjectId(String(req.params.id))
  return res.json({ data: features })
}

export const createFeature = async (req: Request, res: Response) => {
  const { name, category, status, description, functionality, userRoles, integrations, limitations, tags } =
    req.body as {
      name?: string
      category?: string
      status?: 'live' | 'in_development' | 'deprecated'
      description?: string
      functionality?: string | null
      userRoles?: string[]
      integrations?: string[]
      limitations?: string | null
      tags?: string[]
    }

  if (!name || !category || !description) {
    return res.status(400).json({ error: 'name, category and description are required' })
  }

  const feature = await create({
    projectId: String(req.params.id),
    name,
    category,
    status: status || 'in_development',
    description,
    functionality: functionality || null,
    userRoles: userRoles || [],
    integrations: integrations || [],
    limitations: limitations || null,
    tags: tags || [],
    createdBy: (req.user as any).id
  })

  return res.status(201).json({ data: feature })
}

export const getFeature = async (req: Request, res: Response) => {
  const feature = await findById(String(req.params.fid))
  if (!feature || feature.projectId !== String(req.params.id)) {
    return res.status(404).json({ error: 'Feature not found' })
  }

  return res.json({ data: feature })
}

export const updateFeature = async (req: Request, res: Response) => {
  const feature = await findById(String(req.params.fid))
  if (!feature || feature.projectId !== String(req.params.id)) {
    return res.status(404).json({ error: 'Feature not found' })
  }

  const { name, category, status, description, functionality, userRoles, integrations, limitations, tags } =
    req.body as {
      name?: string
      category?: string
      status?: 'live' | 'in_development' | 'deprecated'
      description?: string
      functionality?: string | null
      userRoles?: string[]
      integrations?: string[]
      limitations?: string | null
      tags?: string[]
    }

  const updated = await update(String(req.params.fid), {
    name,
    category,
    status,
    description,
    functionality,
    userRoles,
    integrations,
    limitations,
    tags,
    updatedBy: (req.user as any).id
  })

  return res.json({ data: updated })
}

export const deleteFeature = async (req: Request, res: Response) => {
  const feature = await findById(String(req.params.fid))
  if (!feature || feature.projectId !== String(req.params.id)) {
    return res.status(404).json({ error: 'Feature not found' })
  }

  await remove(String(req.params.fid))
  return res.json({ data: true })
}
