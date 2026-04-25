import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { RowDataPacket } from 'mysql2'
import pool from '../config/db'
import { findById as findTicketById } from '../models/ticket.model'
import { findByProjectId } from '../models/feature.model'

type SkillOverrideRow = RowDataPacket & {
  system_prompt: string
}

export type OrgKnowledgeRow = RowDataPacket & {
  title: string
  category: string
  content: string
}

// In-memory cache for static skill files — invalidated only on process restart or DB override
let _cachedIdentity: string | null = null
let _cachedSkill: string | null = null

const getCoreIdentity = async (): Promise<string> => {
  const [overrideRows] = await pool.query<SkillOverrideRow[]>(
    `SELECT system_prompt
     FROM agent_skills
     WHERE agent_type = 'po_core' AND is_active = TRUE
     ORDER BY version DESC
     LIMIT 1`
  )

  if (overrideRows.length > 0) {
    // DB override bypasses cache so admins can update without restarting
    return overrideRows[0].system_prompt
  }

  if (_cachedIdentity) return _cachedIdentity
  const identityPath = path.join(process.cwd(), 'src', 'agents', 'product-owner', 'skills', 'core.identity.md')
  _cachedIdentity = await readFile(identityPath, 'utf8')
  return _cachedIdentity
}

const getSkillContent = async (): Promise<string> => {
  const [overrideRows] = await pool.query<SkillOverrideRow[]>(
    `SELECT system_prompt
     FROM agent_skills
     WHERE agent_type = 'analysis' AND is_active = TRUE
     ORDER BY version DESC
     LIMIT 1`
  )

  if (overrideRows.length > 0) {
    return overrideRows[0].system_prompt
  }

  if (_cachedSkill) return _cachedSkill
  const skillPath = path.join(process.cwd(), 'src', 'agents', 'product-owner', 'skills', 'unified_pdd.skill.md')
  _cachedSkill = await readFile(skillPath, 'utf8')
  return _cachedSkill
}

const getCombinedPrompt = async (): Promise<string> => {
  const [coreIdentity, stageSkill] = await Promise.all([
    getCoreIdentity(),
    getSkillContent()
  ])

  return (
    `## CORE IDENTITY\n${coreIdentity}\n\n` +
    `## ACTIVE SKILL: UNIFIED PDD\n${stageSkill}`
  )
}

export const getOrgKnowledge = async (): Promise<OrgKnowledgeRow[]> => {
  const [rows] = await pool.query<OrgKnowledgeRow[]>(
    `SELECT DISTINCT oki.title, oki.category, oki.content, oki.updated_at
     FROM org_knowledge_items oki
     LEFT JOIN org_knowledge_agent_map okam ON okam.org_knowledge_item_id = oki.id
     WHERE oki.status = 'active'
       AND (oki.used_by_all = TRUE OR okam.agent_type = 'analysis')
     ORDER BY oki.updated_at DESC`
  )

  return rows
}

export const getProjectKnowledge = async (projectId: string) => {
  const features = await findByProjectId(projectId)
  return features.filter((feature) => feature.status !== 'deprecated')
}

export const buildContext = async (
  ticketId: string,
  projectId: string
): Promise<string> => {
  const [skillContent, orgKnowledge, projectFeatures, ticket] = await Promise.all([
    getCombinedPrompt(),
    getOrgKnowledge(),
    getProjectKnowledge(projectId),
    findTicketById(ticketId)
  ])

  if (!ticket) {
    throw new Error('Ticket not found for context build')
  }

  const orgKnowledgeText = orgKnowledge
    .map((item) => `--- ${item.title} (${item.category}) ---\n${item.content}`)
    .join('\n\n')

  const projectFeatureText = projectFeatures
    .map((feature) => {
      const lines = [
        `--- ${feature.name} [${feature.status}] ---`,
        `Category: ${feature.category}`,
        feature.description ? `Description: ${feature.description}` : null,
        feature.functionality ? `Functionality: ${feature.functionality}` : null,
        feature.userRoles?.length ? `User Roles: ${feature.userRoles.join(', ')}` : null,
        feature.integrations?.length ? `Integrations: ${feature.integrations.join(', ')}` : null,
        feature.limitations ? `Limitations: ${feature.limitations}` : null,
      ]
      return lines.filter(Boolean).join('\n')
    })
    .join('\n\n')

  const currentTaskText =
    `Ticket: ${ticket.title}\n` +
    `Priority: ${ticket.priority}\n` +
    `Description: ${ticket.description || ''}`

  const reviewNotesSection = ticket.reviewNotes
    ? `\n\n[REVIEWER FEEDBACK - You MUST address every point below]\n${ticket.reviewNotes}`
    : ''

  return (
    `[AGENT SKILL]\n${skillContent}\n\n` +
    `[ORGANIZATIONAL KNOWLEDGE]\n${orgKnowledgeText}\n\n` +
    `[PROJECT KNOWLEDGE BASE - Existing Features]\n${projectFeatureText}\n\n` +
    `[CURRENT TASK]\n${currentTaskText}` +
    reviewNotesSection
  )
}
