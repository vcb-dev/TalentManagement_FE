import { createFileRoute, redirect } from '@tanstack/react-router'
import { GuestLandingPage } from '@/features/landing/GuestLandingPage'
import { ensureSessionFromCookie } from '@/features/auth/sessionBootstrap'
import { defaultEntryPathFromSession } from '@/lib/routeGuards'
import { useAuthStore } from '@/stores/auth.store'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    await ensureSessionFromCookie()
    const { accessToken: token, user } = useAuthStore.getState()
    if (!user && !token) return
    const to = defaultEntryPathFromSession(user ?? undefined)
    if (to === '/hr-admin') throw redirect({ to: '/hr-admin', search: { page: 1, pageSize: 15 } })
    throw redirect({ to })
  },
  component: GuestLandingPage,
})
