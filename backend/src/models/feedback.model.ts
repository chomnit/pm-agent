import { RowDataPacket } from 'mysql2'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/db'

type FeedbackRow = RowDataPacket & {
  id: string
  stage_id: string
  draft_id: string
  given_by: string
  feedback_text: string
  created_at: string
  given_by_name?: string
}

export type StageFeedback = {
  id: string
  stageId: string
  draftId: string
  givenBy: string
  feedbackText: string
  createdAt: string
  givenByName?: string
}

const mapFeedback = (row: FeedbackRow): StageFeedback => ({
  id: row.id,
  stageId: row.stage_id,
  draftId: row.draft_id,
  givenBy: row.given_by,
  feedbackText: row.feedback_text,
  createdAt: row.created_at,
  givenByName: row.given_by_name
})

export const findByStageId = async (stageId: string): Promise<StageFeedback[]> => {
  const [rows] = await pool.query<FeedbackRow[]>(
    `SELECT sf.*, u.name AS given_by_name
     FROM stage_feedback sf
     LEFT JOIN users u ON u.id = sf.given_by
     WHERE sf.stage_id = ?
     ORDER BY sf.created_at ASC`,
    [stageId]
  )

  return rows.map(mapFeedback)
}

export const create = async (input: {
  stageId: string
  draftId: string
  givenBy: string
  feedbackText: string
}): Promise<StageFeedback> => {
  const id = uuidv4()
  await pool.query(
    `INSERT INTO stage_feedback (id, stage_id, draft_id, given_by, feedback_text)
     VALUES (?, ?, ?, ?, ?)`,
    [id, input.stageId, input.draftId, input.givenBy, input.feedbackText]
  )

  const [rows] = await pool.query<FeedbackRow[]>(
    'SELECT * FROM stage_feedback WHERE id = ? LIMIT 1',
    [id]
  )

  if (!rows.length) {
    throw new Error('Failed to create feedback')
  }

  return mapFeedback(rows[0])
}
