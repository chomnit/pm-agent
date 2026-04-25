import { RowDataPacket } from 'mysql2'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/db'

type DraftRow = RowDataPacket & {
  id: string
  stage_id: string
  version_number: number
  content: string
  prompt_used: string | null
  model_used: string | null
  tokens_used: number | null
  is_approved: number
  created_at: string
}

export type StageDraft = {
  id: string
  stageId: string
  versionNumber: number
  content: string
  promptUsed: string | null
  modelUsed: string | null
  tokensUsed: number | null
  isApproved: boolean
  createdAt: string
}

const mapDraft = (row: DraftRow): StageDraft => ({
  id: row.id,
  stageId: row.stage_id,
  versionNumber: row.version_number,
  content: row.content,
  promptUsed: row.prompt_used,
  modelUsed: row.model_used,
  tokensUsed: row.tokens_used,
  isApproved: Boolean(row.is_approved),
  createdAt: row.created_at
})

export const findByStageId = async (stageId: string): Promise<StageDraft[]> => {
  const [rows] = await pool.query<DraftRow[]>(
    'SELECT * FROM stage_drafts WHERE stage_id = ? ORDER BY version_number ASC',
    [stageId]
  )
  return rows.map(mapDraft)
}

export const findLatestByStageId = async (stageId: string): Promise<StageDraft | null> => {
  const [rows] = await pool.query<DraftRow[]>(
    'SELECT * FROM stage_drafts WHERE stage_id = ? ORDER BY version_number DESC LIMIT 1',
    [stageId]
  )
  return rows.length ? mapDraft(rows[0]) : null
}

export const create = async (input: {
  stageId: string
  versionNumber: number
  content: string
  promptUsed: string | null
  modelUsed: string | null
  tokensUsed: number | null
}): Promise<StageDraft> => {
  const id = uuidv4()
  await pool.query(
    `INSERT INTO stage_drafts
      (id, stage_id, version_number, content, prompt_used, model_used, tokens_used)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.stageId,
      input.versionNumber,
      input.content,
      input.promptUsed,
      input.modelUsed,
      input.tokensUsed
    ]
  )

  const [rows] = await pool.query<DraftRow[]>('SELECT * FROM stage_drafts WHERE id = ? LIMIT 1', [id])
  if (!rows.length) {
    throw new Error('Failed to create draft')
  }

  return mapDraft(rows[0])
}

export const markApproved = async (id: string): Promise<void> => {
  await pool.query('UPDATE stage_drafts SET is_approved = TRUE WHERE id = ?', [id])
}
