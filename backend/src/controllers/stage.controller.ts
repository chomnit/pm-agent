import { Request, Response } from 'express'
import { create as createFeedback, findByStageId as findFeedbackByStageId } from '../models/feedback.model'
import { findById as findTicketById, updateCurrentStage, updateStatus as updateTicketStatus } from '../models/ticket.model'
import { findLatestByStageId as findLatestDiagramsByStageId } from '../models/diagram.model'
import {
  approve,
  assignReviewer,
  findById,
  findByTicketId,
  incrementRevisionCount,
  updateStatus
} from '../models/stage.model'
import { findByStageId as findDraftsByStageId, findLatestByStageId, markApproved } from '../models/draft.model'
import { isMember } from '../models/project.model'
import { runAgent } from '../services/agent.service'
import * as streamRegistry from '../services/stream-registry.service'
import { markdownToPdf } from '../utils/markdown-to-pdf'

export const getStage = async (req: Request, res: Response) => {
  const stage = await findById(String(req.params.id))
  if (!stage) {
    return res.status(404).json({ error: 'Stage not found' })
  }

  const ticket = await findTicketById(stage.ticketId)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [drafts, feedback] = await Promise.all([
    findDraftsByStageId(stage.id),
    findFeedbackByStageId(stage.id)
  ])

  return res.json({ data: { ...stage, drafts, feedback } })
}

export const assignStageReviewer = async (req: Request, res: Response) => {
  const stage = await findById(String(req.params.id))
  if (!stage) {
    return res.status(404).json({ error: 'Stage not found' })
  }

  const ticket = await findTicketById(stage.ticketId)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const requesterIsMember = await isMember(ticket.projectId, (req.user as any).id)
  if (!requesterIsMember) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { assignedTo } = req.body as { assignedTo?: string }
  if (!assignedTo) {
    return res.status(400).json({ error: 'assignedTo is required' })
  }

  const assigneeIsMember = await isMember(ticket.projectId, assignedTo)
  if (!assigneeIsMember) {
    return res.status(400).json({ error: 'Assigned reviewer must be a project member' })
  }

  await assignReviewer(stage.id, assignedTo, (req.user as any).id)
  const updated = await findById(stage.id)
  return res.json({ data: updated })
}

export const runStageAgent = async (req: Request, res: Response) => {
  const stage = await findById(String(req.params.id))
  if (!stage) {
    return res.status(404).json({ error: 'Stage not found' })
  }

  const ticket = await findTicketById(stage.ticketId)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (stage.status !== 'pending' && stage.status !== 'needs_revision') {
    return res.status(400).json({ error: 'Stage is not runnable' })
  }

  // Init stream BEFORE firing async agent so SSE clients can subscribe immediately
  streamRegistry.initStream(stage.id)

  void runAgent(stage.id, (req.user as any).id).then(() => {
    streamRegistry.emitDone(stage.id)
  }).catch((error) => {
    console.error('Agent run failed', error)
    const msg = error instanceof Error ? error.message : 'Agent run failed'
    streamRegistry.emitDone(stage.id, msg)
  })

  return res.status(202).json({ data: true, message: 'Agent run started' })
}

export const submitStageFeedback = async (req: Request, res: Response) => {
  const stage = await findById(String(req.params.id))
  if (!stage) {
    return res.status(404).json({ error: 'Stage not found' })
  }

  const ticket = await findTicketById(stage.ticketId)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  if (stage.assignedTo !== (req.user as any).id) {
    return res.status(403).json({ error: 'Only assigned reviewer can request revision' })
  }

  const { feedbackText } = req.body as { feedbackText?: string }
  if (!feedbackText?.trim()) {
    return res.status(400).json({ error: 'feedbackText is required' })
  }

  const latestDraft = await findLatestByStageId(stage.id)
  if (!latestDraft) {
    return res.status(400).json({ error: 'No draft available for feedback' })
  }

  await createFeedback({
    stageId: stage.id,
    draftId: latestDraft.id,
    givenBy: (req.user as any).id,
    feedbackText: feedbackText.trim()
  })

  await incrementRevisionCount(stage.id)
  await updateStatus(stage.id, 'needs_revision')

  const updated = await findById(stage.id)
  return res.status(201).json({ data: updated })
}

