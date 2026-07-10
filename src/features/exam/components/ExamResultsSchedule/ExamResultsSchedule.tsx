import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ArrowRight, Building2, Calendar, Clock, Link2, MapPin, Shield } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ProgressStar } from '@/components/shared/ProgressStar/ProgressStar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Form } from '@/components/ui/form'
import { SelectController } from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
import { PaginationCardStepper } from '@/components/ui/pagination'
import { formatViDate } from '@/lib/date'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import type { z } from 'zod'
import { type examSummaryApiSchema, type examSubmissionApiSchema } from '@/features/exam/schemas'

type ExamRow = z.infer<typeof examSummaryApiSchema>
type ExamSubmission = z.infer<typeof examSubmissionApiSchema>

export interface ExamResultsScheduleProps {
  exams: ExamRow[]
  total: number
  totalPages: number
  page: number
  isLoading: boolean
  onPageChange: (page: number) => void
  onOpenExam: (id: string, isSubmission?: boolean, scheduleId?: string) => void
  myEnrolledClassId?: string
  membersInClass?: Array<{
    userId: string
    name: string
    email: string
    latestResult?: { outcome: string } | null
  }>
  membersTitle?: string
  mySubmissions?: ExamSubmission[]
  enrolledClassHasQuestions?: boolean
}

function formatViWeekdayDate(iso: string): string {
  return format(new Date(iso), 'EEEE, dd/MM/yyyy', { locale: vi })
}

function formatViTime(iso: string): string {
  return format(new Date(iso), 'HH:mm', { locale: vi })
}

function cleanExamTitle(title: string): string {
  return title.replace(/\s*\((?:[a-z_]+\s*->\s*[a-z_]+)\)\s*$/i, '').trim()
}

function outcomeLabel(outcome?: string | null): string {
  if (!outcome) return '—'
  return outcome
}

const STATUS_LABEL: Record<ExamRow['status'], string> = {
  UPCOMING: 'Sắp diễn ra',
  IN_PROGRESS: 'Đang mở',
  COMPLETED: 'Đã hoàn thành',
}

