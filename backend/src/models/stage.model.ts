import { RowDataPacket } from 'mysql2'
import pool from '../config/db'
import { StageType } from './ticket.model'

export type StageStatus = 'pending' | 'running' | 'in_review' | 'needs_revision' | 'approved'

type StageRow = RowDataPacket & {
  id: string
  ticket_id: string
  stage_type: StageType
  stage_order: number
  status: StageStatus
  assigned_to: string | null
  assigned_by: string | null
  assigned_at: string | null
  approved_by: string | null
  approved_at: string | null
  run_count: number
  revision_count: number
  created_at: string
  updated_at: string
}

export type TicketStage = {
  id: string
  ticketId: string
  stageType: StageType
  stageOrder: number
  status: StageStatus
  assignedTo: string | null
  assignedBy: string | null
  assignedAt: string | null
  approvedBy: string | null
  approvedAt: string | null
  runCount: number
  revisionCount: number
  createdAt: string
  updatedAt: string
}

const mapStage = (row: StageRow): TicketStage => ({
  id: row.id,
  ticketId: row.ticket_id,
  stageType: row.stage_type,
  stageOrder: row.stage_order,
  status: row.status,
  assignedTo: row.assigned_to,
  assignedBy: row.assigned_by,
  assignedAt: row.assigned_at,
  approvedBy: row.approved_by,
  approvedAt: row.approved_at,
  runCount: row.run_count,
  revisionCount: row.revision_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const findByTicketId = async (ticketId: string): Promise<TicketStage[]> => {
  const [rows] = await pool.query<StageRow[]>(
    'SELECT * FROM ticket_stages WHERE ticket_id = ? ORDER BY stage_order ASC',
    [ticketId]
  )

  return rows.map(mapStage)
}

export const findById = async (id: string): Promise<TicketStage | null> => {
  const [rows] = await pool.query<StageRow[]>('SELECT * FROM ticket_stages WHERE id = ? LIMIT 1', [id])
  return rows.length ? mapStage(rows[0]) : null
}

export const findByTicketAndType = async (
  ticketId: string,
  stageType: StageType
): Promise<TicketStage | null> => {
  const [rows] = await pool.query<StageRow[]>(
    'SELECT * FROM ticket_stages WHERE ticket_id = ? AND stage_type = ? LIMIT 1',
    [ticketId, stageType]
  )
  return rows.length ? mapStage(rows[0]) : null
}

export const updateStatus = async (id: string, status: StageStatus): Promise<void> => {
  await pool.query('UPDATE ticket_stages SET status = ? WHERE id = ?', [status, id])
}

export const assignReviewer = async (
  id: string,
  assignedTo: string,
  assignedBy: string
): Promise<void> => {
  await pool.query(
    `UPDATE ticket_stages
     SET assigned_to = ?, assigned_by = ?, assigned_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [assignedTo, assignedBy, id]
  )
}

export const approve = async (id: string, approvedBy: string): Promise<void> => {
  await pool.query(
    `UPDATE ticket_stages
     SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [approvedBy, id]
  )
}

export const incrementRunCount = async (id: string): Promise<void> => {
  await pool.query('UPDATE ticket_stages SET run_count = run_count + 1 WHERE id = ?', [id])
}

export const incrementRevisionCount = async (id: string): Promise<void> => {
  await pool.query('UPDATE ticket_stages SET revision_count = revision_count + 1 WHERE id = ?', [id])
}
