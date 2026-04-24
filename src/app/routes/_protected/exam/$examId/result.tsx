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
} from '@/features/exam/hooks'
import { useMyEnrolledClass } from '@/features/learning-path/hooks'
import { useAuthStore } from '@/stores/auth.store'

const DEFAULT_DURATION_SECONDS = 60 * 60 // 1 tiếng mặc định

export const Route = createFileRoute('/_protected/exam/$examId/result')({
  component: ExamResultPage,
})

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
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
  const { examId } = Route.useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const userId = user?.id || 'unknown'
  const { data, isLoading } = useExamResults(examId)
  const { data: submissionData } = useSubmission(examId)
  const { data: mySubmissions } = useMySubmissions()
  const { data: myClassData } = useMyEnrolledClass()
  const { mutateAsync: submitExamApi, isPending: isSubmitting } = useSubmitExam()
  const employeeId = '00000000-0000-4000-8000-000000000001'
  const [questionBank, setQuestionBank] = useState<{
    title: string
    duration?: number
    questions: Array<{ id: string; stem: string; options: string[] }>
  } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const myClassId = myClassData?.enrolledClass?.id

  useEffect(() => {
    try {
      console.log('[TakeExam] Initializing for examId:', examId, 'userId:', userId)
      const submissionKey = `member_exam_submission_v1:${userId}:${examId}`
      const existingSubmission = localStorage.getItem(submissionKey)

      let bank: any = null

      // Priority 1: Data from a specific submission (if viewing history)
      if (submissionData) {
        // Double check if this submission belongs to the current user
        if (submissionData.userId !== userId) {
          console.log('[TakeExam] Submission data belongs to another user. Ignoring.')
        } else {
          console.log('[TakeExam] Loading data from existing submission API')
          bank = submissionData.learningClass?.examQuestions || null
          setSubmitted(true)
          if (submissionData.answers) {
            setAnswers(submissionData.answers as Record<string, string>)
          }
          setQuestionBank(bank)
          return
        }
      }

      // Priority 2: Backend data from my currently enrolled class
      if (myClassData?.enrolledClass) {
        if (myClassData.enrolledClass.examQuestions) {
          console.log('[TakeExam] Found question bank in DB')
          bank = myClassData.enrolledClass.examQuestions
        } else {
          console.log('[TakeExam] DB has no question bank for this class')
        }
      }

      // Priority 3: Fallback to localStorage ONLY if DB doesn't have it
      if (!bank) {
        const raw = localStorage.getItem('manager_exam_question_bank_v1')
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, any>
          bank = (myClassId ? parsed[myClassId] : undefined) ?? parsed[examId] ?? null
          if (bank) console.log('[TakeExam] Found question bank in localStorage')
        }
      }

      setQuestionBank(bank)

      // Check if already submitted via API results, my submissions list, or localStorage
      const hasApiResult = data && data.length > 0
      const hasApiSubmission = mySubmissions?.some((s) => s.classId === examId || s.id === examId)

      if (hasApiResult || hasApiSubmission || existingSubmission) {
        console.log('[TakeExam] Submission found. Status: Submitted')
        setSubmitted(true)
        if (existingSubmission) {
          try {
            const parsedSub = JSON.parse(existingSubmission)
            setAnswers(parsedSub.answers || {})
          } catch {}
        } else if (hasApiSubmission) {
          // If we have a submission in API but not in local, try to use its answers if available
          const sub = mySubmissions?.find((s) => s.classId === examId || s.id === examId)
          if (sub?.answers) {
            setAnswers(sub.answers as Record<string, string>)
          }
        }
        return
      }

      if (bank) {
        console.log('[TakeExam] Setting up new exam session')
        let initialAnswers: Record<string, string> = {}
        const draftKey = `exam_draft_v1:${userId}:${examId}`
        const draftRaw = localStorage.getItem(draftKey)
        if (draftRaw) {
          try {
            initialAnswers = JSON.parse(draftRaw)
          } catch {}
        } else {
          for (const q of bank.questions) initialAnswers[q.id] = ''
        }
        setAnswers(initialAnswers)

        const startKey = `exam_start_time_v1:${userId}:${examId}`
        let startTimeStr = localStorage.getItem(startKey)
        if (!startTimeStr) {
          startTimeStr = Date.now().toString()
          localStorage.setItem(startKey, startTimeStr)
        }

        const durationSeconds = (bank.duration || 60) * 60
        const startTime = parseInt(startTimeStr, 10)
        const elapsedRaw = Math.floor((Date.now() - startTime) / 1000)
        const remaining = Math.max(0, durationSeconds - elapsedRaw)

        setTimeLeft(remaining)
      }
    } catch (err) {
      console.error('[TakeExam] Initialization error:', err)
      setQuestionBank(null)
    }
  }, [examId, myClassId, myClassData, data, submissionData, mySubmissions, userId])

  useEffect(() => {
    if (Object.keys(answers).length > 0 && !submitted) {
      localStorage.setItem(`exam_draft_v1:${userId}:${examId}`, JSON.stringify(answers))
    }
  }, [answers, submitted, examId, userId])

  // Countdown logic — chạy mỗi giây
  useEffect(() => {
    if (timeLeft === null || submitted || timeLeft <= 0) return
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

    // Call backend API
    try {
      await submitExamApi({
        classId: myClassId ?? undefined,
        answers,
      })

      // Also save locally just in case
      localStorage.removeItem(`exam_draft_v1:${userId}:${examId}`)
      localStorage.setItem(
        `member_exam_submission_v1:${userId}:${examId}`,
        JSON.stringify({
          userId,
          examId,
          classId: myClassId ?? null,
          answers,
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

      setTimeout(() => {
        navigate({ to: '/exam' })
      }, 1500)
    } catch (err: unknown) {
      const maybeMessage = (err as ApiErrorShape)?.response?.data?.message
      toast.error(maybeMessage || 'Có lỗi xảy ra khi nộp bài')
    }
  }

  // Tự động nộp khi hết giờ
  useEffect(() => {
    if (timeLeft !== 0 || submitted || isSubmitting) return
    const timer = setTimeout(() => {
      void submitAction(true)
    }, 0)
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
            title="Làm bài thi"
            description={questionBank.title}
            onBack={() => navigate({ to: '/exam' })}
          />
          {timeLeft !== null && !submitted && (
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
          {submitted ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Bạn đã nộp bài thành công. Hệ thống đã ghi nhận câu trả lời của bạn.
            </div>
          ) : null}
          {questionBank.questions.map((q, idx) => (
            <ExamQuestionCard
              key={q.id}
              q={q}
              idx={idx}
              answer={answers[q.id] ?? ''}
              submitted={submitted}
              onAnswerChange={handleAnswerChange}
            />
          ))}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              {submitted ? 'Đã nộp bài.' : `Còn ${unansweredCount} câu chưa trả lời.`}
            </p>
            {!submitted && (
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
