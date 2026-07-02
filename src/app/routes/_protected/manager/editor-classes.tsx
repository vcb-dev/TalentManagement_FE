import { createFileRoute } from '@tanstack/react-router'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { requireManagerLikeOrPermissionPrefixes } from '@/lib/routeGuards'
import { EditorClassesScreen } from '@/features/editor-classes/components/EditorClassesScreen'

export const Route = createFileRoute('/_protected/manager/editor-classes')({
  beforeLoad: () => {
    requireManagerLikeOrPermissionPrefixes(['manager.'])
    requirePermissionPrefix('manager.')
  },
  component: EditorClassesScreen,
})
