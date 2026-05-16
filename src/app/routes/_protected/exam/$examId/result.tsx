import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { RadioGroupController } from '@/components/ui/form-controllers'
import { Textarea } from '@/components/ui/textarea'
import { ExamHistory } from '@/features/exam/components/ExamHistory'
import { ClassifyResultContainer } from '@/features/exam/components/ClassifyResult'
import {
  useExamResults,
  useSubmitExam,
  useSubmission,
  useMySubmissions,
  useScheduleDetail,
  useStartExam,
} from '@/features/exam/hooks'
import { useMyEnrolledClass } from '@/features/learning-path/hooks'
import { useAuthStore } from '@/stores/auth.store'

const DEFAULT_DURATION_SECONDS = 60 * 60 // 1 tiếng mặc định

export const Route = createFileRoute('/_protected/exam/$examId/result')({
  component: ExamResultPage,
  validateSearch: (search: Record<string, unknown>) => ({
    scheduleId: (search.scheduleId as string) || undefined,
  }),
})

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

type ExamQuestion = { id: string; stem: string; options: string[] }
type ApiErrorShape = { response?: { data?: { message?: string } } }

const ExamQuestionCard = memo(function ExamQuestionCard({
  q,
  idx,
  answer,
  submitted,
  onAnswerChange,
}: {
  q: ExamQuestion
  idx: number
  answer: string
  submitted: boolean
  onAnswerChange: (questionId: string, value: string) => void
}) {
  // Local state for text answers to prevent cursor jumping
  const [localText, setLocalText] = useState(answer)
  const isText = q.options.length === 0

  const optionForm = useForm<{ choice: string }>({ defaultValues: { choice: answer } })
  const selectedChoice = useWatch({ control: optionForm.control, name: 'choice' }) ?? ''

  // Sync local text when answer prop changes (e.g. initial load or reset)
  useEffect(() => {
    if (isText) {
      setLocalText(answer)
    } else {
      optionForm.setValue('choice', answer, { shouldDirty: false, shouldTouch: false })
    }
  }, [answer, isText, optionForm])

  // Sync choice change for RadioGroup
  useEffect(() => {
    if (isText) return
    if (selectedChoice === answer) return
    onAnswerChange(q.id, selectedChoice)
  }, [selectedChoice, answer, onAnswerChange, q.id, isText])

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground">
        Câu {idx + 1}: {q.stem}
      </p>
      {q.options.length > 0 ? (
        <Form {...optionForm}>
          <RadioGroupController
            control={optionForm.control}
            name="choice"
            label="Đáp án"
            labelClassName="sr-only"
            className="mt-3 space-y-0"
            radioGroupClassName="space-y-2"
            disabled={submitted}
            options={q.options.map((opt, oi) => ({
              value: opt,
              optionClassName: 'flex items-center gap-2 border-0 bg-transparent p-0',
              label: (
                <span>
                  {String.fromCharCode(65 + oi)}. {opt}
                </span>
              ),
            }))}
          />
        </Form>
      ) : (
        <Textarea
          value={localText}
          onChange={(e) => {
            const val = e.target.value
            setLocalText(val)
            onAnswerChange(q.id, val)
          }}
          disabled={submitted}
          placeholder="Nhập câu trả lời của bạn..."
          className="mt-3 min-h-[92px] w-full rounded-lg text-sm focus-visible:border-primary focus-visible:ring-primary/20"
        />
      )}
    </div>
  )
})

