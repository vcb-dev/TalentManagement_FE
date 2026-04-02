import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { type z } from 'zod'
import { gradeFormSchema } from '@/features/exam/schemas'
import { useGradeExam } from '@/features/exam/hooks'

export type GradeFormValues = z.infer<typeof gradeFormSchema>

export function useGradeForm(examId: string, employeeId: string) {
  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: { score: 0, note: '' },
  })
  const grade = useGradeExam()
  const onSubmit = (v: GradeFormValues) => {
    grade.mutate({ examId, employeeId, score: v.score, note: v.note })
  }
  return { form, onSubmit, isSubmitting: grade.isPending }
}
