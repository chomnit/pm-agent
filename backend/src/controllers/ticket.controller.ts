import { Request, Response } from 'express'
import { isMember } from '../models/project.model'
import { findById as findUserById } from '../models/user.model'
import { findLatestByStageId } from '../models/draft.model'
import { findByTicketId } from '../models/stage.model'
import {
  archive,
  create,
  findById,
  findByProjectId,
  findByProjectIdAndStatus,
  updateStatus,
  updateReviewNotes,
  update
} from '../models/ticket.model'
import { runAllAgents } from '../services/agent.service'
import * as streamRegistry from '../services/stream-registry.service'

export const listTickets = async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined
  const status = req.query.status as 'backlog' | 'in_progress' | 'review' | 'approved' | undefined

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' })
  }

  if (status) {
    const tickets = await findByProjectIdAndStatus(projectId, status)
    return res.json({ data: tickets })
  }

  const tickets = await findByProjectId(projectId)
  return res.json({ data: tickets })
}

export const createTicket = async (req: Request, res: Response) => {
  const { projectId, title, description, priority } = req.body as {
    projectId?: string
    title?: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
  }

  if (!projectId || !title) {
    return res.status(400).json({ error: 'projectId and title are required' })
  }

  const member = await isMember(projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const ticket = await create({
    projectId,
    title,
    description: description || null,
    priority: priority || 'medium',
    createdBy: (req.user as any).id
  })

  return res.status(201).json({ data: ticket })
}

export const getTicket = async (req: Request, res: Response) => {
  const ticket = await findById(String(req.params.id))
  if (!ticket || ticket.isArchived) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [stages, createdByUser] = await Promise.all([
    findByTicketId(ticket.id),
    findUserById(ticket.createdBy)
  ])
  const stageWithDrafts = await Promise.all(
    stages.map(async (stage) => ({
      ...stage,
      latestDraft: await findLatestByStageId(stage.id)
    }))
  )

  return res.json({ data: { ...ticket, createdByUser, stages: stageWithDrafts } })
}

export const patchTicketStatus = async (req: Request, res: Response) => {
  const ticket = await findById(String(req.params.id))
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { status } = req.body as { status?: 'backlog' | 'in_progress' | 'review' | 'approved' }
  if (!status) {
    return res.status(400).json({ error: 'status is required' })
  }

  await updateStatus(ticket.id, status)
  const updated = await findById(ticket.id)
  return res.json({ data: updated })
}

export const archiveTicket = async (req: Request, res: Response) => {
  const ticket = await findById(String(req.params.id))
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  await archive(ticket.id)
  return res.json({ data: true })
}

export const runAllTicketAgents = async (req: Request, res: Response) => {
  const ticket = await findById(String(req.params.id))
  if (!ticket || ticket.isArchived) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (ticket.status !== 'backlog' && ticket.status !== 'review') {
    return res.status(400).json({ error: 'Ticket must be in backlog or review state' })
  }

  // Look up the analysis stage so we can init the stream before firing
  const stages = await findByTicketId(ticket.id)
  const analysisStage = stages.find((s) => s.stageType === 'analysis')
  if (!analysisStage) {
    return res.status(400).json({ error: 'Analysis stage not found for ticket' })
  }

  // Init stream BEFORE firing async agent so SSE clients can subscribe immediately
  streamRegistry.initStream(analysisStage.id)

  void runAllAgents(ticket.id, (req.user as any).id).catch((error) => {
    console.error('Pipeline run failed:', error)
    const msg = error instanceof Error ? error.message : 'Agent run failed'
    streamRegistry.emitDone(analysisStage.id, msg)
  })

  return res.status(202).json({ data: true, message: 'Agent pipeline started' })
}

export const updateTicketReviewNotes = async (req: Request, res: Response) => {
  const ticket = await findById(String(req.params.id))
  if (!ticket || ticket.isArchived) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { notes } = req.body as { notes?: string }
  if (notes === undefined) {
    return res.status(400).json({ error: 'notes is required' })
  }

  await updateReviewNotes(ticket.id, notes)
  const updated = await findById(ticket.id)
  return res.json({ data: updated })
}

export const updateTicket = async (req: Request, res: Response) => {
  const ticket = await findById(String(req.params.id))
  if (!ticket || ticket.isArchived) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { title, description, priority } = req.body as {
    title?: string
    description?: string | null
    priority?: 'low' | 'medium' | 'high'
  }

  if (title !== undefined && title.trim() === '') {
    return res.status(400).json({ error: 'Title cannot be empty' })
  }

  await update(ticket.id, { title: title?.trim(), description, priority })
  const updated = await findById(ticket.id)
  return res.json({ data: updated })
}

