import { ClassifyResult } from './ClassifyResult'
import { useClassifyResult } from './useClassifyResult'

export function ClassifyResultContainer({ examId, employeeId }: { examId: string; employeeId: string }) {
  const { result, setResult, submit, isSubmitting } = useClassifyResult(examId, employeeId)
  return (
    <ClassifyResult value={result} onChange={setResult} onSubmit={submit} disabled={isSubmitting} />
  )
}

export { ClassifyResult }
