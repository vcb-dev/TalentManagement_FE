import { useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  useForm,
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormSetValue,
} from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Form } from '@/components/ui/form'
import { TextareaController } from '@/components/ui/form-controllers'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { useGradeSubmission, useManagerSubmissions } from '@/features/exam/hooks'

export interface GraderChamThiScreenProps {
  /** This is actually the submission ID */
  examId: string
  employeeId: string
}

type GradeFormValues = {
  graderNote: string
  grades: Record<string, { criteria: string[]; score: number; isGraded?: boolean }>
  totalScore?: number
}

const CRITERIA_WEIGHTS: Record<string, number> = {
  ly_thuyet: 40,
  thuc_te: 50,
  trinh_bay: 10,
}

function GraderQuestionItem({
  qId,
  idx,
  answer,
  questionText,
  control,
  getValues,
  setValue,
  disabled,
}: {
  qId: string
  idx: number
  answer: string
  questionText: string
  control: Control<GradeFormValues>
  getValues: UseFormGetValues<GradeFormValues>
  setValue: UseFormSetValue<GradeFormValues>
  disabled: boolean
}) {
  const questionGrade = useWatch({ control, name: `grades.${qId}` }) ?? {
    criteria: [],
    score: 0,
    isGraded: false,
  }

  const toggleCriteria = (criteriaId: string) => {
    const current = getValues('grades') ?? {}
    const prevCriteria = current[qId]?.criteria || []
    const isSelected = prevCriteria.includes(criteriaId)
    const newCriteria = isSelected
      ? prevCriteria.filter((c) => c !== criteriaId)
      : [...prevCriteria, criteriaId]
    const newScore = newCriteria.reduce((sum, c) => sum + (CRITERIA_WEIGHTS[c] || 0), 0)
    setValue('grades', {
      ...current,
      [qId]: { criteria: newCriteria, score: newScore, isGraded: true },
    })
  }

  const markAsZero = () => {
    const current = getValues('grades') ?? {}
    setValue('grades', {
      ...current,
      [qId]: { criteria: [], score: 0, isGraded: true },
    })
  }

  const isGraded = (questionGrade as any).isGraded

  return (
    <div
      id={`q-${qId}`}
      className={cn(
        'border-b border-border/50 pb-6 last:border-0 last:pb-0 transition-all p-3 rounded-xl',
        !isGraded && answer?.trim() && 'bg-red-50/20 border border-red-200'
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-foreground">
          <span className="mr-1 font-bold text-primary">Câu {idx + 1}:</span>
          {questionText}
        </p>
        {!isGraded && answer?.trim() && (
          <span className="text-xs font-black text-red-600 animate-pulse uppercase tracking-wider shrink-0">
            ⚠️ Chưa chấm
          </span>
        )}
      </div>

      <div
        className={cn(
          'mb-4 min-h-[44px] whitespace-pre-wrap rounded-lg border border-border p-3 text-sm leading-relaxed',
          answer?.trim()
            ? 'bg-muted/30 text-foreground'
            : 'bg-muted/10 italic text-muted-foreground'
        )}
      >
        {answer?.trim()
          ? answer.replace(/([^\n])\s*(\+)/g, '$1\n$2')
          : 'Thí sinh không trả lời câu này'}
      </div>

      <div
        className={cn(
          'rounded-lg border p-4 transition-colors',
          isGraded ? 'border-primary/10 bg-primary/5' : 'border-red-200 bg-red-50/30'
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Đánh giá câu trả lời
          </span>
          {isGraded && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
              {questionGrade.score}%
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-rose-600 hover:opacity-80 transition-all">
            <Checkbox
              className="h-5 w-5 rounded-full border-2 border-rose-300 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
              checked={isGraded && questionGrade.score === 0 && questionGrade.criteria.length === 0}
              disabled={disabled}
              onCheckedChange={markAsZero}
            />
            Không đạt / 0%
          </label>

          {[
            { id: 'ly_thuyet', label: 'Đúng lý thuyết (40%)' },
            { id: 'thuc_te', label: 'Ví dụ thực tế (50%)' },
            { id: 'trinh_bay', label: 'Trình bày (10%)' },
          ].map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Checkbox
                className="h-5 w-5 rounded-full border-2 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                checked={questionGrade.criteria.includes(c.id)}
                disabled={disabled}
                onCheckedChange={() => toggleCriteria(c.id)}
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function LiveTotalScore({
  control,
  answeredCount,
}: {
  control: Control<GradeFormValues>
  answeredCount: number
}) {
  const grades = useWatch({ control, name: 'grades' }) ?? {}
  const totalScore =
    answeredCount > 0
      ? Math.round(Object.values(grades).reduce((acc, g) => acc + g.score, 0) / answeredCount)
      : 0
  return (
    <span
      className={cn(
        'text-lg font-black flex items-center gap-2',
        totalScore === 100
          ? 'text-emerald-600'
          : totalScore >= 80
            ? 'text-amber-600'
            : 'text-rose-600'
      )}
    >
      {totalScore === 100 ? '🟢' : totalScore >= 80 ? '🟡' : '🔴'} {totalScore}%
    </span>
  )
}

export function GraderChamThiScreen({ examId }: GraderChamThiScreenProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const gradeMutation = useGradeSubmission()

  const { data: submissions = [], isLoading } = useManagerSubmissions()
  const submission = useMemo(() => submissions.find((s) => s.id === examId), [submissions, examId])

  // Try to read question bank from localStorage to map question IDs to text
  const questionMap = useMemo<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('manager_exam_question_bank_v1')
      if (!raw) return {}
      const parsed = JSON.parse(raw) as Record<
        string,
        { title: string; questions: Array<{ id: string; stem: string }> }
      >
      const map: Record<string, string> = {}
      Object.values(parsed).forEach((bank) => {
        bank.questions?.forEach((q) => {
          map[q.id] = q.stem
        })
      })
      return map
    } catch {
      return {}
    }
  }, [])

  const gradeForm = useForm<GradeFormValues>({
    defaultValues: { graderNote: '', grades: {}, totalScore: 0 },
  })

  useEffect(() => {
    if (!submission) return
    const rawGrades =
      (submission.grades as Record<string, { criteria: string[]; score: number }>) || {}
    const mappedGrades: Record<string, { criteria: string[]; score: number; isGraded: boolean }> =
      {}
    Object.entries(rawGrades).forEach(([qId, g]) => {
      mappedGrades[qId] = { ...g, isGraded: true }
    })

    gradeForm.reset({
      graderNote: submission.graderNote ?? '',
      grades: mappedGrades,
      totalScore: submission.totalScore ?? 0,
    })
  }, [submission, gradeForm])

  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'

  // Parse answers - can be object {questionId: answer} or array
  const answersObj: Record<string, string> = (() => {
    if (!submission?.answers) return {}
    if (Array.isArray(submission.answers)) return {}
    return submission.answers as Record<string, string>
  })()

  const answeredEntries = Object.entries(answersObj)

  const totalQuestionsInExam = useMemo(() => {
    if (!submission) return 0
    const questions =
      (submission.schedule as any)?.examQuestions ||
      (submission.learningClass as any)?.examQuestions
    if (questions && Array.isArray(questions)) {
      return questions.length
    }
    return answeredEntries.length
  }, [submission, answeredEntries.length])

  const isFileSubmission = typeof answersObj === 'object' && 'fileUrl' in answersObj

  const handleComplete = (status: 'grading' | 'done') => {
    const graderNote = gradeForm.getValues('graderNote') ?? ''
    if (status === 'done' && !graderNote.trim()) {
      toast.error('Vui lòng nhập nhận xét trước khi hoàn thành chấm')
      return
    }

    const currentGrades = gradeForm.getValues('grades') ?? {}

    // Validation for 'done' status
    if (status === 'done' && !isFileSubmission) {
      let index = 0
      for (const [qId] of answeredEntries) {
        const g = currentGrades[qId] as any
        if (!g || !g.isGraded) {
          toast.error(`Bạn chưa chấm điểm cho câu hỏi thứ ${index + 1}`)
          const element = document.getElementById(`q-${qId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.classList.add('ring-8', 'ring-red-500', 'ring-offset-4', 'duration-500')
            setTimeout(() => {
              element.classList.remove('ring-8', 'ring-red-500', 'ring-offset-4')
            }, 3000)
          }
          return
        }
        index++
      }
    }

    const totalScore = isFileSubmission
      ? Number(gradeForm.getValues('totalScore') || 0)
      : totalQuestionsInExam > 0
        ? Math.round(
            Object.values(currentGrades).reduce((acc, g) => acc + (g as any).score, 0) /
              totalQuestionsInExam
          )
        : 0
    gradeMutation.mutate(
      {
        submissionId: examId,
        graderNote,
        status,
        grades: isFileSubmission ? undefined : currentGrades,
        totalScore,
      },
      {
        onSuccess: () => {
          toast.success(status === 'done' ? 'Đã hoàn thành chấm bài' : 'Đã lưu nháp')
          if (status === 'done') {
            void navigate({ to: '/exam/grader' })
          }
        },
        onError: () => {
          toast.error('Có lỗi xảy ra, vui lòng thử lại')
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
        Đang tải bài thi...
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Không tìm thấy bài nộp này.</p>
        <Button
          type="button"
          variant="ghost"
          className="h-auto p-0 text-sm font-normal normal-case tracking-normal text-primary underline hover:bg-transparent"
          onClick={() => void navigate({ to: '/exam/grader' })}
        >
          ← Quay lại danh sách
        </Button>
      </div>
    )
  }

  const formattedDate = new Date(submission.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Form {...gradeForm}>
      <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
        {/* Sub header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-card/50 px-6 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="h-auto shrink-0 gap-1 px-0 py-0 text-xs font-semibold normal-case tracking-normal text-muted-foreground hover:bg-transparent hover:text-primary"
              onClick={() => void navigate({ to: '/exam/grader' })}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              DS bài thi
            </Button>
            <div className="hidden h-4 w-px shrink-0 bg-border sm:block" />
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              Chấm thi: <span className="font-bold text-foreground">{submission.fullName}</span>
              {submission.learningClass?.name && ` · Lớp ${submission.learningClass.name}`}
            </p>
            <span className="shrink-0 rounded-md border border-border bg-card px-2 py-0.5 text-xs font-bold text-muted-foreground">
              Vai trò: {roleLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={gradeMutation.isPending}
              className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium"
              onClick={() => handleComplete('grading')}
            >
              Lưu nháp
            </Button>
            <Button
              type="button"
              size="sm"
              loading={gradeMutation.isPending}
              className="gap-1 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold shadow-sm"
              onClick={() => handleComplete('done')}
            >
              {gradeMutation.isPending ? 'Đang lưu...' : 'Hoàn thành chấm'}
            </Button>
          </div>
        </div>

        <div className="page-shell">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Answers */}
            <div className="flex flex-col gap-6 lg:col-span-8">
              {/* Member info */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Thông tin thí sinh
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Họ và tên</p>
                    <p className="font-semibold text-foreground">{submission.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Team</p>
                    <p className="font-semibold text-foreground">{submission.teamGroup || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lớp</p>
                    <p className="font-semibold text-foreground">
                      {submission.learningClass?.name || (
                        <span className="italic text-muted-foreground">Chưa gắn lớp</span>
                      )}
                    </p>
                  </div>
                  {submission.schedule && (
                    <div>
                      <p className="text-xs text-muted-foreground">Kỳ thi (Session)</p>
                      <p className="font-bold text-primary">
                        {submission.schedule.topic} ({submission.schedule.startTime})
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Ngày nộp</p>
                    <p className="font-semibold text-foreground">{formattedDate}</p>
                  </div>
                </div>
              </div>

              {/* Answers */}
              {isFileSubmission ? (
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    Bài làm của thí sinh (File đính kèm)
                  </h2>
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                      <ArrowLeft className="-rotate-90 h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {answersObj.fileName || 'File bài thi'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Học viên đã tải lên file bài thi
                      </p>
                    </div>
                    {answersObj.fileUrl && (
                      <a
                        href={answersObj.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 rounded-xl px-4 flex items-center bg-primary text-white text-xs font-black uppercase tracking-widest shadow-sm hover:bg-primary/95 transition-all"
                      >
                        Tải về / Xem tệp
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    Phần làm bài của thí sinh ({answeredEntries.length} câu)
                  </h2>
                  {answeredEntries.length === 0 ? (
                    <p className="italic text-muted-foreground">
                      Không có câu trả lời nào được ghi nhận.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {answeredEntries.map(([qId, answer], idx) => {
                        const questionText = questionMap[qId] || `Câu hỏi ${idx + 1}`

                        return (
                          <GraderQuestionItem
                            key={qId}
                            qId={qId}
                            idx={idx}
                            answer={answer}
                            questionText={questionText}
                            control={gradeForm.control}
                            getValues={gradeForm.getValues}
                            setValue={gradeForm.setValue}
                            disabled={submission.status === 'done' && !gradeMutation.isPending}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Grader note */}
              <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">
                  Nhận xét của người chấm
                </h2>
                <TextareaController
                  control={gradeForm.control}
                  name="graderNote"
                  label="Nhận xét của người chấm"
                  labelClassName="sr-only"
                  disabled={submission.status === 'done' && !gradeMutation.isPending}
                  placeholder="Nhập nhận xét, đánh giá chung về bài làm của thí sinh... (bắt buộc khi hoàn thành chấm)"
                  textareaClassName="min-h-[140px] rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/25"
                />
                {submission.gradedAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Đã chấm lúc:{' '}
                    {new Date(submission.gradedAt).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Summary sidebar */}
            <div className="flex flex-col gap-4 lg:col-span-4">
              <div className="sticky top-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Tóm tắt bài thi
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {isFileSubmission ? 'Hình thức nộp' : 'Số câu trả lời'}
                    </span>
                    <span className="font-bold text-foreground">
                      {isFileSubmission ? 'File đính kèm' : `${answeredEntries.length} câu`}
                    </span>
                  </div>
                  <div className="my-2 h-px w-full bg-border" />
                  {isFileSubmission ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Điểm bài thi (0 - 100) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={gradeForm.watch('totalScore') ?? ''}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                          gradeForm.setValue('totalScore', val, { shouldValidate: true })
                        }}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                        disabled={submission.status === 'done' && !gradeMutation.isPending}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">Tổng điểm trung bình</span>
                      <LiveTotalScore
                        control={gradeForm.control}
                        answeredCount={totalQuestionsInExam}
                      />
                    </div>
                  )}
                  <div className="my-2 h-px w-full bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trạng thái</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold',
                        submission.status === 'done'
                          ? 'bg-emerald-100 text-emerald-700'
                          : submission.status === 'grading'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      )}
                    >
                      {submission.status === 'done'
                        ? 'Đã chấm'
                        : submission.status === 'grading'
                          ? 'Đang chấm'
                          : 'Chờ chấm'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <Button
                    type="button"
                    loading={gradeMutation.isPending}
                    className="w-full rounded-lg py-2 text-sm font-bold"
                    onClick={() => handleComplete('done')}
                  >
                    {gradeMutation.isPending ? 'Đang lưu...' : 'Hoàn thành chấm'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    loading={gradeMutation.isPending}
                    className="w-full rounded-lg border-border py-2 text-sm font-medium"
                    onClick={() => handleComplete('grading')}
                  >
                    Lưu nháp
                  </Button>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs italic text-muted-foreground leading-relaxed">
                    Hãy đọc kỹ từng câu trả lời rồi nhập nhận xét đánh giá toàn diện trước khi hoàn
                    tất chấm bài.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Form>
  )
}
