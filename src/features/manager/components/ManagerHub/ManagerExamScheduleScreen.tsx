import { useQueries } from '@tanstack/react-query'
import { Calendar, Loader2, X } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { toast } from 'sonner'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { managerApi } from '@/features/manager/api'
import { managerKeys } from '@/features/manager/queryKeys'
import type {
  managerClassApiSchema,
  managerClassScheduleApiSchema,
} from '@/features/manager/schemas'
import {
  useManagerClasses,
  useTeacherOptions,
  useUpdateManagerClass,
} from '@/features/manager/hooks'
import { ManagerScreenLayout } from './ManagerScreenLayout'

type ManagerClassRow = z.infer<typeof managerClassApiSchema>
type ScheduleRow = z.infer<typeof managerClassScheduleApiSchema>

const PAGE_SUBTITLE =
  'Lịch học buổi do giáo viên xếp — lọc theo ngày, xem nội dung từng buổi; cột Lịch thi hiển thị kỳ thi đã đặt. Bấm Tạo lịch thi để đặt/sửa kỳ thi và người chấm.'

function toLocalDateInputValue(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function clampTwoDigit(value: string, min: number, max: number): string {
  const onlyDigits = value.replace(/\D/g, '')
  if (!onlyDigits) return pad2(min)
  const parsed = Number.parseInt(onlyDigits, 10)
  if (Number.isNaN(parsed)) return pad2(min)
  return pad2(Math.min(max, Math.max(min, parsed)))
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

function managerClassStatusUi(status: ManagerClassRow['status']): {
  label: string
  badgeClass: string
} {
  if (status === 'closed')
    return { label: 'Đã ngừng', badgeClass: 'bg-muted text-muted-foreground' }
  if (status === 'full') return { label: 'Đủ chỗ', badgeClass: 'bg-amber-100 text-amber-900' }
  return { label: 'Đang hoạt động', badgeClass: 'bg-emerald-100 text-emerald-900' }
}

function filterSchedulesByRange(
  schedules: ScheduleRow[],
  start?: string,
  end?: string
): ScheduleRow[] {
  const s = start?.trim()
  const e = end?.trim()
  if (!s && !e) return schedules
  return schedules.filter((row) => {
    if (s && row.dateIso < s) return false
    if (e && row.dateIso > e) return false
    return true
  })
}

export function ManagerExamScheduleScreen() {
  const { data: classes = [] } = useManagerClasses()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const scheduleRange = useMemo(() => {
    return { start: startDate.trim() || undefined, end: endDate.trim() || undefined }
  }, [startDate, endDate])
  const hasDateFilter = Boolean(scheduleRange.start || scheduleRange.end)

  const scheduleQueries = useQueries({
    queries: classes.map((c) => ({
      queryKey: managerKeys.classSchedules(c.id),
      queryFn: () => managerApi.classSchedules(c.id),
      enabled: classes.length > 0,
    })),
  })

  const anyScheduleFetching = scheduleQueries.some((q) => q.isFetching)

  const [examModalClassId, setExamModalClassId] = useState<string | null>(null)
  const examForm = useForm<{
    examDate: string
    examHour: string
    examMinute: string
    examTeacherQuery: string
  }>({
    defaultValues: { examDate: '', examHour: '08', examMinute: '00', examTeacherQuery: '' },
  })
  const { setValue: setExamValue, getValues: getExamValues, reset: resetExamForm } = examForm
  const [examTeacher, setExamTeacher] = useState<{
    userId: string
    name: string
    email: string
  } | null>(null)

  const modalClass = classes.find((c) => c.id === examModalClassId) ?? null
  const isTapSuClass = modalClass?.levelFrom === 'tap_su' && modalClass?.levelTo === 'biet_viec'
  const examTeacherQuery = getExamValues('examTeacherQuery')
  const { data: examTeacherOptions = [], isFetching: fetchingExamTeachers } =
    useTeacherOptions(examTeacherQuery)
  const updateClass = useUpdateManagerClass()

  const closeExamModal = () => {
    setExamModalClassId(null)
    resetExamForm({ examDate: '', examHour: '08', examMinute: '00', examTeacherQuery: '' })
  }

  const saveExamSchedule = () => {
    if (!examModalClassId) return
    const values = getExamValues()
    if (!values.examDate.trim()) {
      toast.error('Vui lòng chọn ngày giờ kỳ thi')
      return
    }
    const at = new Date(`${values.examDate}T${values.examHour}:${values.examMinute}:00`)
    if (Number.isNaN(at.getTime())) {
      toast.error('Thời gian thi không hợp lệ')
      return
    }
    if (at.getTime() < new Date().getTime()) {
      toast.error('Chỉ được chọn thời điểm hiện tại hoặc tương lai')
      return
    }
    const finalTeacher = isTapSuClass ? (modalClass?.teacher ?? null) : examTeacher
    if (!finalTeacher) {
      toast.error(
        isTapSuClass
          ? 'Lớp tập sự chưa có giáo viên phụ trách để tự động gán người chấm'
          : 'Vui lòng chọn giáo viên phụ trách (đồng thời là người chấm thi)'
      )
      return
    }
    updateClass.mutate(
      {
        classId: examModalClassId,
        input: {
          examDate: at.toISOString(),
          teacherUserId: finalTeacher.userId,
          status: 'open',
        },
      },
      { onSuccess: () => closeExamModal() }
    )
  }

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className={cn('min-w-0', PAGE_HEADER_SURFACE)}>
          <h1 className={PAGE_HEADER_TITLE}>
            <span className={PAGE_HEADER_GRADIENT}>Lịch thi</span>
          </h1>
          <p className={PAGE_HEADER_DESCRIPTION}>{PAGE_SUBTITLE}</p>
        </div>

        <div>
          <h3 className="text-base font-bold tracking-tight text-foreground">
            Lịch học buổi theo lớp
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Lọc theo ngày buổi học (dateIso). Mỗi lớp một nhóm dòng.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="block min-w-[10rem] flex-1 text-xs font-semibold text-muted-foreground sm:max-w-[13rem]">
              Từ ngày
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                max={endDate || undefined}
                className="mt-1 h-[42px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block min-w-[10rem] flex-1 text-xs font-semibold text-muted-foreground sm:max-w-[13rem]">
              Đến ngày
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                min={startDate || undefined}
                className="mt-1 h-[42px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-xl"
              disabled={!hasDateFilter}
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
            >
              Xóa lọc
            </Button>
          </div>
        </div>

        <div
          className={cn(
            'overflow-x-auto rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10 transition-opacity',
            anyScheduleFetching && 'opacity-70'
          )}
        >
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
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
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Lịch thi
                </th>
                <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Chưa có lớp nào.
                  </td>
                </tr>
              ) : (
                classes.map((c, idx) => {
                  const q = scheduleQueries[idx]
                  const rawSchedules = q?.data ?? []
                  const schedules = filterSchedulesByRange(
                    rawSchedules,
                    scheduleRange.start,
                    scheduleRange.end
                  )
                  const loading = q?.isLoading ?? false
                  const st = managerClassStatusUi(c.status)
                  const teacherName = c.teacher?.name || '—'
                  const rowCount = Math.max(1, schedules.length)
                  const examText = formatExamViShort(c.examDate)

                  const examCell = (
                    <div className="space-y-0.5">
                      <span className="font-medium text-foreground">{examText}</span>
                      {c.examDate && c.teacher?.name ? (
                        <p className="text-[11px] text-muted-foreground">Chấm: {c.teacher.name}</p>
                      ) : null}
                    </div>
                  )

                  const hasExamSchedule = Boolean(c.examDate)
                  let isExamEnded = false
                  if (c.examDate) {
                    const examTime = new Date(c.examDate).getTime()
                    if (!Number.isNaN(examTime) && examTime < Date.now()) {
                      isExamEnded = true
                    }
                  }

                  const actionCell = (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {isExamEnded ? (
                        <span className="text-sm font-semibold text-rose-600">
                          Lịch thi đã kết thúc
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="font-bold"
                          onClick={() => setExamModalClassId(c.id)}
                        >
                          {hasExamSchedule ? 'Sửa lịch thi' : 'Tạo lịch thi'}
                        </Button>
                      )}
                    </div>
                  )

                  if (loading && !q?.data) {
                    return (
                      <tr key={c.id} className="border-t border-border/80 bg-card">
                        <td className="px-3 py-3 font-semibold text-foreground">{c.name}</td>
                        <td className="px-3 py-3 text-foreground">{teacherName}</td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                              st.badgeClass
                            )}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                          <span className="inline-flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải lịch học buổi…
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">{examCell}</td>
                        <td className="px-3 py-3 text-right align-top">{actionCell}</td>
                      </tr>
                    )
                  }

                  if (schedules.length === 0) {
                    return (
                      <tr key={c.id} className="border-t border-border/80 bg-card">
                        <td className="px-3 py-3 align-top font-semibold text-foreground">
                          {c.name}
                        </td>
                        <td className="px-3 py-3 align-top text-foreground">{teacherName}</td>
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
                            ? 'Không có buổi học trong khoảng đã chọn.'
                            : 'Chưa có buổi học nào được xếp lịch.'}
                        </td>
                        <td className="px-3 py-3 align-top">{examCell}</td>
                        <td className="px-3 py-3 align-top text-right">{actionCell}</td>
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
                                className="px-3 py-2.5 align-top font-semibold text-foreground"
                                rowSpan={rowCount}
                              >
                                {c.name}
                              </td>
                              <td
                                className="px-3 py-2.5 align-top text-foreground"
                                rowSpan={rowCount}
                              >
                                {teacherName}
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
                          {sIdx === 0 ? (
                            <td className="px-3 py-2.5 align-top" rowSpan={rowCount}>
                              {examCell}
                            </td>
                          ) : null}
                          {sIdx === 0 ? (
                            <td className="px-3 py-2.5 align-top text-right" rowSpan={rowCount}>
                              {actionCell}
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
      </div>

      {examModalClassId && modalClass ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-xl rounded-2xl border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Calendar className="h-5 w-5 text-primary" strokeWidth={2} />
                  {modalClass.examDate ? 'Sửa lịch thi' : 'Tạo lịch thi'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">Lớp: {modalClass.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Đang lưu: {formatExamViShort(modalClass.examDate)}
                  {modalClass.teacher?.name ? ` — ${modalClass.teacher.name} chấm` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
                onClick={closeExamModal}
                aria-label="Đóng"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Thời gian thi
                </label>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <DatePicker
                      value={getExamValues('examDate')}
                      onChange={(value) => setExamValue('examDate', value)}
                      min={toLocalDateInputValue(new Date())}
                      className="h-[38px] rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
                    />
                    <div className="flex items-center gap-1.5">
                      <Input
                        inputMode="numeric"
                        value={getExamValues('examHour')}
                        onChange={(e) =>
                          setExamValue('examHour', clampTwoDigit(e.target.value, 0, 23))
                        }
                        onBlur={(e) =>
                          setExamValue('examHour', clampTwoDigit(e.target.value, 0, 23))
                        }
                        className="h-[38px] w-[64px] rounded-lg border border-border bg-background px-2 py-0 text-center text-sm font-semibold shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                        aria-label="Giờ thi (00-23)"
                      />
                      <span className="text-sm font-bold text-muted-foreground">:</span>
                      <Input
                        inputMode="numeric"
                        value={getExamValues('examMinute')}
                        onChange={(e) =>
                          setExamValue('examMinute', clampTwoDigit(e.target.value, 0, 59))
                        }
                        onBlur={(e) =>
                          setExamValue('examMinute', clampTwoDigit(e.target.value, 0, 59))
                        }
                        className="h-[38px] w-[64px] rounded-lg border border-border bg-background px-2 py-0 text-center text-sm font-semibold shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                        aria-label="Phút thi (00-59)"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Giáo viên phụ trách (người chấm thi)
                </label>
                {isTapSuClass ? (
                  <Input
                    value={modalClass.teacher?.name || 'Chưa gán giáo viên phụ trách lớp'}
                    disabled
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground shadow-none outline-none"
                  />
                ) : (
                  <>
                    <Input
                      value={getExamValues('examTeacherQuery')}
                      onChange={(e) => setExamValue('examTeacherQuery', e.target.value)}
                      placeholder="Gõ tên/email giáo viên..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                    {examTeacherQuery.trim().length > 0 ? (
                      <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-card p-1 shadow-lg">
                        {fetchingExamTeachers ? (
                          <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Đang tìm...
                          </div>
                        ) : examTeacherOptions.length === 0 ? (
                          <div className="px-2 py-2 text-xs text-muted-foreground">
                            Không có kết quả phù hợp
                          </div>
                        ) : (
                          examTeacherOptions.map((opt) => (
                            <Button
                              key={opt.userId}
                              type="button"
                              variant="ghost"
                              className="flex h-auto w-full flex-col items-start rounded px-2 py-2 text-left text-xs font-normal hover:bg-primary/10"
                              onClick={() => {
                                setExamTeacher(opt)
                                setExamValue('examTeacherQuery', '')
                              }}
                            >
                              <p className="font-semibold text-foreground">{opt.name}</p>
                              <p className="text-muted-foreground">{opt.email}</p>
                            </Button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeExamModal}>
                Hủy
              </Button>
              <Button
                type="button"
                className="font-bold"
                onClick={saveExamSchedule}
                disabled={updateClass.isPending}
              >
                {updateClass.isPending
                  ? 'Đang lưu...'
                  : modalClass.examDate
                    ? 'Lưu chỉnh sửa'
                    : 'Lưu lịch thi'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ManagerScreenLayout>
  )
}
