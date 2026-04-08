import { requireRole } from '@/lib/routeGuards'

export function requireBodOrManager() {
  requireRole('BOD', 'MANAGER')
}
