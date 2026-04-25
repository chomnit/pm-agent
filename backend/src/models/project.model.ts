import { RowDataPacket } from 'mysql2'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/db'

type ProjectRow = RowDataPacket & {
  id: string
  name: string
  description: string | null
  slug: string
  created_by: string
  is_archived: number
  created_at: string
  updated_at: string
}

type MemberRow = RowDataPacket & {
  id: string
  project_id: string
  user_id: string
  role: 'owner' | 'member'
  invited_by: string | null
  joined_at: string
  name: string
  email: string
  avatar_url: string | null
}

type MemberCheckRow = RowDataPacket & {
  id: string
}

type MemberRoleRow = RowDataPacket & {
  role: 'owner' | 'member'
}

export type Project = {
  id: string
  name: string
  description: string | null
  slug: string
  createdBy: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export type ProjectMember = {
  id: string
  projectId: string
  userId: string
  role: 'owner' | 'member'
  invitedBy: string | null
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }
}

const mapProject = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  description: row.description,
  slug: row.slug,
  createdBy: row.created_by,
  isArchived: Boolean(row.is_archived),
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const mapMember = (row: MemberRow): ProjectMember => ({
  id: row.id,
  projectId: row.project_id,
  userId: row.user_id,
  role: row.role,
  invitedBy: row.invited_by,
  joinedAt: row.joined_at,
  user: {
    id: row.user_id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url
  }
})

export const findById = async (id: string): Promise<Project | null> => {
  const [rows] = await pool.query<ProjectRow[]>('SELECT * FROM projects WHERE id = ? LIMIT 1', [id])
  return rows.length ? mapProject(rows[0]) : null
}

export const findByUserId = async (userId: string): Promise<Project[]> => {
  const [rows] = await pool.query<ProjectRow[]>(
    `SELECT p.*
     FROM projects p
     INNER JOIN project_members pm ON pm.project_id = p.id
     WHERE pm.user_id = ? AND p.is_archived = FALSE
     ORDER BY p.updated_at DESC`,
    [userId]
  )

  return rows.map(mapProject)
}

export const create = async (input: {
  name: string
  description: string | null
  slug: string
  createdBy: string
}): Promise<Project> => {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const projectId = uuidv4()
    const memberId = uuidv4()

    await connection.query(
      'INSERT INTO projects (id, name, description, slug, created_by) VALUES (?, ?, ?, ?, ?)',
      [projectId, input.name, input.description, input.slug, input.createdBy]
    )

    await connection.query(
      `INSERT INTO project_members (id, project_id, user_id, role, invited_by)
       VALUES (?, ?, ?, 'owner', ?)`,
      [memberId, projectId, input.createdBy, input.createdBy]
    )

    await connection.commit()
    const project = await findById(projectId)
    if (!project) {
      throw new Error('Failed to create project')
    }
    return project
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const update = async (
  id: string,
  input: {
    name?: string
    description?: string | null
  }
): Promise<Project | null> => {
  const fields: string[] = []
  const values: Array<string | null> = []

  if (typeof input.name !== 'undefined') {
    fields.push('name = ?')
    values.push(input.name)
  }

  if (typeof input.description !== 'undefined') {
    fields.push('description = ?')
    values.push(input.description)
  }

  if (fields.length === 0) {
    return findById(id)
  }

  values.push(id)
  await pool.query(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values)

  return findById(id)
}

export const archive = async (id: string): Promise<void> => {
  await pool.query('UPDATE projects SET is_archived = TRUE WHERE id = ?', [id])
}

export const addMember = async (
  projectId: string,
  userId: string,
  role: 'owner' | 'member',
  invitedBy: string | null
): Promise<void> => {
  const id = uuidv4()
  await pool.query(
    `INSERT INTO project_members (id, project_id, user_id, role, invited_by)
     VALUES (?, ?, ?, ?, ?)`,
    [id, projectId, userId, role, invitedBy]
  )
}

export const removeMember = async (projectId: string, userId: string): Promise<void> => {
  await pool.query('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId])
}

export const getMembers = async (projectId: string): Promise<ProjectMember[]> => {
  const [rows] = await pool.query<MemberRow[]>(
    `SELECT pm.*, u.name, u.email, u.avatar_url
     FROM project_members pm
     INNER JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ?
     ORDER BY pm.joined_at ASC`,
    [projectId]
  )

  return rows.map(mapMember)
}

export const isMember = async (projectId: string, userId: string): Promise<boolean> => {
  const [rows] = await pool.query<MemberCheckRow[]>(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
    [projectId, userId]
  )

  return rows.length > 0
}

export const getMemberRole = async (
  projectId: string,
  userId: string
): Promise<'owner' | 'member' | null> => {
  const [rows] = await pool.query<MemberRoleRow[]>(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
    [projectId, userId]
  )
  return rows.length ? rows[0].role : null
}
