import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { ExamHistory } from '@/features/exam/components/ExamHistory'
import { ClassifyResultContainer } from '@/features/exam/components/ClassifyResult'
import { useExamResults } from '@/features/exam/hooks'
import { useMyEnrolledClass } from '@/features/learning-path/hooks'

export const Route = createFileRoute('/_protected/exam/$examId/result')({
  component: ExamResultPage,
})

function ExamResultPage() {
  const { examId } = Route.useParams()
  const { data, isLoading } = useExamResults(examId)
  const { data: myClassData } = useMyEnrolledClass()
  const employeeId = '00000000-0000-4000-8000-000000000001'
  const [questionBank, setQuestionBank] = useState<{
    title: string
    questions: Array<{ id: string; stem: string; options: string[] }>
  } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const myClassId = myClassData?.enrolledClass?.id

  useEffect(() => {
    try {
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
        const initialAnswers: Record<string, string> = {}
        for (const q of bank.questions) initialAnswers[q.id] = ''
        setAnswers(initialAnswers)
      }
    } catch {
      setQuestionBank(null)
    }
  }, [examId, myClassId])

  const unansweredCount = useMemo(() => {
    if (!questionBank) return 0
    return questionBank.questions.filter((q) => !answers[q.id]?.trim()).length
  }, [questionBank, answers])

  const submitExam = () => {
    if (!questionBank) return
    if (unansweredCount > 0) {
      toast.error(`Bạn còn ${unansweredCount} câu chưa trả lời`)
      return
    }
    localStorage.setItem(
      `member_exam_submission_v1:${examId}`,
      JSON.stringify({
        examId,
        classId: myClassId ?? null,
        answers,
        submittedAt: new Date().toISOString(),
      })
    )
    setSubmitted(true)
    toast.success('Nộp bài thành công')
  }

  if (questionBank) {
    return (
      <>
        <PageHeader title="Làm bài thi" description={questionBank.title} />
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
            <Button type="button" className="font-bold" onClick={submitExam} disabled={submitted}>
              {submitted ? 'Đã nộp bài' : 'Nộp bài'}
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Kết quả kỳ thi" />
      <ExamHistory rows={data ?? []} isLoading={isLoading} />
      <div className="mt-6 max-w-lg">
        <ClassifyResultContainer examId={examId} employeeId={employeeId} />
      </div>
    </>
  )
}