export function ExamResultsSchedule({
  exams,
  total,
  totalPages,
  page,
  isLoading,
  onPageChange,
  onOpenExam,
  myEnrolledClassId,
  membersInClass,
  membersTitle,
  mySubmissions,
  enrolledClassHasQuestions,
}: ExamResultsScheduleProps) {
  const filterForm = useForm<{ yearFilter: string }>({ defaultValues: { yearFilter: 'all' } })
  const yearFilter = useWatch({ control: filterForm.control, name: 'yearFilter' }) ?? 'all'
  const deferredYearFilter = useDeferredValue(yearFilter)
  const [questionBankClassIds, setQuestionBankClassIds] = useState<Set<string>>(new Set())
  const [submittedExamMap, setSubmittedExamMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    try {
      const raw = localStorage.getItem('manager_exam_question_bank_v1')
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        setQuestionBankClassIds(new Set(Object.keys(parsed)))
      }

      const submittedMap = new Map<string, string>()
      // Priority 1: Use API data from props
      if (mySubmissions) {
        if (mySubmissions.length > 0) {
          mySubmissions.forEach((sub) => {
            if (sub.classId) submittedMap.set(sub.classId, sub.id)
            if (sub.scheduleId) submittedMap.set(sub.scheduleId, sub.id)
          })
        }
      }
      // Priority 2: Fallback to localStorage (legacy/offline support)
      else {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('member_exam_submission_v1:')) {
            const id = key.replace('member_exam_submission_v1:', '')
            submittedMap.set(id, id)
          }
        }
      }
      setSubmittedExamMap(submittedMap)
    } catch {
      setQuestionBankClassIds(new Set())
    }
  }, [mySubmissions])

  const { upcoming, completed } = useMemo(() => {
    const u: ExamRow[] = []
    const c: ExamRow[] = []
    for (const e of exams) {
      if (e.status === 'UPCOMING' || e.status === 'IN_PROGRESS') u.push(e)
      else if (e.status === 'COMPLETED') c.push(e)
    }
    return { upcoming: u, completed: c }
  }, [exams])

  const yearOptions = useMemo(() => {
    const years = new Set<number>()
    for (const e of completed) {
      years.add(new Date(e.scheduledAt).getFullYear())
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [completed])

  const filteredCompleted = useMemo(() => {
    if (deferredYearFilter === 'all') return completed
    const y = Number.parseInt(deferredYearFilter, 10)
    return completed.filter((e) => new Date(e.scheduledAt).getFullYear() === y)
  }, [completed, deferredYearFilter])

  // MERGE EVERYTHING: ALL submissions + any completed exams from schedule that don't have submissions
  const combinedResults = useMemo(() => {
    type MergedResult = {
      id: string
      classId?: string | null
      scheduleId?: string | null
      title: string
      date: string
      status: string
      outcome?: string | null
      score?: number | null
      isSubmission: boolean
    }

    // 1. Start with all submissions
    // "started" = mới mở bài, chưa thực sự nộp gì — không được coi là isSubmission,
    // nếu không FE sẽ điều hướng nhầm sang màn xem-kết-quả cho bài chưa ai làm.
    const results: MergedResult[] = [...(mySubmissions || [])].map((s) => ({
      id: s.id, // This is submissionId
      classId: s.classId,
      scheduleId: s.scheduleId,
      title: s.schedule?.topic || s.learningClass?.name || 'Kỳ thi nội bộ',
      date: s.createdAt,
      status: s.status,
      outcome: s.outcome,
      score: s.totalScore,
      isSubmission: s.status !== 'started',
    }))

    // 2. Map scheduled exams and merge into results
    filteredCompleted.forEach((exam) => {
      // Find a match: same scheduleId OR (matching classId and either side has no scheduleId)
      const examClassId = exam.classId || exam.id
      const match = results.find(
        (r) =>
          (exam.scheduleId && r.scheduleId === exam.scheduleId) ||
          (examClassId && r.classId === examClassId && (!r.scheduleId || !exam.scheduleId))
      )

      if (match) {
        // Enhance the existing submission record with info from the schedule
        if ((!match.title || match.title === 'Kỳ thi nội bộ') && exam.title) {
          match.title = exam.title
        }
        if (!match.scheduleId && exam.scheduleId) {
          match.scheduleId = exam.scheduleId
        }
        // Ensure classId is synced if missing
        if (!match.classId && examClassId) {
          match.classId = examClassId
        }
        // Sync score and outcome from ExamAttempt if missing in submission
        if (match.score === null && exam.score !== undefined) {
          match.score = exam.score
        }
        if (!match.outcome && exam.outcome) {
          match.outcome = exam.outcome
        }
        // IMPORTANT: Prioritize the submissionId from the schedule if the submission match doesn't have it correct
        if (exam.submissionId) {
          match.id = exam.submissionId
          match.isSubmission = true
        }
      } else {
        // No submission found for this exam, add as a "Not Taken" or "Historical" row
        results.push({
          id: exam.submissionId || exam.id, // Use submissionId if backend found one
          classId: examClassId,
          scheduleId: exam.scheduleId,
          title: exam.title,
          date: exam.scheduledAt,
          status: exam.status === 'COMPLETED' ? 'done' : 'NOT_TAKEN',
          outcome: exam.outcome ?? null,
          score: exam.score ?? null,
          isSubmission: !!exam.submissionId, // If backend gave us an ID, treat as submission
        })
      }
    })

    // 3. Sort by date descending
    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [mySubmissions, filteredCompleted])

  const upcomingShow = upcoming

  if (isLoading) {
    return (
      <div className="space-y-10 text-sm text-foreground">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Skeleton className="min-h-[280px] rounded-xl" />
            <Skeleton className="min-h-[280px] rounded-xl" />
            <Skeleton className="min-h-[280px] rounded-xl" />
          </div>
        </section>
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-7 w-56 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-8 w-48 rounded-lg" />
          </div>
        </section>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 text-sm text-foreground">
      {/* Lịch thi sắp tới */}
      <section id="lich-thi-sap-toi" className="scroll-mt-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight text-foreground">Lịch thi sắp tới</h2>
          </div>
          <a
            href="#ket-qua-thi-da-dat"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Xem tất cả
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {exams.map((exam, idx) => {
            const Icon = idx % 2 === 0 ? Building2 : Shield
            const isOptional = idx % 2 === 1
            const hasQuestionBank =
              exam.hasQuestions ||
              questionBankClassIds.has(exam.id) ||
              (myEnrolledClassId === exam.id && enrolledClassHasQuestions) ||
              (myEnrolledClassId ? questionBankClassIds.has(myEnrolledClassId) : false)
            const submissionId = exam.submissionId
            const isSubmitted = !!submissionId
            const isStarted =
              exam.status === 'IN_PROGRESS' || new Date() >= new Date(exam.scheduledAt)
            const canOpenExam =
              exam.status === 'COMPLETED' || isSubmitted || (hasQuestionBank && isStarted)
            const actionLabel =
              exam.status === 'COMPLETED' || isSubmitted
                ? 'Xem bài làm'
                : !hasQuestionBank
                  ? 'Chưa có bài thi'
                  : isStarted
                    ? 'Vào làm bài'
                    : 'Chưa đến giờ thi'
            return (
              <div
                key={exam.id}
                className={cn(
                  'group relative overflow-hidden rounded-xl border border-border bg-muted/40 p-6 shadow-sm transition-all duration-300 hover:shadow-md',
                  CARD_ENTRANCE_HOVER
                )}
              >
                <div className="absolute right-0 top-0 p-4">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider',
                      isOptional
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-primary-100 text-primary-700'
                    )}
                  >
                    {isOptional ? 'Tự chọn' : 'Bắt buộc'}
                  </span>
                </div>
                <div className="mb-6">
                  <Icon className="mb-4 block h-9 w-9 text-primary" strokeWidth={2} aria-hidden />
                  <h3 className="mb-2 text-lg font-bold leading-tight text-foreground">
                    {cleanExamTitle(exam.title)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {STATUS_LABEL[exam.status]} · {formatViWeekdayDate(exam.scheduledAt)}
                  </p>
                </div>
                <div className="mb-8 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>{formatViWeekdayDate(exam.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>Bắt đầu {formatViTime(exam.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>Theo lịch hệ thống VCB HRM</span>
                  </div>
                </div>
                {!membersInClass && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (canOpenExam) {
                        onOpenExam(
                          isSubmitted ? submissionId! : exam.id,
                          isSubmitted,
                          exam.scheduleId ?? undefined
                        )
                      }
                    }}
                    disabled={!canOpenExam}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-lg border-0 py-3 text-base font-bold text-white shadow-sm transition-all',
                      'vcb-cta-exam-gradient hover:bg-transparent hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70'
                    )}
                  >
                    {actionLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            )
          })}

          {null}
        </div>
      </section>

      {/* Kết quả / Thành viên */}
      <section id="ket-qua-thi-da-dat" className="scroll-mt-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 shrink-0 rounded-full bg-brand-tertiary" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {membersInClass ? membersTitle || 'Thành viên trong lớp' : 'Kết quả thi'}
            </h2>
          </div>
          {membersInClass ? null : (
            <Form {...filterForm}>
              <SelectController
                control={filterForm.control}
                name="yearFilter"
                label="Lọc theo năm"
                labelClassName="sr-only"
                className="inline-flex"
                triggerClassName="rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm font-medium text-foreground shadow-sm"
              >
                <SelectItem value="all">Tất cả</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Năm {y}
                  </SelectItem>
                ))}
              </SelectController>
            </Form>
          )}
        </div>

        <div className="space-y-3 md:hidden">
          {membersInClass ? (
            membersInClass.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                Chưa có thành viên trong lớp.
              </div>
            ) : (
              membersInClass.map((m) => (
                <article
                  key={m.userId}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-foreground">{m.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.email}</p>
                  <p className="mt-2 text-sm">
                    <span className="font-medium text-foreground">KQ gần nhất:</span>{' '}
                    {outcomeLabel(m.latestResult?.outcome)}
                  </p>
                </article>
              ))
            )
          ) : combinedResults.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              Không có kết quả thi nào.
            </div>
          ) : (
            combinedResults.map((res) => {
              const isDone = res.status === 'done'
              const score = res.score
              const outcome = res.outcome

              return (
                <article
                  key={res.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {cleanExamTitle(res.title)}
                    </p>
                    {res.isSubmission ? (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide',
                          isDone ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning'
                        )}
                      >
                        {isDone ? 'Đã chấm' : 'Chờ chấm'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-success-muted px-2 py-0.5 text-xs font-bold text-success uppercase">
                        HOÀN THÀNH
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatViDate(res.date)}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      Điểm: {score != null ? `${score}%` : isDone ? '0%' : '—'}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      KQ: {outcome === 'DAT' ? 'Đạt' : outcome === 'CHO_HOC_LAI' ? 'Thi lại' : '—'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      onOpenExam(
                        res.isSubmission ? res.id : res.classId || res.id,
                        res.isSubmission,
                        res.scheduleId ?? undefined
                      )
                    }
                    className="mt-3 h-auto justify-start p-0 text-sm font-semibold normal-case tracking-normal text-primary underline-offset-4 hover:bg-transparent hover:underline"
                  >
                    Xem kết quả
                  </Button>
                </article>
              )
            })
          )}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-muted/60 text-muted-foreground">
                  {membersInClass ? (
                    <>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                        Họ tên
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                        Kết quả gần nhất
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                        Tên kỳ thi
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                        Ngày hoàn thành
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                        Điểm số
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                        Kết quả
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                        Thao tác
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {membersInClass ? (
                  membersInClass.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                        Chưa có thành viên trong lớp.
                      </td>
                    </tr>
                  ) : (
                    membersInClass.map((m) => (
                      <tr key={m.userId} className="transition-colors hover:bg-muted/40">
                        <td className="px-6 py-5 font-semibold text-foreground">{m.name}</td>
                        <td className="px-6 py-5 text-sm text-muted-foreground">{m.email}</td>
                        <td className="px-6 py-5 text-sm text-muted-foreground">
                          {m.latestResult?.outcome || '—'}
                        </td>
                      </tr>
                    ))
                  )
                ) : combinedResults.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                      Không có kết quả thi nào.
                    </td>
                  </tr>
                ) : (
                  combinedResults.map((res, rowIdx) => {
                    const isDone = res.status === 'done'
                    const score = res.score
                    const outcome = res.outcome

                    return (
                      <tr key={res.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                                rowIdx % 3 === 0 && 'bg-warning-muted text-warning',
                                rowIdx % 3 === 1 && 'bg-primary-100 text-primary-700',
                                rowIdx % 3 === 2 && 'bg-danger-muted text-danger'
                              )}
                            >
                              <Link2 className="h-5 w-5" aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">
                                {cleanExamTitle(res.title)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {res.isSubmission
                                  ? res.classId
                                    ? 'Kỳ thi theo lớp'
                                    : 'Kỳ thi nội bộ'
                                  : 'Lịch thi đã kết thúc'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm text-muted-foreground">
                          {formatViDate(res.date)}
                        </td>
                        <td className="px-6 py-5 font-bold text-foreground">
                          {score != null ? `${score}%` : isDone ? '0%' : '—'}
                        </td>
                        <td className="px-6 py-5">
                          {res.isSubmission ? (
                            <span
                              className={cn(
                                'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider',
                                isDone
                                  ? 'bg-success-muted text-success'
                                  : 'bg-warning-muted text-warning'
                              )}
                            >
                              {isDone ? 'Đã chấm' : 'Chờ chấm'}
                            </span>
                          ) : (
                            <span className="rounded-full bg-success-muted px-3 py-1 text-xs font-bold text-success">
                              HOÀN THÀNH
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={cn(
                              'font-bold',
                              outcome === 'DAT'
                                ? 'text-emerald-600'
                                : outcome === 'CHO_HOC_LAI'
                                  ? 'text-rose-600'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {outcome === 'DAT'
                              ? 'Đạt'
                              : outcome === 'CHO_HOC_LAI'
                                ? 'Thi lại'
                                : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              onOpenExam(
                                res.isSubmission ? res.id : res.classId || res.id,
                                res.isSubmission,
                                res.scheduleId ?? undefined
                              )
                            }
                            className="h-auto p-0 text-xs font-bold normal-case tracking-normal text-primary underline-offset-4 hover:bg-transparent hover:underline"
                          >
                            Xem kết quả
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Hiển thị {exams.length} kỳ thi trên trang · Tổng {total} kỳ thi
          </p>
          <PaginationCardStepper
            page={page}
            totalPages={Math.max(totalPages, 1)}
            onPageChange={onPageChange}
          />
        </div>
      </section>
    </div>
  )
}
