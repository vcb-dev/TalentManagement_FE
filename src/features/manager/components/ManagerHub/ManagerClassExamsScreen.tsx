import { Link } from '@tanstack/react-router'
import { CheckSquare, Circle, FileUp, ListPlus, Loader2, Trash2, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { InputController, TextareaController } from '@/components/ui/form-controllers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { managerClassApiSchema } from '@/features/manager/schemas'
import {
  useClassSchedules,
  useManagerClasses,
  useSaveExamQuestions,
  useSaveScheduleExamQuestions,
} from '@/features/manager/hooks'
import { ManagerScreenLayout } from './ManagerScreenLayout'
import { ClassMembersScoresModal } from '@/features/manager/components/ClassMembersScoresModal'

type ManagerClassRow = z.infer<typeof managerClassApiSchema>
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
  duration: number
  questions: QuestionItem[]
  updatedAt: string
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

function ClassSchedulesList({
  classId,
  onEditExam,
  questionBank,
}: {
  classId: string
  onEditExam: (sid: string) => void
  questionBank: Record<string, QuestionBankPayload>
}) {
  const { data: schedules = [] } = useClassSchedules(classId)
  const examSchedules = schedules.filter((s) => s.isExam)

  if (examSchedules.length === 0) return null

  return (
    <div className="mt-3 w-full space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left px-1">
        Các buổi thi đã lên lịch:
      </p>
      <div className="flex flex-col gap-1.5 w-full">
        {examSchedules.map((s) => {
          const bank = questionBank[s.id]
          const hasQuestions = !!bank
          return (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 p-2 rounded-lg border border-primary/10 bg-primary/5 group"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">{s.topic}</span>
                <span className="text-[10px] text-muted-foreground">
                  {s.dateIso} · {s.startTime} - {s.endTime}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded',
                    hasQuestions ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {hasQuestions ? `${bank.questions.length} câu` : 'Chưa có đề'}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] font-bold bg-white border shadow-sm hover:bg-primary/5 hover:text-primary"
                  onClick={() => onEditExam(s.id)}
                >
                  {hasQuestions ? 'Sửa đề' : 'Tạo đề'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ManagerClassExamsScreen() {
  const [selectedClassIdForScores, setSelectedClassIdForScores] = useState<string | null>(null)
  const { data: rawClasses = [], isLoading } = useManagerClasses()
  const classes = useMemo(() => {
    return (rawClasses as any[]).filter((c) => (c.schedules ?? []).some((s: any) => s.isExam))
  }, [rawClasses])

  const saveQuestionsMutation = useSaveExamQuestions()
  const saveScheduleQuestionsMutation = useSaveScheduleExamQuestions()

  const [assignmentModalClassId, setAssignmentModalClassId] = useState<string | null>(null)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)

  const { data: schedules = [] } = useClassSchedules(assignmentModalClassId || '')
  const examSchedules = schedules.filter((s) => s.isExam)

  const [questionBankByClass, setQuestionBankByClass] = useState<
    Record<string, QuestionBankPayload>
  >({})

  // Sync questionBankByClass from the API data
  useEffect(() => {
    if (classes.length > 0) {
      setQuestionBankByClass((prev) => {
        const next = { ...prev }
        classes.forEach((c) => {
          if (c.examQuestions) {
            next[c.id] = c.examQuestions as QuestionBankPayload
          } else {
            // If server says null, we must remove it from local state to avoid stale localStorage data
            delete next[c.id]
          }
        })

        // Also handle schedule-specific questions
        if (assignmentModalClassId && examSchedules.length > 0) {
          examSchedules.forEach((s) => {
            if (s.examQuestions) {
              next[s.id] = s.examQuestions as QuestionBankPayload
            } else {
              delete next[s.id]
            }
          })
        }
        return next
      })
    }
  }, [classes, assignmentModalClassId, schedules])

  useEffect(() => {
    // Initial load from localStorage
    try {
      const raw = localStorage.getItem('manager_exam_question_bank_v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        setQuestionBankByClass((prev) => ({ ...parsed, ...prev }))
      }
    } catch {}
  }, [])
  const [questionDraft, setQuestionDraft] = useState<QuestionItem[]>([])
  const [composeQuestions, setComposeQuestions] = useState<ComposeQuestion[]>([
    newComposeQuestion(),
  ])
  const assignmentForm = useForm<{
    title: string
    duration: number
    mode: 'upload' | 'compose'
    rawInput: string
  }>({
    defaultValues: { title: '', duration: 60, mode: 'upload', rawInput: '' },
  })
  const {
    control: assignmentControl,
    watch: watchAssignment,
    setValue: setAssignmentValue,
    getValues: getAssignmentValues,
    reset: resetAssignmentForm,
  } = assignmentForm
  const assignmentMode = watchAssignment('mode')

  const assignmentClass = classes.find((c) => c.id === assignmentModalClassId) ?? null

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

  const openAssignmentModal = (classId: string, scheduleId: string | null = null) => {
    setAssignmentModalClassId(classId)
    setSelectedScheduleId(scheduleId)

    const key = scheduleId || classId
    const current = questionBankByClass[key]

    resetAssignmentForm({
      title:
        current?.title ||
        (scheduleId
          ? `Đề thi: ${examSchedules.find((s) => s.id === scheduleId)?.topic || ''}`
          : `Đề mẫu: ${classes.find((c) => c.id === classId)?.name || ''}`
        ).trim(),
      duration: current?.duration || 60,
      mode: 'upload',
      rawInput: '',
    })
    setQuestionDraft(current?.questions ?? [])
    setComposeQuestions(questionItemsToCompose(current?.questions ?? []))
  }

  const closeAssignmentModal = () => {
    setAssignmentModalClassId(null)
    setSelectedScheduleId(null)
    resetAssignmentForm({ title: '', duration: 60, mode: 'upload', rawInput: '' })
  }

  const onUploadQuestionFile = async (file: File) => {
    const text = await file.text()
    setAssignmentValue('rawInput', text)
    const parsed = parseQuestionsFromText(text)
    setQuestionDraft(parsed)
    toast.success(`Đã đọc ${parsed.length} câu hỏi từ file`)
  }

  const parseRawQuestions = () => {
    const parsed = parseQuestionsFromText(getAssignmentValues('rawInput'))
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

  const saveQuestionBank = async () => {
    if (!assignmentModalClassId) return
    const finalQuestions =
      assignmentMode === 'compose' ? composeToQuestionItems(composeQuestions) : questionDraft
    if (finalQuestions.length === 0) {
      toast.error('Chưa có câu hỏi để lưu')
      return
    }
    const payload: QuestionBankPayload = {
      title: getAssignmentValues('title').trim() || 'Bộ câu hỏi',
      duration: getAssignmentValues('duration') || 60,
      questions: finalQuestions,
      updatedAt: new Date().toISOString(),
    }

    if (selectedScheduleId) {
      await saveScheduleQuestionsMutation.mutateAsync({
        classId: assignmentModalClassId,
        scheduleId: selectedScheduleId,
        questions: payload,
      })
    } else {
      await saveQuestionsMutation.mutateAsync({
        classId: assignmentModalClassId,
        questions: payload,
      })
    }

    const key = selectedScheduleId || assignmentModalClassId
    const next: Record<string, QuestionBankPayload> = {
      ...questionBankByClass,
      [key]: payload,
    }
    setQuestionBankByClass(next)
    localStorage.setItem('manager_exam_question_bank_v1', JSON.stringify(next))
    closeAssignmentModal()
  }

  return (
    <>
      <ManagerScreenLayout hideHubNav hideToolbar>
        <div className="mb-8 flex flex-col gap-8">
          <div className={cn('min-w-0', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Bài thi của lớp</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>
              Danh sách các lớp quản lý và bộ câu hỏi tương ứng hiện có. Nhấn "Tạo bài thi" để gán
              đề cho từng lớp.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground">Danh sách lớp</h3>
          </div>

          <div
            className={cn(
              'overflow-x-auto rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10 transition-opacity'
            )}
          >
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-primary/12 via-teal-500/8 to-violet-500/8">
                  <th className="px-3 py-3 font-semibold">Tên lớp</th>
                  <th className="px-3 py-3 font-semibold">Giáo viên</th>
                  <th className="px-3 py-3 font-semibold">Trạng thái</th>
                  <th className="px-3 py-3 font-semibold">Tình trạng đề thi</th>
                  <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs font-medium text-muted-foreground">
                          Đang tải danh sách lớp...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : classes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có kỳ thi nào được lên lịch. Hãy tạo lịch thi tại mục "Lịch thi" để bắt
                      đầu gán đề.
                    </td>
                  </tr>
                ) : (
                  classes.map((c) => {
                    const st = managerClassStatusUi(c.status)
                    const teacherName = c.teacher?.name || '—'
                    const bank = questionBankByClass[c.id]
                    const hasQuestionBank = Boolean(bank)

                    let isExamEnded = false
                    if (c.examDate) {
                      const examTime = new Date(c.examDate).getTime()
                      if (!Number.isNaN(examTime) && examTime < Date.now()) {
                        isExamEnded = true
                      }
                    }

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
                          {hasQuestionBank ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-emerald-600 font-semibold">
                                {bank?.questions.length ?? 0} câu hỏi
                              </span>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                Thời gian: {bank?.duration || 60} phút
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Chưa có đề thi</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="font-bold rounded-lg border-primary/20 text-primary hover:bg-primary/5 hover:text-primary-700"
                                onClick={() => setSelectedClassIdForScores(c.id)}
                              >
                                <Users className="h-3.5 w-3.5 mr-1.5" />
                                Thành viên & Điểm
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="font-bold border-amber-200 text-amber-700 bg-amber-50/30 hover:bg-amber-50"
                                onClick={() => openAssignmentModal(c.id)}
                              >
                                {hasQuestionBank ? 'Chỉnh sửa đề mẫu' : 'Tạo đề mẫu'}
                              </Button>
                            </div>

                            {/* List sessions for this class */}
                            <ClassSchedulesList
                              classId={c.id}
                              onEditExam={(sid) => openAssignmentModal(c.id, sid)}
                              questionBank={questionBankByClass}
                            />
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

        {assignmentModalClassId && assignmentClass ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6 backdrop-blur-[2px]">
            <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-white/20 bg-card shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-page-entrance">
              <div className="shrink-0 px-5 pt-5 pb-4 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                      <FileUp className="h-5 w-5 text-primary" strokeWidth={2} />
                      {selectedScheduleId
                        ? questionBankByClass[selectedScheduleId]
                          ? 'Sửa bộ đề thi cho buổi thi'
                          : 'Tạo bộ đề thi cho buổi thi'
                        : questionBankByClass[assignmentModalClassId]
                          ? 'Sửa bộ đề thi mẫu cho lớp'
                          : 'Tạo bộ đề thi mẫu cho lớp'}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                        Lớp: {assignmentClass.name}
                      </span>
                      {selectedScheduleId && (
                        <span className="text-xs font-bold text-primary bg-primary/5 border border-primary/10 px-2 py-1 rounded-md">
                          Buổi: {examSchedules.find((s) => s.id === selectedScheduleId)?.topic}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-md text-muted-foreground"
                    onClick={closeAssignmentModal}
                    aria-label="Đóng"
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
                <Form {...assignmentForm}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <InputController
                          control={assignmentControl}
                          name="title"
                          label="Tên bộ đề"
                          required
                          rules={{ required: true }}
                          placeholder="Ví dụ: Bộ đề tập sự tháng 04/2026"
                        />
                      </div>
                      <div>
                        <InputController
                          control={assignmentControl}
                          name="duration"
                          label="Thời gian (phút)"
                          type="number"
                          required
                          rules={{ required: true, min: 1 }}
                          placeholder="60"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={assignmentMode === 'upload' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAssignmentValue('mode', 'upload')}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-sm font-semibold',
                          assignmentMode !== 'upload' && 'border-border bg-card hover:bg-muted'
                        )}
                      >
                        Upload file
                      </Button>
                      <Button
                        type="button"
                        variant={assignmentMode === 'compose' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAssignmentValue('mode', 'compose')}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-sm font-semibold',
                          assignmentMode !== 'compose' && 'border-border bg-card hover:bg-muted'
                        )}
                      >
                        Tự soạn câu hỏi
                      </Button>
                    </div>

                    {assignmentMode === 'upload' ? (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                            Upload file câu hỏi
                          </label>
                          <Input
                            type="file"
                            accept=".txt,.md,.csv,text/plain,text/markdown"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) void onUploadQuestionFile(file)
                            }}
                            className="block w-full cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary hover:file:bg-primary/20"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Hỗ trợ txt/md/csv. Mỗi câu nên bắt đầu bằng số thứ tự (vd: 1. / Câu 1:)
                            để parse chuẩn hơn.
                          </p>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                            Nhập/chỉnh nội dung câu hỏi thô
                          </label>
                          <TextareaController
                            control={assignmentControl}
                            name="rawInput"
                            label=""
                            className="space-y-0"
                            placeholder={
                              '1. Câu hỏi số 1\nA. Đáp án A\nB. Đáp án B\n\n2. Câu hỏi số 2\nA. ...'
                            }
                            rows={8}
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={parseRawQuestions}
                            >
                              Format bộ câu hỏi
                            </Button>
                            {questionDraft.length > 0 && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="font-bold text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
                                onClick={() => {
                                  setComposeQuestions(questionItemsToCompose(questionDraft))
                                  setAssignmentValue('mode', 'compose')
                                  toast.success('Đã chuyển sang chế độ chỉnh sửa chi tiết')
                                }}
                              >
                                Chỉnh sửa chi tiết
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-3">
                        {composeQuestions.map((q, qIdx) => (
                          <div
                            key={q.id}
                            className="rounded-xl border border-border bg-background p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-foreground">
                                Câu hỏi {qIdx + 1}
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-auto gap-1 rounded-md px-2 py-1 text-xs font-normal normal-case tracking-normal text-muted-foreground"
                                onClick={() => removeComposeQuestion(q.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Xóa
                              </Button>
                            </div>
                            <Input
                              value={q.title}
                              onChange={(e) =>
                                updateComposeQuestion(q.id, (x) => ({
                                  ...x,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="Câu hỏi chưa có tiêu đề"
                              className="mb-2 w-full rounded-lg text-sm focus-visible:border-primary focus-visible:ring-primary/20"
                            />
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
                              <Select
                                value={q.type}
                                onValueChange={(value) =>
                                  updateComposeQuestion(q.id, (x) => ({
                                    ...x,
                                    type: value as ComposeQuestionType,
                                    options:
                                      value === 'text'
                                        ? []
                                        : x.options.length > 0
                                          ? x.options
                                          : ['Lựa chọn 1', 'Lựa chọn 2'],
                                  }))
                                }
                              >
                                <SelectTrigger className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="single">Trắc nghiệm (1 đáp án)</SelectItem>
                                  <SelectItem value="multiple">
                                    Trắc nghiệm (nhiều đáp án)
                                  </SelectItem>
                                  <SelectItem value="text">Tự luận ngắn</SelectItem>
                                </SelectContent>
                              </Select>
                              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground">
                                <Checkbox
                                  checked={q.required}
                                  onCheckedChange={(v) =>
                                    updateComposeQuestion(q.id, (x) => ({
                                      ...x,
                                      required: v === true,
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
                                    <Input
                                      value={opt}
                                      onChange={(e) =>
                                        updateComposeQuestion(q.id, (x) => ({
                                          ...x,
                                          options: x.options.map((v, i) =>
                                            i === oi ? e.target.value : v
                                          ),
                                        }))
                                      }
                                      className="flex-1 rounded-lg text-sm focus-visible:border-primary focus-visible:ring-primary/20"
                                      placeholder={`Lựa chọn ${oi + 1}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-auto rounded-md px-2 py-1 text-xs font-normal normal-case tracking-normal text-muted-foreground"
                                      onClick={() => removeOption(q.id, oi)}
                                    >
                                      Xóa
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-auto gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold normal-case tracking-normal text-primary hover:bg-primary/10"
                                  onClick={() => addOption(q.id)}
                                >
                                  <ListPlus className="h-3.5 w-3.5" />
                                  Thêm lựa chọn
                                </Button>
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
                </Form>
              </div>
            </div>
          </div>
        ) : null}
      </ManagerScreenLayout>

      <ClassMembersScoresModal
        isOpen={!!selectedClassIdForScores}
        onClose={() => setSelectedClassIdForScores(null)}
        classId={selectedClassIdForScores || ''}
      />
    </>
  )
}
