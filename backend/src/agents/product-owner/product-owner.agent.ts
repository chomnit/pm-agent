import Anthropic from '@anthropic-ai/sdk'
import { claude } from '../../config/claude'
import { buildContext } from '../../services/context.service'
import * as streamRegistry from '../../services/stream-registry.service'
import { findById as findStageById, updateStatus } from '../../models/stage.model'
import { findById as findTicketById } from '../../models/ticket.model'
import {
  findByStageId as findDraftsByStageId,
  findLatestByStageId,
  create as createDraft
} from '../../models/draft.model'
import { findByStageId as findFeedbackByStageId } from '../../models/feedback.model'
import { getApiKey } from '../../models/user.model'

export const run = async (stageId: string, triggeredBy: string): Promise<void> => {
  const stage = await findStageById(stageId)
  if (!stage) throw new Error('Stage not found')

  const ticket = await findTicketById(stage.ticketId)
  if (!ticket) throw new Error('Ticket not found')

  const baseContext = await buildContext(stage.ticketId, ticket.projectId)

  // Append revision history when re-running
  const [allDrafts, allFeedback] = await Promise.all([
    findDraftsByStageId(stageId),
    findFeedbackByStageId(stageId)
  ])

  let revisionSection = ''
  if (allDrafts.length > 0) {
    // Only include the latest draft + its feedback to avoid multiplicative token growth
    // across revision cycles. Earlier drafts add no new signal once feedback is captured.
    const latestDraft = allDrafts[allDrafts.length - 1]
    const latestFeedback = allFeedback.filter((f) => f.draftId === latestDraft.id)

    revisionSection =
      `\n\n[PREVIOUS DRAFT (v${latestDraft.versionNumber})]\n${latestDraft.content}`

    if (latestFeedback.length > 0) {
      revisionSection +=
        `\n\n[REVIEWER FEEDBACK - Address every point below]\n` +
        latestFeedback.map((f) => f.feedbackText).join('\n\n')
    }

    revisionSection += `\n\n[YOUR TASK]\nProduce an improved draft that fully addresses all feedback above.`
  }

  const systemPrompt = baseContext + revisionSection

  const latestDraft = await findLatestByStageId(stageId)
  const nextVersion = latestDraft ? latestDraft.versionNumber + 1 : 1

  // Use the triggering user's stored API key if available, fall back to global
  const userApiKey = await getApiKey(triggeredBy)
  const client = userApiKey ? new Anthropic({ apiKey: userApiKey }) : claude

  let fullContent = ''

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: 'Produce your output now.' }]
  })

  stream.on('text', (text: string) => {
    fullContent += text
    streamRegistry.emitChunk(stageId, text)
  })

  const finalMessage = await stream.finalMessage()

  await createDraft({
    stageId,
    versionNumber: nextVersion,
    content: fullContent,
    promptUsed: systemPrompt,
    modelUsed: finalMessage.model,
    tokensUsed: (finalMessage.usage.input_tokens ?? 0) + (finalMessage.usage.output_tokens ?? 0)
  })

  await updateStatus(stageId, 'in_review')
}
