import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/shared/AppShell'
import { ensureSessionFromCookie } from '@/features/auth/sessionBootstrap'
import { useAuthStore } from '@/stores/auth.store'

export const Route = createFileRoute('/_protected')({
  beforeLoad: async () => {
    await ensureSessionFromCookie()
    const { user, accessToken } = useAuthStore.getState()
    if (!user && !accessToken) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '/'
      throw redirect({ to: '/login', search: { redirect: path } })
    }
  },
  component: () => (
    <AppShell title={import.meta.env.VITE_APP_NAME}>
      <Outlet />
    </AppShell>
  ),
})
