import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExamResultsSchedule } from '@/features/exam/components/ExamResultsSchedule'
import { ManagedClassesExamTable } from '@/features/exam/components/ManagedClassesExamTable'
import { useExams, useMySubmissions } from '@/features/exam/hooks'
import { useMyEnrolledClass } from '@/features/learning-path/hooks'
import { useTeacherClassDetail, useTeacherClasses } from '@/features/teacher/hooks'
import type { z } from 'zod'
import { examSummaryApiSchema } from '@/features/exam/schemas'

export const Route = createFileRoute('/_protected/exam/')({
  component: ExamIndexPage,
})

type ExamRow = z.infer<typeof examSummaryApiSchema>

function ExamIndexPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'mine' | 'managed'>('mine')
  const [managedClassId, setManagedClassId] = useState('')
  const pageSize = 20
  const { data, isLoading } = useExams({ page, pageSize }, viewMode === 'mine')
  const { data: mySubmissions } = useMySubmissions(viewMode === 'mine')
  const { data: myClassData } = useMyEnrolledClass(undefined, viewMode === 'mine')
  const { data: managedClasses = [], isLoading: isManagedLoading } = useTeacherClasses(
    viewMode === 'managed'
  )

  useEffect(() => {
    setPage(1)
  }, [viewMode])

  useEffect(() => {
    if (viewMode !== 'managed') return
    if (managedClassId) return
    setManagedClassId(managedClasses[0]?.id ?? '')
  }, [viewMode, managedClassId, managedClasses])

  const { data: managedDetail } = useTeacherClassDetail(managedClassId, viewMode === 'managed')

  const managedSelectedExam = useMemo<ExamRow[]>(() => {
    if (!managedClassId) return []
    const cls = managedClasses.find((c) => c.id === managedClassId)
    if (!cls?.examDate) return []
    const ms = new Date(cls.examDate).getTime()
    const nowMs = new Date().getTime()
    return [
      {
        id: cls.id,
        title: `${cls.name} (Lớp phụ trách)`,
        scheduledAt: cls.examDate,
        status: ms <= nowMs ? 'IN_PROGRESS' : 'UPCOMING',
      },
    ]
  }, [managedClassId, managedClasses])

  return (
    <>
      <PageHeader
        title="Kết quả & Lịch thi"
        description="Theo dõi lộ trình đào tạo, lịch kiểm tra năng lực và kết quả các kỳ thi nội bộ tại VCB."
      />
      <div className="mb-4 flex items-center gap-2">
        <Button
          type="button"
          variant={viewMode === 'mine' ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'rounded-lg border px-3 py-1.5 text-sm font-semibold',
            viewMode === 'mine' ? 'border-primary' : 'border-border bg-card hover:bg-muted'
          )}
          onClick={() => setViewMode('mine')}
        >
          Lịch thi của tôi
        </Button>
        <Button
          type="button"
          variant={viewMode === 'managed' ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'rounded-lg border px-3 py-1.5 text-sm font-semibold',
            viewMode === 'managed' ? 'border-primary' : 'border-border bg-card hover:bg-muted'
          )}
          onClick={() => setViewMode('managed')}
        >
          Lịch thi của lớp phụ trách
        </Button>
      </div>
      {viewMode === 'managed' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ManagedClassesExamTable classes={managedClasses} isLoading={isManagedLoading} />
        </div>
      ) : (
        <ExamResultsSchedule
          exams={data?.data ?? []}
          total={data?.total ?? 0}
          totalPages={data?.totalPages ?? 1}
          page={data?.page ?? page}
          isLoading={isLoading}
          onPageChange={setPage}
          onOpenExam={(id, isSubmission, scheduleId) => {
            if (isSubmission) {
              void navigate({
                to: '/exam/submission/$submissionId',
                params: { submissionId: id },
              } as any)
            } else {
              void navigate({
                to: '/exam/$examId/result',
                params: { examId: id },
                search: { scheduleId } as any,
              } as any)
            }
          }}
          myEnrolledClassId={myClassData?.enrolledClass?.id ?? undefined}
          mySubmissions={mySubmissions ?? undefined}
          enrolledClassHasQuestions={!!myClassData?.enrolledClass?.examQuestions}
        />
      )}
    </>
  )
}
