import { RowDataPacket } from 'mysql2'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/db'

export type TicketStatus = 'backlog' | 'in_progress' | 'review' | 'approved'
export type StageType = 'analysis'

type TicketRow = RowDataPacket & {
  id: string
  project_id: string
  ticket_number: number
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  status: TicketStatus
  current_stage: StageType | null
  review_notes: string | null
  created_by: string
  is_archived: number
  created_at: string
  updated_at: string
}

export type Ticket = {
  id: string
  projectId: string
  ticketNumber: number
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  status: TicketStatus
  currentStage: StageType | null
  reviewNotes: string | null
  createdBy: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

const mapTicket = (row: TicketRow): Ticket => ({
  id: row.id,
  projectId: row.project_id,
  ticketNumber: row.ticket_number,
  title: row.title,
  description: row.description,
  priority: row.priority,
  status: row.status,
  currentStage: row.current_stage,
  reviewNotes: row.review_notes ?? null,
  createdBy: row.created_by,
  isArchived: Boolean(row.is_archived),
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const findById = async (id: string): Promise<Ticket | null> => {
  const [rows] = await pool.query<TicketRow[]>('SELECT * FROM tickets WHERE id = ? LIMIT 1', [id])
  return rows.length ? mapTicket(rows[0]) : null
}

export const findByProjectId = async (projectId: string): Promise<Ticket[]> => {
  const [rows] = await pool.query<TicketRow[]>(
    `SELECT *
     FROM tickets
     WHERE project_id = ? AND is_archived = FALSE
     ORDER BY updated_at DESC`,
    [projectId]
  )

  return rows.map(mapTicket)
}

export const findByProjectIdAndStatus = async (
  projectId: string,
  status: TicketStatus
): Promise<Ticket[]> => {
  const [rows] = await pool.query<TicketRow[]>(
    `SELECT *
     FROM tickets
     WHERE project_id = ? AND status = ? AND is_archived = FALSE
     ORDER BY updated_at DESC`,
    [projectId, status]
  )

  return rows.map(mapTicket)
}

export const create = async (input: {
  projectId: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  createdBy: string
}): Promise<Ticket> => {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const ticketId = uuidv4()

    await connection.query(
      `INSERT INTO tickets (id, project_id, title, description, priority, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketId, input.projectId, input.title, input.description, input.priority, input.createdBy]
    )

    await connection.query(
      `INSERT INTO ticket_stages (id, ticket_id, stage_type, stage_order, status)
       VALUES (?, ?, 'analysis', 1, 'pending')`,
      [uuidv4(), ticketId]
    )

    await connection.query(
      'UPDATE tickets SET current_stage = ? WHERE id = ?',
      ['analysis', ticketId]
    )

    await connection.commit()

    const ticket = await findById(ticketId)
    if (!ticket) {
      throw new Error('Failed to create ticket')
    }

    return ticket
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const updateStatus = async (id: string, status: TicketStatus): Promise<void> => {
  await pool.query('UPDATE tickets SET status = ? WHERE id = ?', [status, id])
}

export const updateCurrentStage = async (id: string, stageType: StageType | null): Promise<void> => {
  await pool.query('UPDATE tickets SET current_stage = ? WHERE id = ?', [stageType, id])
}

export const archive = async (id: string): Promise<void> => {
  await pool.query('UPDATE tickets SET is_archived = TRUE WHERE id = ?', [id])
}

export const updateReviewNotes = async (id: string, notes: string): Promise<void> => {
  await pool.query('UPDATE tickets SET review_notes = ? WHERE id = ?', [notes, id])
}

export const update = async (
  id: string,
  fields: { title?: string; description?: string | null; priority?: 'low' | 'medium' | 'high' }
): Promise<void> => {
  const setClauses: string[] = []
  const values: unknown[] = []

  if (fields.title !== undefined) {
    setClauses.push('title = ?')
    values.push(fields.title)
  }
  if ('description' in fields) {
    setClauses.push('description = ?')
    values.push(fields.description ?? null)
  }
  if (fields.priority !== undefined) {
    setClauses.push('priority = ?')
    values.push(fields.priority)
  }

  if (setClauses.length === 0) return
  values.push(id)
  await pool.query(`UPDATE tickets SET ${setClauses.join(', ')} WHERE id = ?`, values)
}
