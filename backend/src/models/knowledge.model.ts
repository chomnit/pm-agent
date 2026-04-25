import { RowDataPacket } from 'mysql2'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/db'
import { StageType } from './ticket.model'

export type KnowledgeCategory =
  | 'legal_contracts'
  | 'procedures'
  | 'templates'
  | 'system_architecture'
  | 'payment_flows'

export type KnowledgeStatus = 'active' | 'inactive' | 'draft'

type KnowledgeRow = RowDataPacket & {
  id: string
  title: string
  category: KnowledgeCategory
  content: string
  source_file: string | null
  status: KnowledgeStatus
  used_by_all: number
  version: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

type AgentMapRow = RowDataPacket & {
  org_knowledge_item_id: string
  agent_type: StageType
}

export type OrgKnowledgeItem = {
  id: string
  title: string
  category: KnowledgeCategory
  content: string
  sourceFile: string | null
  status: KnowledgeStatus
  usedByAll: boolean
  version: string | null
  createdBy: string
  updatedBy: string | null
  createdAt: string
  updatedAt: string
  agentTypes: StageType[]
}

const mapKnowledge = (row: KnowledgeRow, agentTypes: StageType[] = []): OrgKnowledgeItem => ({
  id: row.id,
  title: row.title,
  category: row.category,
  content: row.content,
  sourceFile: row.source_file,
  status: row.status,
  usedByAll: Boolean(row.used_by_all),
  version: row.version,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  agentTypes
})

const loadAgentMap = async (knowledgeIds: string[]): Promise<Map<string, StageType[]>> => {
  if (!knowledgeIds.length) {
    return new Map()
  }

  const [rows] = await pool.query<AgentMapRow[]>(
    `SELECT org_knowledge_item_id, agent_type
     FROM org_knowledge_agent_map
     WHERE org_knowledge_item_id IN (?)`,
    [knowledgeIds]
  )

  const map = new Map<string, StageType[]>()

  for (const row of rows) {
    const current = map.get(row.org_knowledge_item_id) || []
    current.push(row.agent_type)
    map.set(row.org_knowledge_item_id, current)
  }

  return map
}

const withAgentMap = async (rows: KnowledgeRow[]): Promise<OrgKnowledgeItem[]> => {
  const ids = rows.map((r) => r.id)
  const agentMap = await loadAgentMap(ids)
  return rows.map((row) => mapKnowledge(row, agentMap.get(row.id) || []))
}

export const findAll = async (): Promise<OrgKnowledgeItem[]> => {
  const [rows] = await pool.query<KnowledgeRow[]>('SELECT * FROM org_knowledge_items ORDER BY updated_at DESC')
  return withAgentMap(rows)
}

export const findById = async (id: string): Promise<OrgKnowledgeItem | null> => {
  const [rows] = await pool.query<KnowledgeRow[]>('SELECT * FROM org_knowledge_items WHERE id = ? LIMIT 1', [id])
  if (!rows.length) {
    return null
  }

  const items = await withAgentMap(rows)
  return items[0] || null
}

export const findActive = async (): Promise<OrgKnowledgeItem[]> => {
  const [rows] = await pool.query<KnowledgeRow[]>(
    "SELECT * FROM org_knowledge_items WHERE status = 'active' ORDER BY updated_at DESC"
  )
  return withAgentMap(rows)
}

export const findActiveByAgentType = async (agentType: StageType): Promise<OrgKnowledgeItem[]> => {
  const [rows] = await pool.query<KnowledgeRow[]>(
    `SELECT DISTINCT oki.*
     FROM org_knowledge_items oki
     LEFT JOIN org_knowledge_agent_map okam ON okam.org_knowledge_item_id = oki.id
     WHERE oki.status = 'active'
       AND (oki.used_by_all = TRUE OR okam.agent_type = ?)
     ORDER BY oki.updated_at DESC`,
    [agentType]
  )

  return withAgentMap(rows)
}

export const create = async (input: {
  title: string
  category: KnowledgeCategory
  content: string
  sourceFile: string | null
  status: KnowledgeStatus
  usedByAll: boolean
  version: string | null
  createdBy: string
}): Promise<OrgKnowledgeItem> => {
  const id = uuidv4()
  await pool.query(
    `INSERT INTO org_knowledge_items
      (id, title, category, content, source_file, status, used_by_all, version, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title,
      input.category,
      input.content,
      input.sourceFile,
      input.status,
      input.usedByAll,
      input.version,
      input.createdBy
    ]
  )

  const item = await findById(id)
  if (!item) {
    throw new Error('Failed to create knowledge item')
  }
  return item
}

export const update = async (
  id: string,
  fields: Partial<{
    title: string
    category: KnowledgeCategory
    content: string
    sourceFile: string | null
    status: KnowledgeStatus
    usedByAll: boolean
    version: string | null
    updatedBy: string
  }>
): Promise<OrgKnowledgeItem | null> => {
  const updates: string[] = []
  const values: Array<string | boolean | null> = []

  if (typeof fields.title !== 'undefined') {
    updates.push('title = ?')
    values.push(fields.title)
  }
  if (typeof fields.category !== 'undefined') {
    updates.push('category = ?')
    values.push(fields.category)
  }
  if (typeof fields.content !== 'undefined') {
    updates.push('content = ?')
    values.push(fields.content)
  }
  if (typeof fields.sourceFile !== 'undefined') {
    updates.push('source_file = ?')
    values.push(fields.sourceFile)
  }
  if (typeof fields.status !== 'undefined') {
    updates.push('status = ?')
    values.push(fields.status)
  }
  if (typeof fields.usedByAll !== 'undefined') {
    updates.push('used_by_all = ?')
    values.push(fields.usedByAll)
  }
  if (typeof fields.version !== 'undefined') {
    updates.push('version = ?')
    values.push(fields.version)
  }
  if (typeof fields.updatedBy !== 'undefined') {
    updates.push('updated_by = ?')
    values.push(fields.updatedBy)
  }

  if (!updates.length) {
    return findById(id)
  }

  values.push(id)
  await pool.query(`UPDATE org_knowledge_items SET ${updates.join(', ')} WHERE id = ?`, values)
  return findById(id)
}

export const updateAgentMap = async (id: string, agentTypes: StageType[]): Promise<void> => {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    await connection.query('DELETE FROM org_knowledge_agent_map WHERE org_knowledge_item_id = ?', [id])

    if (agentTypes.length) {
      const values = agentTypes.map((agentType) => [uuidv4(), id, agentType])
      await connection.query(
        'INSERT INTO org_knowledge_agent_map (id, org_knowledge_item_id, agent_type) VALUES ?',
        [values]
      )
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const remove = async (id: string): Promise<void> => {
  await pool.query('DELETE FROM org_knowledge_items WHERE id = ?', [id])
}
