import { useQueries } from '@tanstack/react-query'
import { Calendar, CheckSquare, Circle, FileUp, ListPlus, Loader2, Trash2, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { managerApi } from '@/features/manager/api'
import { managerKeys } from '@/features/manager/queryKeys'
import { managerClassApiSchema, managerClassScheduleApiSchema } from '@/features/manager/schemas'
import {
  useManagerClasses,
  useTeacherOptions,
  useUpdateManagerClass,
} from '@/features/manager/hooks'
import { ManagerScreenLayout } from './ManagerScreenLayout'

type ManagerClassRow = z.infer<typeof managerClassApiSchema>
type ScheduleRow = z.infer<typeof managerClassScheduleApiSchema>
type QuestionItem = { id: string; stem: string; options: string[] }
type ComposeQuestionType = 'single' | 'multiple' | 'text'
type ComposeQuestion = {
  id: string
  title: string
  type: ComposeQuestionType
  required: boolean
  options: string[]
}
type QuestionBankPayload = {
  title: string
  questions: QuestionItem[]
  updatedAt: string
}

const PAGE_SUBTITLE =
  'Lịch học buổi do giáo viên xếp — lọc theo ngày, xem nội dung từng buổi; cột Lịch thi hiển thị kỳ thi đã đặt. Bấm Tạo lịch thi để đặt/sửa kỳ thi và người chấm.'

function toLocalDateInputValue(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toLocalTimeParts(value: Date): { hour: string; minute: string } {
  return { hour: pad2(value.getHours()), minute: pad2(value.getMinutes()) }
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

function parseQuestionsFromText(raw: string): QuestionItem[] {
  const lines = raw
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
  if (lines.length === 0) return []

  const qStart = /^(\d+[\).\:-]\s+|Câu\s*\d+[:.)-]?\s*)/i
  const optionLine = /^([A-H][\).\:-]\s+|[-*]\s+)/i

  const chunks: string[][] = []
  for (const line of lines) {
    if (qStart.test(line) || chunks.length === 0) chunks.push([line])
    else chunks[chunks.length - 1]!.push(line)
  }

  return chunks.map((chunk, idx) => {
    let stem = chunk[0]!.replace(qStart, '').trim()
    const options: string[] = []
    for (const line of chunk.slice(1)) {
      if (optionLine.test(line)) options.push(line.replace(optionLine, '').trim())
      else stem += ` ${line}`
    }
    return {
      id: `q-${idx + 1}`,
      stem,
      options,
    }
  })
}

function newComposeQuestion(seed?: number): ComposeQuestion {
  const fallback = Date.now()
  return {
    id: `cq-${seed ?? fallback}`,
    title: '',
    type: 'single',
    required: true,
    options: ['Lựa chọn 1', 'Lựa chọn 2'],
  }
}

function questionItemsToCompose(items: QuestionItem[]): ComposeQuestion[] {
  if (items.length === 0) return [newComposeQuestion()]
  return items.map((item, idx) => ({
    id: `cq-${idx + 1}`,
    title: item.stem,
    type: item.options.length > 0 ? 'single' : 'text',
    required: true,
    options: item.options.length > 0 ? item.options : [],
  }))
}

