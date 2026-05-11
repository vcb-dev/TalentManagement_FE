import { createFileRoute } from '@tanstack/react-router'
import { GuestLandingPage } from '@/features/landing/GuestLandingPage'

export const Route = createFileRoute('/')({
  component: GuestLandingPage,
})
