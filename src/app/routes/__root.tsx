import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import GlobalNotificationListener from '@/components/GlobalNotificationListener'

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <GlobalNotificationListener />
      <Toaster richColors position="top-right" />
    </>
  ),
})
