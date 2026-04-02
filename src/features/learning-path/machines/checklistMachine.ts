import { assign, createMachine } from 'xstate'
import type { ChecklistItem, EvidencePayload } from '@/types/learning'

export interface ChecklistMachineContext {
  items: ChecklistItem[]
  currentIndex: number
  completedIds: string[]
  submittingId: string | null
}

export type ChecklistMachineEvent =
  | { type: 'SUBMIT_EVIDENCE'; itemId: string; evidence: EvidencePayload }
  | { type: 'EVIDENCE_ACCEPTED'; itemId: string }
  | { type: 'EVIDENCE_REJECTED'; itemId: string; reason: string }
  | { type: 'REGISTER_EXAM' }
  | { type: 'RESET' }

export const checklistMachine = createMachine({
  id: 'checklist',
  types: {} as {
    context: ChecklistMachineContext
    events: ChecklistMachineEvent
    input: ChecklistMachineContext
  },
  initial: 'idle',
  context: ({ 
    input 
  }: { 
    input: ChecklistMachineContext 
  }) => input,
  states: {
    idle: {
      on: {
        SUBMIT_EVIDENCE: {
          guard: ({ context, event }) =>
            context.items[context.currentIndex]?.id === event.itemId,
          target: 'submitting',
          actions: assign({
            submittingId: ({ event }) => event.itemId,
          }),
        },
        REGISTER_EXAM: {
          guard: ({ context }) => context.currentIndex >= context.items.length,
        },
        RESET: {
          actions: assign(({ context }) => ({
            ...context,
            currentIndex: 0,
            completedIds: [],
            submittingId: null,
          })),
        },
      },
    },
    submitting: {
      on: {
        EVIDENCE_ACCEPTED: [
          {
            guard: ({ context }) => context.currentIndex + 1 >= context.items.length,
            target: 'allCompleted',
            actions: assign(({ context, event }) => ({
              completedIds: [...context.completedIds, event.itemId],
              currentIndex: context.currentIndex + 1,
              submittingId: null,
            })),
          },
          {
            target: 'idle',
            actions: assign(({ context, event }) => ({
              completedIds: [...context.completedIds, event.itemId],
              currentIndex: context.currentIndex + 1,
              submittingId: null,
            })),
          },
        ],
        EVIDENCE_REJECTED: {
          target: 'idle',
          actions: assign({
            submittingId: null,
          }),
        },
      },
    },
    allCompleted: {
      type: 'final',
    },
  },
})
