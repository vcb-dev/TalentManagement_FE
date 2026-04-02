import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { ExamHistory } from '@/features/exam/components/ExamHistory'
import { ClassifyResultContainer } from '@/features/exam/components/ClassifyResult'
import { useExamResults } from '@/features/exam/hooks'

export const Route = createFileRoute('/_protected/exam/$examId/result')({
  component: ExamResultPage,
})

function ExamResultPage() {
  const { examId } = Route.useParams()
  const { data, isLoading } = useExamResults(examId)
  const employeeId = '00000000-0000-4000-8000-000000000001'
  return (
    <>
      <PageHeader title="Kết quả kỳ thi" />
      <ExamHistory rows={data ?? []} isLoading={isLoading} />
      <div className="mt-6 max-w-lg">
        <ClassifyResultContainer examId={examId} employeeId={employeeId} />
      </div>
    </>
  )
}
