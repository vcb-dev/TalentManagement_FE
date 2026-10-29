import { BRAND_BTN_SOLID, BRAND_TEXT } from '@/components/shared/brandButtonStyles'
import { EmployeeAvatar, OrgUserAvatar } from '@/components/shared/EmployeeAvatar'
import { FormDialog } from '@/components/shared/FormDialog'
import { FormSection } from '@/components/shared/FormSection'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { NumberedPaginationBar } from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CriteriaWeightsField } from '@/features/exam-papers/components/CriteriaWeightsField'
import {
  DEFAULT_ESSAY_CRITERIA_WEIGHTS,
  sumCriteriaWeights,
  type EssayCriteriaWeights,
} from '@/features/exam-papers/criteria'
import { useExamPapers } from '@/features/exam-papers/hooks'
import { ClassMembersScoresModal } from '@/features/manager/components/ClassMembersScoresModal'
import {
  useAllExams,
  useCreateClassSchedule,
  useDeleteClassSchedule,
  useManagerClasses,
  useTeacherOptions,
  useUpdateClassSchedule,
} from '@/features/manager/hooks'
import type { managerClassApiSchema } from '@/features/manager/schemas'
import { formatViDate } from '@/lib/date'
import {
  addMinutesToHm,
  examLiveStatus,
  extractCriteriaWeights,
  getExamDurationMinutes,
  mergeScheduleExamQuestions,
} from '@/lib/examScheduleTime'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { BarChart3, Calendar, Loader2, Pencil, Plus, Search, Trash2, UserX, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { ExamManagementTabs } from './ExamManagementTabs'
import { ExamDurationField, ExamPaperPicker } from './ExamPaperAssignmentFields'
import { ManagerScreenLayout } from './ManagerScreenLayout'

type ManagerClassRow = z.infer<typeof managerClassApiSchema>

const FIELD_LABEL = 'block text-xs font-semibold text-muted-foreground'

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

function examBadgeForSchedule(e: Parameters<typeof examLiveStatus>[1]) {
  const s = examLiveStatus(Date.now(), e)
  if (s === 'upcoming')
    return {
      label: 'Sắp diễn ra',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      muted: false,
    }
  if (s === 'live')
    return {
      label: 'Đang diễn ra',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      muted: false,
    }
  return {
    label: 'Đã kết thúc',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    muted: true,
  }
}

/** Số dòng mỗi trang của bảng lịch thi (mockup hiển thị "1 - 10 trong N kết quả"). */
const EXAM_PAGE_SIZE = 10

interface ScoresModalTarget {
  classId: string
  scheduleId: string
  className?: string
  topic?: string
}

export function ManagerExamScheduleScreen() {
  const [scoresModal, setScoresModal] = useState<ScoresModalTarget | null>(null)
  const user = useAuthStore((s) => s.user)
  const canManage =
    user?.permissionIds?.includes('manager.classes') || user?.role === 'BOD' || user?.role === 'HR'
  const { data: exams = [], isLoading: loadingExams } = useAllExams()
  const { data: classes = [] } = useManagerClasses()
  const { data: examPapers = [] } = useExamPapers()
  const paperById = useMemo(() => new Map(examPapers.map((p) => [p.id, p])), [examPapers])

  /** `/all-exams` đôi khi không/chậm có examQuestions trong khi GET /classes (schedules nhúng) đã có — gộp để hiển thị đúng duration. */
  const scheduleExamQuestionsFromClasses = useMemo(() => {
    const m = new Map<string, unknown>()
    for (const c of classes as ManagerClassRow[]) {
      for (const s of c.schedules ?? []) {
        if (s?.id && (s as { examQuestions?: unknown }).examQuestions != null) {
          m.set(s.id, (s as { examQuestions: unknown }).examQuestions)
        }
      }
    }
    return m
  }, [classes])

  function toExamTimelineRow(e: (typeof exams)[number]) {
    const cls = (classes as ManagerClassRow[]).find((c) => c.id === e.classId)
    const mergedQs = mergeScheduleExamQuestions(
      mergeScheduleExamQuestions(e.examQuestions, scheduleExamQuestionsFromClasses.get(e.id)),
      cls?.examQuestions ?? null
    )
    return {
      dateIso: e.dateIso,
      startTime: e.startTime,
      endTime: e.endTime,
      examQuestions: mergedQs,
    }
  }
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

  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [searchQuery, startDate, endDate])

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAM_PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const rangeFrom = filteredExams.length === 0 ? 0 : (currentPage - 1) * EXAM_PAGE_SIZE + 1
  const rangeTo = Math.min(currentPage * EXAM_PAGE_SIZE, filteredExams.length)
  const pagedExams = useMemo(
    () => filteredExams.slice((currentPage - 1) * EXAM_PAGE_SIZE, currentPage * EXAM_PAGE_SIZE),
    [filteredExams, currentPage]
  )

  const [examModalOpen, setExamModalOpen] = useState(false)
  const [examModalClassId, setExamModalClassId] = useState<string | null>(null)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([])
  const [durationInput, setDurationInput] = useState('120')
  const [criteriaWeights, setCriteriaWeights] = useState<EssayCriteriaWeights>(
    DEFAULT_ESSAY_CRITERIA_WEIGHTS
  )

  const togglePaper = (paperId: string) => {
    setSelectedPaperIds((prev) =>
      prev.includes(paperId) ? prev.filter((id) => id !== paperId) : [...prev, paperId]
    )
  }

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

  const classGroups = useMemo(
    () => [
      {
        label: 'Lớp học tri thức',
        items: (classes as ManagerClassRow[]).filter((c) => c.isKnowledgeWork !== false),
      },
      {
        label: 'Lớp học khác',
        items: (classes as ManagerClassRow[]).filter((c) => c.isKnowledgeWork === false),
      },
    ],
    [classes]
  )
  const examEndPreview =
    watchedExamHour && watchedExamMinute && durationInput
      ? addMinutesToHm(
          `${watchedExamHour}:${watchedExamMinute}`,
          Number.parseInt(durationInput, 10) || 0
        )
      : undefined
  const scheduleSummary = (() => {
    if (!watchedExamDate) return 'Chưa chọn ngày thi'
    const d = new Date(`${watchedExamDate}T00:00:00`)
    const day = Number.isNaN(d.getTime())
      ? watchedExamDate
      : d.toLocaleDateString('vi-VN', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
    const start = `${watchedExamHour}:${watchedExamMinute}`
    return examEndPreview ? `${day} · ${start}–${examEndPreview}` : `${day} · ${start}`
  })()

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
        const t = toExamTimelineRow(schedule)
        setDurationInput(String(getExamDurationMinutes(t.examQuestions, t.startTime, t.endTime)))
        setSelectedPaperIds(schedule.examPaperIds ?? [])
        setCriteriaWeights(extractCriteriaWeights(t.examQuestions))
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
      setDurationInput('120')
      setSelectedPaperIds([])
      setCriteriaWeights(DEFAULT_ESSAY_CRITERIA_WEIGHTS)
    }
  }

  const closeExamModal = () => {
    setExamModalOpen(false)
    setExamModalClassId(null)
    setEditingScheduleId(null)
    resetExamForm()
    setExamTeacher(null)
    setDurationInput('120')
    setSelectedPaperIds([])
    setCriteriaWeights(DEFAULT_ESSAY_CRITERIA_WEIGHTS)
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

    const durationMin = Number.parseInt(durationInput.trim(), 10)
    if (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > 1440) {
      toast.error('Thời gian làm bài phải từ 1 đến 1440 phút')
      return
    }
    const weightTotal = sumCriteriaWeights(criteriaWeights)
    if (weightTotal !== 100) {
      toast.error(`Tổng thang điểm 3 tiêu chí tự luận phải bằng 100% (hiện là ${weightTotal}%)`)
      return
    }
    const startHm = `${examHour}:${examMinute}`

    const payload = {
      dateIso: examDate,
      startTime: startHm,
      endTime: addMinutesToHm(startHm, durationMin),
      topic: topic || 'Kỳ thi năng lực',
      isExam: true,
      examTeacherUserId: finalTeacher?.userId,
      examStatus: 'open',
      durationMinutes: durationMin,
      examPaperIds: selectedPaperIds,
      criteriaWeights,
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
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">Lịch thi & Người chấm</h1>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ExamManagementTabs active="/manager/exam-schedule" className="mb-0" />
            {canManage && (
              <Button
                type="button"
                className={cn('h-10 gap-2 rounded-lg px-4 text-sm font-semibold', BRAND_BTN_SOLID)}
                onClick={() => openExamModal()}
              >
                <Plus className="h-4 w-4" />
                Tạo lịch thi mới
              </Button>
            )}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              {loadingExams ? (
                <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : (
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tên lớp học hoặc kỳ thi..."
                className="h-12 w-full rounded-lg border-transparent bg-muted/40 pl-10 pr-4 text-sm shadow-none"
              />
            </div>

            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1">
              <span className="shrink-0 text-[11px] font-bold uppercase text-muted-foreground">
                Từ ngày
              </span>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                max={endDate || undefined}
                className="h-8 w-full min-w-0 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 sm:w-32"
              />
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1">
              <span className="shrink-0 text-[11px] font-bold uppercase text-muted-foreground">
                Đến ngày
              </span>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                min={startDate || undefined}
                className="h-8 w-full min-w-0 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 sm:w-32"
              />
            </div>

            {(startDate || endDate || searchQuery) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Xóa bộ lọc"
                title="Xóa bộ lọc"
                className="h-10 w-10 shrink-0 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                  setSearchQuery('')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Mobile: thẻ — đủ nội dung, nút full width */}
          <div className="divide-y divide-border md:hidden">
            {pagedExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-muted-foreground">
                <Calendar className="mb-4 h-10 w-10 opacity-20" />
                <p className="font-bold">Không tìm thấy kỳ thi nào</p>
                <p className="mt-1 text-center text-xs">
                  Hãy nhấn &quot;Tạo lịch thi mới&quot; để bắt đầu
                </p>
              </div>
            ) : (
              pagedExams.map((e) => {
                const t = toExamTimelineRow(e)
                const badge = examBadgeForSchedule(t)
                const durMin = getExamDurationMinutes(t.examQuestions, t.startTime, t.endTime)
                const endHm = addMinutesToHm(t.startTime, durMin)
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
                          badge.muted ? 'text-muted-foreground' : 'text-foreground'
                        )}
                      >
                        {formatViDate(e.dateIso)} · {e.startTime} – {endHm}
                        <span className="ml-1 font-bold text-muted-foreground">
                          ({durMin} phút)
                        </span>
                      </p>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold',
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Người chấm
                      </p>
                      <p className="mt-0.5 break-words text-sm font-bold text-foreground">
                        {e.examTeacherName || (e.examTeacherUserId ? 'Đã gán' : 'Chưa gán')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Đề thi
                      </p>
                      {e.examPaperIds?.length ? (
                        <p className={cn('mt-0.5 break-words text-sm font-bold', BRAND_TEXT)}>
                          {e.examPaperIds.length} đề:{' '}
                          {e.examPaperIds.map((id) => paperById.get(id)?.code ?? '—').join(', ')}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-sm italic text-muted-foreground">Chưa gán đề</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-10 w-full gap-1.5 rounded-lg border-[#006C49]/30 text-xs font-bold hover:bg-[#006C49]/10',
                          BRAND_TEXT
                        )}
                        onClick={() =>
                          setScoresModal({
                            classId: e.classId,
                            scheduleId: e.id,
                            className: e.className,
                            topic: e.topic,
                          })
                        }
                      >
                        <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                        Học viên & Điểm
                      </Button>
                      {canManage ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-10 min-w-0 flex-1 gap-1.5 rounded-lg text-xs font-bold"
                            onClick={() => openExamModal(e.classId, e.id)}
                          >
                            <Pencil className="h-3.5 w-3.5 shrink-0" />
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label="Xóa lịch thi"
                            className="h-10 shrink-0 rounded-lg px-3 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                            onClick={() => {
                              if (confirm('Bạn có chắc chắn muốn xóa lịch thi này?')) {
                                deleteSchedule.mutate({ classId: e.classId, scheduleId: e.id })
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
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
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-[30%] max-w-[300px] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tên lớp & Kỳ thi
                  </th>
                  <th className="w-[20%] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Thời gian
                  </th>
                  <th className="w-[18%] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Người chấm
                  </th>
                  <th className="w-[20%] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Đề thi & Tình trạng
                  </th>
                  <th className="w-[12%] px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedExams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Calendar className="mb-4 h-10 w-10 opacity-20" />
                        <p className="font-bold">Không tìm thấy kỳ thi nào</p>
                        <p className="text-xs">Hãy nhấn &quot;Tạo lịch thi mới&quot; để bắt đầu</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedExams.map((e) => {
                    const t = toExamTimelineRow(e)
                    const badge = examBadgeForSchedule(t)
                    const durMin = getExamDurationMinutes(t.examQuestions, t.startTime, t.endTime)
                    const endHm = addMinutesToHm(t.startTime, durMin)
                    const graderName = e.examTeacherName || (e.examTeacherUserId ? 'Đã gán' : null)

                    return (
                      <tr key={e.id} className="transition-colors hover:bg-muted/20">
                        <td className="min-w-0 max-w-[300px] px-4 py-3">
                          <p className="truncate text-sm font-semibold leading-tight text-foreground">
                            {e.className}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{e.topic}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-sm font-medium tabular-nums',
                                badge.muted ? 'text-muted-foreground' : 'text-foreground'
                              )}
                            >
                              {formatViDate(e.dateIso)}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight',
                                badge.className
                              )}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                            {e.startTime} – {endHm} ({durMin} phút)
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {graderName ? (
                            <div className="flex items-center gap-2">
                              <OrgUserAvatar
                                name={graderName}
                                className="h-6 w-6 text-[10px] ring-0"
                              />
                              <span className="text-sm font-medium text-foreground">
                                {graderName}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-sm italic text-muted-foreground">
                              <UserX className="h-4 w-4 shrink-0" />
                              Chưa gán
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {e.examPaperIds?.length ? (
                            <p className={cn('text-sm font-medium', BRAND_TEXT)}>
                              {e.examPaperIds.length} đề:{' '}
                              {e.examPaperIds
                                .map((id) => paperById.get(id)?.code ?? '—')
                                .join(', ')}
                            </p>
                          ) : (
                            <p className="text-sm italic text-muted-foreground">Chưa gán đề</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Học viên & Điểm"
                              title="Học viên & Điểm"
                              className={cn('h-8 w-8 rounded-md hover:bg-[#006C49]/10', BRAND_TEXT)}
                              onClick={() =>
                                setScoresModal({
                                  classId: e.classId,
                                  scheduleId: e.id,
                                  className: e.className,
                                  topic: e.topic,
                                })
                              }
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            {canManage && (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Sửa lịch thi"
                                  title="Sửa"
                                  className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                                  onClick={() => openExamModal(e.classId, e.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Xóa lịch thi"
                                  title="Xóa"
                                  className="h-8 w-8 rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                                  onClick={() => {
                                    if (confirm('Bạn có chắc chắn muốn xóa lịch thi này?')) {
                                      deleteSchedule.mutate({
                                        classId: e.classId,
                                        scheduleId: e.id,
                                      })
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
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

          {filteredExams.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Hiển thị{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {rangeFrom} - {rangeTo}
                </span>{' '}
                trong{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {filteredExams.length}
                </span>{' '}
                kết quả
              </p>
              <NumberedPaginationBar
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </div>
      </ManagerScreenLayout>

      <FormDialog
        open={examModalOpen}
        onOpenChange={(open) => {
          if (!open) closeExamModal()
        }}
        title={editingScheduleId ? 'Chỉnh sửa lịch thi' : 'Tạo lịch thi'}
        description="Chọn lớp, thời gian, đề thi và người chấm cho kỳ thi."
        icon={<Calendar className="size-5" />}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{scheduleSummary}</span>
              {' · '}
              {selectedPaperIds.length > 0 ? `${selectedPaperIds.length} đề` : 'chưa chọn đề'}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeExamModal}>
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn('px-5', BRAND_BTN_SOLID)}
                onClick={saveExamSchedule}
                disabled={!examModalClassId || createSchedule.isPending || updateSchedule.isPending}
              >
                {createSchedule.isPending || updateSchedule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {editingScheduleId ? 'Lưu thay đổi' : 'Tạo lịch thi'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <FormSection title="Lớp & kỳ thi">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={FIELD_LABEL}>Lớp học</label>
                <Select
                  value={examModalClassId ?? ''}
                  onValueChange={setExamModalClassId}
                  disabled={!!editingScheduleId}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl" aria-label="Lớp học">
                    <SelectValue placeholder="Chọn lớp..." />
                  </SelectTrigger>
                  {/* Danh sách render qua portal (ngoài FormDialog) → tự gán lại tông xanh. */}
                  <SelectContent className="rounded-xl [--primary:var(--button)]">
                    {classGroups.map((g) =>
                      g.items.length > 0 ? (
                        <SelectGroup key={g.label}>
                          <SelectLabel>{g.label}</SelectLabel>
                          {g.items.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="exam-topic" className={FIELD_LABEL}>
                  Tên kỳ thi
                </label>
                <Input
                  id="exam-topic"
                  {...examForm.register('topic')}
                  placeholder="Ví dụ: Kỳ thi năng lực đợt 1"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Thời gian">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={FIELD_LABEL}>Ngày thi</label>
                <DatePicker
                  value={watchedExamDate}
                  onChange={(value) => setExamValue('examDate', value)}
                  min={toLocalDateInputValue(new Date())}
                  className="h-10 w-full rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="exam-hour" className={FIELD_LABEL}>
                  Giờ bắt đầu
                </label>
                <div className="flex h-10 items-center gap-1 rounded-xl border border-border bg-background px-3 shadow-sm focus-within:ring-2 focus-within:ring-button/35">
                  <Input
                    id="exam-hour"
                    inputMode="numeric"
                    aria-label="Giờ"
                    value={watchedExamHour}
                    onChange={(e) => setExamValue('examHour', clampTwoDigit(e.target.value, 0, 23))}
                    className="h-7 w-8 border-none bg-transparent p-0 text-center font-semibold tabular-nums shadow-none focus-visible:ring-0"
                  />
                  <span className="font-semibold text-muted-foreground">:</span>
                  <Input
                    inputMode="numeric"
                    aria-label="Phút"
                    value={watchedExamMinute}
                    onChange={(e) =>
                      setExamValue('examMinute', clampTwoDigit(e.target.value, 0, 59))
                    }
                    className="h-7 w-8 border-none bg-transparent p-0 text-center font-semibold tabular-nums shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
            <ExamDurationField
              durationInput={durationInput}
              onDurationChange={setDurationInput}
              endTimePreview={examEndPreview}
            />
          </FormSection>

          <FormSection
            title="Đề thi"
            description="Chọn nhiều đề — mỗi học viên được gán ngẫu nhiên 1 đề khi vào thi."
          >
            <ExamPaperPicker selectedPaperIds={selectedPaperIds} onTogglePaper={togglePaper} />
          </FormSection>

          <FormSection title="Chấm thi">
            {!editingScheduleId ? (
              <div className="space-y-1.5">
                <label htmlFor="exam-teacher" className={FIELD_LABEL}>
                  Người chấm thi
                </label>
                {isTapSuClass ? (
                  <p className="rounded-xl border border-warning/30 bg-warning-muted/60 px-3 py-2.5 text-sm text-foreground">
                    Lớp Tập sự tự gán giáo viên phụ trách:{' '}
                    <span className="font-semibold">{modalClass?.teacher?.name || '—'}</span>
                  </p>
                ) : examTeacher ? (
                  <div className="flex items-center gap-3 rounded-xl border border-button/30 bg-button/5 px-3 py-2">
                    <EmployeeAvatar
                      name={examTeacher.name}
                      className="size-8 shadow-none ring-0"
                      fallbackClassName="bg-button/10 text-button"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {examTeacher.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{examTeacher.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 min-h-8 rounded-lg px-3 text-muted-foreground"
                      onClick={() => {
                        setExamTeacher(null)
                        setExamValue('examTeacherQuery', '')
                      }}
                    >
                      Đổi
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="exam-teacher"
                      value={watchedExamTeacherQuery}
                      onChange={(e) => setExamValue('examTeacherQuery', e.target.value)}
                      placeholder="Gõ tên hoặc email giáo viên..."
                      autoComplete="off"
                      className="h-10 rounded-xl pl-9"
                    />
                    {watchedExamTeacherQuery.trim().length > 0 ? (
                      <div className="absolute z-50 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-xl">
                        {fetchingExamTeachers ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-button" />
                          </div>
                        ) : examTeacherOptions.length === 0 ? (
                          <p className="px-3 py-2.5 text-sm text-muted-foreground">
                            Không tìm thấy giáo viên phù hợp.
                          </p>
                        ) : (
                          examTeacherOptions.map((opt) => (
                            <button
                              key={opt.userId}
                              type="button"
                              className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-button/10 focus-visible:bg-button/10 focus-visible:outline-none"
                              onClick={() => {
                                setExamTeacher(opt)
                                setExamValue('examTeacherQuery', opt.name)
                              }}
                            >
                              <span className="text-sm font-semibold text-foreground">
                                {opt.name}
                              </span>
                              <span className="text-xs text-muted-foreground">{opt.email}</span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
            <div className="space-y-2">
              <div>
                <p className={FIELD_LABEL}>Thang điểm tự luận</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Dùng khi lịch thi không gán đề — đề thi đã có thang điểm riêng cho từng câu tự
                  luận.
                </p>
              </div>
              <CriteriaWeightsField
                value={criteriaWeights}
                onChange={setCriteriaWeights}
                idPrefix="schedule-criteria"
              />
            </div>
          </FormSection>
        </div>
      </FormDialog>

      {scoresModal && (
        <ClassMembersScoresModal
          isOpen
          onClose={() => setScoresModal(null)}
          classId={scoresModal.classId}
          scheduleId={scoresModal.scheduleId}
          className={scoresModal.className}
          examTopic={scoresModal.topic}
        />
      )}
    </>
  )
}
