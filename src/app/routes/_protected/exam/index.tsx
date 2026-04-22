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
  const { data: mySubmissions } = useMySubmissions()
  const { data: myClassData } = useMyEnrolledClass()
  const {
    data: managedClasses = [],
    isLoading: isManagedLoading,
    isError: isManagedError,
  } = useTeacherClasses(viewMode === 'managed')

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
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Chọn lớp:</span>
          <Select
            value={managedClassId || '__none'}
            onValueChange={(value) => setManagedClassId(value === '__none' ? '' : value)}
            disabled={managedClasses.length === 0}
          >
            <SelectTrigger className="h-9 min-w-[260px] rounded-lg border border-border bg-background px-3 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {managedClasses.length === 0 ? (
                <SelectItem value="__none">Không có lớp phụ trách</SelectItem>
              ) : (
                managedClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.memberCount} thành viên)
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {viewMode === 'managed' && isManagedError ? (
        <p className="mb-4 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          Bạn chưa có quyền hoặc chưa phụ trách lớp nào.
        </p>
      ) : null}
      <ExamResultsSchedule
        exams={viewMode === 'mine' ? (data?.data ?? []) : managedSelectedExam}
        total={viewMode === 'mine' ? (data?.total ?? 0) : managedSelectedExam.length}
        totalPages={viewMode === 'mine' ? (data?.totalPages ?? 1) : 1}
        page={viewMode === 'mine' ? (data?.page ?? page) : page}
        isLoading={viewMode === 'mine' ? isLoading : isManagedLoading}
        onPageChange={setPage}
        onOpenExam={(id, isSubmission) => {
          if (isSubmission) {
            void navigate({ to: '/exam/submission/$submissionId', params: { submissionId: id } })
          } else {
            void navigate({ to: '/exam/$examId/result', params: { examId: id } })
          }
        }}
        myEnrolledClassId={
          viewMode === 'mine' ? (myClassData?.enrolledClass?.id ?? undefined) : undefined
        }
        membersInClass={viewMode === 'managed' ? (managedDetail?.members ?? []) : undefined}
        membersTitle={viewMode === 'managed' ? 'Thành viên trong lớp' : undefined}
        mySubmissions={viewMode === 'mine' ? (mySubmissions ?? undefined) : undefined}
        enrolledClassHasQuestions={!!myClassData?.enrolledClass?.examQuestions}
      />
    </>
  )
}
