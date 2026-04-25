export const useAgent = () => {
  const config = useRuntimeConfig()
  const base = config.public.apiBase
  const apiFetch = useApiFetch()

  const runAgent = (stageId: string) =>
    apiFetch(`${base}/api/stages/${stageId}/run`, { method: 'POST' })

  const runAllAgents = (ticketId: string) =>
    apiFetch(`${base}/api/tickets/${ticketId}/run`, { method: 'POST' })

  const saveReviewNotes = (ticketId: string, notes: string) =>
    apiFetch(`${base}/api/tickets/${ticketId}/review-notes`, {
      method: 'PATCH',
      body: { notes }
    })

  const pollStageStatus = (stageId: string, onComplete: (stage: any) => void) => {
    const id = setInterval(async () => {
      try {
        const res: any = await apiFetch(`${base}/api/stages/${stageId}`)
        const stage = res.data ?? res
        if (stage.status !== 'running') {
          clearInterval(id)
          onComplete(stage)
        }
      } catch {
        clearInterval(id)
      }
    }, 3000)
    return () => clearInterval(id)
  }

  const pollTicketStatus = (ticketId: string, onUpdate: (ticket: any) => void, onComplete: (ticket: any) => void) => {
    const id = setInterval(async () => {
      try {
        const res: any = await apiFetch(`${base}/api/tickets/${ticketId}`)
        const ticket = res.data ?? res
        onUpdate(ticket)
        if (ticket.status !== 'in_progress') {
          clearInterval(id)
          onComplete(ticket)
        }
      } catch {
        clearInterval(id)
      }
    }, 3000)
    return () => clearInterval(id)
  }

  const submitFeedback = (stageId: string, feedbackText: string) =>
    apiFetch(`${base}/api/stages/${stageId}/feedback`, {
      method: 'POST',
      body: { feedbackText }
    })

  const approveStage = (stageId: string) =>
    apiFetch(`${base}/api/stages/${stageId}/approve`, { method: 'POST' })

  const assignReviewer = (stageId: string, assignedTo: string) =>
    apiFetch(`${base}/api/stages/${stageId}/assign`, {
      method: 'POST',
      body: { assignedTo }
    })

  const connectStream = (
    stageId: string,
    onChunk: (text: string) => void,
    onDone: (error?: string) => void
  ): (() => void) => {
    const es = new EventSource(`${base}/api/stages/${stageId}/stream`, { withCredentials: true })

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'chunk') {
          onChunk(data.text)
        } else if (data.type === 'done') {
          es.close()
          onDone(data.error ?? undefined)
        }
      } catch { /* ignore malformed events */ }
    }

    es.onerror = () => { es.close(); onDone('Connection lost. Please try again.') }

    return () => es.close()
  }

  const fetchDiagrams = (stageId: string) =>
    apiFetch<{ data: any[] }>(`${base}/api/stages/${stageId}/diagrams`)

  const pollDiagrams = (
    stageId: string,
    onReady: (diagrams: any[]) => void,
    timeoutMs = 90_000
  ): (() => void) => {
    let stopped = false
    const timeoutId = setTimeout(() => { stopped = true }, timeoutMs)

    const poll = async () => {
      if (stopped) return
      try {
        const res = await fetchDiagrams(stageId)
        const list = res.data ?? []
        if (list.length > 0) {
          stopped = true
          clearTimeout(timeoutId)
          onReady(list)
        } else {
          setTimeout(poll, 5000)
        }
      } catch {
        setTimeout(poll, 5000)
      }
    }

    setTimeout(poll, 5000)

    return () => {
      stopped = true
      clearTimeout(timeoutId)
    }
  }

  return { runAgent, runAllAgents, saveReviewNotes, pollStageStatus, pollTicketStatus, submitFeedback, approveStage, assignReviewer, connectStream, fetchDiagrams, pollDiagrams }
}
