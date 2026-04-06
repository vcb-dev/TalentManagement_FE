import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ExamResultsSchedule } from '@/features/exam/components/ExamResultsSchedule'
import { useExams } from '@/features/exam/hooks'

export const Route = createFileRoute('/_protected/exam/')({
  component: ExamIndexPage,
})

function ExamIndexPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const pageSize = 20
  const { data, isLoading } = useExams({ page, pageSize })

  return (
    <>
      <PageHeader
        title="Kết quả & Lịch thi"
        description="Theo dõi lộ trình đào tạo, lịch kiểm tra năng lực và kết quả các kỳ thi nội bộ tại VCB."
      />
      <ExamResultsSchedule
        exams={data?.data ?? []}
        total={data?.total ?? 0}
        totalPages={data?.totalPages ?? 1}
        page={data?.page ?? page}
        isLoading={isLoading}
        onPageChange={setPage}
        onOpenExam={(id) => void navigate({ to: '/exam/$examId/result', params: { examId: id } })}
      />
    </>
  )
}
