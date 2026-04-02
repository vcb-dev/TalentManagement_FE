import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { EmployeeFormContainer } from '@/features/hr-admin/components/EmployeeForm'
import { requireHrAdmin } from '@/features/hr-admin/requireHrAdmin'

export const Route = createFileRoute('/_protected/hr-admin/new')({
  beforeLoad: () => {
    requireHrAdmin()
  },
  component: NewEmployeePage,
})

function NewEmployeePage() {
  const navigate = useNavigate()
  return (
    <EmployeeFormContainer
      onSuccess={() => void navigate({ to: '/hr-admin', search: { page: 1 } })}
    />
  )
}