export const approveStageByReviewer = async (req: Request, res: Response) => {
  const stage = await findById(String(req.params.id))
  if (!stage) {
    return res.status(404).json({ error: 'Stage not found' })
  }

  const ticket = await findTicketById(stage.ticketId)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  if (stage.assignedTo !== (req.user as any).id) {
    return res.status(403).json({ error: 'Only assigned reviewer can approve stage' })
  }

  const latestDraft = await findLatestByStageId(stage.id)
  if (!latestDraft) {
    return res.status(400).json({ error: 'No draft to approve' })
  }

  await approve(stage.id, (req.user as any).id)
  await markApproved(latestDraft.id)

  const allStages = await findByTicketId(stage.ticketId)
  const nextStage = allStages.find((item) => item.stageOrder === stage.stageOrder + 1)

  if (nextStage) {
    await updateCurrentStage(ticket.id, nextStage.stageType)
  } else {
    // No next stage — the analysis stage is the last. Approve the ticket.
    await updateTicketStatus(ticket.id, 'approved')
    await updateCurrentStage(ticket.id, null)
  }

  const updated = await findById(stage.id)
  return res.json({ data: updated })
}

export const listStageDrafts = async (req: Request, res: Response) => {
  const stage = await findById(String(req.params.id))
  if (!stage) {
    return res.status(404).json({ error: 'Stage not found' })
  }

  const ticket = await findTicketById(stage.ticketId)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const drafts = await findDraftsByStageId(stage.id)
  return res.json({ data: drafts })
}

export const getStageDiagrams = async (req: Request, res: Response) => {
  const stage = await findById(String(req.params.id))
  if (!stage) {
    return res.status(404).json({ error: 'Stage not found' })
  }

  const ticket = await findTicketById(stage.ticketId)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' })
  }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const diagrams = await findLatestDiagramsByStageId(stage.id)
  return res.json({ data: diagrams })
}

export const streamStageOutput = async (req: Request, res: Response): Promise<void> => {
  const stage = await findById(String(req.params.id))
  if (!stage) { res.status(404).json({ error: 'Stage not found' }); return }

  const ticket = await findTicketById(stage.ticketId)
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) { res.status(403).json({ error: 'Forbidden' }); return }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  // If no active stream entry, the agent already finished — signal done immediately
  if (!streamRegistry.isStreaming(stage.id)) {
    send({ type: 'done', text: '' })
    res.end()
    return
  }

  const cleanup = streamRegistry.subscribe(
    stage.id,
    (chunk) => send({ type: 'chunk', text: chunk }),
    (full, error) => { send({ type: 'done', text: full, error }); res.end() }
  )

  req.on('close', cleanup)
}

export const downloadStageDraft = async (req: Request, res: Response): Promise<void> => {
  const stage = await findById(String(req.params.id))
  if (!stage) { res.status(404).json({ error: 'Stage not found' }); return }

  const ticket = await findTicketById(stage.ticketId)
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return }

  const member = await isMember(ticket.projectId, (req.user as any).id)
  if (!member) { res.status(403).json({ error: 'Forbidden' }); return }

  const latestDraft = await findLatestByStageId(stage.id)
  if (!latestDraft) { res.status(404).json({ error: 'No draft available' }); return }

  const slug = ticket.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const format = String(req.query.format ?? 'md')

  if (format === 'pdf') {
    markdownToPdf(latestDraft.content, ticket.title, res)
  } else {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${slug}-pdd.md"`)
    res.send(latestDraft.content)
  }
}
