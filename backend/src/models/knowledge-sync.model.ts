import { RowDataPacket } from 'mysql2'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/db'

export type SessionStatus = 'processing' | 'completed' | 'failed'
export type ProposalStatus = 'pending' | 'accepted' | 'rejected'
export type Confidence = 'high' | 'medium' | 'low'

export interface SyncSession {
  id: string
  projectId: string
  status: SessionStatus
  ticketCount: number
  proposalCount: number
  unmatchedCount: number
  unmatchedTickets: { title: string; description: string }[] | null
  errorMessage: string | null
  createdBy: string
  completedAt: string | null
  createdAt: string
}

export interface SyncProposal {
  id: string
  sessionId: string
  projectId: string
  featureId: string | null
  featureName: string
  status: ProposalStatus
  currentSnapshot: Record<string, any> | null
  proposedChanges: {
    description?: string
    functionality?: string
    userRoles?: string[]
    integrations?: string[]
    limitations?: string
    tags?: string[]
  }
  fieldDecisions: Record<string, 'accepted' | 'rejected'>
  matchedTickets: { title: string; description: string }[]
  reasoning: string | null
  confidence: Confidence
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

const mapSession = (row: any): SyncSession => ({
  id: row.id,
  projectId: row.project_id,
  status: row.status,
  ticketCount: row.ticket_count,
  proposalCount: row.proposal_count,
  unmatchedCount: row.unmatched_count,
  unmatchedTickets: row.unmatched_tickets ? JSON.parse(row.unmatched_tickets) : null,
  errorMessage: row.error_message,
  createdBy: row.created_by,
  completedAt: row.completed_at,
  createdAt: row.created_at,
})

const mapProposal = (row: any): SyncProposal => ({
  id: row.id,
  sessionId: row.session_id,
  projectId: row.project_id,
  featureId: row.feature_id,
  featureName: row.feature_name,
  status: row.status,
  currentSnapshot: row.current_snapshot ? JSON.parse(row.current_snapshot) : null,
  proposedChanges: JSON.parse(row.proposed_changes),
  fieldDecisions: row.field_decisions ? JSON.parse(row.field_decisions) : {},
  matchedTickets: JSON.parse(row.matched_tickets),
  reasoning: row.reasoning,
  confidence: row.confidence,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const createSession = async (data: {
  projectId: string
  ticketCount: number
  createdBy: string
}): Promise<SyncSession> => {
  const id = uuidv4()
  await pool.query(
    `INSERT INTO knowledge_sync_sessions (id, project_id, ticket_count, created_by) VALUES (?, ?, ?, ?)`,
    [id, data.projectId, data.ticketCount, data.createdBy]
  )
  const session = await getSessionById(id)
  if (!session) throw new Error('Failed to create session')
  return session
}

export const getSessionById = async (id: string): Promise<SyncSession | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM knowledge_sync_sessions WHERE id = ?`, [id]
  )
  return rows[0] ? mapSession(rows[0]) : null
}

export const listSessionsByProject = async (projectId: string): Promise<SyncSession[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM knowledge_sync_sessions WHERE project_id = ? ORDER BY created_at DESC LIMIT 20`,
    [projectId]
  )
  return rows.map(mapSession)
}

export const updateSessionStatus = async (
  id: string,
  status: SessionStatus,
  extra?: {
    proposalCount?: number
    unmatchedCount?: number
    unmatchedTickets?: { title: string; description: string }[]
    errorMessage?: string
  }
): Promise<void> => {
  const sets: string[] = ['status = ?']
  const vals: any[] = [status]

  if (extra?.proposalCount !== undefined) { sets.push('proposal_count = ?'); vals.push(extra.proposalCount) }
  if (extra?.unmatchedCount !== undefined) { sets.push('unmatched_count = ?'); vals.push(extra.unmatchedCount) }
  if (extra?.unmatchedTickets !== undefined) { sets.push('unmatched_tickets = ?'); vals.push(JSON.stringify(extra.unmatchedTickets)) }
  if (extra?.errorMessage !== undefined) { sets.push('error_message = ?'); vals.push(extra.errorMessage) }
  if (status === 'completed' || status === 'failed') { sets.push('completed_at = NOW()') }

  vals.push(id)
  await pool.query(`UPDATE knowledge_sync_sessions SET ${sets.join(', ')} WHERE id = ?`, vals)
}

export const createProposal = async (data: {
  sessionId: string
  projectId: string
  featureId: string | null
  featureName: string
  currentSnapshot: Record<string, any> | null
  proposedChanges: Record<string, any>
  matchedTickets: { title: string; description: string }[]
  reasoning: string | null
  confidence: Confidence
}): Promise<SyncProposal> => {
  const id = uuidv4()
  await pool.query(
    `INSERT INTO knowledge_sync_proposals
     (id, session_id, project_id, feature_id, feature_name, current_snapshot,
      proposed_changes, field_decisions, matched_tickets, reasoning, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.sessionId, data.projectId, data.featureId, data.featureName,
      data.currentSnapshot ? JSON.stringify(data.currentSnapshot) : null,
      JSON.stringify(data.proposedChanges),
      JSON.stringify({}),
      JSON.stringify(data.matchedTickets),
      data.reasoning,
      data.confidence,
    ]
  )
  const proposal = await getProposalById(id)
  if (!proposal) throw new Error('Failed to create proposal')
  return proposal
}

export const getProposalById = async (id: string): Promise<SyncProposal | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM knowledge_sync_proposals WHERE id = ?`, [id]
  )
  return rows[0] ? mapProposal(rows[0]) : null
}

export const listProposalsBySession = async (sessionId: string): Promise<SyncProposal[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM knowledge_sync_proposals WHERE session_id = ? ORDER BY feature_name ASC`,
    [sessionId]
  )
  return rows.map(mapProposal)
}

export const updateFieldDecisions = async (
  id: string,
  fieldDecisions: Record<string, 'accepted' | 'rejected'>
): Promise<void> => {
  await pool.query(
    `UPDATE knowledge_sync_proposals SET field_decisions = ? WHERE id = ?`,
    [JSON.stringify(fieldDecisions), id]
  )
}

export const markProposalAccepted = async (id: string, reviewedBy: string): Promise<void> => {
  await pool.query(
    `UPDATE knowledge_sync_proposals SET status = 'accepted', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
    [reviewedBy, id]
  )
}

export const markProposalRejected = async (id: string, reviewedBy: string): Promise<void> => {
  await pool.query(
    `UPDATE knowledge_sync_proposals SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
    [reviewedBy, id]
  )
}
