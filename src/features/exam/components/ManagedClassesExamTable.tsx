import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertCircle, Calendar, CheckCircle2, Loader2, Users } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { managerApi } from '@/features/manager/api'
import { managerKeys } from '@/features/manager/queryKeys'
import type {
  managerClassApiSchema,
  managerClassScheduleApiSchema,
} from '@/features/manager/schemas'
import { ClassMembersScoresModal } from '@/features/manager/components/ClassMembersScoresModal'

type ManagerClassRow = z.infer<typeof managerClassApiSchema>
type ScheduleRow = z.infer<typeof managerClassScheduleApiSchema>

interface ManagedClassesExamTableProps {
  classes: Array<{
    id: string
    name: string
    teacher?: { name: string; userId: string; email: string } | null
    status: 'open' | 'full' | 'closed'
    levelFrom: string
    levelTo: string
    examDate?: string | null
    [key: string]: any
  }>
  isLoading: boolean
}

function formatExamViShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

function formatDateIsoVi(dateIso: string): string {
  const parts = dateIso.split('-').map((x) => Number.parseInt(x, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateIso
  const y = parts[0]!
  const mo = parts[1]!
  const d = parts[2]!
  const dt = new Date(y, mo - 1, d)
  return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function renderExamStatus(examDate: string | null | undefined) {
  if (!examDate) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 shadow-sm">
        <AlertCircle className="h-3 w-3" />
        Chưa xếp lịch
      </span>
    )
  }

  const now = Date.now()
  const start = new Date(examDate).getTime()
  const end = start + 4 * 60 * 60 * 1000

  if (now < start) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 shadow-sm">
        <Calendar className="h-3 w-3" />
        Sắp diễn ra
      </span>
    )
  }

  if (now >= start && now <= end) {
    return (
      <span className="relative inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
        Đang diễn ra
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500 shadow-sm opacity-80">
      <CheckCircle2 className="h-3 w-3" />
      Đã kết thúc
    </span>
  )
}

