import type { z } from 'zod'
import type {
  approvalsPageApiSchema,
  managerClassApiSchema,
  managerMemberOptionApiSchema,
  teamMemberProgressApiSchema,
  teamProgressPageApiSchema,
} from '@/features/manager/schemas'

export type TeamMemberProgress = z.infer<typeof teamMemberProgressApiSchema>
export type TeamProgressPage = z.infer<typeof teamProgressPageApiSchema>
export type ApprovalsPage = z.infer<typeof approvalsPageApiSchema>
export type ManagerClass = z.infer<typeof managerClassApiSchema>
export type ManagerMemberOption = z.infer<typeof managerMemberOptionApiSchema>