function ExamResultPage() {
  const { scheduleId } = Route.useSearch()
  const { examId } = Route.useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const userId = user?.id || 'unknown'
  const { data, isLoading } = useExamResults(examId)
  const { data: submissionData } = useSubmission(examId)
  const { data: mySubmissions, isLoading: isSubsLoading } = useMySubmissions()
  const { data: myClassData, isLoading: isClassLoading } = useMyEnrolledClass()
  const { data: scheduleDetail, isLoading: isScheduleLoading } = useScheduleDetail(scheduleId || '')
  const allLoading = isLoading || isSubsLoading || isClassLoading || isScheduleLoading
  const { mutateAsync: submitExamApi, isPending: isSubmitting } = useSubmitExam()
  const { mutate: startExamApi } = useStartExam()
  const employeeId = '00000000-0000-4000-8000-000000000001'
  const [questionBank, setQuestionBank] = useState<{
    title: string
    duration?: number
    questions: Array<{ id: string; stem: string; options: string[] }>
  } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [timeExpired, setTimeExpired] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const answersRef = useRef<Record<string, string>>({})

  const myClassId = myClassData?.enrolledClass?.id

  const activeSubmission = useMemo(() => {
    if (!mySubmissions) return null
    return mySubmissions.find(
      (s) =>
        (scheduleId && s.scheduleId === scheduleId) ||
        (!scheduleId && (s.classId === examId || s.id === examId))
    )
  }, [mySubmissions, scheduleId, examId])

  // 1. Chặn logic khởi tạo nếu đang tải dữ liệu — phải đợi TẤT CẢ sources
  useEffect(() => {
    if (allLoading) return

    try {
      const submissionKey = `member_exam_submission_v1:${userId}:${examId}${scheduleId ? `:${scheduleId}` : ''}`
      const existingSubmission = localStorage.getItem(submissionKey)

      // Check if already submitted via API results or my submissions list
      const hasApiResult = data && data.length > 0 && data.some((r) => r.employeeId === userId)
      const isActuallySubmitted = activeSubmission && activeSubmission.status !== 'started'

      if (hasApiResult || isActuallySubmitted || (existingSubmission && isActuallySubmitted)) {
        console.log('[TakeExam] Submission found. Status: Submitted')
        setSubmitted(true)
        setTimeLeft(null)

        const sub = activeSubmission

        // Load answers from the best source
        if (existingSubmission) {
          try {
            const parsed = JSON.parse(existingSubmission)
            setAnswers(parsed.answers || {})
          } catch {}
        } else {
          if (sub?.answers) setAnswers(sub.answers as Record<string, string>)
        }

        // Load bank robustly
        let foundBank = null
        if (sub) {
          // Priority 1: From submission data
          foundBank = sub.schedule?.examQuestions || sub.learningClass?.examQuestions
        }
        if (!foundBank) {
          // Priority 2: From schedule detail
          if (scheduleId && scheduleDetail?.examQuestions) {
            foundBank = scheduleDetail.examQuestions
          }
          // Fallback to class questions
          if (!foundBank && !scheduleId && myClassData?.enrolledClass?.id === examId) {
            foundBank = myClassData.enrolledClass.examQuestions
          }
        }

        if (foundBank) {
          setQuestionBank(foundBank)
        }
        return
      }

      // If not submitted, proceed with timer initialization
      let bank = null
      if (scheduleId && scheduleDetail?.examQuestions) {
        bank = scheduleDetail.examQuestions
      } else if (!scheduleId && myClassData?.enrolledClass?.id === examId) {
        bank = myClassData.enrolledClass.examQuestions
      }

      if (bank) {
        setQuestionBank(bank)

        let initialAnswers: Record<string, string> = {}
        const draftKey = `exam_draft_v1:${userId}:${examId}${scheduleId ? `:${scheduleId}` : ''}`
        const draftRaw = localStorage.getItem(draftKey)
        if (draftRaw) {
          try {
            initialAnswers = JSON.parse(draftRaw)
          } catch {}
        } else {
          for (const q of bank.questions) initialAnswers[q.id] = ''
        }
        setAnswers(initialAnswers)

        const durationSeconds = (bank.duration || 60) * 60

        // Logic: Countdown = Giờ kết thúc (lịch thi hoặc startTime + duration) - Thời gian hiện tại
        let finalTimeLeft = durationSeconds

        if (scheduleId && scheduleDetail?.dateIso && scheduleDetail?.startTime) {
          try {
            const startMs = new Date(
              `${scheduleDetail.dateIso}T${scheduleDetail.startTime}:00+07:00`
            ).getTime()
            const durationMs = durationSeconds * 1000

            // Logic: Luôn kết thúc tại (Giờ bắt đầu + Thời lượng bài thi)
            const finalEndMs = startMs + durationMs

            if (!isNaN(finalEndMs)) {
              finalTimeLeft = Math.max(0, Math.floor((finalEndMs - Date.now()) / 1000))
            }
          } catch {}
        }

        // Gọi startExam để ghi nhận vào DB (không ảnh hưởng timer)
        if (!activeSubmission) {
          startExamApi({ classId: !scheduleId ? examId : undefined, scheduleId })
        }

        setTimeLeft(finalTimeLeft)
      }
    } catch (err) {
      console.error('[TakeExam] Init error:', err)
    }
  }, [
    allLoading,
    userId,
    examId,
    scheduleId,
    data,
    mySubmissions,
    myClassData,
    scheduleDetail,
    activeSubmission,
    startExamApi,
  ])

  // Luôn giữ answersRef đồng bộ với state mới nhất
  useEffect(() => {
    answersRef.current = answers
    if (Object.keys(answers).length > 0 && !submitted) {
      localStorage.setItem(
        `exam_draft_v1:${userId}:${examId}${scheduleId ? `:${scheduleId}` : ''}`,
        JSON.stringify(answers)
      )
    }
  }, [answers, submitted, examId, scheduleId, userId])

  // Countdown logic
  useEffect(() => {
    if (timeLeft === null || submitted || timeLeft <= 0 || allLoading) return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timeLeft === null, submitted]) // eslint-disable-line react-hooks/exhaustive-deps

  const unansweredCount = useMemo(() => {
    if (!questionBank) return 0
    return questionBank.questions.filter((q) => !answers[q.id]?.trim()).length
  }, [questionBank, answers])

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => {
      if (prev[questionId] === value) return prev
      return {
        ...prev,
        [questionId]: value,
      }
    })
  }, [])

  const submitAction = async (isAuto = false) => {
    if (!questionBank) return
    if (!isAuto && unansweredCount > 0) {
      toast.error(`Bạn còn ${unansweredCount} câu chưa trả lời`)
      return
    }

    if (timerRef.current) clearInterval(timerRef.current)

    // Lấy đáp án mới nhất từ ref (tránh stale closure)
    let finalAnswers = answersRef.current
    if (Object.keys(finalAnswers).length === 0) {
      // Fallback: đọc từ localStorage draft
      const draftKey = `exam_draft_v1:${userId}:${examId}${scheduleId ? `:${scheduleId}` : ''}`
      const draftRaw = localStorage.getItem(draftKey)
      if (draftRaw) {
        try {
          finalAnswers = JSON.parse(draftRaw)
        } catch {}
      }
    }

    // Call backend API
    try {
      await submitExamApi({
        classId: myClassId ?? undefined,
        scheduleId,
        answers: finalAnswers,
      })

      // Also save locally just in case
      localStorage.removeItem(
        `exam_draft_v1:${userId}:${examId}${scheduleId ? `:${scheduleId}` : ''}`
      )
      localStorage.setItem(
        `member_exam_submission_v1:${userId}:${examId}${scheduleId ? `:${scheduleId}` : ''}`,
        JSON.stringify({
          userId,
          examId,
          scheduleId,
          classId: myClassId ?? null,
          answers: finalAnswers,
          submittedAt: new Date().toISOString(),
          autoSubmitted: isAuto,
        })
      )
      setSubmitted(true)
      if (isAuto) {
        toast.warning('Hết giờ! Bài thi đã được nộp tự động.')
      } else {
        toast.success('Nộp bài thành công')
      }
    } catch (err: unknown) {
      const maybeMessage = (err as ApiErrorShape)?.response?.data?.message
      toast.error(maybeMessage || 'Có lỗi xảy ra khi nộp bài')
    }
  }

  // Tự động nộp khi hết giờ — CHỈ nộp khi có bộ câu hỏi, tránh tạo bài nộp trắng
  useEffect(() => {
    if (timeLeft !== 0 || submitted || isSubmitting) return
    if (!questionBank) {
      // Không có bộ câu hỏi = đang xem lại sau khi hết giờ, không nộp lại
      setTimeExpired(true)
      return
    }
    setTimeExpired(true)
    // Thêm jitter (độ trễ ngẫu nhiên 0-5s) để tránh 200 người cùng nộp bài 1 lúc gây sập server
    const jitter = Math.floor(Math.random() * 5000)
    const timer = setTimeout(() => {
      void submitAction(true)
    }, jitter)
    return () => clearTimeout(timer)
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  // Màu timer: đỏ nhấp nháy <= 5 phút, vàng <= 15 phút, xanh bình thường
  const timerColor =
    timeLeft !== null && timeLeft <= 300
      ? 'bg-red-500 text-white animate-pulse shadow-red-300'
      : timeLeft !== null && timeLeft <= 900
        ? 'bg-amber-400 text-amber-900 shadow-amber-200'
        : 'bg-primary/10 text-primary shadow-primary/20'

  if (questionBank) {
    return (
      <>
        {/* Header row: tiêu đề bên trái, đồng hồ bên phải — đối xứng */}
        <div className="flex items-center justify-between">
          <PageHeader
            title={submitted || timeExpired ? 'Bài làm của bạn' : 'Làm bài thi'}
            description={questionBank.title}
            onBack={() => navigate({ to: '/exam' })}
          />
          {timeLeft !== null && !submitted && !timeExpired && (
            <div
              className={`flex items-center gap-3 rounded-2xl px-5 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all duration-300 ${timerColor}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="font-mono text-2xl font-bold tracking-widest">
                {formatTime(timeLeft)}
              </span>
              {timeLeft <= 300 && <span className="text-sm font-semibold">Sắp hết giờ!</span>}
            </div>
          )}
        </div>

        <div className="mx-auto max-w-4xl space-y-4">
          {submitted && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              ✅ Bạn đã nộp bài thành công. Hệ thống đã ghi nhận câu trả lời của bạn.
            </div>
          )}
          {!submitted && timeExpired && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              ⏰ Đã hết thời gian làm bài. Bài thi của bạn đã được ghi nhận.
            </div>
          )}

          {/* Grading Scale Info */}
          {!submitted && !timeExpired && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                  Thang điểm đánh giá bài thi
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Đúng lý thuyết
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-foreground">40</span>
                    <span className="text-sm font-bold text-primary">%</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Trình bày chính xác, đầy đủ kiến thức chuyên môn liên quan.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 border-primary/10 sm:border-l sm:pl-6">
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Ví dụ thực tế
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-foreground">50</span>
                    <span className="text-sm font-bold text-primary">%</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Có ví dụ minh họa cụ thể, sát với thực tiễn công việc tại VCB.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 border-primary/10 sm:border-l sm:pl-6">
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Trình bày
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-foreground">10</span>
                    <span className="text-sm font-bold text-primary">%</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Cách trình bày mạch lạc, rõ ràng, dễ hiểu và chuyên nghiệp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* HIỂN THỊ ĐIỂM SỐ VÀ KẾT QUẢ KHI ĐÃ CHẤM XONG */}
          {activeSubmission?.status === 'done' && (
            <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-xl transition-all duration-500 hover:shadow-2xl">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4">
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Kết quả bài thi của bạn
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
                <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 p-4 ring-1 ring-black/5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Điểm số
                  </p>
                  <p className="mt-2 text-4xl font-black text-primary">
                    {activeSubmission.totalScore != null ? `${activeSubmission.totalScore}%` : '—'}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 p-4 ring-1 ring-black/5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Kết quả
                  </p>
                  <div className="mt-2">
                    {activeSubmission.outcome === 'DAT' ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                        ĐẠT
                      </span>
                    ) : activeSubmission.outcome === 'CHO_HOC_LAI' ? (
                      <span className="inline-flex rounded-full bg-rose-100 px-4 py-1 text-sm font-bold text-rose-700 ring-1 ring-rose-200">
                        THI LẠI
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col justify-center rounded-xl bg-muted/30 p-4 ring-1 ring-black/5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nhận xét của giáo viên
                  </p>
                  <p className="mt-2 text-sm italic text-foreground/80">
                    {activeSubmission.graderNote || 'Không có nhận xét cụ thể.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          {questionBank.questions.map((q, idx) => (
            <ExamQuestionCard
              key={q.id}
              q={q}
              idx={idx}
              answer={answers[q.id] ?? ''}
              submitted={submitted || timeExpired}
              onAnswerChange={handleAnswerChange}
            />
          ))}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              {submitted || timeExpired
                ? 'Đã nộp bài.'
                : `Còn ${unansweredCount} câu chưa trả lời.`}
            </p>
            {!submitted && !timeExpired && (
              <Button
                type="button"
                className="font-bold"
                onClick={() => void submitAction(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang nộp bài...' : 'Nộp bài'}
              </Button>
            )}
          </div>
        </div>
      </>
    )
  }

  if (!questionBank && allLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
        Đang tải dữ liệu bài thi...
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Kết quả kỳ thi" onBack={() => navigate({ to: '/exam' })} />
      <ExamHistory rows={data ?? []} isLoading={isLoading} />
      <div className="mt-6 max-w-lg">
        <ClassifyResultContainer examId={examId} employeeId={employeeId} />
      </div>
    </>
  )
}
