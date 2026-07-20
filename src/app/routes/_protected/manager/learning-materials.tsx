import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireManagerLikeOrPermissionPrefixes } from '@/lib/routeGuards'
import { ManagerLearningMaterialsScreen } from '@/features/learning-materials/components/ManagerLearningMaterialsScreen'

export const Route = createFileRoute('/_protected/manager/learning-materials')({
  beforeLoad: () => {
    requireManagerLikeOrPermissionPrefixes(['manager.'])
    requirePermissionPrefix('manager.')
  },
  component: ManagerLearningMaterialsScreen,
})
