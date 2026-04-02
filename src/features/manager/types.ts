import type { z } from 'zod'
import type {
  approvalsPageApiSchema,
  teamMemberProgressApiSchema,
  teamProgressPageApiSchema,
} from '@/features/manager/schemas'

export type TeamMemberProgress = z.infer<typeof teamMemberProgressApiSchema>
export type TeamProgressPage = z.infer<typeof teamProgressPageApiSchema>
export type ApprovalsPage = z.infer<typeof approvalsPageApiSchema>
