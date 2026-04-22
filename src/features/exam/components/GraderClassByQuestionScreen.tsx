import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Loader2, Save, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useGradeSubmission, useManagerSubmissions } from '@/features/exam/hooks'
import { useManagerClasses } from '@/features/manager/hooks'

export interface GraderClassByQuestionScreenProps {
  classId: string
}

const CRITERIA_WEIGHTS: Record<string, number> = {
  ly_thuyet: 40,
  thuc_te: 50,
  trinh_bay: 10,
}

type LocalGrade = { criteria: string[]; score: number; note: string }

export function GraderClassByQuestionScreen({ classId }: GraderClassByQuestionScreenProps) {
  const navigate = useNavigate()
  const { data: allSubmissions = [], isLoading: isLoadingSubs } = useManagerSubmissions()
  const { data: allClasses = [], isLoading: isLoadingClasses } = useManagerClasses()
  const gradeMutation = useGradeSubmission()

  const currentClass = useMemo(
    () => allClasses.find((c) => c.id === classId),
    [allClasses, classId]
  )
  const classSubmissions = useMemo(
    () => allSubmissions.filter((s) => s.classId === classId),
    [allSubmissions, classId]
  )

  // Local state for all grades: Record<submissionId, Record<questionId, LocalGrade>>
  // Plus global notes for each submission: Record<submissionId, string>
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, LocalGrade>>>({})
  const [submissionNotes, setSubmissionNotes] = useState<Record<string, string>>({})

  // Question bank for this class
  const questionBank = useMemo(() => {
    console.log('[Grader] Finding question bank for class:', classId)
    // Priority 1: Backend data from the current class object
    if (currentClass?.examQuestions) {
      console.log('[Grader] Found in backend data')
      return currentClass.examQuestions as any
    }
    // Priority 2: Fallback to localStorage (legacy/transition)
    try {
      const raw = localStorage.getItem('manager_exam_question_bank_v1')
      console.log('[Grader] localStorage content:', raw ? 'exists' : 'empty')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const found = parsed[classId] || null
      console.log('[Grader] Found in localStorage:', found ? 'yes' : 'no')
      return found
    } catch (err) {
      console.error('[Grader] Error reading localStorage:', err)
      return null
    }
  }, [currentClass, classId])

  // Initialize local state from submissions
  useMemo(() => {
    const newGrades: Record<string, Record<string, LocalGrade>> = {}
    const newNotes: Record<string, string> = {}
    classSubmissions.forEach((sub) => {
      newGrades[sub.id] = (sub.grades as Record<string, LocalGrade>) || {}
      newNotes[sub.id] = sub.graderNote || ''
    })
    // Only set if we don't have state yet to avoid overwriting during edits
    if (Object.keys(localGrades).length === 0) {
      setLocalGrades(newGrades)
      setSubmissionNotes(newNotes)
    }
  }, [classSubmissions]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCriteria = (submissionId: string, qId: string, criteriaId: string) => {
    setLocalGrades((prev) => {
      const subGrades = prev[submissionId] || {}
      const qGrade = subGrades[qId] || { criteria: [], score: 0, note: '' }
      const isSelected = qGrade.criteria.includes(criteriaId)
      const newCriteria = isSelected
        ? qGrade.criteria.filter((c) => c !== criteriaId)
        : [...qGrade.criteria, criteriaId]
      const newScore = newCriteria.reduce((sum, c) => sum + (CRITERIA_WEIGHTS[c] || 0), 0)

      return {
        ...prev,
        [submissionId]: {
          ...subGrades,
          [qId]: { ...qGrade, criteria: newCriteria, score: newScore },
        },
      }
    })
  }

  const handleSaveAll = async () => {
    const submissionsToSave = Object.keys(localGrades)
    if (submissionsToSave.length === 0) {
      toast.info('Không có dữ liệu để lưu')
      return
    }

    let successCount = 0
    let failCount = 0

    for (const subId of submissionsToSave) {
      const sub = classSubmissions.find((s) => s.id === subId)
      if (!sub) continue

      const grades = localGrades[subId]
      const graderNote = submissionNotes[subId] || ''

      // Calculate total score for this student
      const answeredCount = Object.keys(sub.answers || {}).length
      const totalScore =
        answeredCount > 0
          ? Math.round(
              Object.values(grades || {}).reduce((acc, g) => acc + (g.score || 0), 0) /
                answeredCount
            )
          : 0

      try {
        await gradeMutation.mutateAsync({
          submissionId: subId,
          grades,
          graderNote,
          status: 'done', // Auto mark as done when saving in this view
          totalScore,
        })
        successCount++
      } catch {
        failCount++
      }
    }

    if (successCount > 0) {
      toast.success(`Đã lưu kết quả cho ${successCount} học viên`)
      setTimeout(() => {
        void navigate({ to: '/manager/grading' })
      }, 1000)
    }
    if (failCount > 0) {
      toast.error(`Lỗi khi lưu cho ${failCount} học viên`)
    }
  }

  if (isLoadingSubs || isLoadingClasses) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Đang tải dữ liệu chấm thi...</p>
      </div>
    )
  }

  if (!questionBank) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Lớp này chưa được gán bộ câu hỏi.</p>
        <Button onClick={() => void navigate({ to: '/manager/class-exams' })}>
          Quản lý đề thi
        </Button>
      </div>
    )
  }

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3.5rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-primary/10 bg-card/80 px-6 py-3 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary/10"
            onClick={() => void navigate({ to: '/manager/grading' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate">
              {currentClass?.name || 'Chấm thi theo lớp'}
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest">
              Chế độ: Chấm theo câu hỏi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={gradeMutation.isPending}
            className="rounded-lg px-4 font-bold shadow-lg shadow-primary/20"
            onClick={handleSaveAll}
          >
            {gradeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lưu tất cả bài chấm
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-10 max-w-5xl mx-auto w-full">
        {questionBank.questions.map((q: any, qIdx: number) => {
          return (
            <section key={q.id} className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white shadow-sm">
                  {qIdx + 1}
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-foreground leading-snug">{q.stem}</h2>
                  {q.options && q.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.options.map((opt: string, oi: number) => (
                        <span
                          key={oi}
                          className="rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground font-medium"
                        >
                          {String.fromCharCode(65 + oi)}. {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 ml-10">
                {classSubmissions.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground bg-muted/20 p-4 rounded-lg border border-dashed border-border">
                    Chưa có học viên nào nộp bài.
                  </p>
                ) : (
                  classSubmissions.map((sub) => {
                    const answer = (sub.answers as any)?.[q.id] || ''
                    const grade = localGrades[sub.id]?.[q.id] || {
                      criteria: [],
                      score: 0,
                      note: '',
                    }
                    const isDone = sub.status === 'done'

                    return (
                      <div
                        key={sub.id}
                        className="group relative rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                              <User className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              {sub.fullName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tight',
                                grade.score >= 90
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : grade.score >= 40
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {grade.score}%
                            </span>
                          </div>
                        </div>

                        <div
                          className={cn(
                            'mb-4 rounded-lg border p-3 text-sm transition-colors',
                            answer.trim()
                              ? 'border-border bg-muted/20 text-foreground'
                              : 'border-dashed border-muted text-muted-foreground italic bg-transparent'
                          )}
                        >
                          {answer.trim() || 'Học viên không trả lời câu này'}
                        </div>

                        {/* Criteria Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-4">
                          {[
                            { id: 'ly_thuyet', label: 'Lý thuyết', weight: 40 },
                            { id: 'thuc_te', label: 'Thực tế', weight: 50 },
                            { id: 'trinh_bay', label: 'Trình bày', weight: 10 },
                          ].map((c) => (
                            <label
                              key={c.id}
                              className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                            >
                              <Checkbox
                                className="h-4 w-4 rounded-sm border-2 border-primary/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                checked={grade.criteria.includes(c.id)}
                                onCheckedChange={() => toggleCriteria(sub.id, q.id, c.id)}
                              />
                              {c.label} ({c.weight}%)
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          )
        })}

        {/* Global notes per student section */}
        <section className="pt-10 border-t-2 border-border border-dashed">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold">Nhận xét chung cho từng học viên</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {classSubmissions.map((sub) => (
              <div key={sub.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="font-bold text-sm">{sub.fullName}</span>
                </div>
                <Textarea
                  placeholder={`Nhập đánh giá tổng quát cho ${sub.fullName}...`}
                  value={submissionNotes[sub.id] || ''}
                  onChange={(e) =>
                    setSubmissionNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))
                  }
                  className="min-h-[100px] text-sm resize-none rounded-lg border-border focus:ring-primary/20"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="py-10 flex justify-center">
          <Button
            size="lg"
            className="h-12 px-10 rounded-xl font-bold shadow-2xl shadow-primary/30 text-base"
            onClick={handleSaveAll}
            disabled={gradeMutation.isPending}
          >
            {gradeMutation.isPending && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
            Xác nhận & Hoàn tất chấm thi cho cả lớp
          </Button>
        </div>
      </div>
    </div>
  )
}
