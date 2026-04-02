import { createFileRoute, redirect } from '@tanstack/react-router'
import { defaultPathForRole } from '@/lib/routeGuards'
import { useAuthStore } from '@/stores/auth.store'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { accessToken: token, user } = useAuthStore.getState()
    if (!token) throw redirect({ to: '/login' })
    if (user?.role === 'HR_ADMIN') throw redirect({ to: '/hr-admin', search: { page: 1 } })
    throw redirect({ to: defaultPathForRole(user?.role) })
  },
})
