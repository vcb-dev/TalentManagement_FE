import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { DashboardSkeleton } from '@/components/ui/skeleton'

const EmployeeLearningDashboard = lazy(() =>
  import('@/features/employee-dashboard').then((module) => ({
    default: module.EmployeeLearningDashboard,
  }))
)

export const Route = createFileRoute('/_protected/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EmployeeLearningDashboard />
    </Suspense>
  )
}
