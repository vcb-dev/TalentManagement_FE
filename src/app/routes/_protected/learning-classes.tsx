import { createFileRoute } from '@tanstack/react-router'
import { MemberLearningClassesScreen } from '@/features/learning-path/components/MemberLearningClassesScreen'
import { requireAnyPermissionId } from '@/lib/permissionGuards'

export const Route = createFileRoute('/_protected/learning-classes')({
  beforeLoad: () => requireAnyPermissionId('learning.view'),
  component: MemberLearningClassesScreen,
})
