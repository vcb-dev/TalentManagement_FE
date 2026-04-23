import { createFileRoute } from '@tanstack/react-router'
import { requireRoleOrPermissionPrefixes } from '@/lib/routeGuards'
import { ManagerGradingScreen } from '@/features/manager/components/ManagerHub/ManagerGradingScreen'

export const Route = createFileRoute('/_protected/exam/grader')({
  beforeLoad: () => {
    requireRoleOrPermissionPrefixes(['TEACHER', 'MANAGER'], ['teacher.', 'manager.'])
  },
  component: ManagerGradingScreen,
})
