import { Request, Response } from 'express'
import { findById, getApiKeyStatus, saveApiKey, clearApiKey } from '../models/user.model'

export const getMe = async (req: Request, res: Response) => {
  const userId = (req.user as any)?.id
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await findById(userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  return res.json({ data: user })
}

export const getApiKeyStatusHandler = async (req: Request, res: Response) => {
  const userId = (req.user as any)?.id
  const status = await getApiKeyStatus(userId)
  return res.json({ data: status })
}

export const saveApiKeyHandler = async (req: Request, res: Response) => {
  const userId = (req.user as any)?.id
  const { apiKey } = req.body as { apiKey?: string }

  if (!apiKey?.trim()) {
    return res.status(400).json({ error: 'apiKey is required' })
  }

  // Basic format validation — must start with sk-ant-
  if (!apiKey.trim().startsWith('sk-ant-')) {
    return res.status(400).json({ error: 'Invalid Anthropic API key format' })
  }

  await saveApiKey(userId, apiKey.trim())
  const status = await getApiKeyStatus(userId)
  return res.json({ data: status })
}

export const clearApiKeyHandler = async (req: Request, res: Response) => {
  const userId = (req.user as any)?.id
  await clearApiKey(userId)
  return res.json({ data: { isSet: false, preview: null } })
}
