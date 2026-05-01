import { Request, Response } from 'express'
import * as syncModel from '../models/knowledge-sync.model'
import { update as updateFeature } from '../models/feature.model'
import { runKnowledgeSync, type IncomingTicket } from '../services/knowledge-sync.service'

export const startSync = async (req: Request, res: Response) => {
  const projectId = String(req.params.id)
  const userId = (req.user as any).id
  const { tickets } = req.body as { tickets?: { title: string; description?: string }[] }

  if (!Array.isArray(tickets) || tickets.length === 0) {
    return res.status(400).json({ error: 'tickets array is required and must not be empty' })
  }
  if (tickets.length > 1000) {
    return res.status(400).json({ error: 'Maximum 1000 tickets per sync' })
  }

  const normalized: IncomingTicket[] = tickets
    .map(t => ({ title: String(t.title || '').trim(), description: String(t.description || '').trim() }))
    .filter(t => t.title.length > 0)

  if (normalized.length === 0) {
    return res.status(400).json({ error: 'No valid tickets found (titles are required)' })
  }

  const session = await syncModel.createSession({ projectId, ticketCount: normalized.length, createdBy: userId })

  // Fire-and-forget — do not await
  setImmediate(() => runKnowledgeSync(session.id, projectId, normalized).catch(console.error))

  return res.status(202).json({ data: session })
}

export const listSyncSessions = async (req: Request, res: Response) => {
  const sessions = await syncModel.listSessionsByProject(String(req.params.id))
  return res.json({ data: sessions })
}

export const getSyncSession = async (req: Request, res: Response) => {
  const [session, proposals] = await Promise.all([
    syncModel.getSessionById(String(req.params.sessionId)),
    syncModel.listProposalsBySession(String(req.params.sessionId)),
  ])
  if (!session) return res.status(404).json({ error: 'Session not found' })
  return res.json({ data: { ...session, proposals } })
}

export const saveFieldDecisions = async (req: Request, res: Response) => {
  const { fieldDecisions } = req.body as { fieldDecisions: Record<string, 'accepted' | 'rejected'> }

  if (!fieldDecisions || typeof fieldDecisions !== 'object') {
    return res.status(400).json({ error: 'fieldDecisions object is required' })
  }
  for (const val of Object.values(fieldDecisions)) {
    if (val !== 'accepted' && val !== 'rejected') {
      return res.status(400).json({ error: 'Each fieldDecision value must be "accepted" or "rejected"' })
    }
  }

  await syncModel.updateFieldDecisions(String(req.params.proposalId), fieldDecisions)
  return res.json({ data: true })
}

export const applyProposal = async (req: Request, res: Response) => {
  const proposalId = String(req.params.proposalId)
  const userId = (req.user as any).id

  const proposal = await syncModel.getProposalById(proposalId)
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' })
  if (proposal.status !== 'pending') return res.status(409).json({ error: 'Proposal already processed' })
  if (!proposal.featureId) {
    return res.status(400).json({ error: 'Cannot apply — ticket flagged for manual feature creation' })
  }

  // Only apply fields the user explicitly accepted
  const acceptedChanges: Record<string, any> = {}
  for (const [field, decision] of Object.entries(proposal.fieldDecisions)) {
    if (decision === 'accepted') {
      const value = (proposal.proposedChanges as any)[field]
      if (value !== undefined) acceptedChanges[field] = value
    }
  }

  if (Object.keys(acceptedChanges).length === 0) {
    return res.status(400).json({ error: 'Accept at least one field before applying' })
  }

  await updateFeature(proposal.featureId, { ...acceptedChanges, status: 'live', updatedBy: userId })
  await syncModel.markProposalAccepted(proposalId, userId)

  return res.json({ data: true })
}

export const rejectProposal = async (req: Request, res: Response) => {
  const proposalId = String(req.params.proposalId)
  const userId = (req.user as any).id

  const proposal = await syncModel.getProposalById(proposalId)
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' })
  if (proposal.status !== 'pending') return res.status(409).json({ error: 'Proposal already processed' })

  await syncModel.markProposalRejected(proposalId, userId)
  return res.json({ data: true })
}
