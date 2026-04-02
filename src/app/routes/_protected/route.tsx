import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/shared/AppShell'
import { useAuthStore } from '@/stores/auth.store'

export const Route = createFileRoute('/_protected')({
  beforeLoad: () => {
    const token = useAuthStore.getState().accessToken
    if (!token) {
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
