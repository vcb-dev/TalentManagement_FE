import { ClipboardList } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { CARD_ENTRANCE_HOVER, SECTION_FADE_UP, staggerStyle } from '@/lib/cardMotion'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonSubmissionCardList } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/axios'
import { useManagerSubmissions } from '@/features/exam/hooks'
import { type examSubmissionApiSchema } from '@/features/exam/schemas'
import { z } from 'zod'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useManagerClasses } from '@/features/manager/hooks'

export interface GraderExamListScreenProps {
  classId?: string
}

type SubmissionRow = z.infer<typeof examSubmissionApiSchema>

const RUBRIC_CRITERIA = [
  {
    id: 'suy_ngam',
    title: 'Suy ngẫm và nhận thức cá nhân (40đ)',
    options: {
      chua_dat: { score: 10, desc: 'Chủ yếu nhắc lại nội dung sách.' },
      dat: { score: 25, desc: 'Nêu được bài học hoặc nhận thức riêng.' },
      tot: { score: 40, desc: 'Thể hiện sự thay đổi trong tư duy hoặc cách nhìn nhận vấn đề.' },
    },
  },
  {
    id: 'ket_noi',
    title: 'Kết nối với thực tế (30đ)',
    options: {
      chua_dat: { score: 10, desc: 'Ít hoặc chưa liên hệ với thực tế.' },
      dat: { score: 20, desc: 'Có liên hệ với bản thân hoặc công việc.' },
      tot: { score: 30, desc: 'Liên hệ cụ thể và thể hiện khả năng vận dụng.' },
    },
  },
  {
    id: 'phat_trien',
    title: 'Phát triển ý tưởng (30đ)',
    options: {
      chua_dat: { score: 10, desc: 'Chưa có quan điểm riêng.' },
      dat: { score: 20, desc: 'Có quan điểm hoặc câu hỏi riêng.' },
      tot: { score: 30, desc: 'Có phản biện, mở rộng hoặc đề xuất cách áp dụng mới.' },
    },
  },
]

