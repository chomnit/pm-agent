/**
 * In-memory registry for streaming Claude output to SSE clients.
 * Buffers chunks so late subscribers (e.g. page refresh during generation) catch up immediately.
 */

type ChunkCallback = (chunk: string) => void
type DoneCallback = (fullContent: string, error?: string) => void

type StreamEntry = {
  buffer: string
  done: boolean
  error?: string
  chunkCallbacks: ChunkCallback[]
  doneCallbacks: DoneCallback[]
}

const registry = new Map<string, StreamEntry>()

export const initStream = (stageId: string): void => {
  registry.set(stageId, {
    buffer: '',
    done: false,
    chunkCallbacks: [],
    doneCallbacks: []
  })
}

export const emitChunk = (stageId: string, chunk: string): void => {
  const entry = registry.get(stageId)
  if (!entry) return
  entry.buffer += chunk
  entry.chunkCallbacks.forEach((cb) => cb(chunk))
}

export const emitDone = (stageId: string, error?: string): void => {
  const entry = registry.get(stageId)
  if (!entry) return
  entry.done = true
  entry.error = error
  const content = entry.buffer
  entry.doneCallbacks.forEach((cb) => cb(content, error))
  // Keep entry briefly so any in-flight SSE connections receive the done event
  setTimeout(() => registry.delete(stageId), 10_000)
}

export const subscribe = (
  stageId: string,
  onChunk: ChunkCallback,
  onDone: DoneCallback
): (() => void) => {
  const entry = registry.get(stageId)
  if (!entry) return () => {}

  // Send everything buffered so far so late subscribers catch up immediately
  if (entry.buffer) {
    onChunk(entry.buffer)
  }

  if (entry.done) {
    onDone(entry.buffer, entry.error)
    return () => {}
  }

  entry.chunkCallbacks.push(onChunk)
  entry.doneCallbacks.push(onDone)

  return () => {
    const e = registry.get(stageId)
    if (!e) return
    e.chunkCallbacks = e.chunkCallbacks.filter((cb) => cb !== onChunk)
    e.doneCallbacks = e.doneCallbacks.filter((cb) => cb !== onDone)
  }
}

export const isStreaming = (stageId: string): boolean => registry.has(stageId)
