import { useState } from 'react'
import type { ExamResultCode } from '@/lib/constants'
import { useClassifyExam } from '@/features/exam/hooks'

export function useClassifyResult(examId: string, employeeId: string) {
  const [result, setResult] = useState<ExamResultCode | undefined>()
  const classify = useClassifyExam()
  const submit = () => {
    if (!result) return
    classify.mutate({ examId, employeeId, result })
  }
  return { result, setResult, submit, isSubmitting: classify.isPending }
}
