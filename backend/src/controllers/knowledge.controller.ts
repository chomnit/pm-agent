import { Request, Response } from 'express'
import mammoth from 'mammoth'
import pdf from 'pdf-parse'
import {
  create,
  findAll,
  findById,
  remove,
  update,
  updateAgentMap
} from '../models/knowledge.model'

export const listKnowledge = async (_req: Request, res: Response) => {
  const items = await findAll()
  return res.json({ data: items })
}

export const createKnowledge = async (req: Request, res: Response) => {
  const { title, category, content, sourceFile, status, usedByAll, version, agentTypes } = req.body as {
    title?: string
    category?: 'legal_contracts' | 'procedures' | 'templates' | 'system_architecture' | 'payment_flows'
    content?: string
    sourceFile?: string | null
    status?: 'active' | 'inactive' | 'draft'
    usedByAll?: boolean
    version?: string | null
    agentTypes?: Array<'analysis'>
  }

  if (!title || !category || !content) {
    return res.status(400).json({ error: 'title, category and content are required' })
  }

  const item = await create({
    title,
    category,
    content,
    sourceFile: sourceFile || null,
    status: status || 'draft',
    usedByAll: Boolean(usedByAll),
    version: version || null,
    createdBy: (req.user as any).id
  })

  if (Array.isArray(agentTypes)) {
    await updateAgentMap(item.id, agentTypes)
  }

  const fresh = await findById(item.id)
  return res.status(201).json({ data: fresh })
}

export const getKnowledge = async (req: Request, res: Response) => {
  const item = await findById(String(req.params.id))
  if (!item) {
    return res.status(404).json({ error: 'Knowledge item not found' })
  }

  return res.json({ data: item })
}

export const patchKnowledge = async (req: Request, res: Response) => {
  const { agentTypes, ...fields } = req.body as {
    title?: string
    category?: 'legal_contracts' | 'procedures' | 'templates' | 'system_architecture' | 'payment_flows'
    content?: string
    sourceFile?: string | null
    status?: 'active' | 'inactive' | 'draft'
    usedByAll?: boolean
    version?: string | null
    agentTypes?: Array<'analysis'>
  }

  const updated = await update(String(req.params.id), {
    ...fields,
    updatedBy: (req.user as any).id
  })

  if (!updated) {
    return res.status(404).json({ error: 'Knowledge item not found' })
  }

  if (Array.isArray(agentTypes)) {
    await updateAgentMap(String(req.params.id), agentTypes)
  }

  const fresh = await findById(String(req.params.id))
  return res.json({ data: fresh })
}

export const deleteKnowledge = async (req: Request, res: Response) => {
  const existing = await findById(String(req.params.id))
  if (!existing) {
    return res.status(404).json({ error: 'Knowledge item not found' })
  }

  await remove(String(req.params.id))
  return res.json({ data: true })
}

export const uploadKnowledgeFile = async (req: Request, res: Response) => {
  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'File is required' })
  }

  const mime = file.mimetype
  let extracted = ''

  if (mime === 'application/pdf') {
    const parsePdf = pdf as unknown as (buffer: Buffer) => Promise<{ text: string }>
    const result = await parsePdf(file.buffer)
    extracted = result.text
  } else if (
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer })
    extracted = result.value
  } else {
    return res.status(400).json({ error: 'Only PDF and DOCX are supported' })
  }

  return res.json({ data: { text: extracted } })
}
