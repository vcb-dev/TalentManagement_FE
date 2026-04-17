import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { CARD_ENTRANCE_HOVER, SECTION_FADE_UP, staggerStyle } from '@/lib/cardMotion'
import { useManagerSubmissions } from '@/features/exam/hooks'
import { examSubmissionApiSchema } from '@/features/exam/schemas'
import { z } from 'zod'

type SubmissionRow = z.infer<typeof examSubmissionApiSchema>

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

export function GraderExamListScreen() {
  const navigate = useNavigate()
  const [onlyPending, setOnlyPending] = useState(false)

  const { data: submissions = [], isLoading } = useManagerSubmissions()

  const rows = useMemo<SubmissionRow[]>(() => {
    if (onlyPending) return submissions.filter((r) => r.status === 'pending')
    return submissions
  }, [submissions, onlyPending])

  const pendingTotal = submissions.filter((r) => r.status === 'pending').length

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
            <div
              className={cn(
                'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
                SECTION_FADE_UP
              )}
            >
              <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
                <h1 className={PAGE_HEADER_TITLE}>
                  <span className={PAGE_HEADER_GRADIENT}>Danh sách bài thi đã nộp</span>
                </h1>
                <p className={PAGE_HEADER_DESCRIPTION}>
                  <span className="font-semibold text-foreground">{pendingTotal} bài chờ chấm</span>
                  {' · '}
                  Tổng cộng {submissions.length} bài đã nộp. Bấm "Chấm thi" để xem chi tiết và nhập
                  nhận xét.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
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
                  onClick={() => void navigate({ to: '/manager/grading' as any })}
                >
                  ← Quay lại
                </Button>
              </div>
            </div>

            {/* Table */}
            <div
              className={cn(
                'overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm',
                SECTION_FADE_UP
              )}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead className="bg-primary/[0.06] text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      {['Thí sinh', 'Lớp / Team', 'Ngày nộp', 'Trạng thái', 'Thao tác'].map((h) => (
                        <th
                          key={h}
                          className={cn(
                            'whitespace-nowrap px-6 py-4',
                            h === 'Ngày nộp' || h === 'Trạng thái' || h === 'Thao tác'
                              ? 'text-center'
                              : 'text-left'
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-10 text-center text-sm text-muted-foreground font-bold"
                        >
                          Đang tải danh sách bài thi...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-sm text-muted-foreground"
                        >
                          {onlyPending
                            ? 'Không có bài nào đang chờ chấm 🎉'
                            : 'Chưa có bài thi nào được nộp.'}
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
                              <div className="text-sm text-foreground font-medium">
                                {row.learningClass?.name || (
                                  <span className="italic text-muted-foreground">Chưa gắn lớp</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 align-middle text-center text-muted-foreground">
                              {formattedDate}
                            </td>
                            <td className="px-6 py-4 align-middle text-center">
                              {statusBadge(row.status)}
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
    </div>
  )
}