function statusBadge(status: SubmissionRow['status']) {
  if (status === 'pending') {
    return (
      <span className="inline-flex rounded-full border border-rose-200/80 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
        Chờ chấm
      </span>
    )
  }
  if (status === 'grading') {
    return (
      <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
        Đang chấm
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
      Đã chấm
    </span>
  )
}

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    const a = parts[parts.length - 2]?.[0]
    const b = parts[parts.length - 1]?.[0]
    if (a && b) return (a + b).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export function GraderExamListScreen({ classId }: GraderExamListScreenProps) {
  const navigate = useNavigate()
  const [onlyPending, setOnlyPending] = useState(false)
  const [selectedSubForRubric, setSelectedSubForRubric] = useState<SubmissionRow | null>(null)

  const {
    data: submissions = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useManagerSubmissions()
  const { data: classes = [] } = useManagerClasses()

  const currentClass = useMemo(
    () => (classId ? classes.find((c) => c.id === classId) : null),
    [classes, classId]
  )

  const rows = useMemo<SubmissionRow[]>(() => {
    let filtered = submissions
    if (classId) {
      filtered = filtered.filter((s) => s.classId === classId)
    }
    if (onlyPending) {
      filtered = filtered.filter((r) => r.status === 'pending')
    }
    return filtered
  }, [submissions, onlyPending, classId])

  const pendingTotal = rows.filter((r) => r.status === 'pending').length

  const goGrade = (row: SubmissionRow) => {
    // Navigate to grader detail. examId here = submission id
    void navigate({
      to: '/exam/$examId/grade',
      params: { examId: row.id },
      search: { employeeId: row.userId },
    })
  }

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3.5rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="page-shell">
          <div className="mb-8 flex flex-col gap-8">
            {/* Header */}
            <PageHeader
              title={
                currentClass ? `Bài thi lớp: ${currentClass.name}` : 'Danh sách bài thi đã nộp'
              }
              description={
                <>
                  <span className="font-semibold text-foreground">{pendingTotal} bài chờ chấm</span>
                  {' · '}
                  Tổng cộng {rows.length} bài đã nộp. Bấm &quot;Chấm thi&quot; để xem chi tiết và
                  nhập nhận xét.
                </>
              }
              gradientTitle
              surface
              variant="flat"
              className={cn(SECTION_FADE_UP, 'border-0 pb-0')}
              actions={
                <>
                  {currentClass ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/10"
                      onClick={() =>
                        void navigate({
                          to: '/manager/grade-class/$classId/by-question',
                          params: { classId: currentClass.id },
                        })
                      }
                    >
                      Chấm theo câu hỏi
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant={onlyPending ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'rounded-lg border px-5 py-2.5 text-sm font-semibold shadow-sm',
                      !onlyPending && 'border-border bg-card hover:bg-muted'
                    )}
                    onClick={() => setOnlyPending((v) => !v)}
                  >
                    {onlyPending ? 'Hiện tất cả' : 'Chỉ chờ chấm'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-border px-5 py-2.5 text-sm font-semibold"
                    onClick={() =>
                      void navigate({
                        to: currentClass ? '/exam/grader' : '/dashboard',
                      })
                    }
                  >
                    ← Quay lại
                  </Button>
                </>
              }
            />

            {/* Table (md+) + thẻ (mobile) */}
            <div
              className={cn(
                'overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm',
                SECTION_FADE_UP
              )}
            >
              <div className="space-y-3 p-3 md:hidden">
                {isError ? (
                  <ErrorState
                    title="Không tải được danh sách bài thi"
                    description={getApiErrorMessage(error)}
                    onRetry={() => void refetch()}
                    retrying={isFetching}
                    compact
                  />
                ) : isLoading ? (
                  <SkeletonSubmissionCardList count={4} />
                ) : rows.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardList className="h-8 w-8" />}
                    title={
                      onlyPending
                        ? 'Không có bài nào đang chờ chấm'
                        : 'Chưa có bài thi nào được nộp'
                    }
                    description={
                      onlyPending
                        ? 'Tất cả bài nộp đã được xử lý.'
                        : 'Danh sách sẽ cập nhật khi học viên nộp bài.'
                    }
                    compact
                  />
                ) : (
                  rows.map((row, rowIdx) => {
                    const dateObj = new Date(row.createdAt)
                    const formattedDate = dateObj.toLocaleDateString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                    const initials = getInitials(row.fullName)
                    return (
                      <div
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          'cursor-pointer rounded-xl border border-border/80 bg-card p-4 shadow-sm outline-none transition-colors hover:bg-primary/[0.05] focus-visible:ring-2 focus-visible:ring-primary/30',
                          CARD_ENTRANCE_HOVER
                        )}
                        style={staggerStyle(rowIdx, 42)}
                        onClick={() => goGrade(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            goGrade(row)
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground">{row.fullName}</p>
                            <p className="text-xs text-muted-foreground">{row.teamGroup || '—'}</p>
                          </div>
                        </div>
                        <div className="mt-3 text-sm">
                          <p className="font-bold text-foreground">
                            {row.learningClass?.name || (
                              <span className="italic font-normal text-muted-foreground">
                                Chưa gắn lớp
                              </span>
                            )}
                          </p>
                          {row.schedule ? (
                            <p className="mt-1 text-xs font-medium text-primary">
                              Kỳ thi: {row.schedule.topic} ({row.schedule.startTime})
                            </p>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{formattedDate}</span>
                          <div className="flex items-center gap-2">
                            {row.status === 'done' &&
                              row.totalScore != null &&
                              (row.schedule?.examQuestions?.gradingType === 'rubric_reading' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedSubForRubric(row)
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-extrabold text-primary hover:bg-primary/20 transition-all cursor-pointer"
                                >
                                  {row.totalScore}đ 📋
                                </button>
                              ) : (
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                                  {row.totalScore}%
                                </span>
                              ))}
                            {statusBadge(row.status)}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant={row.status === 'done' ? 'outline' : 'default'}
                          size="sm"
                          className={cn(
                            'mt-3 w-full rounded-lg text-xs font-bold shadow-sm',
                            row.status === 'done' &&
                              'border-border bg-card text-muted-foreground hover:bg-muted/40'
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            goGrade(row)
                          }}
                        >
                          {row.status === 'done'
                            ? 'Xem lại'
                            : row.status === 'grading'
                              ? 'Tiếp tục'
                              : 'Chấm thi'}
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead className="bg-primary/[0.06] text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      {['Thí sinh', 'Lớp / Team', 'Ngày nộp', 'Trạng thái', 'Điểm', 'Thao tác'].map(
                        (h) => (
                          <th
                            key={h}
                            className={cn(
                              'whitespace-nowrap px-6 py-4',
                              h === 'Ngày nộp' ||
                                h === 'Trạng thái' ||
                                h === 'Điểm' ||
                                h === 'Thao tác'
                                ? 'text-center'
                                : 'text-left'
                            )}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isError ? (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <ErrorState
                            title="Không tải được danh sách bài thi"
                            description={getApiErrorMessage(error)}
                            onRetry={() => void refetch()}
                            retrying={isFetching}
                            compact
                            className="border-0 bg-transparent"
                          />
                        </td>
                      </tr>
                    ) : isLoading ? (
                      Array.from({ length: 5 }, (_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }, (_, j) => (
                            <td key={j} className="px-6 py-4">
                              <div className="h-4 w-full animate-pulse rounded bg-muted" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <EmptyState
                            icon={<ClipboardList className="h-8 w-8" />}
                            title={
                              onlyPending
                                ? 'Không có bài nào đang chờ chấm'
                                : 'Chưa có bài thi nào được nộp'
                            }
                            description={
                              onlyPending
                                ? 'Tất cả bài nộp đã được xử lý.'
                                : 'Danh sách sẽ cập nhật khi học viên nộp bài.'
                            }
                            compact
                          />
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, rowIdx) => {
                        const dateObj = new Date(row.createdAt)
                        const formattedDate = dateObj.toLocaleDateString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                        const initials = getInitials(row.fullName)
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              'cursor-pointer transition-colors hover:bg-primary/[0.05]',
                              CARD_ENTRANCE_HOVER
                            )}
                            style={staggerStyle(rowIdx, 42)}
                            onClick={() => goGrade(row)}
                          >
                            <td className="px-6 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-foreground">
                                    {row.fullName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {row.teamGroup || '—'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-middle">
                              <div className="text-sm font-bold text-foreground">
                                {row.learningClass?.name || (
                                  <span className="italic text-muted-foreground">Chưa gắn lớp</span>
                                )}
                              </div>
                              {row.schedule && (
                                <div className="mt-1 text-xs font-medium text-primary">
                                  Kỳ thi: {row.schedule.topic} ({row.schedule.startTime})
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 align-middle text-center text-muted-foreground">
                              {formattedDate}
                            </td>
                            <td className="px-6 py-4 align-middle text-center">
                              {statusBadge(row.status)}
                            </td>
                            <td className="px-6 py-4 align-middle text-center">
                              {row.status === 'done' && row.totalScore != null ? (
                                row.schedule?.examQuestions?.gradingType === 'rubric_reading' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedSubForRubric(row)
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary hover:bg-primary/20 transition-all cursor-pointer"
                                  >
                                    {row.totalScore}đ 📋
                                  </button>
                                ) : (
                                  <span className="text-sm font-extrabold text-slate-700">
                                    {row.totalScore}%
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 align-middle text-center">
                              <Button
                                type="button"
                                variant={row.status === 'done' ? 'outline' : 'default'}
                                size="sm"
                                className={cn(
                                  'whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-bold shadow-sm transition-transform active:scale-95',
                                  row.status === 'done' &&
                                    'border-border bg-card text-muted-foreground hover:bg-muted/40'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  goGrade(row)
                                }}
                              >
                                {row.status === 'done'
                                  ? 'Xem lại'
                                  : row.status === 'grading'
                                    ? 'Tiếp tục'
                                    : 'Chấm thi'}
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
          </div>
        </div>
      </div>
      <Dialog
        open={!!selectedSubForRubric}
        onOpenChange={(open) => !open && setSelectedSubForRubric(null)}
      >
        <DialogContent className="max-w-3xl rounded-2xl border-slate-200 p-6 shadow-2xl bg-white">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-lg font-black text-slate-900 uppercase tracking-tight">
              Bảng điểm Rubric - {selectedSubForRubric?.fullName}
            </DialogTitle>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Lớp: {selectedSubForRubric?.learningClass?.name || '—'} | Kỳ thi:{' '}
              {selectedSubForRubric?.schedule?.topic || '—'}
            </p>
          </DialogHeader>

          {selectedSubForRubric && (
            <div className="mt-4 space-y-6">
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 font-bold text-slate-700 w-1/3">Tiêu chí</th>
                      <th className="px-4 py-3 font-bold text-orange-600 text-center w-2/9">
                        Chưa đạt
                      </th>
                      <th className="px-4 py-3 font-bold text-emerald-600 text-center w-2/9">
                        Đạt
                      </th>
                      <th className="px-4 py-3 font-bold text-indigo-600 text-center w-2/9">Tốt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {RUBRIC_CRITERIA.map((criteria) => {
                      const rubricGradesObj =
                        (selectedSubForRubric.grades as any)?.rubric_reading || {}
                      const currentValue = rubricGradesObj[criteria.id] || null
                      return (
                        <tr key={criteria.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 font-bold text-slate-800 vertical-align-top">
                            {criteria.title}
                          </td>
                          {Object.entries(criteria.options).map(([optKey, optVal]) => {
                            const isChecked = currentValue === optKey
                            const colorClass =
                              optKey === 'chua_dat'
                                ? 'data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600'
                                : optKey === 'dat'
                                  ? 'data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
                                  : 'data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600'
                            return (
                              <td
                                key={optKey}
                                className={cn(
                                  'px-4 py-4 text-center transition-all',
                                  isChecked &&
                                    (optKey === 'chua_dat'
                                      ? 'bg-orange-50/30'
                                      : optKey === 'dat'
                                        ? 'bg-emerald-50/30'
                                        : 'bg-indigo-50/30')
                                )}
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <Checkbox
                                    className={cn('h-5 w-5 rounded-full border-2', colorClass)}
                                    checked={isChecked}
                                    disabled
                                  />
                                  <span
                                    className={cn(
                                      'text-xs font-black uppercase',
                                      isChecked
                                        ? optKey === 'chua_dat'
                                          ? 'text-orange-600'
                                          : optKey === 'dat'
                                            ? 'text-emerald-600'
                                            : 'text-indigo-600'
                                        : 'text-slate-400'
                                    )}
                                  >
                                    {optVal.score}đ
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[150px] mx-auto block">
                                    {optVal.desc}
                                  </span>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {selectedSubForRubric.graderNote && (
                <div className="rounded-xl border border-primary/20 bg-card p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                    Nhận xét chung từ người chấm
                  </h4>
                  <p className="text-sm font-semibold text-slate-700 whitespace-pre-wrap">
                    {selectedSubForRubric.graderNote}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm font-bold text-slate-600">Tổng điểm:</span>
                <span className="text-xl font-black text-primary">
                  {selectedSubForRubric.totalScore}đ
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
