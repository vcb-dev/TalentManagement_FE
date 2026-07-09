import { useMemo, useState } from 'react'
import { CheckCircle2, MessageSquare, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonSubmissionCardList } from '@/components/ui/skeleton'
import {
  useGradeSubmission,
  useManagerSubmissions,
  useSubmissionFeedback,
} from '@/features/exam/hooks'
import {
  DEFAULT_ESSAY_CRITERIA_WEIGHTS,
  ESSAY_CRITERIA,
  type EssayCriteriaWeights,
} from '@/features/exam-papers/criteria'
import type { z } from 'zod'
import type { examSubmissionApiSchema } from '@/features/exam/schemas'

type Submission = z.infer<typeof examSubmissionApiSchema>
type QuestionGrade = { score: number; auto?: boolean; criteria: string[] }

/** Điểm câu tự luận = tổng % các tiêu chí đạt (0–100). */
function essayScoreFromCriteria(weights: EssayCriteriaWeights, selectedCriteria: string[]): number {
  return ESSAY_CRITERIA.reduce(
    (sum, c) => sum + (selectedCriteria.includes(c.id) ? weights[c.id] || 0 : 0),
    0
  )
}

function questionAnswerText(answers: unknown, questionId: string): string {
  if (!answers || typeof answers !== 'object') return ''
  const record = answers as Record<string, unknown>
  const v = record[questionId]
  return typeof v === 'string' ? v : ''
}

function FeedbackPanel({ submissionId }: { submissionId: string }) {
  const { data: feedback } = useSubmissionFeedback(submissionId)
  if (!feedback) return null
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-xs font-semibold text-primary">Feedback từ học viên</p>
        <p className="mt-1 text-foreground">{feedback.content}</p>
      </div>
    </div>
  )
}

