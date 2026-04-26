import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

// Use override:true so the .env file value wins even if the shell has the var set to empty string.
dotenv.config({ override: true })

const apiKey = process.env.ANTHROPIC_API_KEY

if (!apiKey) {
  // Keep startup resilient; calls will fail with a clear error if key is missing.
  console.warn('ANTHROPIC_API_KEY is not set. Agent runs will fail until configured.')
}

export const claude = new Anthropic({
  apiKey: apiKey || 'missing-api-key'
})
