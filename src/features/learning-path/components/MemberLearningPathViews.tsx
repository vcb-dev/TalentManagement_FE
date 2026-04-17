import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { DateController } from '@/components/ui/form-controllers'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMyEnrolledClass } from '@/features/learning-path/hooks'
import type { MeEnrolledClass } from '@/features/learning-path/schemas'
import { cn } from '@/lib/utils'

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  contentWidth = 'default',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  contentWidth?: 'default' | 'wide'
}) {
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <Button
        type="button"
        variant="ghost"
        className="absolute inset-0 z-0 h-full w-full rounded-none border-0 bg-black/45 p-0 backdrop-blur-[2px] hover:bg-black/50"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative z-[1] flex max-h-[min(92vh,860px)] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-[var(--shadow-card)] sm:rounded-2xl',
          contentWidth === 'wide' ? 'sm:max-w-2xl' : 'sm:max-w-xl'
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 space-y-1">
            <h2 id={titleId} className="text-lg font-bold text-foreground">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
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

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`
}

function classStatusUi(status: MeEnrolledClass['status']): { label: string; badgeClass: string } {
  if (status === 'closed')
    return { label: 'Đã ngừng', badgeClass: 'bg-muted text-muted-foreground' }
  return { label: 'Đang hoạt động', badgeClass: 'bg-emerald-100 text-emerald-900' }
}

function MemberScheduleTableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10">
        <div className="p-4">
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  )
}

export function MemberClassesPanel() {
  const filterForm = useForm<{ startDate: string; endDate: string }>({
    defaultValues: { startDate: '', endDate: '' },
  })
  const startDate = useWatch({ control: filterForm.control, name: 'startDate' }) ?? ''
  const endDate = useWatch({ control: filterForm.control, name: 'endDate' }) ?? ''
  const deferredStartDate = useDeferredValue(startDate)
  const deferredEndDate = useDeferredValue(endDate)
  const scheduleRange = useMemo(() => {
    const s = deferredStartDate.trim() || undefined
    const e = deferredEndDate.trim() || undefined
    return { startDate: s, endDate: e }
  }, [deferredStartDate, deferredEndDate])
  const hasDateFilter = Boolean(scheduleRange.startDate || scheduleRange.endDate)

  const { data, isLoading, isError, isFetching } = useMyEnrolledClass(scheduleRange)
  const [membersOpen, setMembersOpen] = useState(false)

  const closeMembers = useCallback(() => setMembersOpen(false), [])

  const cls = data?.enrolledClass ?? null

  if (isLoading) {
    return <MemberScheduleTableSkeleton />
  }

  if (isError) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Không tải được lớp học. Thử lại sau.
      </p>
    )
  }

  if (!cls) {
    return (
      <p className="rounded-xl border border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
        Bạn chưa được xếp vào lớp nào. Khi quản lý gán lớp, thông tin sẽ hiển thị tại đây.
      </p>
    )
  }

  const st = classStatusUi(cls.status)
  const rowCount = Math.max(1, cls.schedules.length)
  const actionsCell = (
    <div className="flex justify-end">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Xem thành viên lớp"
        title="Xem thành viên lớp"
        className="h-8 w-8 rounded-lg"
        onClick={() => setMembersOpen(true)}
      >
        <Eye className="h-4 w-4" strokeWidth={2} aria-hidden />
      </Button>
    </div>
  )

  return (
    <>
      <div>
        <h3 className="text-base font-bold tracking-tight text-foreground">Lịch học buổi</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Thông tin lớp và lịch do giáo viên phụ trách cập nhật.
        </p>
        <Form {...filterForm}>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <DateController
              control={filterForm.control}
              name="startDate"
              label="Từ ngày"
              max={endDate || undefined}
              className="block min-w-[10rem] flex-1 sm:max-w-[13rem]"
              labelClassName="text-xs font-semibold text-muted-foreground"
              datePickerClassName="mt-1 h-[42px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
            <DateController
              control={filterForm.control}
              name="endDate"
              label="Đến ngày"
              min={startDate || undefined}
              className="block min-w-[10rem] flex-1 sm:max-w-[13rem]"
              labelClassName="text-xs font-semibold text-muted-foreground"
              datePickerClassName="mt-1 h-[42px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-xl"
              disabled={!hasDateFilter}
              onClick={() => {
                filterForm.reset({ startDate: '', endDate: '' })
              }}
            >
              Xóa lọc
            </Button>
          </div>
        </Form>
        <div
          className={cn(
            'mt-4 overflow-x-auto rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10 transition-opacity',
            isFetching && 'opacity-60'
          )}
        >
          <div className="space-y-3 p-3 md:hidden">
            {cls.schedules.length === 0 ? (
              <div className="rounded-xl border border-border/80 bg-card px-4 py-5 text-sm text-muted-foreground">
                {hasDateFilter
                  ? 'Không có buổi học trong khoảng thời gian đã chọn.'
                  : 'Chưa có buổi học nào được xếp lịch.'}
              </div>
            ) : (
              cls.schedules.map((s) => (
                <article
                  key={s.id}
                  className="rounded-xl border border-border/80 bg-background px-4 py-3 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{cls.name}</p>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap',
                        st.badgeClass
                      )}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Giáo viên: {cls.teacherName}</p>
                  <div className="mt-2 grid grid-cols-1 gap-1.5 text-sm">
                    <p>
                      <span className="font-medium text-foreground">Ngày:</span>{' '}
                      {formatDateIsoVi(s.dateIso)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Giờ:</span>{' '}
                      {formatTimeRange(s.startTime, s.endTime)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Nội dung:</span> {s.topic}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Địa điểm:</span>{' '}
                      {s.location?.trim() || '—'}
                    </p>
                  </div>
                </article>
              ))
            )}
            <div className="flex justify-end">{actionsCell}</div>
          </div>
          <table className="hidden w-full min-w-[960px] border-collapse text-left text-sm md:table">
            <thead>
              <tr className="bg-gradient-to-r from-primary/12 via-teal-500/8 to-violet-500/8">
                <th className="px-3 py-3 font-semibold">Tên lớp</th>
                <th className="px-3 py-3 font-semibold">Giáo viên</th>
                <th className="px-3 py-3 font-semibold">Trạng thái</th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Ngày
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Giờ
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Nội dung
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Địa điểm
                </th>
                <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {cls.schedules.length === 0 ? (
                <tr className="border-t border-border/80 bg-card">
                  <td className="px-3 py-3 align-top font-semibold text-foreground">{cls.name}</td>
                  <td className="px-3 py-3 align-top text-foreground">{cls.teacherName}</td>
                  <td className="px-3 py-3 align-top">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                        st.badgeClass
                      )}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    {hasDateFilter
                      ? 'Không có buổi học trong khoảng thời gian đã chọn.'
                      : 'Chưa có buổi học nào được xếp lịch.'}
                  </td>
                  <td className="px-3 py-3 align-top text-right">{actionsCell}</td>
                </tr>
              ) : (
                cls.schedules.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="border-t border-border/80 bg-card transition-colors hover:bg-muted/25"
                  >
                    {idx === 0 ? (
                      <>
                        <td
                          className="px-3 py-2.5 align-top font-semibold text-foreground"
                          rowSpan={rowCount}
                        >
                          {cls.name}
                        </td>
                        <td className="px-3 py-2.5 align-top text-foreground" rowSpan={rowCount}>
                          {cls.teacherName}
                        </td>
                        <td className="px-3 py-2.5 align-top" rowSpan={rowCount}>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                              st.badgeClass
                            )}
                          >
                            {st.label}
                          </span>
                        </td>
                      </>
                    ) : null}
                    <td className="px-3 py-2.5 whitespace-nowrap align-top">
                      {formatDateIsoVi(s.dateIso)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap align-top font-mono text-xs tabular-nums">
                      {s.startTime} – {s.endTime}
                    </td>
                    <td className="px-3 py-2.5 align-top">{s.topic}</td>
                    <td className="px-3 py-2.5 align-top text-muted-foreground">
                      {s.location?.trim() || '—'}
                    </td>
                    {idx === 0 ? (
                      <td className="px-3 py-2.5 align-top text-right" rowSpan={rowCount}>
                        {actionsCell}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={membersOpen}
        onClose={closeMembers}
        title="Danh sách thành viên"
        description={cls.name}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Vị trí</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cls.members.map((m) => (
              <TableRow key={m.userId}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  {m.email}
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">
                  {m.jobTitle?.trim() || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Modal>
    </>
  )
}
