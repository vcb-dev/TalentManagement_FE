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
import { Eye, X, Star, Edit3, School, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { DateController } from '@/components/ui/form-controllers'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import { SessionEvaluationModal } from '@/features/teacher/components/SessionEvaluationModal'
import { useAuthStore } from '@/stores/auth.store'

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
          <button
            type="button"
            className="shrink-0 rounded-full p-2 hover:bg-muted"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <X className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
          </button>
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

function classStatusUi(status: MeEnrolledClass['status']): { label: string; badgeClass: string } {
  if (status === 'closed')
    return { label: 'Đã ngừng', badgeClass: 'bg-muted text-muted-foreground' }
  return { label: 'Đang hoạt động', badgeClass: 'bg-emerald-100 text-emerald-900' }
}

function MemberScheduleTableSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-[2rem]" />
      <Skeleton className="h-96 w-full rounded-[2rem]" />
    </div>
  )
}

export function MemberClassesPanel() {
  const user = useAuthStore((s) => s.user)
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
  const [evalModalOpen, setEvalModalOpen] = useState(false)
  const [evalTarget, setEvalTarget] = useState<{ scheduleId: string; topic: string } | null>(null)

  const closeMembers = useCallback(() => setMembersOpen(false), [])

  const cls = data?.enrolledClass ?? null

  if (isLoading) {
    return <MemberScheduleTableSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-bold text-destructive">Không tải được dữ liệu lớp học</p>
        <p className="mt-1 text-xs text-destructive/60">
          Vui lòng kiểm tra lại kết nối hoặc thử lại sau.
        </p>
      </div>
    )
  }

  if (!cls) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-100">
          <School className="h-8 w-8" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-500">Bạn chưa được xếp vào lớp nào</p>
        <p className="mt-1 text-xs text-slate-400">
          Khi quản lý gán lớp, thông tin sẽ hiển thị tại đây.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/60 p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_12px_24px_-8px_rgba(var(--primary-rgb),0.5)]">
            <Calendar className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Lịch học & Phản hồi
            </h2>
            <p className="text-sm font-bold text-slate-500/80">
              Theo dõi lịch đào tạo, điểm danh và đánh giá chất lượng buổi học
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white px-6 font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-primary"
              onClick={() => setMembersOpen(true)}
            >
              <Eye className="mr-2 h-4 w-4" /> Danh sách lớp
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.04)]">
        <div className="border-b border-slate-50 bg-slate-50/30 px-8 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-1 bg-primary rounded-full" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">
                  Đang tham gia
                </p>
                <p className="text-lg font-black text-slate-900">{cls.name}</p>
              </div>
            </div>

            <Form {...filterForm}>
              <div className="flex flex-wrap items-center gap-3">
                <DateController
                  control={filterForm.control}
                  name="startDate"
                  label=""
                  placeholder="Từ ngày"
                  datePickerClassName="h-10 w-[140px] rounded-xl border-slate-200 bg-white text-xs font-bold"
                />
                <DateController
                  control={filterForm.control}
                  name="endDate"
                  label=""
                  placeholder="Đến ngày"
                  datePickerClassName="h-10 w-[140px] rounded-xl border-slate-200 bg-white text-xs font-bold"
                />
                {hasDateFilter && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                    onClick={() => filterForm.reset({ startDate: '', endDate: '' })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Form>
          </div>
        </div>

        <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
          <div className="divide-y divide-slate-50 md:hidden">
            {cls.schedules.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <p className="text-sm font-bold text-slate-400">Không tìm thấy lịch học nào</p>
              </div>
            ) : (
              cls.schedules.map((s) => (
                <div key={s.id} className="space-y-3 p-4">
                  <div>
                    <p className="text-xs font-black text-slate-900">
                      {formatDateIsoVi(s.dateIso)}
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      {s.startTime} - {s.endTime}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    <span className="font-semibold text-slate-400">Giảng viên: </span>
                    {cls.teacherName}
                  </p>
                  <p className="break-words text-xs font-bold text-slate-600">{s.topic}</p>
                  <p className="text-xs font-bold text-slate-500">
                    <span className="font-semibold text-slate-400">Địa điểm: </span>
                    {s.location?.trim() || '—'}
                  </p>
                  <Badge
                    className={cn(
                      'h-7 rounded-lg px-3 text-xs font-black uppercase tracking-tight border-0 shadow-sm',
                      s.attendance === 'PRESENT'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : s.attendance === 'LATE'
                          ? 'bg-amber-500/10 text-amber-600'
                          : s.attendance === 'ABSENT'
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-slate-100 text-slate-400'
                    )}
                  >
                    {s.attendance === 'PRESENT'
                      ? 'Tham gia'
                      : s.attendance === 'LATE'
                        ? 'Đi muộn'
                        : s.attendance === 'ABSENT'
                          ? 'Vắng mặt'
                          : 'Chưa điểm danh'}
                  </Badge>
                  <div className="pt-1">
                    {s.attendance === 'PRESENT' || s.attendance === 'LATE' ? (
                      <Button
                        className={cn(
                          'h-10 w-full rounded-xl px-5 text-xs font-black uppercase tracking-widest shadow-lg transition-all',
                          s.isEvaluated
                            ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'
                            : 'bg-primary text-white shadow-primary/20 hover:bg-primary/90'
                        )}
                        onClick={() => {
                          setEvalTarget({ scheduleId: s.id, topic: s.topic })
                          setEvalModalOpen(true)
                        }}
                      >
                        {s.isEvaluated ? (
                          <>
                            <Edit3 className="mr-2 h-3.5 w-3.5" /> Sửa đánh giá
                          </>
                        ) : (
                          <>
                            <Star className="mr-2 h-3.5 w-3.5" /> Đánh giá buổi học
                          </>
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs font-bold italic text-slate-300">
                        Không khả dụng
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/30">
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Thời gian
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Giảng viên
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Nội dung
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Địa điểm
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                    Trạng thái
                  </th>
                  <th className="px-8 py-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cls.schedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <p className="text-sm font-bold text-slate-400">
                        Không tìm thấy lịch học nào
                      </p>
                    </td>
                  </tr>
                ) : (
                  cls.schedules.map((s) => (
                    <tr key={s.id} className="group transition-colors hover:bg-slate-50/50">
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-900">
                            {formatDateIsoVi(s.dateIso)}
                          </p>
                          <p className="text-xs font-bold text-slate-400">
                            {s.startTime} - {s.endTime}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-slate-700">{cls.teacherName}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="max-w-[200px] truncate text-xs font-bold text-slate-600">
                          {s.topic}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-slate-500">
                          {s.location?.trim() || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <Badge
                          className={cn(
                            'h-7 rounded-lg border-0 px-3 text-xs font-black uppercase tracking-tight shadow-sm',
                            s.attendance === 'PRESENT'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : s.attendance === 'LATE'
                                ? 'bg-amber-500/10 text-amber-600'
                                : s.attendance === 'ABSENT'
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : 'bg-slate-100 text-slate-400'
                          )}
                        >
                          {s.attendance === 'PRESENT'
                            ? 'Tham gia'
                            : s.attendance === 'LATE'
                              ? 'Đi muộn'
                              : s.attendance === 'ABSENT'
                                ? 'Vắng mặt'
                                : 'Chưa điểm danh'}
                        </Badge>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {s.attendance === 'PRESENT' || s.attendance === 'LATE' ? (
                          <Button
                            className={cn(
                              'h-9 rounded-xl px-5 text-xs font-black uppercase tracking-widest shadow-lg transition-all',
                              s.isEvaluated
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'
                                : 'bg-primary text-white shadow-primary/20 hover:bg-primary/90'
                            )}
                            onClick={() => {
                              setEvalTarget({ scheduleId: s.id, topic: s.topic })
                              setEvalModalOpen(true)
                            }}
                          >
                            {s.isEvaluated ? (
                              <>
                                <Edit3 className="mr-2 h-3.5 w-3.5" /> Sửa đánh giá
                              </>
                            ) : (
                              <>
                                <Star className="mr-2 h-3.5 w-3.5" /> Đánh giá buổi học
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs font-bold italic text-slate-300">
                            Không khả dụng
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {evalTarget && (
        <SessionEvaluationModal
          open={evalModalOpen}
          onOpenChange={setEvalModalOpen}
          classId={cls.id}
          scheduleId={evalTarget.scheduleId}
          userId={user?.id || ''}
          userName={user?.name || ''}
        />
      )}

      <Modal
        open={membersOpen}
        onClose={closeMembers}
        title="Danh sách thành viên"
        description={cls.name}
        contentWidth="wide"
      >
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="divide-y divide-slate-50 md:hidden">
            {cls.members.map((m) => (
              <div key={m.userId} className="space-y-1 p-4">
                <p className="text-xs font-bold text-slate-700">{m.name}</p>
                <p className="break-all text-xs text-slate-500">{m.email}</p>
                <p className="text-xs font-medium text-slate-500">
                  Vị trí: {m.jobTitle?.trim() || '—'}
                </p>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="h-10 px-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Họ tên
                  </TableHead>
                  <TableHead className="h-10 px-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Email
                  </TableHead>
                  <TableHead className="h-10 px-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Vị trí
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cls.members.map((m) => (
                  <TableRow
                    key={m.userId}
                    className="border-slate-50 transition-colors hover:bg-slate-50/50"
                  >
                    <TableCell className="px-4 py-3 text-xs font-bold text-slate-700">
                      {m.name}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-500">{m.email}</TableCell>
                    <TableCell className="px-4 py-3 text-xs font-medium text-slate-500">
                      {m.jobTitle?.trim() || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Modal>
    </div>
  )
}
