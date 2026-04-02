import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { ExamList } from '@/features/exam/components/ExamList'
import { useExams } from '@/features/exam/hooks'

export const Route = createFileRoute('/_protected/exam/')({
  component: ExamIndexPage,
})

function ExamIndexPage() {
  const navigate = useNavigate()
  const filters = { page: 1, pageSize: 20 }
  const { data, isLoading } = useExams(filters)
  return (
    <>
      <PageHeader title="Kỳ thi" />
      <ExamList
        exams={data?.data ?? []}
        isLoading={isLoading}
        onOpen={(id) => void navigate({ to: '/exam/$examId/result', params: { examId: id } })}
      />
    </>
  )
}
