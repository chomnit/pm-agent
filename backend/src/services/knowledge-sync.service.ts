import { claude } from '../config/claude'
import * as syncModel from '../models/knowledge-sync.model'
import { findByProjectId } from '../models/feature.model'
import type { ProjectFeature } from '../models/feature.model'

export interface IncomingTicket {
  title: string
  description: string
}

type Classification = {
  ticketIndex: number
  featureName: string
  confidence: 'high' | 'medium' | 'low'
}

// Pass 1: classify every ticket against the feature list in one call
async function classifyTickets(
  features: ProjectFeature[],
  tickets: IncomingTicket[]
): Promise<Classification[]> {
  const featureList = features
    .map((f, i) => `${i + 1}. "${f.name}" — ${f.description.slice(0, 120)}`)
    .join('\n')

  const ticketList = tickets
    .map((t, i) => `${i + 1}. "${t.title}"${t.description ? `: ${t.description.slice(0, 200)}` : ''}`)
    .join('\n')

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: `You are classifying Jira release tickets to product knowledge-base features for a fintech product.

EXISTING FEATURES:
${featureList}

TICKETS TO CLASSIFY (${tickets.length} total):
${ticketList}

Rules:
- Match each ticket to the single best feature by its exact name from the list above.
- Use "__new__" when the ticket clearly describes a brand-new product area not covered by any existing feature.
- Use "__skip__" for pure bug fixes, test coverage, CI/CD, refactoring, or infrastructure tickets with zero product-feature impact.
- A ticket may only be assigned to one feature.

Return ONLY valid JSON with no markdown, no explanation:
{
  "classifications": [
    {"ticketIndex": 0, "featureName": "exact name from list, __new__, or __skip__", "confidence": "high"},
    ...one entry per ticket...
  ]
}`
    }]
  })

  const raw = (response.content[0] as any).text as string
  const match = raw.match(/\{[\s\S]*\}/)
  const json = JSON.parse(match ? match[0] : raw)
  return json.classifications as Classification[]
}

// Pass 2: generate field-level update proposal for one feature
async function generateProposal(
  feature: ProjectFeature,
  tickets: IncomingTicket[]
): Promise<{
  proposedChanges: Record<string, any>
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}> {
  const ticketList = tickets
    .map((t, i) => `${i + 1}. "${t.title}"${t.description ? `: ${t.description}` : ''}`)
    .join('\n')

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are updating a product knowledge-base entry for a fintech application.

FEATURE: "${feature.name}"
Current description: ${feature.description}
Current functionality: ${feature.functionality || '(none)'}
Current user roles: ${(feature.userRoles || []).join(', ') || '(none)'}
Current integrations: ${(feature.integrations || []).join(', ') || '(none)'}
Current limitations: ${feature.limitations || '(none)'}
Current tags: ${(feature.tags || []).join(', ') || '(none)'}

NEW JIRA TICKETS RELATED TO THIS FEATURE:
${ticketList}

Based strictly on these tickets, propose updated values for any fields that need to change.
Do NOT invent information not supported by the tickets.
Only include fields that genuinely need updating — omit unchanged fields entirely.

Return ONLY valid JSON with no markdown:
{
  "proposedChanges": {
    "description": "only if needs updating",
    "functionality": "only if needs updating",
    "userRoles": ["only","if","changed"],
    "integrations": ["only","if","changed"],
    "limitations": "only if needs updating",
    "tags": ["only","if","changed"]
  },
  "reasoning": "1–2 sentence summary of what changed and why",
  "confidence": "high | medium | low"
}`
    }]
  })

  const raw = (response.content[0] as any).text as string
  const match = raw.match(/\{[\s\S]*\}/)
  const json = JSON.parse(match ? match[0] : raw)
  return json
}

export async function runKnowledgeSync(
  sessionId: string,
  projectId: string,
  tickets: IncomingTicket[]
): Promise<void> {
  try {
    const features = await findByProjectId(projectId)

    if (features.length === 0) {
      await syncModel.updateSessionStatus(sessionId, 'completed', {
        proposalCount: 0,
        unmatchedCount: tickets.length,
        unmatchedTickets: tickets,
      })
      return
    }

    // ── Pass 1: classify all tickets ─────────────────────────────────────────
    const classifications = await classifyTickets(features, tickets)

    const byFeature = new Map<string, IncomingTicket[]>()
    const unmatched: IncomingTicket[] = []

    for (const c of classifications) {
      const ticket = tickets[c.ticketIndex]
      if (!ticket) continue
      if (c.featureName === '__skip__') continue
      if (c.featureName === '__new__') { unmatched.push(ticket); continue }

      const list = byFeature.get(c.featureName) ?? []
      list.push(ticket)
      byFeature.set(c.featureName, list)
    }

    // ── Pass 2: generate proposals in parallel (batches of 5) ────────────────
    const entries = [...byFeature.entries()]
    let proposalCount = 0
    const CONCURRENCY = 5

    for (let i = 0; i < entries.length; i += CONCURRENCY) {
      const batch = entries.slice(i, i + CONCURRENCY)

      await Promise.allSettled(
        batch.map(async ([featureName, matchedTickets]) => {
          const feature = features.find(f => f.name === featureName)
          if (!feature) return

          let result: Awaited<ReturnType<typeof generateProposal>>
          try {
            result = await generateProposal(feature, matchedTickets)
          } catch (err) {
            console.error(`[sync] proposal failed for "${featureName}":`, err)
            return
          }

          if (!result.proposedChanges || Object.keys(result.proposedChanges).length === 0) return

          const currentSnapshot = {
            description: feature.description,
            functionality: feature.functionality,
            userRoles: feature.userRoles,
            integrations: feature.integrations,
            limitations: feature.limitations,
            tags: feature.tags,
          }

          await syncModel.createProposal({
            sessionId,
            projectId,
            featureId: feature.id,
            featureName: feature.name,
            currentSnapshot,
            proposedChanges: result.proposedChanges,
            matchedTickets,
            reasoning: result.reasoning ?? null,
            confidence: result.confidence ?? 'medium',
          })

          proposalCount++
        })
      )
    }

    await syncModel.updateSessionStatus(sessionId, 'completed', {
      proposalCount,
      unmatchedCount: unmatched.length,
      unmatchedTickets: unmatched,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sync] session failed:', message)
    await syncModel.updateSessionStatus(sessionId, 'failed', { errorMessage: message })
  }
}
