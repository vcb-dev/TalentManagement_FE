import { useMemo, useState, useEffect } from 'react'
import { Calendar, Users, X, Edit3, Loader2 } from 'lucide-react'
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
import {
  useAllExams,
  useCreateClassSchedule,
  useDeleteClassSchedule,
  useManagerClasses,
  useTeacherOptions,
  useUpdateClassSchedule,
  useUpdateManagerClass,
} from '@/features/manager/hooks'
import { formatViDate } from '@/lib/date'
import { useAuthStore } from '@/stores/auth.store'
import { ManagerScreenLayout } from './ManagerScreenLayout'
import { ClassMembersScoresModal } from '@/features/manager/components/ClassMembersScoresModal'
import type { managerClassApiSchema } from '@/features/manager/schemas'

type ManagerClassRow = z.infer<typeof managerClassApiSchema>

const PAGE_SUBTITLE =
  'Quản lý danh sách kỳ thi và người chấm cho từng lớp học. Bạn có thể lọc danh sách theo ngày thi và cập nhật thông tin kỳ thi nhanh chóng.'

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

function examScheduleIsPast(e: { dateIso: string; startTime: string }): boolean {
  const examTime = new Date(`${e.dateIso}T${e.startTime}:00`).getTime()
  return examTime < Date.now()
}

