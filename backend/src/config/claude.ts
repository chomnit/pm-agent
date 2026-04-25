import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config()

const apiKey = process.env.ANTHROPIC_API_KEY

if (!apiKey) {
  // Keep startup resilient; calls will fail with a clear error if key is missing.
  console.warn('ANTHROPIC_API_KEY is not set. Agent runs will fail until configured.')
}

export const claude = new Anthropic({
  apiKey: apiKey || 'missing-api-key'
})
