import { reactive, watchEffect } from 'vue'

interface CommentAnchor {
  id: string
  anchorTop: number
  cardHeight: number
  resolvedTop: number
}

export const useCommentPositions = () => {
  const anchors = reactive<Map<string, CommentAnchor>>(new Map())

  const recalculate = () => {
    const sorted = [...anchors.values()].sort((a, b) => a.anchorTop - b.anchorTop)
    let cursor = 0
    for (const pos of sorted) {
      const top = Math.max(pos.anchorTop, cursor)
      pos.resolvedTop = top
      cursor = top + (pos.cardHeight || 80) + 8
    }
  }

  watchEffect(() => {
    // Access .size to trigger reactivity when entries are added/removed
    void anchors.size
    // Access each entry's mutable fields to trigger on updates
    for (const a of anchors.values()) {
      void a.anchorTop
      void a.cardHeight
    }
    recalculate()
  })

  const addComment = (id: string, anchorTop: number) => {
    anchors.set(id, { id, anchorTop, cardHeight: 80, resolvedTop: anchorTop })
  }

  const setAnchorTop = (id: string, top: number) => {
    const entry = anchors.get(id)
    if (entry) entry.anchorTop = top
  }

  const setCardHeight = (id: string, height: number) => {
    const entry = anchors.get(id)
    if (entry) entry.cardHeight = height
  }

  const removeComment = (id: string) => {
    anchors.delete(id)
  }

  const clear = () => {
    anchors.clear()
  }

  return { anchors, addComment, setAnchorTop, setCardHeight, removeComment, clear }
}
