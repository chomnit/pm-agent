import { findById as findStageById, findByTicketId, incrementRunCount, updateStatus } from '../models/stage.model'
import { findById as findTicketById, updateCurrentStage, updateStatus as updateTicketStatus } from '../models/ticket.model'
import * as productOwnerAgent from '../agents/product-owner/product-owner.agent'
import * as streamRegistry from './stream-registry.service'

export const runAgent = async (stageId: string, triggeredBy: string): Promise<void> => {
  const stage = await findStageById(stageId)
  if (!stage) {
    throw new Error('Stage not found')
  }

  if (stage.status !== 'pending' && stage.status !== 'needs_revision') {
    throw new Error('Stage can only run from pending or needs_revision state')
  }

  await updateStatus(stage.id, 'running')
  await incrementRunCount(stage.id)

  try {
    await productOwnerAgent.run(stageId, triggeredBy)
  } catch (error) {
    await updateStatus(stage.id, 'needs_revision')
    throw error
  }
}

export const runAllAgents = async (ticketId: string, triggeredBy: string): Promise<void> => {
  const ticket = await findTicketById(ticketId)
  if (!ticket) throw new Error('Ticket not found')

  if (ticket.status !== 'backlog' && ticket.status !== 'review') {
    throw new Error('Ticket must be in backlog or review state to run agents')
  }

  const stages = await findByTicketId(ticketId)
  const stage = stages.find((s) => s.stageType === 'analysis')
  if (!stage) throw new Error('Analysis stage not found for ticket')

  await updateStatus(stage.id, 'pending')
  await updateCurrentStage(ticketId, 'analysis')
  await updateTicketStatus(ticketId, 'in_progress')

  try {
    await runAgent(stage.id, triggeredBy)
    // All DB updates done — now move ticket to review and signal SSE done
    await updateTicketStatus(ticketId, 'review')
    streamRegistry.emitDone(stage.id)
  } catch (error) {
    console.error('Agent run failed:', error)
    await updateTicketStatus(ticketId, 'review')
    throw error
  }
}
