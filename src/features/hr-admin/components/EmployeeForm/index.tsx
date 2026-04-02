import { EmployeeForm } from './EmployeeForm'
import { useEmployeeForm } from './useEmployeeForm'

export function EmployeeFormContainer({ onSuccess }: { onSuccess?: () => void }) {
  const { form, onSubmit, isSubmitting } = useEmployeeForm(onSuccess)
  return <EmployeeForm form={form} onSubmit={onSubmit} isSubmitting={isSubmitting} />
}

export { EmployeeForm }
