import { GradeForm } from './GradeForm'
import { useGradeForm } from './useGradeForm'

export function GradeFormContainer({ examId, employeeId }: { examId: string; employeeId: string }) {
  const { form, onSubmit, isSubmitting } = useGradeForm(examId, employeeId)
  return <GradeForm form={form} onSubmit={onSubmit} isSubmitting={isSubmitting} />
}

export { GradeForm }
