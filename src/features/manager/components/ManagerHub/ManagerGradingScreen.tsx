import { useNavigate } from '@tanstack/react-router'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useManagerClasses } from '@/features/manager/hooks'
import { useManagerSubmissions } from '@/features/exam/hooks'
import { ManagerScreenLayout } from './ManagerScreenLayout'
import { managerClassApiSchema } from '@/features/manager/schemas'
import { z } from 'zod'

type ManagerClassRow = z.infer<typeof managerClassApiSchema>

function managerClassStatusUi(status: ManagerClassRow['status']): {
  label: string
  badgeClass: string
} {
  if (status === 'closed')
    return { label: 'Đã ngừng', badgeClass: 'bg-muted text-muted-foreground' }
  if (status === 'full') return { label: 'Đủ chỗ', badgeClass: 'bg-amber-100 text-amber-900' }
  return { label: 'Đang hoạt động', badgeClass: 'bg-emerald-100 text-emerald-900' }
}

export function ManagerGradingScreen() {
  const navigate = useNavigate()
  const { data: classes = [], isLoading } = useManagerClasses()
  const { data: submissions = [], isLoading: isLoadingSubmissions } = useManagerSubmissions()

  // Total pending across all submissions (regardless of classId)
  const totalPending = submissions.filter((s) => s.status === 'pending').length
  const totalDone = submissions.filter((s) => s.status === 'done').length

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className={cn('min-w-0', PAGE_HEADER_SURFACE)}>
          <h1 className={PAGE_HEADER_TITLE}>
            <span className={PAGE_HEADER_GRADIENT}>Chấm bài thi</span>
          </h1>
          <p className={PAGE_HEADER_DESCRIPTION}>
            Quản lý và chấm điểm bài thi đã nộp của các thành viên. Bấm "Xem tất cả bài nộp" để bắt
            đầu chấm bài.
          </p>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tổng bài đã nộp
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {isLoadingSubmissions ? '—' : submissions.length}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Chờ chấm</p>
            <p className="mt-1 text-3xl font-bold text-rose-700">
              {isLoadingSubmissions ? '—' : totalPending}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Đã chấm xong
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-700">
              {isLoadingSubmissions ? '—' : totalDone}
            </p>
          </div>
        </div>

        {/* Classes table – informational, shows submission count per class */}
        <div>
          <h3 className="mb-3 text-base font-bold tracking-tight text-foreground">Danh sách lớp</h3>
          <div
            className={cn(
              'overflow-x-auto rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10'
            )}
          >
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-primary/12 via-teal-500/8 to-violet-500/8">
                  <th className="px-3 py-3 font-semibold">Tên lớp</th>
                  <th className="px-3 py-3 font-semibold">Giáo viên</th>
                  <th className="px-3 py-3 font-semibold">Trạng thái</th>
                  <th className="px-3 py-3 font-semibold">Bài thi đã nộp</th>
                  <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Đang tải danh sách lớp...
                    </td>
                  </tr>
                ) : classes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có lớp nào.
                    </td>
                  </tr>
                ) : (
                  classes.map((c) => {
                    const st = managerClassStatusUi(c.status)
                    const teacherName = c.teacher?.name || '—'

                    let isExamEnded = false
                    if (c.examDate) {
                      const examTime = new Date(c.examDate).getTime()
                      if (!Number.isNaN(examTime) && examTime < Date.now()) {
                        isExamEnded = true
                      }
                    }

                    // Count submissions linked to this class
                    const classSubmissions = submissions.filter((s) => s.classId === c.id)
                    const pending = classSubmissions.filter((s) => s.status === 'pending').length
                    const total = classSubmissions.length

                    return (
                      <tr
                        key={c.id}
                        className="border-t border-border/80 bg-card transition-colors hover:bg-muted/25"
                      >
                        <td className="px-3 py-4 font-semibold text-foreground">{c.name}</td>
                        <td className="px-3 py-4 text-foreground">{teacherName}</td>
                        <td className="px-3 py-4">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                              st.badgeClass
                            )}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          {total > 0 ? (
                            <span className="text-foreground font-medium">
                              {total} bài ({' '}
                              {pending > 0 ? (
                                <span className="font-bold text-rose-600">{pending} chờ chấm</span>
                              ) : (
                                <span className="text-emerald-600 font-bold">Đã chấm hết</span>
                              )}{' '}
                              )
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Chưa có bài nộp</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-right">
                          {isExamEnded ? (
                            <span className="text-sm font-semibold text-rose-600">
                              Lịch thi đã kết thúc
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                              onClick={() =>
                                void navigate({
                                  to: '/manager/grade-class/$classId',
                                  params: { classId: c.id },
                                })
                              }
                            >
                              Chấm thi
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Show unlinked submissions if any */}
          {(() => {
            const unlinked = submissions.filter((s) => s.classId == null)
            if (unlinked.length === 0) return null
            return (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                <span className="font-bold text-amber-800">
                  ⚠️ {unlinked.length} bài nộp chưa gắn với lớp cụ thể
                </span>
                <span className="ml-2 text-amber-700">— thành viên chưa được xếp lớp khi thi.</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-3 border-amber-400 text-amber-800 hover:bg-amber-100"
                  onClick={() => void navigate({ to: '/exam/grader' })}
                >
                  Xem bài nộp
                </Button>
              </div>
            )
          })()}
        </div>
      </div>
    </ManagerScreenLayout>
  )
}
