import { createFileRoute } from '@tanstack/react-router'
import { MyDashboardScreenContainer } from '@/features/dashboard'

export const Route = createFileRoute('/_protected/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return <MyDashboardScreenContainer />
}
