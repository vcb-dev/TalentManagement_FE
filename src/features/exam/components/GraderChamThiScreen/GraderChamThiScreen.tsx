import { useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { useGradeSubmission, useManagerSubmissions } from '@/features/exam/hooks'

export interface GraderChamThiScreenProps {
  /** This is actually the submission ID */
  examId: string
  employeeId: string
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

  const gradeForm = useForm<{
    graderNote: string
    grades: Record<string, { criteria: string[]; score: number }>
  }>({
    defaultValues: { graderNote: '', grades: {} },
  })
  const graderNote = useWatch({ control: gradeForm.control, name: 'graderNote' }) ?? ''
  const grades = useWatch({ control: gradeForm.control, name: 'grades' }) ?? {}

  useEffect(() => {
    if (!submission) return
    gradeForm.reset({
      graderNote: submission.graderNote ?? '',
      grades: (submission.grades as Record<string, { criteria: string[]; score: number }>) || {},
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

  const totalScore =
    answeredEntries.length > 0
      ? Math.round(
          Object.values(grades).reduce((acc, g) => acc + g.score, 0) / answeredEntries.length
        )
      : 0

  const handleComplete = (status: 'grading' | 'done') => {
    if (status === 'done' && !graderNote.trim()) {
      toast.error('Vui lòng nhập nhận xét trước khi hoàn thành chấm')
      return
    }
    gradeMutation.mutate(
      {
        submissionId: examId,
        graderNote: gradeForm.getValues('graderNote'),
        status,
        grades: gradeForm.getValues('grades') ?? {},
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
        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() => void navigate({ to: '/exam/grader' })}
        >
          ← Quay lại danh sách
        </button>
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
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      {/* Sub header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-card/50 px-6 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
            onClick={() => void navigate({ to: '/exam/grader' })}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            DS bài thi
          </button>
          <div className="hidden h-4 w-px shrink-0 bg-border sm:block" />
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            Chấm thi: <span className="font-bold text-foreground">{submission.fullName}</span>
            {submission.learningClass?.name && ` · Lớp ${submission.learningClass.name}`}
          </p>
          <span className="shrink-0 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            Vai trò: {roleLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={gradeMutation.isPending}
            className="whitespace-nowrap rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
            onClick={() => handleComplete('grading')}
          >
            Lưu nháp
          </button>
          <button
            type="button"
            disabled={gradeMutation.isPending}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-button bg-button px-3.5 py-1.5 text-xs font-bold text-button-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
            onClick={() => handleComplete('done')}
          >
            {gradeMutation.isPending ? 'Đang lưu...' : 'Hoàn thành chấm'}
          </button>
        </div>
      </div>

      <div className="page-shell">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-12">
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
                <div>
                  <p className="text-xs text-muted-foreground">Ngày nộp</p>
                  <p className="font-semibold text-foreground">{formattedDate}</p>
                </div>
              </div>
            </div>

            {/* Answers */}
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
                    const questionGrade = grades[qId] || { criteria: [], score: 0 }

                    const toggleCriteria = (criteriaId: string) => {
                      const current = gradeForm.getValues('grades') ?? {}
                      const prevCriteria = current[qId]?.criteria || []
                      const isSelected = prevCriteria.includes(criteriaId)
                      const newCriteria = isSelected
                        ? prevCriteria.filter((c) => c !== criteriaId)
                        : [...prevCriteria, criteriaId]
                      const CRITERIA_WEIGHTS: Record<string, number> = {
                        ly_thuyet: 40,
                        thuc_te: 50,
                        trinh_bay: 10,
                      }
                      const newScore = newCriteria.reduce(
                        (sum, c) => sum + (CRITERIA_WEIGHTS[c] || 0),
                        0
                      )
                      gradeForm.setValue('grades', {
                        ...current,
                        [qId]: { criteria: newCriteria, score: newScore },
                      })
                    }

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
                          {answer?.trim() || 'Thí sinh không trả lời câu này'}
                        </div>

                        <div className="rounded-lg border border-primary/10 bg-primary/5 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Đánh giá câu trả lời
                            </span>
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
                              {questionGrade.score}%
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium hover:text-primary">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                                checked={questionGrade.criteria.includes('ly_thuyet')}
                                disabled={submission.status === 'done' && !gradeMutation.isPending}
                                onChange={() => toggleCriteria('ly_thuyet')}
                              />
                              Đúng lý thuyết (40%)
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium hover:text-primary">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                                checked={questionGrade.criteria.includes('thuc_te')}
                                disabled={submission.status === 'done' && !gradeMutation.isPending}
                                onChange={() => toggleCriteria('thuc_te')}
                              />
                              Ví dụ thực tế (50%)
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium hover:text-primary">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                                checked={questionGrade.criteria.includes('trinh_bay')}
                                disabled={submission.status === 'done' && !gradeMutation.isPending}
                                onChange={() => toggleCriteria('trinh_bay')}
                              />
                              Trình bày (10%)
                            </label>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Grader note */}
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">
                Nhận xét của người chấm
              </h2>
              <Controller
                control={gradeForm.control}
                name="graderNote"
                render={({ field }) => (
                  <textarea
                    className="min-h-[140px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/25"
                    placeholder="Nhập nhận xét, đánh giá chung về bài làm của thí sinh... (bắt buộc khi hoàn thành chấm)"
                    disabled={submission.status === 'done' && !gradeMutation.isPending}
                    {...field}
                  />
                )}
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
                  <span className="text-muted-foreground">Số câu trả lời</span>
                  <span className="font-bold text-foreground">{answeredEntries.length}</span>
                </div>
                <div className="my-2 h-px w-full bg-border" />
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Tổng điểm trung bình</span>
                  <span className="text-lg font-bold text-primary">{totalScore}%</span>
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

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  disabled={gradeMutation.isPending}
                  className="w-full rounded-lg border border-button bg-button py-2 text-sm font-bold text-button-foreground hover:opacity-90 disabled:opacity-60"
                  onClick={() => handleComplete('done')}
                >
                  {gradeMutation.isPending ? 'Đang lưu...' : 'Hoàn thành chấm'}
                </button>
                <button
                  type="button"
                  disabled={gradeMutation.isPending}
                  className="w-full rounded-lg border border-border bg-card py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                  onClick={() => handleComplete('grading')}
                >
                  Lưu nháp
                </button>
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
  )
}