function SubmissionGradingCard({ submission }: { submission: Submission }) {
  const paper = submission.examPaper
  const existingGrades = (submission.grades as Record<string, QuestionGrade>) ?? {}
  const [essayCriteria, setEssayCriteria] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {}
    for (const q of paper?.questions ?? []) {
      const existing = q.type === 'essay' ? existingGrades[q.id] : undefined
      if (existing) {
        init[q.id] = existing.criteria ?? []
      }
    }
    return init
  })
  const [gradedEssayIds, setGradedEssayIds] = useState<Set<string>>(
    () => new Set(Object.keys(essayCriteria).filter((qId) => essayCriteria[qId] !== undefined))
  )
  const [graderNote, setGraderNote] = useState(submission.graderNote ?? '')
  const gradeSubmission = useGradeSubmission()

  const mcqQuestions = paper?.questions.filter((q) => q.type === 'mcq') ?? []
  const essayQuestions = paper?.questions.filter((q) => q.type === 'essay') ?? []

  const essayScoreFor = (q: (typeof essayQuestions)[number]) => {
    const weights = q.criteriaWeights ?? DEFAULT_ESSAY_CRITERIA_WEIGHTS
    return essayScoreFromCriteria(weights, essayCriteria[q.id] ?? [])
  }

  const toggleCriteria = (qId: string, criteriaId: string) => {
    setGradedEssayIds((prev) => new Set(prev).add(qId))
    setEssayCriteria((prev) => {
      const current = prev[qId] ?? []
      const next = current.includes(criteriaId)
        ? current.filter((c) => c !== criteriaId)
        : [...current, criteriaId]
      return { ...prev, [qId]: next }
    })
  }

  const markAsZero = (qId: string) => {
    setGradedEssayIds((prev) => new Set(prev).add(qId))
    setEssayCriteria((prev) => ({ ...prev, [qId]: [] }))
  }

  // Mỗi câu quy về thang 100%: trắc nghiệm đúng = 100%, tự luận = tổng % tiêu chí đạt.
  // Điểm bài = trung bình cộng % của tất cả câu hỏi.
  const preview = useMemo(() => {
    const questionCount = mcqQuestions.length + essayQuestions.length
    let sum = 0
    for (const q of mcqQuestions) {
      sum += (existingGrades[q.id]?.score ?? 0) > 0 ? 100 : 0
    }
    for (const q of essayQuestions) {
      sum += essayScoreFor(q)
    }
    return questionCount > 0 ? Math.round(sum / questionCount) : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcqQuestions, essayQuestions, existingGrades, essayCriteria])

  const save = (status: 'grading' | 'done') => {
    const grades: Record<string, QuestionGrade> = { ...existingGrades }
    for (const q of essayQuestions) {
      grades[q.id] = { score: essayScoreFor(q), criteria: essayCriteria[q.id] ?? [] }
    }
    gradeSubmission.mutate(
      {
        submissionId: submission.id,
        graderNote,
        status,
        grades,
        totalScore: preview,
      },
      {
        onSuccess: () => {
          toast.success(status === 'done' ? 'Đã lưu điểm' : 'Đã lưu nháp')
        },
        onError: () => {
          toast.error('Có lỗi xảy ra, vui lòng thử lại')
        },
      }
    )
  }

  if (!paper) {
    return (
      <Card className="p-4">
        <p className="text-sm font-semibold text-foreground">{submission.fullName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Bài nộp này không dùng đề thi ExamPaper (dùng bộ câu hỏi cũ) — chấm ở màn chấm bài thông
          thường.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">{submission.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {submission.teamGroup ?? '—'} · Đề {paper.code}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {submission.status === 'done' ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Đã chấm · {submission.totalScore ?? preview}%
            </Badge>
          ) : submission.status === 'grading' ? (
            <Badge variant="warning">Đang chấm</Badge>
          ) : (
            <Badge variant="warning">Chờ chấm</Badge>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {mcqQuestions.map((q, idx) => {
          const answer = questionAnswerText(submission.answers, q.id)
          const graded = existingGrades[q.id]
          const isCorrect = graded ? graded.score > 0 : null
          return (
            <div key={q.id} className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">
                  Câu {idx + 1}. {q.stem}
                </p>
                {isCorrect === true ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : isCorrect === false ? (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                ) : null}
              </div>
              <p className="mt-1 text-muted-foreground">
                Đáp án chọn: <span className="font-medium text-foreground">{answer || '—'}</span>
                {' · '}Tự động chấm ({(graded?.score ?? 0) > 0 ? 'đúng' : 'sai'})
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-3 space-y-2">
        {essayQuestions.map((q, idx) => {
          const answer = questionAnswerText(submission.answers, q.id)
          const weights = q.criteriaWeights ?? DEFAULT_ESSAY_CRITERIA_WEIGHTS
          const selected = essayCriteria[q.id] ?? []
          const isGraded = gradedEssayIds.has(q.id)
          const score = essayScoreFor(q)
          return (
            <div key={q.id} className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs">
              <p className="font-medium text-foreground">
                Tự luận {idx + 1}. {q.stem}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {answer || '(chưa trả lời)'}
              </p>

              <div
                className={cn(
                  'mt-2 rounded-lg border p-2.5 transition-colors',
                  isGraded ? 'border-primary/10 bg-primary/5' : 'border-red-200 bg-red-50/30'
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground">
                    Đánh giá theo thang điểm (tổng 100%)
                  </span>
                  {isGraded && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
                      {score}%
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <label className="flex cursor-pointer items-center gap-1.5 font-medium text-rose-600">
                    <Checkbox
                      className="h-4 w-4 rounded-full border-2 border-rose-300 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                      checked={isGraded && selected.length === 0}
                      onCheckedChange={() => markAsZero(q.id)}
                    />
                    Không đạt / 0đ
                  </label>
                  {ESSAY_CRITERIA.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-1.5 font-medium hover:text-primary"
                    >
                      <Checkbox
                        className="h-4 w-4 rounded-full border-2 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        checked={selected.includes(c.id)}
                        onCheckedChange={() => toggleCriteria(q.id, c.id)}
                      />
                      {c.label} ({weights[c.id]}%)
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3">
        <Textarea
          value={graderNote}
          onChange={(e) => setGraderNote(e.target.value)}
          placeholder="Nhận xét chung cho học viên..."
          className="min-h-[60px] text-sm"
        />
      </div>

      <FeedbackPanel submissionId={submission.id} />

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Điểm dự kiến: {preview}%</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => save('grading')}
            disabled={gradeSubmission.isPending}
          >
            Lưu nháp
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => save('done')}
            disabled={gradeSubmission.isPending}
          >
            {gradeSubmission.isPending ? 'Đang lưu...' : 'Lưu điểm'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function EditorExamGradingScreen({ scheduleId }: { scheduleId: string }) {
  const { data: submissions = [], isLoading } = useManagerSubmissions({ scheduleId })

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Chấm bài thi', href: '/manager/grading' },
          { label: 'Chấm chéo bài thi' },
        ]}
      />
      <PageHeader
        title="Chấm chéo bài thi"
        description="Câu trắc nghiệm đã được hệ thống tự chấm — bạn chỉ cần chấm điểm 3 câu tự luận và nhận xét chung cho từng học viên."
      />
      {isLoading ? (
        <SkeletonSubmissionCardList count={3} />
      ) : submissions.length === 0 ? (
        <EmptyState title="Chưa có bài nộp" description="Học viên chưa nộp bài cho lịch thi này." />
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <SubmissionGradingCard key={s.id} submission={s} />
          ))}
        </div>
      )}
    </>
  )
}