export function ManagedClassesExamTable({ classes, isLoading }: ManagedClassesExamTableProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const scheduleQueries = useQueries({
    queries: classes.map((c) => ({
      queryKey: managerKeys.classSchedules(c.id),
      queryFn: () => managerApi.classSchedules(c.id),
      enabled: classes.length > 0,
    })),
  })

  const anyScheduleFetching = scheduleQueries.some((q) => q.isFetching)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-border/50">
        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Đang tải danh sách lớp phụ trách...
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {classes.length === 0 ? (
          <div className="rounded-2xl border border-border/80 bg-card px-4 py-12 text-center text-muted-foreground shadow-[var(--shadow-card)]">
            Chưa có lớp nào được phân công phụ trách.
          </div>
        ) : (
          classes.map((c) => {
            const idxInOriginal = classes.findIndex((oc) => oc.id === c.id)
            const q = scheduleQueries[idxInOriginal]
            const schedules = q?.data ?? []
            const loading = q?.isLoading ?? false
            const teacherName = c.teacher?.name || '—'
            const examBlock = (
              <div className="space-y-0.5">
                <span className="font-medium text-foreground">{formatExamViShort(c.examDate)}</span>
                {c.examDate && c.teacher?.name ? (
                  <p className="text-xs text-muted-foreground">Chấm: {c.teacher.name}</p>
                ) : null}
              </div>
            )

            if (loading && !q?.data) {
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-border/80 bg-card p-4 shadow-[var(--shadow-card)]"
                >
                  <p className="font-semibold text-foreground">{c.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{teacherName}</p>
                  <div className="mt-3">{renderExamStatus(c.examDate)}</div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tải lịch học buổi…
                  </div>
                </div>
              )
            }

            if (schedules.length === 0) {
              return (
                <div
                  key={c.id}
                  className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-[var(--shadow-card)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{c.name}</h3>
                      <p className="text-sm text-foreground">{teacherName}</p>
                    </div>
                    {renderExamStatus(c.examDate)}
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Chưa có buổi học nào được xếp lịch.
                  </p>
                  <div className="border-t border-border/50 pt-3">{examBlock}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-full font-bold rounded-lg border-primary/20 text-primary hover:bg-primary/5 hover:text-primary-700"
                    onClick={() => setSelectedClassId(c.id)}
                  >
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    Thành viên & Điểm
                  </Button>
                </div>
              )
            }

            return (
              <div
                key={c.id}
                className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    <p className="text-sm text-foreground">{teacherName}</p>
                  </div>
                  {renderExamStatus(c.examDate)}
                </div>
                <div className="space-y-2">
                  {schedules.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm"
                    >
                      <p className="font-semibold text-foreground">{formatDateIsoVi(s.dateIso)}</p>
                      <p className="font-mono text-xs tabular-nums text-muted-foreground">
                        {s.startTime} – {s.endTime}
                      </p>
                      <p className="mt-1 break-words">{s.topic}</p>
                      <p className="text-muted-foreground">{s.location?.trim() || '—'}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/50 pt-3">{examBlock}</div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-full font-bold rounded-lg border-primary/20 text-primary hover:bg-primary/5 hover:text-primary-700"
                    onClick={() => setSelectedClassId(c.id)}
                  >
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    Thành viên & Điểm
                  </Button>
                  {c.examDate && new Date(c.examDate).getTime() < Date.now() ? (
                    <span className="text-center text-sm font-semibold text-rose-600">
                      Lịch thi đã kết thúc
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div
        className={cn(
          'hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-card)] transition-opacity duration-300 md:block',
          anyScheduleFetching && 'opacity-60'
        )}
      >
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border/50">
              <th className="px-5 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Tên lớp
              </th>
              <th className="px-5 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Giáo viên
              </th>
              <th className="px-5 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Trạng thái
              </th>
              <th className="px-5 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Ngày học
              </th>
              <th className="px-5 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Giờ học
              </th>
              <th className="px-5 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Nội dung
              </th>
              <th className="px-5 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Địa điểm
              </th>
              <th className="px-5 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Kỳ thi dự kiến
              </th>
              <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  Chưa có lớp nào được phân công phụ trách.
                </td>
              </tr>
            ) : (
              classes.map((c) => {
                const idxInOriginal = classes.findIndex((oc) => oc.id === c.id)
                const q = scheduleQueries[idxInOriginal]
                const schedules = q?.data ?? []
                const loading = q?.isLoading ?? false
                const teacherName = c.teacher?.name || '—'
                const rowCount = Math.max(1, schedules.length)
                const examText = formatExamViShort(c.examDate)

                const examCell = (
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground">{examText}</span>
                    {c.examDate && c.teacher?.name ? (
                      <p className="text-xs text-muted-foreground">Chấm: {c.teacher.name}</p>
                    ) : null}
                  </div>
                )

                if (loading && !q?.data) {
                  return (
                    <tr key={c.id} className="border-t border-border/80 bg-card">
                      <td className="px-5 py-4 font-semibold text-foreground">{c.name}</td>
                      <td className="px-5 py-4 text-foreground">{teacherName}</td>
                      <td className="px-5 py-4">{renderExamStatus(c.examDate)}</td>
                      <td colSpan={4} className="px-5 py-4 text-center text-muted-foreground">
                        <span className="inline-flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải lịch học buổi…
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top">{examCell}</td>
                      <td className="px-5 py-4 text-right align-top">—</td>
                    </tr>
                  )
                }

                if (schedules.length === 0) {
                  return (
                    <tr key={c.id} className="border-t border-border/80 bg-card">
                      <td className="px-5 py-4 align-top font-semibold text-foreground">
                        {c.name}
                      </td>
                      <td className="px-5 py-4 align-top text-foreground">{teacherName}</td>
                      <td className="px-5 py-4 align-top">{renderExamStatus(c.examDate)}</td>
                      <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                        Chưa có buổi học nào được xếp lịch.
                      </td>
                      <td className="px-5 py-4 align-top">{examCell}</td>
                      <td className="px-5 py-4 align-top text-right">—</td>
                    </tr>
                  )
                }

                return (
                  <Fragment key={c.id}>
                    {schedules.map((s, sIdx) => (
                      <tr
                        key={`${c.id}-${s.id}`}
                        className="border-t border-border/80 bg-card transition-colors hover:bg-muted/25"
                      >
                        {sIdx === 0 ? (
                          <>
                            <td
                              className="px-5 py-4 align-top font-semibold text-foreground"
                              rowSpan={rowCount}
                            >
                              {c.name}
                            </td>
                            <td className="px-5 py-4 align-top text-foreground" rowSpan={rowCount}>
                              {teacherName}
                            </td>
                            <td className="px-5 py-4 align-top" rowSpan={rowCount}>
                              {renderExamStatus(c.examDate)}
                            </td>
                          </>
                        ) : null}
                        <td className="px-5 py-4 whitespace-nowrap align-top">
                          {formatDateIsoVi(s.dateIso)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap align-top font-mono text-xs tabular-nums text-muted-foreground">
                          {s.startTime} – {s.endTime}
                        </td>
                        <td className="px-5 py-4 align-top max-w-[200px] break-words">{s.topic}</td>
                        <td className="px-5 py-4 align-top text-muted-foreground">
                          {s.location?.trim() || '—'}
                        </td>
                        {sIdx === 0 ? (
                          <td className="px-5 py-4 align-top" rowSpan={rowCount}>
                            {examCell}
                          </td>
                        ) : null}
                        {sIdx === 0 ? (
                          <td className="px-5 py-4 align-top text-right" rowSpan={rowCount}>
                            <div className="flex flex-col items-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="font-bold rounded-lg border-primary/20 text-primary hover:bg-primary/5 hover:text-primary-700"
                                onClick={() => setSelectedClassId(c.id)}
                              >
                                <Users className="h-3.5 w-3.5 mr-1.5" />
                                Thành viên & Điểm
                              </Button>
                              {c.examDate && new Date(c.examDate).getTime() < Date.now() ? (
                                <span className="text-sm font-semibold text-rose-600">
                                  Lịch thi đã kết thúc
                                </span>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <ClassMembersScoresModal
        isOpen={!!selectedClassId}
        onClose={() => setSelectedClassId(null)}
        classId={selectedClassId || ''}
      />
    </>
  )
}