export function ManagerExamScheduleScreen() {
  const [selectedClassIdForScores, setSelectedClassIdForScores] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)
  const canManage =
    user?.permissionIds?.includes('manager.classes') || user?.role === 'BOD' || user?.role === 'HR'
  const { data: exams = [], isLoading: loadingExams } = useAllExams()
  const { data: classes = [] } = useManagerClasses()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredExams = useMemo(() => {
    let result = exams

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (e) => e.className.toLowerCase().includes(q) || e.topic.toLowerCase().includes(q)
      )
    }

    if (startDate || endDate) {
      result = result.filter((e) => {
        const examDateStr = e.dateIso.slice(0, 10)
        if (startDate && examDateStr < startDate) return false
        if (endDate && examDateStr > endDate) return false
        return true
      })
    }

    return result
  }, [exams, startDate, endDate, searchQuery])

  const [examModalOpen, setExamModalOpen] = useState(false)
  const [examModalClassId, setExamModalClassId] = useState<string | null>(null)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)

  const examForm = useForm<{
    examDate: string
    examHour: string
    examMinute: string
    examTeacherQuery: string
    topic: string
  }>({
    defaultValues: {
      examDate: '',
      examHour: '08',
      examMinute: '00',
      examTeacherQuery: '',
      topic: 'Kỳ thi năng lực',
    },
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

  const createSchedule = useCreateClassSchedule()
  const updateSchedule = useUpdateClassSchedule()
  const deleteSchedule = useDeleteClassSchedule()

  const openExamModal = (classId?: string, scheduleId?: string) => {
    setExamModalClassId(classId ?? null)
    setEditingScheduleId(scheduleId ?? null)
    setExamModalOpen(true)

    if (scheduleId) {
      const schedule = exams.find((e) => e.id === scheduleId)
      if (schedule) {
        resetExamForm({
          examDate: schedule.dateIso,
          examHour: schedule.startTime.split(':')[0],
          examMinute: schedule.startTime.split(':')[1],
          examTeacherQuery: '', // will set below
          topic: schedule.topic,
        })
        // Find teacher info if possible
        // (Teacher info might not be in the schedule object, but we have examTeacherUserId)
      }
    } else {
      resetExamForm({
        examDate: '',
        examHour: '08',
        examMinute: '00',
        examTeacherQuery: '',
        topic: 'Kỳ thi năng lực',
      })
      setExamTeacher(null)
    }
  }

  const closeExamModal = () => {
    setExamModalOpen(false)
    setExamModalClassId(null)
    setEditingScheduleId(null)
    resetExamForm()
    setExamTeacher(null)
  }

  const saveExamSchedule = () => {
    if (!examModalClassId) return
    const { examDate, examHour, examMinute, topic } = examForm.getValues()
    if (!examDate.trim()) {
      toast.error('Vui lòng chọn ngày giờ kỳ thi')
      return
    }

    const finalTeacher = isTapSuClass ? (modalClass?.teacher ?? null) : examTeacher
    if (!finalTeacher && !editingScheduleId) {
      toast.error(
        isTapSuClass
          ? 'Lớp tập sự chưa có giáo viên phụ trách để tự động gán người chấm'
          : 'Vui lòng chọn giáo viên phụ trách (đồng thời là người chấm thi)'
      )
      return
    }

    const payload = {
      dateIso: examDate,
      startTime: `${examHour}:${examMinute}`,
      endTime: `${pad2((parseInt(examHour) + 2) % 24)}:${examMinute}`, // default 2 hours
      topic: topic || 'Kỳ thi năng lực',
      isExam: true,
      examTeacherUserId: finalTeacher?.userId,
      examStatus: 'open',
    }

    if (editingScheduleId) {
      updateSchedule.mutate(
        {
          classId: examModalClassId,
          scheduleId: editingScheduleId,
          input: payload,
        },
        { onSuccess: () => closeExamModal() }
      )
    } else {
      createSchedule.mutate(
        {
          classId: examModalClassId,
          input: payload,
        },
        { onSuccess: () => closeExamModal() }
      )
    }
  }

  return (
    <>
      <ManagerScreenLayout hideHubNav hideToolbar>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Lịch thi & Người chấm</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>{PAGE_SUBTITLE}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            {canManage && (
              <Button
                type="button"
                className="h-10 w-full gap-2 rounded-xl px-5 text-xs font-bold shadow-sm sm:w-auto"
                onClick={() => openExamModal()}
              >
                <Calendar className="h-4 w-4" />
                Tạo lịch thi mới
              </Button>
            )}
          </div>
        </div>

        <div className="group relative mb-8 flex flex-col gap-4 rounded-[28px] border border-border/50 bg-white/50 p-4 backdrop-blur-xl shadow-xl shadow-primary/5 transition-all hover:border-primary/20 sm:gap-6 sm:p-6 md:flex-row md:flex-wrap md:items-center">
          <div className="hidden items-center gap-3 border-r border-border/50 pr-6 lg:flex">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
              <Users className="h-5.5 w-5.5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                Bộ lọc
              </p>
              <p className="text-xs font-bold text-foreground">Tìm kiếm & Lọc</p>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
            <div className="relative min-w-0 w-full">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tên lớp học hoặc kỳ thi..."
                className="h-12 w-full rounded-[18px] border-border/60 bg-white pl-11 pr-4 font-bold shadow-sm transition-all hover:border-primary/30 focus:ring-primary/20"
              />
              <Loader2
                className={cn(
                  'absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground/50',
                  loadingExams && 'animate-spin'
                )}
              />
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
              <div className="flex w-full min-w-0 flex-1 flex-col gap-2 rounded-2xl border border-border/40 bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:px-4 sm:py-1.5">
                <span className="shrink-0 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Từ ngày
                </span>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  max={endDate || undefined}
                  className="h-9 w-full min-w-0 border-0 bg-transparent p-0 text-xs font-bold shadow-none focus:ring-0 sm:w-32"
                />
              </div>
              <div className="flex w-full min-w-0 flex-1 flex-col gap-2 rounded-2xl border border-border/40 bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:px-4 sm:py-1.5">
                <span className="shrink-0 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Đến ngày
                </span>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  min={startDate || undefined}
                  className="h-9 w-full min-w-0 border-0 bg-transparent p-0 text-xs font-bold shadow-none focus:ring-0 sm:w-32"
                />
              </div>
            </div>
          </div>

          {(startDate || endDate || searchQuery) && (
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full shrink-0 rounded-[18px] px-6 font-black text-xs uppercase tracking-widest text-rose-500 transition-all hover:bg-rose-50 hover:text-rose-600 sm:w-auto"
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setSearchQuery('')
              }}
            >
              <X className="mr-2 h-4 w-4" strokeWidth={3} />
              Xóa lọc
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Mobile: thẻ — đủ nội dung, nút full width */}
          <div className="divide-y divide-border md:hidden">
            {filteredExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-muted-foreground">
                <Calendar className="mb-4 h-10 w-10 opacity-20" />
                <p className="font-bold">Không tìm thấy kỳ thi nào</p>
                <p className="mt-1 text-center text-xs">
                  Hãy nhấn &quot;Tạo lịch thi mới&quot; để bắt đầu
                </p>
              </div>
            ) : (
              filteredExams.map((e) => {
                const isPast = examScheduleIsPast(e)
                return (
                  <div key={e.id} className="space-y-3 bg-card p-4">
                    <div className="min-w-0">
                      <p className="text-base font-bold leading-snug text-foreground">
                        {e.className}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">{e.topic}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          'text-sm font-black tabular-nums',
                          isPast ? 'text-muted-foreground' : 'text-foreground'
                        )}
                      >
                        {formatViDate(e.dateIso)} lúc {e.startTime}
                      </p>
                      {isPast ? (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                          Đã kết thúc
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600">
                          Sắp diễn ra
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Người chấm
                      </p>
                      <p className="mt-0.5 break-words text-sm font-bold text-foreground">
                        {e.examTeacherName || (e.examTeacherUserId ? 'Đã gán' : 'Chưa gán')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full gap-1.5 rounded-xl border-primary/20 text-xs font-bold text-primary hover:bg-primary/5"
                        onClick={() => setSelectedClassIdForScores(e.classId)}
                      >
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        Học viên & Điểm
                      </Button>
                      {canManage ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-10 min-w-0 flex-1 gap-1.5 rounded-xl text-xs font-bold"
                            onClick={() => openExamModal(e.classId, e.id)}
                          >
                            <Edit3 className="h-3.5 w-3.5 shrink-0" />
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-10 shrink-0 rounded-xl px-3 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => {
                              if (confirm('Bạn có chắc chắn muốn xóa lịch thi này?')) {
                                deleteSchedule.mutate({ classId: e.classId, scheduleId: e.id })
                              }
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop: bảng */}
          <div className="hidden md:block md:overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-4 font-bold text-foreground">Tên lớp & Kỳ thi</th>
                  <th className="px-5 py-4 font-bold text-foreground">Thời gian</th>
                  <th className="px-5 py-4 font-bold text-foreground">Người chấm</th>
                  <th className="px-5 py-4 text-right font-bold text-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Calendar className="mb-4 h-10 w-10 opacity-20" />
                        <p className="font-bold">Không tìm thấy kỳ thi nào</p>
                        <p className="text-xs">Hãy nhấn &quot;Tạo lịch thi mới&quot; để bắt đầu</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredExams.map((e) => {
                    const isPast = examScheduleIsPast(e)

                    return (
                      <tr key={e.id} className="border-b transition-colors hover:bg-muted/20">
                        <td className="px-5 py-5">
                          <p className="font-bold text-foreground leading-tight">{e.className}</p>
                          <span className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            {e.topic}
                          </span>
                        </td>
                        <td className="px-5 py-5">
                          <div className="space-y-1">
                            <p
                              className={cn(
                                'font-black tabular-nums text-sm',
                                isPast ? 'text-muted-foreground' : 'text-foreground'
                              )}
                            >
                              {formatViDate(e.dateIso)} lúc {e.startTime}
                            </p>
                            {isPast ? (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                                Đã kết thúc
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600">
                                Sắp diễn ra
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-5">
                          <p className="text-xs font-bold text-foreground">
                            {e.examTeacherName || (e.examTeacherUserId ? 'Đã gán' : 'Chưa gán')}
                          </p>
                        </td>
                        <td className="px-5 py-5 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 rounded-lg border-primary/20 text-xs font-bold text-primary hover:bg-primary/5"
                              onClick={() => setSelectedClassIdForScores(e.classId)}
                            >
                              <Users className="h-3.5 w-3.5" />
                              Học viên & Điểm
                            </Button>
                            {canManage && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 rounded-lg text-xs font-bold"
                                  onClick={() => openExamModal(e.classId, e.id)}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  Sửa
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                  onClick={() => {
                                    if (confirm('Bạn có chắc chắn muốn xóa lịch thi này?')) {
                                      deleteSchedule.mutate({
                                        classId: e.classId,
                                        scheduleId: e.id,
                                      })
                                    }
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ManagerScreenLayout>

      {examModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[min(92dvh,900px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {editingScheduleId ? 'Chỉnh sửa lịch thi' : 'Thiết lập kỳ thi mới'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={closeExamModal}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground ml-1">Chọn lớp học</label>
                <Select
                  value={examModalClassId ?? ''}
                  onValueChange={setExamModalClassId}
                  disabled={!!editingScheduleId}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-border bg-muted/20 font-bold">
                    <SelectValue placeholder="Chọn lớp..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="font-bold">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground ml-1">
                  Tên kỳ thi (Topic)
                </label>
                <Input
                  {...examForm.register('topic')}
                  placeholder="Ví dụ: Kỳ thi năng lực đợt 1"
                  className="h-10 w-full rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">Ngày thi</label>
                  <DatePicker
                    value={watchedExamDate}
                    onChange={(value) => setExamValue('examDate', value)}
                    min={toLocalDateInputValue(new Date())}
                    className="h-10 w-full rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">Giờ thi</label>
                  <div className="flex items-center gap-2 px-3 py-1 bg-muted/20 rounded-xl border border-border h-10">
                    <Input
                      inputMode="numeric"
                      value={watchedExamHour}
                      onChange={(e) =>
                        setExamValue('examHour', clampTwoDigit(e.target.value, 0, 23))
                      }
                      className="h-7 w-8 border-none bg-transparent p-0 text-center font-bold shadow-none focus-visible:ring-0"
                    />
                    <span className="font-bold text-muted-foreground">:</span>
                    <Input
                      inputMode="numeric"
                      value={watchedExamMinute}
                      onChange={(e) =>
                        setExamValue('examMinute', clampTwoDigit(e.target.value, 0, 59))
                      }
                      className="h-7 w-8 border-none bg-transparent p-0 text-center font-bold shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>

              {!editingScheduleId && (
                <div
                  className={cn('space-y-1.5', isTapSuClass && 'opacity-50 pointer-events-none')}
                >
                  <label className="text-xs font-bold text-muted-foreground ml-1">
                    Người chấm thi
                  </label>
                  <div className="search-dropdown-container relative">
                    {isTapSuClass ? (
                      <div className="h-10 w-full rounded-xl bg-amber-50 border border-amber-100 px-3 flex items-center text-xs text-amber-700 font-bold">
                        Tự động gán: {modalClass?.teacher?.name || '—'}
                      </div>
                    ) : (
                      <>
                        <Input
                          value={watchedExamTeacherQuery}
                          onChange={(e) => setExamValue('examTeacherQuery', e.target.value)}
                          placeholder="Tìm kiếm giáo viên..."
                          className="h-10 w-full rounded-xl"
                        />
                        {watchedExamTeacherQuery.trim().length > 0 &&
                          watchedExamTeacherQuery !== examTeacher?.name && (
                            <div className="absolute z-50 mt-2 max-h-48 w-full overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-xl">
                              {fetchingExamTeachers ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                </div>
                              ) : (
                                examTeacherOptions.map((opt) => (
                                  <Button
                                    key={opt.userId}
                                    variant="ghost"
                                    className="h-auto w-full flex-col items-start px-3 py-2 text-left hover:bg-primary/5 rounded-lg"
                                    onClick={() => {
                                      setExamTeacher(opt)
                                      setExamValue('examTeacherQuery', opt.name)
                                    }}
                                  >
                                    <span className="font-bold text-xs">{opt.name}</span>
                                    <span className="text-xs opacity-60">{opt.email}</span>
                                  </Button>
                                ))
                              )}
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-5 border-t">
              <Button variant="ghost" onClick={closeExamModal} className="font-bold text-xs">
                Hủy
              </Button>
              <Button
                className="font-bold text-xs px-6"
                onClick={saveExamSchedule}
                disabled={!examModalClassId || createSchedule.isPending || updateSchedule.isPending}
              >
                {(createSchedule.isPending || updateSchedule.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedClassIdForScores && (
        <ClassMembersScoresModal
          isOpen={!!selectedClassIdForScores}
          onClose={() => setSelectedClassIdForScores(null)}
          classId={selectedClassIdForScores}
        />
      )}
    </>
  )
}
