import type { ReactNode } from 'react'
import type { Action, Resource } from '@/types/auth'
import { usePermission } from '@/hooks/usePermission'

export type PermissionGateProps =
  | {
      permissionId: string
      action?: never
      resource?: never
      fallback?: ReactNode
      children: ReactNode
    }
  | {
      action: Action
      resource: Resource
      permissionId?: never
      fallback?: ReactNode
      children: ReactNode
    }

export function PermissionGate(props: PermissionGateProps) {
  const { can, canId } = usePermission()
  const { fallback = null, children } = props
  const ok =
    'permissionId' in props && props.permissionId
      ? canId(props.permissionId)
      : can(props.action!, props.resource!)
  return ok ? <>{children}</> : <>{fallback}</>
}