function composeToQuestionItems(compose: ComposeQuestion[]): QuestionItem[] {
  return compose
    .map((q, idx) => ({
      id: `q-${idx + 1}`,
      stem: q.title.trim(),
      options: q.type === 'text' ? [] : q.options.map((x) => x.trim()).filter((x) => x.length > 0),
    }))
    .filter((q) => q.stem.length > 0)
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
  const [examDate, setExamDate] = useState('')
  const [examHour, setExamHour] = useState('08')
  const [examMinute, setExamMinute] = useState('00')
  const [examTeacherQuery, setExamTeacherQuery] = useState('')
  const [examTeacher, setExamTeacher] = useState<{
    userId: string
    name: string
    email: string
  } | null>(null)
  const [questionBankByClass, setQuestionBankByClass] = useState<
    Record<string, QuestionBankPayload>
  >({})
  const [assignmentModalClassId, setAssignmentModalClassId] = useState<string | null>(null)
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentMode, setAssignmentMode] = useState<'upload' | 'compose'>('upload')
  const [questionRawInput, setQuestionRawInput] = useState('')
  const [questionDraft, setQuestionDraft] = useState<QuestionItem[]>([])
  const [composeQuestions, setComposeQuestions] = useState<ComposeQuestion[]>([
    newComposeQuestion(),
  ])

  const modalClass = classes.find((c) => c.id === examModalClassId) ?? null
  const assignmentClass = classes.find((c) => c.id === assignmentModalClassId) ?? null
  const isTapSuClass = modalClass?.levelFrom === 'tap_su' && modalClass?.levelTo === 'biet_viec'
  const { data: examTeacherOptions = [], isFetching: fetchingExamTeachers } =
    useTeacherOptions(examTeacherQuery)
  const updateClass = useUpdateManagerClass()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('manager_exam_question_bank_v1')
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, QuestionBankPayload>
      setQuestionBankByClass(parsed)
    } catch {
      // ignore invalid local cache
    }
  }, [])

  useEffect(() => {
    if (!examModalClassId) {
      setExamDate('')
      setExamHour('08')
      setExamMinute('00')
      setExamTeacher(null)
      setExamTeacherQuery('')
      return
    }
    const c = classes.find((x) => x.id === examModalClassId)
    if (!c) return
    if (c.examDate) {
      const d = new Date(c.examDate)
      setExamDate(toLocalDateInputValue(d))
      const t = toLocalTimeParts(d)
      setExamHour(t.hour)
      setExamMinute(t.minute)
    } else {
      const now = new Date()
      setExamDate(toLocalDateInputValue(now))
      setExamHour(toLocalTimeParts(now).hour)
      setExamMinute(toLocalTimeParts(now).minute)
    }
    setExamTeacher(c.teacher ?? null)
    setExamTeacherQuery('')
  }, [examModalClassId, classes])

  const closeExamModal = () => {
    setExamModalClassId(null)
    setExamTeacherQuery('')
  }

  const openAssignmentModal = (classId: string) => {
    setAssignmentModalClassId(classId)
    const current = questionBankByClass[classId]
    setAssignmentTitle(
      current?.title || `Đề thi lớp ${classes.find((c) => c.id === classId)?.name || ''}`.trim()
    )
    setQuestionDraft(current?.questions ?? [])
    setComposeQuestions(questionItemsToCompose(current?.questions ?? []))
    setAssignmentMode('upload')
    setQuestionRawInput('')
  }

  const closeAssignmentModal = () => {
    setAssignmentModalClassId(null)
    setQuestionRawInput('')
  }

  const onUploadQuestionFile = async (file: File) => {
    const text = await file.text()
    setQuestionRawInput(text)
    const parsed = parseQuestionsFromText(text)
    setQuestionDraft(parsed)
    toast.success(`Đã đọc ${parsed.length} câu hỏi từ file`)
  }

  const parseRawQuestions = () => {
    const parsed = parseQuestionsFromText(questionRawInput)
    setQuestionDraft(parsed)
    toast.success(`Đã format ${parsed.length} câu hỏi`)
  }

  const addComposeQuestion = () => {
    setComposeQuestions((prev) => [...prev, newComposeQuestion(prev.length + 1)])
  }

  const removeComposeQuestion = (id: string) => {
    setComposeQuestions((prev) => {
      const next = prev.filter((q) => q.id !== id)
      return next.length > 0 ? next : [newComposeQuestion()]
    })
  }

  const updateComposeQuestion = (id: string, updater: (q: ComposeQuestion) => ComposeQuestion) => {
    setComposeQuestions((prev) => prev.map((q) => (q.id === id ? updater(q) : q)))
  }

  const addOption = (questionId: string) => {
    updateComposeQuestion(questionId, (q) => ({
      ...q,
      options: [...q.options, `Lựa chọn ${q.options.length + 1}`],
    }))
  }

  const removeOption = (questionId: string, idx: number) => {
    updateComposeQuestion(questionId, (q) => ({
      ...q,
      options: q.options.filter((_, i) => i !== idx),
    }))
  }

  const saveQuestionBank = () => {
    if (!assignmentModalClassId) return
    const finalQuestions =
      assignmentMode === 'compose' ? composeToQuestionItems(composeQuestions) : questionDraft
    if (finalQuestions.length === 0) {
      toast.error('Chưa có câu hỏi để lưu')
      return
    }
    const next: Record<string, QuestionBankPayload> = {
      ...questionBankByClass,
      [assignmentModalClassId]: {
        title: assignmentTitle.trim() || 'Bộ câu hỏi',
        questions: finalQuestions,
        updatedAt: new Date().toISOString(),
      },
    }
    setQuestionBankByClass(next)
    localStorage.setItem('manager_exam_question_bank_v1', JSON.stringify(next))
    toast.success('Đã lưu bộ câu hỏi cho lớp')
    closeAssignmentModal()
  }

  const saveExamSchedule = () => {
    if (!examModalClassId) return
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
        <div className={cn('min-w-0', PAGE_HEADER_SURFACE)}>
          <h1 className={PAGE_HEADER_TITLE}>
            <span className={PAGE_HEADER_GRADIENT}>Lịch thi & chỉ định người chấm</span>
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
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <label className="block min-w-[10rem] flex-1 text-xs font-semibold text-muted-foreground sm:max-w-[13rem]">
              Đến ngày
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
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
                  const hasQuestionBank = Boolean(questionBankByClass[c.id])
                  const actionCell = (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="font-bold"
                        onClick={() => openAssignmentModal(c.id)}
                      >
                        {hasQuestionBank ? 'Sửa bài thi' : 'Tạo bài thi'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="font-bold"
                        onClick={() => setExamModalClassId(c.id)}
                      >
                        {hasExamSchedule ? 'Sửa lịch thi' : 'Tạo lịch thi'}
                      </Button>
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
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                onClick={closeExamModal}
                aria-label="Đóng"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Thời gian thi
                </label>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      min={toLocalDateInputValue(new Date())}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        inputMode="numeric"
                        value={examHour}
                        onChange={(e) => setExamHour(clampTwoDigit(e.target.value, 0, 23))}
                        onBlur={(e) => setExamHour(clampTwoDigit(e.target.value, 0, 23))}
                        className="h-[38px] w-[64px] rounded-lg border border-border bg-background px-2 text-center text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        aria-label="Giờ thi (00-23)"
                      />
                      <span className="text-sm font-bold text-muted-foreground">:</span>
                      <input
                        inputMode="numeric"
                        value={examMinute}
                        onChange={(e) => setExamMinute(clampTwoDigit(e.target.value, 0, 59))}
                        onBlur={(e) => setExamMinute(clampTwoDigit(e.target.value, 0, 59))}
                        className="h-[38px] w-[64px] rounded-lg border border-border bg-background px-2 text-center text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  <input
                    value={modalClass.teacher?.name || 'Chưa gán giáo viên phụ trách lớp'}
                    disabled
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground outline-none"
                  />
                ) : (
                  <>
                    <input
                      value={examTeacherQuery}
                      onChange={(e) => setExamTeacherQuery(e.target.value)}
                      placeholder="Gõ tên/email giáo viên..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                            <button
                              key={opt.userId}
                              type="button"
                              className="block w-full rounded px-2 py-2 text-left text-xs hover:bg-primary/10"
                              onClick={() => {
                                setExamTeacher(opt)
                                setExamTeacherQuery('')
                              }}
                            >
                              <p className="font-semibold text-foreground">{opt.name}</p>
                              <p className="text-muted-foreground">{opt.email}</p>
                            </button>
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

      {assignmentModalClassId && assignmentClass ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-3xl rounded-2xl border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <FileUp className="h-5 w-5 text-primary" strokeWidth={2} />
                  {questionBankByClass[assignmentClass.id] ? 'Sửa bộ bài thi' : 'Tạo bộ bài thi'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">Lớp: {assignmentClass.name}</p>
              </div>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                onClick={closeAssignmentModal}
                aria-label="Đóng"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Tên bộ đề
                </label>
                <input
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  placeholder="Ví dụ: Bộ đề tập sự tháng 04/2026"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAssignmentMode('upload')}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                    assignmentMode === 'upload'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                >
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode('compose')}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                    assignmentMode === 'compose'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                >
                  Tự soạn câu hỏi
                </button>
              </div>

              {assignmentMode === 'upload' ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      Upload file câu hỏi
                    </label>
                    <input
                      type="file"
                      accept=".txt,.md,.csv,text/plain,text/markdown"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void onUploadQuestionFile(file)
                      }}
                      className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary hover:file:bg-primary/20"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Hỗ trợ txt/md/csv. Mỗi câu nên bắt đầu bằng số thứ tự (vd: 1. / Câu 1:) để
                      parse chuẩn hơn.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      Nhập/chỉnh nội dung câu hỏi thô
                    </label>
                    <textarea
                      value={questionRawInput}
                      onChange={(e) => setQuestionRawInput(e.target.value)}
                      placeholder={
                        '1. Câu hỏi số 1\nA. Đáp án A\nB. Đáp án B\n\n2. Câu hỏi số 2\nA. ...'
                      }
                      className="min-h-[170px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={parseRawQuestions}>
                        Format bộ câu hỏi
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-3">
                  {composeQuestions.map((q, qIdx) => (
                    <div key={q.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">Câu hỏi {qIdx + 1}</p>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                          onClick={() => removeComposeQuestion(q.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xóa
                        </button>
                      </div>
                      <input
                        value={q.title}
                        onChange={(e) =>
                          updateComposeQuestion(q.id, (x) => ({ ...x, title: e.target.value }))
                        }
                        placeholder="Câu hỏi chưa có tiêu đề"
                        className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
                        <select
                          value={q.type}
                          onChange={(e) =>
                            updateComposeQuestion(q.id, (x) => ({
                              ...x,
                              type: e.target.value as ComposeQuestionType,
                              options:
                                e.target.value === 'text'
                                  ? []
                                  : x.options.length > 0
                                    ? x.options
                                    : ['Lựa chọn 1', 'Lựa chọn 2'],
                            }))
                          }
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="single">Trắc nghiệm (1 đáp án)</option>
                          <option value="multiple">Trắc nghiệm (nhiều đáp án)</option>
                          <option value="text">Tự luận ngắn</option>
                        </select>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) =>
                              updateComposeQuestion(q.id, (x) => ({
                                ...x,
                                required: e.target.checked,
                              }))
                            }
                          />
                          Bắt buộc
                        </label>
                        <div className="text-xs text-muted-foreground">
                          {q.type === 'text' ? 'Trả lời văn bản' : 'Dạng lựa chọn'}
                        </div>
                      </div>

                      {q.type !== 'text' ? (
                        <div className="mt-3 space-y-2">
                          {q.options.map((opt, oi) => (
                            <div key={`${q.id}-${oi}`} className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {q.type === 'single' ? (
                                  <Circle className="h-4 w-4" />
                                ) : (
                                  <CheckSquare className="h-4 w-4" />
                                )}
                              </span>
                              <input
                                value={opt}
                                onChange={(e) =>
                                  updateComposeQuestion(q.id, (x) => ({
                                    ...x,
                                    options: x.options.map((v, i) =>
                                      i === oi ? e.target.value : v
                                    ),
                                  }))
                                }
                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                placeholder={`Lựa chọn ${oi + 1}`}
                              />
                              <button
                                type="button"
                                className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                                onClick={() => removeOption(q.id, oi)}
                              >
                                Xóa
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                            onClick={() => addOption(q.id)}
                          >
                            <ListPlus className="h-3.5 w-3.5" />
                            Thêm lựa chọn
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={addComposeQuestion}>
                      Thêm câu hỏi
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Xem trước (
                  {assignmentMode === 'compose'
                    ? composeToQuestionItems(composeQuestions).length
                    : questionDraft.length}{' '}
                  câu)
                </p>
                <div className="max-h-56 space-y-2 overflow-auto pr-1">
                  {(assignmentMode === 'compose'
                    ? composeToQuestionItems(composeQuestions)
                    : questionDraft
                  ).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {assignmentMode === 'compose'
                        ? 'Chưa có câu hỏi hợp lệ. Vui lòng nhập tiêu đề cho từng câu.'
                        : 'Chưa có câu hỏi. Upload file hoặc nhập nội dung rồi bấm "Format bộ câu hỏi".'}
                    </p>
                  ) : (
                    (assignmentMode === 'compose'
                      ? composeToQuestionItems(composeQuestions)
                      : questionDraft
                    ).map((q, idx) => (
                      <div
                        key={q.id}
                        className="rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-foreground">
                          Câu {idx + 1}: {q.stem}
                        </p>
                        {q.options.length > 0 ? (
                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {q.options.map((opt, oi) => (
                              <p key={`${q.id}-${oi}`}>
                                {String.fromCharCode(65 + oi)}. {opt}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeAssignmentModal}>
                Hủy
              </Button>
              <Button type="button" className="font-bold" onClick={saveQuestionBank}>
                Lưu bộ bài thi
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ManagerScreenLayout>
  )
}
