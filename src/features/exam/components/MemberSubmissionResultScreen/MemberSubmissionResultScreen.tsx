import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useMySubmissions } from '@/features/exam/hooks'

export interface MemberSubmissionResultScreenProps {
  submissionId: string
}

export function MemberSubmissionResultScreen({ submissionId }: MemberSubmissionResultScreenProps) {
  const navigate = useNavigate()
  const { data: submissions = [], isLoading } = useMySubmissions()
  const submission = useMemo(
    () => submissions.find((s) => s.id === submissionId),
    [submissions, submissionId]
  )

  // Map question IDs to text from bank
  const questionMap = useMemo<Record<string, { stem: string; options: string[] }>>(() => {
    const map: Record<string, { stem: string; options: string[] }> = {}

    // 1. Try from submission's learningClass
    const bank = submission?.learningClass?.examQuestions || submission?.schedule?.examQuestions
    if (bank?.questions) {
      bank.questions.forEach((q: any) => {
        map[q.id] = { stem: q.stem, options: q.options || [] }
      })
      return map
    }

    // 2. Fallback to localStorage
    try {
      const raw = localStorage.getItem('manager_exam_question_bank_v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        Object.values(parsed).forEach((b: any) => {
          b.questions?.forEach((q: any) => {
            if (!map[q.id]) map[q.id] = { stem: q.stem, options: q.options || [] }
          })
        })
      }
    } catch {}

    return map
  }, [submission])

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
        Đang tải kết quả bài thi...
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
          onClick={() => void navigate({ to: '/exam' })}
        >
          ← Quay lại danh sách
        </Button>
      </div>
    )
  }

  // Parse answers - can be object {questionId: answer}
  const answersObj: Record<string, string> = (() => {
    if (!submission?.answers) return {}
    if (Array.isArray(submission.answers)) return {}
    return submission.answers as Record<string, string>
  })()

  const answeredEntries = Object.entries(answersObj)
  const grades =
    (submission.grades as Record<string, { criteria: string[]; score: number; note?: string }>) ||
    {}

  const formattedDate = new Date(submission.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      {/* Sub header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-card/50 px-6 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="h-auto shrink-0 gap-1 px-0 py-0 text-xs font-semibold normal-case tracking-normal text-muted-foreground hover:bg-transparent hover:text-primary"
            onClick={() => void navigate({ to: '/exam' })}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Danh sách kỳ thi
          </Button>
          <div className="hidden h-4 w-px shrink-0 bg-border sm:block" />
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            Kết quả thi:{' '}
            <span className="font-bold text-foreground">
              {submission.learningClass?.name ?? submission.fullName ?? 'Kỳ thi nội bộ'}
            </span>
          </p>
        </div>
      </div>

      <div className="page-shell">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Success Message Alert */}
          <div className="lg:col-span-12">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-900 shadow-sm ring-1 ring-emerald-200/50">
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Bạn đã nộp bài thành công. Hệ thống đã ghi nhận câu trả lời của bạn.</span>
              </div>
            </div>
          </div>

          {/* Left: Answers & Feedback */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Bài làm của bạn ({answeredEntries.length} câu)
              </h2>
              {answeredEntries.length === 0 ? (
                <p className="italic text-muted-foreground">
                  Không có câu trả lời nào được ghi nhận.
                </p>
              ) : (
                <div className="space-y-5">
                  {answeredEntries.map(([qId, answer], idx) => {
                    const questionData = questionMap[qId]
                    const questionText = questionData?.stem || `Câu hỏi ${idx + 1}`
                    const questionGrade = grades[qId] || { criteria: [], score: 0 }

                    return (
                      <div
                        key={qId}
                        className="border-b border-border/50 pb-6 last:border-0 last:pb-0"
                      >
                        <p className="mb-2 text-sm font-semibold text-foreground">
                          <span className="mr-1 font-bold text-primary">Câu {idx + 1}:</span>
                          {questionText}
                        </p>
                        <div
                          className={cn(
                            'mb-4 min-h-[44px] rounded-lg border border-border p-3 text-sm',
                            answer?.trim()
                              ? 'bg-muted/30 text-foreground'
                              : 'bg-muted/10 italic text-muted-foreground'
                          )}
                        >
                          {answer?.trim() || 'Bạn không trả lời câu này'}
                        </div>

                        {submission.status === 'done' && (
                          <div className="rounded-lg border border-primary/10 bg-primary/5 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Đánh giá
                              </span>
                              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
                                {questionGrade.score}%
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4">
                              <label className="flex cursor-default items-center gap-2 text-sm font-medium opacity-80">
                                <Checkbox
                                  className="shrink-0"
                                  checked={questionGrade.criteria.includes('ly_thuyet')}
                                  disabled
                                />
                                Đúng lý thuyết (40%)
                              </label>
                              <label className="flex cursor-default items-center gap-2 text-sm font-medium opacity-80">
                                <Checkbox
                                  className="shrink-0"
                                  checked={questionGrade.criteria.includes('thuc_te')}
                                  disabled
                                />
                                Ví dụ thực tế (50%)
                              </label>
                              <label className="flex cursor-default items-center gap-2 text-sm font-medium opacity-80">
                                <Checkbox
                                  className="shrink-0"
                                  checked={questionGrade.criteria.includes('trinh_bay')}
                                  disabled
                                />
                                Trình bày (10%)
                              </label>
                            </div>

                            {questionGrade.note && (
                              <div className="mt-4 border-t border-primary/10 pt-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                                  Góp ý từ người chấm
                                </p>
                                <p className="mt-1 text-sm font-bold leading-relaxed text-foreground">
                                  {questionGrade.note}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Grader note */}
            {submission.status === 'done' && (
              <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">
                  Nhận xét của người chấm
                </h2>
                <div className="min-h-[100px] w-full rounded-lg border border-border bg-muted/20 p-4 text-sm font-bold text-foreground">
                  {submission.graderNote || (
                    <span className="italic text-muted-foreground">
                      Không có nhận xét chi tiết.
                    </span>
                  )}
                </div>
                {submission.gradedAt && (
                  <p className="mt-4 text-xs text-muted-foreground">
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
            )}
          </div>

          {/* Right: Summary sidebar */}
          <div className="flex flex-col gap-4 lg:col-span-4">
            <div className="sticky top-4 rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Tóm tắt kết quả
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ngày làm bài</span>
                  <span className="font-medium text-foreground">{formattedDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Số câu trả lời</span>
                  <span className="font-bold text-foreground">{answeredEntries.length}</span>
                </div>
                <div className="my-2 h-px w-full bg-border" />
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Tổng điểm trung bình</span>
                  <span className="text-lg font-bold text-primary">
                    {submission.totalScore != null ? submission.totalScore + '%' : '—'}
                  </span>
                </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
