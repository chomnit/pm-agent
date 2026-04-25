import { RowDataPacket } from 'mysql2'
import pool from '../config/db'

type DiagramRow = RowDataPacket & {
  id: string
  draft_id: string
  diagram_type: string
  title: string
  html_content: string
  generated_at: string
}

export type StageDiagram = {
  id: string
  draftId: string
  diagramType: string
  title: string
  htmlContent: string
  generatedAt: string
}

const mapDiagram = (row: DiagramRow): StageDiagram => ({
  id: row.id,
  draftId: row.draft_id,
  diagramType: row.diagram_type,
  title: row.title,
  htmlContent: row.html_content,
  generatedAt: row.generated_at
})

export const create = async (input: {
  draftId: string
  diagramType: string
  title: string
  htmlContent: string
}): Promise<void> => {
  await pool.execute(
    `INSERT INTO stage_diagrams (id, draft_id, diagram_type, title, html_content)
     VALUES (UUID(), ?, ?, ?, ?)`,
    [input.draftId, input.diagramType, input.title, input.htmlContent]
  )
}

export const findByDraftId = async (draftId: string): Promise<StageDiagram[]> => {
  const [rows] = await pool.query<DiagramRow[]>(
    `SELECT id, draft_id, diagram_type, title, html_content, generated_at
     FROM stage_diagrams
     WHERE draft_id = ?
     ORDER BY generated_at ASC`,
    [draftId]
  )
  return rows.map(mapDiagram)
}

/**
 * Returns diagrams linked to the latest draft for a given stage.
 * Returns an empty array (not an error) if diagrams haven't been generated yet.
 */
export const findLatestByStageId = async (stageId: string): Promise<StageDiagram[]> => {
  const [rows] = await pool.query<DiagramRow[]>(
    `SELECT sd.id, sd.draft_id, sd.diagram_type, sd.title, sd.html_content, sd.generated_at
     FROM stage_diagrams sd
     INNER JOIN (
       SELECT id FROM stage_drafts
       WHERE stage_id = ?
       ORDER BY version_number DESC
       LIMIT 1
     ) AS ld ON ld.id = sd.draft_id
     ORDER BY sd.generated_at ASC`,
    [stageId]
  )
  return rows.map(mapDiagram)
}
