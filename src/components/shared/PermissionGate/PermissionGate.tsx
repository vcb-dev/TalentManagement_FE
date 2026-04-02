import type { ReactNode } from 'react'
import type { Action, Resource } from '@/types/auth'
import { usePermission } from '@/hooks/usePermission'

export interface PermissionGateProps {
  action: Action
  resource: Resource
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGate({ action, resource, fallback = null, children }: PermissionGateProps) {
  const { can } = usePermission()
  return can(action, resource) ? <>{children}</> : <>{fallback}</>
}
