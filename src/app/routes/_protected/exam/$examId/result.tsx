import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { ExamHistory } from '@/features/exam/components/ExamHistory'
import { ClassifyResultContainer } from '@/features/exam/components/ClassifyResult'
import { useExamResults, useSubmitExam } from '@/features/exam/hooks'
import { useMyEnrolledClass } from '@/features/learning-path/hooks'

const EXAM_DURATION_SECONDS = 60 * 60 // 1 tiếng

export const Route = createFileRoute('/_protected/exam/$examId/result')({
  component: ExamResultPage,
})

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

function ExamResultPage() {
  const { examId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useExamResults(examId)
  const { data: myClassData } = useMyEnrolledClass()
  const { mutateAsync: submitExamApi, isPending: isSubmitting } = useSubmitExam()
  const employeeId = '00000000-0000-4000-8000-000000000001'
  const [questionBank, setQuestionBank] = useState<{
    title: string
    questions: Array<{ id: string; stem: string; options: string[] }>
  } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const myClassId = myClassData?.enrolledClass?.id

  useEffect(() => {
    try {
      const submissionKey = `member_exam_submission_v1:${examId}`
      const existingSubmission = localStorage.getItem(submissionKey)

      const raw = localStorage.getItem('manager_exam_question_bank_v1')
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<
        string,
        { title: string; questions: Array<{ id: string; stem: string; options: string[] }> }
      >
      const byClass = myClassId ? parsed[myClassId] : undefined
      const byExamId = parsed[examId]
      const bank = byClass ?? byExamId ?? null
      setQuestionBank(bank)

      if (bank) {
        if (existingSubmission) {
          setSubmitted(true)
          try {
            const parsedSub = JSON.parse(existingSubmission)
            setAnswers(parsedSub.answers || {})
          } catch {
            // ignore
          }
          return
        }

        let initialAnswers: Record<string, string> = {}
        const draftRaw = localStorage.getItem(`exam_draft_v1:${examId}`)
        if (draftRaw) {
          try {
            initialAnswers = JSON.parse(draftRaw)
          } catch {
            // ignore
          }
        } else {
          for (const q of bank.questions) initialAnswers[q.id] = ''
        }
        setAnswers(initialAnswers)

        const startKey = `exam_start_time_v1:${examId}`
        let startTimeStr = localStorage.getItem(startKey)
        if (!startTimeStr) {
          startTimeStr = Date.now().toString()
          localStorage.setItem(startKey, startTimeStr)
        }

        const startTime = parseInt(startTimeStr, 10)
        const elapsedRaw = Math.floor((Date.now() - startTime) / 1000)
        const remaining = Math.max(0, EXAM_DURATION_SECONDS - elapsedRaw)

        setTimeLeft(remaining)
      }
    } catch {
      setQuestionBank(null)
    }
  }, [examId, myClassId])

  useEffect(() => {
    if (Object.keys(answers).length > 0 && !submitted) {
      localStorage.setItem(`exam_draft_v1:${examId}`, JSON.stringify(answers))
    }
  }, [answers, submitted, examId])

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
      localStorage.removeItem(`exam_draft_v1:${examId}`)
      localStorage.setItem(
        `member_exam_submission_v1:${examId}`,
        JSON.stringify({
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi nộp bài')
    }
  }

  // Tự động nộp khi hết giờ
  useEffect(() => {
    if (timeLeft !== 0 || submitted || isSubmitting) return
    void submitAction(true)
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
            <div key={q.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">
                Câu {idx + 1}: {q.stem}
              </p>
              {q.options.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, oi) => (
                    <label key={`${q.id}-${oi}`} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        disabled={submitted}
                      />
                      <span>
                        {String.fromCharCode(65 + oi)}. {opt}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                  disabled={submitted}
                  placeholder="Nhập câu trả lời của bạn..."
                  className="mt-3 min-h-[92px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              )}
            </div>
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
