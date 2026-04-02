import { useMachine } from '@xstate/react'
import { useMemo } from 'react'
import type { ChecklistItem } from '@/types/learning'
import { checklistMachine } from '../../machines/checklistMachine'

export function useChecklistItem(items: ChecklistItem[], completedIds: string[]) {
  const input = useMemo(
    () => ({
      items,
      currentIndex: completedIds.length,
      completedIds: [...completedIds],
      submittingId: null as string | null,
    }),
    [items, completedIds]
  )

  const [state, send] = useMachine(checklistMachine, { input })

  const isUnlocked = (itemId: string) => {
    const idx = items.findIndex((i) => i.id === itemId)
    return idx <= state.context.currentIndex && idx >= 0
  }

  const isCompleted = (itemId: string) => state.context.completedIds.includes(itemId)

  const isAllCompleted = state.context.currentIndex >= items.length && items.length > 0

  return { state, send, isUnlocked, isCompleted, isAllCompleted }
}
