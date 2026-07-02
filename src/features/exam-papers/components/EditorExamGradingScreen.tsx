import { useMemo, useState } from 'react'
import { CheckCircle2, MessageSquare, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonSubmissionCardList } from '@/components/ui/skeleton'
import {
  useGradeSubmission,
  useManagerSubmissions,
  useSubmissionFeedback,
} from '@/features/exam/hooks'
import type { z } from 'zod'
import type { examSubmissionApiSchema } from '@/features/exam/schemas'

type Submission = z.infer<typeof examSubmissionApiSchema>
type QuestionGrade = { score: number; auto?: boolean; criteria: string[] }

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
  const [essayScores, setEssayScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const q of paper?.questions ?? []) {
      const existing = q.type === 'essay' ? existingGrades[q.id] : undefined
      if (existing) {
        init[q.id] = String(existing.score)
      }
    }
    return init
  })
  const [graderNote, setGraderNote] = useState(submission.graderNote ?? '')
  const gradeSubmission = useGradeSubmission()

  const mcqQuestions = paper?.questions.filter((q) => q.type === 'mcq') ?? []
  const essayQuestions = paper?.questions.filter((q) => q.type === 'essay') ?? []

  const preview = useMemo(() => {
    let earned = 0
    let total = 0
    for (const q of mcqQuestions) {
      total += q.points
      earned += existingGrades[q.id]?.score ?? 0
    }
    for (const q of essayQuestions) {
      total += q.points
      const raw = essayScores[q.id]
      earned += raw !== undefined ? Math.min(Number(raw) || 0, q.points) : 0
    }
    return total > 0 ? Math.round((earned / total) * 100) : 0
  }, [mcqQuestions, essayQuestions, existingGrades, essayScores])

  const submit = () => {
    const grades: Record<string, QuestionGrade> = { ...existingGrades }
    for (const q of essayQuestions) {
      const raw = essayScores[q.id]
      const score = Math.max(0, Math.min(q.points, Number(raw) || 0))
      grades[q.id] = { score, criteria: [] }
    }
    gradeSubmission.mutate({
      submissionId: submission.id,
      graderNote,
      status: 'done',
      grades,
      totalScore: preview,
    })
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
                {' · '}Tự động chấm ({graded?.score ?? 0}/{q.points} điểm)
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-3 space-y-2">
        {essayQuestions.map((q, idx) => {
          const answer = questionAnswerText(submission.answers, q.id)
          return (
            <div key={q.id} className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs">
              <p className="font-medium text-foreground">
                Tự luận {idx + 1}. {q.stem}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {answer || '(chưa trả lời)'}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-muted-foreground">Điểm (tối đa {q.points}):</span>
                <Input
                  type="number"
                  min={0}
                  max={q.points}
                  value={essayScores[q.id] ?? ''}
                  onChange={(e) => setEssayScores((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="h-7 w-20 text-xs"
                />
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
        <Button type="button" size="sm" onClick={submit} disabled={gradeSubmission.isPending}>
          {gradeSubmission.isPending ? 'Đang lưu...' : 'Lưu điểm'}
        </Button>
      </div>
    </Card>
  )
}

export function EditorExamGradingScreen({ scheduleId }: { scheduleId: string }) {
  const { data: submissions = [], isLoading } = useManagerSubmissions({ scheduleId })

  return (
    <>
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
