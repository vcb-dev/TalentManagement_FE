import { useQueries } from '@tanstack/react-query'
import { AlertCircle, Calendar, CheckCircle2, Loader2, Users, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
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

function renderExamStatus(examDate: string | null | undefined) {
  if (!examDate) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 shadow-sm">
        <AlertCircle className="h-3 w-3" />
        Chưa xếp lịch
      </span>
    )
  }

  const now = Date.now()
  const start = new Date(examDate).getTime()
  const end = start + 4 * 60 * 60 * 1000 // Giả định kỳ thi diễn ra trong 4 tiếng

  if (now < start) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 shadow-sm">
        <Calendar className="h-3 w-3" />
        Sắp diễn ra
      </span>
    )
  }

  if (now >= start && now <= end) {
    return (
      <span className="relative inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
        Đang diễn ra
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500 shadow-sm opacity-80">
      <CheckCircle2 className="h-3 w-3" />
      Đã kết thúc
    </span>
  )
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

  const totalClasses = classes.length
  const scheduledCount = classes.filter((c) => c.examDate).length
  const pendingCount = totalClasses - scheduledCount
  const overdueCount = classes.filter((c) => {
    if (!c.examDate) return false
    return new Date(c.examDate).getTime() < Date.now()
  }).length

  const anyScheduleFetching = scheduleQueries.some((q) => q.isFetching)

  const [examModalOpen, setExamModalOpen] = useState(false)
  const [showAllClasses, setShowAllClasses] = useState(false) // Mặc định chỉ hiện lớp đã xếp lịch

  const filteredClasses = useMemo(() => {
    if (showAllClasses) return classes
    return classes.filter((c) => c.examDate)
  }, [classes, showAllClasses])

  const [examModalClassId, setExamModalClassId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(true)
  const examForm = useForm<{
    examDate: string
    examHour: string
    examMinute: string
    examTeacherQuery: string
  }>({
    defaultValues: { examDate: '', examHour: '08', examMinute: '00', examTeacherQuery: '' },
  })
  const { setValue: setExamValue, watch: watchExam, reset: resetExamForm } = examForm
  const watchedExamDate = watchExam('examDate')
  const watchedExamHour = watchExam('examHour')
  const watchedExamMinute = watchExam('examMinute')
  const watchedExamTeacherQuery = watchExam('examTeacherQuery')
  const [debouncedExamTeacherQuery, setDebouncedExamTeacherQuery] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedExamTeacherQuery(watchedExamTeacherQuery), 500)
    return () => clearTimeout(t)
  }, [watchedExamTeacherQuery])

  const [examTeacher, setExamTeacher] = useState<{
    userId: string
    name: string
    email: string
  } | null>(null)

  const modalClass = classes.find((c) => c.id === examModalClassId) ?? null
  const isTapSuClass = modalClass?.levelFrom === 'tap_su' && modalClass?.levelTo === 'biet_viec'
  const { data: examTeacherOptions = [], isFetching: fetchingExamTeachers } =
    useTeacherOptions(debouncedExamTeacherQuery)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-dropdown-container')) {
        // Reset query to current selection (or empty) to close dropdown
        setExamValue('examTeacherQuery', examTeacher?.name || '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [examTeacher, setExamValue])

  const updateClass = useUpdateManagerClass()

  const openExamModal = (classId?: string, editing?: boolean) => {
    setExamModalClassId(classId ?? null)
    setExamModalOpen(true)
    setIsCreatingNew(!editing)
    resetExamForm({ examDate: '', examHour: '08', examMinute: '00', examTeacherQuery: '' })
    setExamTeacher(null)
  }

  const closeExamModal = () => {
    setExamModalOpen(false)
    setExamModalClassId(null)
    setIsCreatingNew(true)
    resetExamForm({ examDate: '', examHour: '08', examMinute: '00', examTeacherQuery: '' })
    setExamTeacher(null)
  }

  const saveExamSchedule = () => {
    if (!examModalClassId) return
    const { examDate, examHour, examMinute } = examForm.getValues()
    if (!examDate.trim()) {
      toast.error('Vui lòng chọn ngày giờ kỳ thi')
      return
    }
    const at = new Date(`${examDate}T${examHour}:${examMinute}:00`)
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
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Lịch thi & Người chấm</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>{PAGE_SUBTITLE}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="mr-4 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-1.5 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tất cả lớp
              </span>
              <button
                onClick={() => setShowAllClasses(!showAllClasses)}
                className={cn(
                  'relative h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none',
                  showAllClasses ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <div
                  className={cn(
                    'absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                    showAllClasses ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
            <Button
              type="button"
              className="gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => openExamModal()}
            >
              <Calendar className="h-4 w-4" strokeWidth={2.5} />
              Tạo lịch thi mới
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className={cn(
              'flex flex-col gap-1 rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]',
              CARD_ENTRANCE_HOVER
            )}
          >
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground italic">
                Tổng số lớp
              </div>
              <div className="text-3xl font-bold text-foreground">{totalClasses}</div>
            </div>
          </div>
          <div
            className={cn(
              'flex flex-col gap-1 rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]',
              CARD_ENTRANCE_HOVER
            )}
          >
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-widest text-emerald-600/70 italic">
                Đã xếp lịch
              </div>
              <div className="text-3xl font-bold text-foreground">{scheduledCount}</div>
            </div>
          </div>
          <div
            className={cn(
              'flex flex-col gap-1 rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]',
              CARD_ENTRANCE_HOVER
            )}
          >
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-widest text-amber-600/70 italic">
                Chưa xếp lịch
              </div>
              <div className="text-3xl font-bold text-foreground">{pendingCount}</div>
            </div>
          </div>
          <div
            className={cn(
              'flex flex-col gap-1 rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]',
              CARD_ENTRANCE_HOVER
            )}
          >
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-widest text-rose-600/70 italic">
                Đã kết thúc
              </div>
              <div className="text-3xl font-bold text-foreground">{overdueCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold tracking-tight text-foreground">
            Lịch học buổi theo lớp
          </h3>
          <p className="text-xs text-muted-foreground">
            Lọc theo ngày buổi học (dateIso). Mỗi lớp một nhóm dòng.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
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
            className="mt-auto h-[42px] shrink-0 rounded-xl px-4 font-semibold"
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

      {examModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="mb-8 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {isCreatingNew ? 'Thiết lập kỳ thi mới' : 'Chỉnh sửa lịch thi'}
                  </h3>
                  {modalClass && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Đang xử lý cho lớp:{' '}
                      <span className="font-semibold text-primary">{modalClass.name}</span>
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-muted text-muted-foreground h-10 w-10 rounded-full"
                onClick={closeExamModal}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  1. Chọn lớp học mục tiêu
                </label>
                <Select value={examModalClassId ?? ''} onValueChange={setExamModalClassId}>
                  <SelectTrigger className="h-12 w-full rounded-2xl border-border bg-muted/30 px-4 focus:ring-primary/20">
                    <SelectValue placeholder="Chọn lớp trong danh sách..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border shadow-xl">
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="rounded-xl py-2.5">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  className={cn('space-y-2', !examModalClassId && 'opacity-40 pointer-events-none')}
                >
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
                    2. Ngày & Giờ thi
                  </label>
                  <div className="flex items-center gap-3">
                    <DatePicker
                      value={watchedExamDate}
                      onChange={(value) => setExamValue('examDate', value)}
                      min={toLocalDateInputValue(new Date())}
                      className="h-12 flex-1 rounded-2xl border-border bg-muted/30"
                    />
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 rounded-2xl border border-border">
                      <Input
                        inputMode="numeric"
                        value={watchedExamHour}
                        onChange={(e) =>
                          setExamValue('examHour', clampTwoDigit(e.target.value, 0, 23))
                        }
                        className="h-10 w-12 border-none bg-transparent p-0 text-center text-lg font-bold shadow-none focus-visible:ring-0"
                      />
                      <span className="font-bold text-muted-foreground">:</span>
                      <Input
                        inputMode="numeric"
                        value={watchedExamMinute}
                        onChange={(e) =>
                          setExamValue('examMinute', clampTwoDigit(e.target.value, 0, 59))
                        }
                        className="h-10 w-12 border-none bg-transparent p-0 text-center text-lg font-bold shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'space-y-2',
                    (!examModalClassId || isTapSuClass) && 'opacity-40 pointer-events-none'
                  )}
                >
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
                    3. Giám khảo chấm thi
                  </label>
                  <div className="search-dropdown-container relative">
                    {isTapSuClass ? (
                      <div className="h-12 w-full rounded-2xl bg-amber-50/50 border border-amber-200/50 px-4 flex items-center text-sm text-amber-700 italic">
                        Mặc định là giáo viên phụ trách lớp
                      </div>
                    ) : (
                      <>
                        <Input
                          value={watchedExamTeacherQuery}
                          onChange={(e) => setExamValue('examTeacherQuery', e.target.value)}
                          placeholder="Gõ tên để tìm kiếm..."
                          className="h-12 w-full rounded-2xl border-border bg-muted/30 px-4"
                        />
                        {watchedExamTeacherQuery.trim().length > 0 &&
                          watchedExamTeacherQuery !== examTeacher?.name && (
                            <div className="absolute z-50 mt-2 max-h-48 w-full overflow-auto rounded-2xl border border-border bg-card p-2 shadow-2xl shadow-primary/10">
                              {fetchingExamTeachers ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                </div>
                              ) : (
                                examTeacherOptions.map((opt) => (
                                  <Button
                                    key={opt.userId}
                                    variant="ghost"
                                    className="h-auto w-full flex-col items-start px-4 py-3 text-xs mb-1 rounded-xl"
                                    onClick={() => {
                                      setExamTeacher(opt)
                                      setExamValue('examTeacherQuery', opt.name)
                                    }}
                                  >
                                    <span className="font-bold text-sm">{opt.name}</span>
                                    <span className="text-[10px] opacity-60 mt-0.5">
                                      {opt.email}
                                    </span>
                                  </Button>
                                ))
                              )}
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-4 border-t border-border pt-8">
              <Button
                variant="ghost"
                className="rounded-2xl px-6 font-bold text-muted-foreground hover:text-foreground"
                onClick={closeExamModal}
              >
                Đóng lại
              </Button>
              <Button
                className="rounded-2xl px-10 font-bold shadow-xl shadow-primary/20 h-12"
                onClick={saveExamSchedule}
                disabled={!examModalClassId || updateClass.isPending}
              >
                {updateClass.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                {isCreatingNew ? 'Xác nhận tạo lịch' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          'overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-card)] transition-opacity duration-300',
          anyScheduleFetching && 'opacity-60'
        )}
      >
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border/50">
              <th className="px-5 py-4 font-bold text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Tên lớp
              </th>
              <th className="px-5 py-4 font-bold text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Giáo viên
              </th>
              <th className="px-5 py-4 font-bold text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Trạng thái
              </th>
              <th className="px-5 py-4 font-bold text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Ngày học
              </th>
              <th className="px-5 py-4 font-bold text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Giờ học
              </th>
              <th className="px-5 py-4 font-bold text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Nội dung
              </th>
              <th className="px-5 py-4 font-bold text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Địa điểm
              </th>
              <th className="px-5 py-4 font-bold text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Kỳ thi dự kiến
              </th>
              <th className="px-5 py-4 text-right font-bold text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredClasses.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {showAllClasses
                        ? 'Chưa có lớp nào được tạo.'
                        : 'Chưa có kỳ thi nào được xếp lịch.'}
                    </p>
                    {!showAllClasses && (
                      <Button
                        variant="ghost"
                        className="h-auto p-0 text-xs font-bold text-primary underline-offset-4 hover:bg-transparent hover:underline"
                        onClick={() => setShowAllClasses(true)}
                      >
                        Hiển thị tất cả các lớp
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredClasses.map((c) => {
                const idxInOriginal = classes.findIndex((oc) => oc.id === c.id)
                const q = scheduleQueries[idxInOriginal]
                const rawSchedules = q?.data ?? []
                const schedules = filterSchedulesByRange(
                  rawSchedules,
                  scheduleRange.start,
                  scheduleRange.end
                )
                const loading = q?.isLoading ?? false
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
                        className="font-bold rounded-lg"
                        onClick={() => openExamModal(c.id, hasExamSchedule)}
                      >
                        {hasExamSchedule ? 'Sửa lịch thi' : 'Tạo lịch thi'}
                      </Button>
                    )}
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
                      <td className="px-5 py-4 text-right align-top">{actionCell}</td>
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
                        {hasDateFilter
                          ? 'Không có buổi học trong khoảng đã chọn.'
                          : 'Chưa có buổi học nào được xếp lịch.'}
                      </td>
                      <td className="px-5 py-4 align-top">{examCell}</td>
                      <td className="px-5 py-4 align-top text-right">{actionCell}</td>
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
                        <td className="px-5 py-4 whitespace-nowrap align-top font-mono text-xs tabular-nums">
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
    </ManagerScreenLayout>
  )
}
