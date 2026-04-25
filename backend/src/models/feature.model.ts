import { RowDataPacket } from 'mysql2'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/db'

export type FeatureStatus = 'live' | 'in_development' | 'deprecated'

type FeatureRow = RowDataPacket & {
  id: string
  project_id: string
  name: string
  category: string
  status: FeatureStatus
  description: string
  functionality: string | null
  user_roles: string | null
  integrations: string | null
  limitations: string | null
  tags: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type ProjectFeature = {
  id: string
  projectId: string
  name: string
  category: string
  status: FeatureStatus
  description: string
  functionality: string | null
  userRoles: string[]
  integrations: string[]
  limitations: string | null
  tags: string[]
  createdBy: string
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

const parseJsonArray = (value: string | null): string[] => {
  if (!value) {
    return []
  }
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const mapFeature = (row: FeatureRow): ProjectFeature => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  category: row.category,
  status: row.status,
  description: row.description,
  functionality: row.functionality,
  userRoles: parseJsonArray(row.user_roles),
  integrations: parseJsonArray(row.integrations),
  limitations: row.limitations,
  tags: parseJsonArray(row.tags),
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const findByProjectId = async (projectId: string): Promise<ProjectFeature[]> => {
  const [rows] = await pool.query<FeatureRow[]>(
    'SELECT * FROM project_features WHERE project_id = ? ORDER BY updated_at DESC',
    [projectId]
  )
  return rows.map(mapFeature)
}

export const findById = async (id: string): Promise<ProjectFeature | null> => {
  const [rows] = await pool.query<FeatureRow[]>('SELECT * FROM project_features WHERE id = ? LIMIT 1', [id])
  return rows.length ? mapFeature(rows[0]) : null
}

export const create = async (input: {
  projectId: string
  name: string
  category: string
  status: FeatureStatus
  description: string
  functionality: string | null
  userRoles: string[]
  integrations: string[]
  limitations: string | null
  tags: string[]
  createdBy: string
}): Promise<ProjectFeature> => {
  const id = uuidv4()
  await pool.query(
    `INSERT INTO project_features
      (id, project_id, name, category, status, description, functionality,
       user_roles, integrations, limitations, tags, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.projectId,
      input.name,
      input.category,
      input.status,
      input.description,
      input.functionality,
      JSON.stringify(input.userRoles || []),
      JSON.stringify(input.integrations || []),
      input.limitations,
      JSON.stringify(input.tags || []),
      input.createdBy
    ]
  )

  const feature = await findById(id)
  if (!feature) {
    throw new Error('Failed to create feature')
  }

  return feature
}

export const update = async (
  id: string,
  fields: Partial<{
    name: string
    category: string
    status: FeatureStatus
    description: string
    functionality: string | null
    userRoles: string[]
    integrations: string[]
    limitations: string | null
    tags: string[]
    updatedBy: string | null
  }>
): Promise<ProjectFeature | null> => {
  const updates: string[] = []
  const values: Array<string | string[] | null> = []

  if (typeof fields.name !== 'undefined') {
    updates.push('name = ?')
    values.push(fields.name)
  }
  if (typeof fields.category !== 'undefined') {
    updates.push('category = ?')
    values.push(fields.category)
  }
  if (typeof fields.status !== 'undefined') {
    updates.push('status = ?')
    values.push(fields.status)
  }
  if (typeof fields.description !== 'undefined') {
    updates.push('description = ?')
    values.push(fields.description)
  }
  if (typeof fields.functionality !== 'undefined') {
    updates.push('functionality = ?')
    values.push(fields.functionality)
  }
  if (typeof fields.userRoles !== 'undefined') {
    updates.push('user_roles = ?')
    values.push(JSON.stringify(fields.userRoles))
  }
  if (typeof fields.integrations !== 'undefined') {
    updates.push('integrations = ?')
    values.push(JSON.stringify(fields.integrations))
  }
  if (typeof fields.limitations !== 'undefined') {
    updates.push('limitations = ?')
    values.push(fields.limitations)
  }
  if (typeof fields.tags !== 'undefined') {
    updates.push('tags = ?')
    values.push(JSON.stringify(fields.tags))
  }
  if (typeof fields.updatedBy !== 'undefined') {
    updates.push('updated_by = ?')
    values.push(fields.updatedBy)
  }

  if (!updates.length) {
    return findById(id)
  }

  values.push(id)
  await pool.query(`UPDATE project_features SET ${updates.join(', ')} WHERE id = ?`, values)
  return findById(id)
}

export const remove = async (id: string): Promise<void> => {
  await pool.query('DELETE FROM project_features WHERE id = ?', [id])
}
