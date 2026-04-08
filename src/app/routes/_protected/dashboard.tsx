import { createFileRoute } from '@tanstack/react-router'
import { EmployeeLearningDashboard } from '@/features/employee-dashboard'

export const Route = createFileRoute('/_protected/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return <EmployeeLearningDashboard />
}
