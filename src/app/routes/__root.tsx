import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import GlobalNotificationListener from '@/components/GlobalNotificationListener'
import { RouterProgressBar } from '@/components/shared/RouterProgressBar'

export const Route = createRootRoute({
  component: () => (
    <>
      <RouterProgressBar />
      <Outlet />
      <GlobalNotificationListener />
      <Toaster richColors position="top-right" />
    </>
  ),
})
