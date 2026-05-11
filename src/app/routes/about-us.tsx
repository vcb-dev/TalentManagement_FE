import { createFileRoute } from '@tanstack/react-router'
import { AboutUsPage } from '@/features/landing/AboutUsPage'
import { ensureSessionFromCookie } from '@/features/auth/sessionBootstrap'

export const Route = createFileRoute('/about-us')({
  beforeLoad: async () => {
    await ensureSessionFromCookie()
  },
  component: AboutUsPage,
})
