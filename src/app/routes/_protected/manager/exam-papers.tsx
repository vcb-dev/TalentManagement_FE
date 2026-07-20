import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireManagerLikeOrPermissionPrefixes } from '@/lib/routeGuards'
import { ExamPapersManagementScreen } from '@/features/exam-papers/components/ExamPapersManagementScreen'

export const Route = createFileRoute('/_protected/manager/exam-papers')({
  beforeLoad: () => {
    requireManagerLikeOrPermissionPrefixes(['manager.'])
    requirePermissionPrefix('manager.')
  },
  component: ExamPapersManagementScreen,
})
