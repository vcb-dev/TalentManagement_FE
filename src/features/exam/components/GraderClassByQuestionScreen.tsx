import { useEffect, useMemo, useState } from 'react'
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
  scheduleId?: string
}

const CRITERIA_WEIGHTS: Record<string, number> = {
  ly_thuyet: 40,
  thuc_te: 50,
  trinh_bay: 10,
}

type LocalGrade = { criteria: string[]; score: number; note: string }

export function GraderClassByQuestionScreen({
  classId,
  scheduleId,
}: GraderClassByQuestionScreenProps) {
  const navigate = useNavigate()
  const { data: allSubmissions = [], isLoading: isLoadingSubs } = useManagerSubmissions()
  const { data: allClasses = [], isLoading: isLoadingClasses } = useManagerClasses()
  const gradeMutation = useGradeSubmission()

  const currentClass = useMemo(
    () => allClasses.find((c) => c.id.toLowerCase() === classId?.toLowerCase()),
    [allClasses, classId]
  )
  const classSubmissions = useMemo(() => {
    let filtered = allSubmissions.filter((s) => s.classId?.toLowerCase() === classId?.toLowerCase())
    if (scheduleId) {
      filtered = filtered.filter((s) => s.scheduleId?.toLowerCase() === scheduleId.toLowerCase())
    }
    return filtered
  }, [allSubmissions, classId, scheduleId])

  // Local state for all grades: Record<submissionId, Record<questionId, LocalGrade>>
  // Plus global notes for each submission: Record<submissionId, string>
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, LocalGrade>>>({})
  const [submissionNotes, setSubmissionNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    console.log('[Grader] classId from params:', classId)
    console.log('[Grader] allSubmissions count:', allSubmissions.length)
    console.log('[Grader] classSubmissions content:', JSON.stringify(classSubmissions))
    if (allSubmissions.length > 0) {
      console.log('[Grader] First submission classId:', allSubmissions[0]?.classId)
    }
  }, [classId, allSubmissions])

  // Question bank for this class
  const questionBank = useMemo(() => {
    console.log('[Grader] Finding question bank for class:', classId, 'schedule:', scheduleId)
    console.log('[Grader] Total submissions for this filter:', classSubmissions.length)

    // Priority 1: If we have a scheduleId, try to find questions from a submission that has that scheduleId
    if (scheduleId) {
      const subWithScheduleQuestions = classSubmissions.find(
        (s) => s.scheduleId?.toLowerCase() === scheduleId.toLowerCase() && s.schedule?.examQuestions
      )
      if (subWithScheduleQuestions?.schedule?.examQuestions) {
        console.log('[Grader] Found questions in the specific schedule data')
        return subWithScheduleQuestions.schedule.examQuestions as any
      }
    }

    // Priority 2: Backend data from the current class object
    if (currentClass?.examQuestions) {
      console.log('[Grader] Found in backend class data')
      return currentClass.examQuestions as any
    }

    // Priority 3: Look into any submission found (might have questions from its schedule)
    const firstSubWithQuestions = classSubmissions.find(
      (s) => s.schedule?.examQuestions || s.learningClass?.examQuestions
    )
    if (firstSubWithQuestions) {
      console.log(
        '[Grader] Found in any submission data. Schedule questions:',
        !!firstSubWithQuestions.schedule?.examQuestions
      )
      return (
        firstSubWithQuestions.schedule?.examQuestions ||
        firstSubWithQuestions.learningClass?.examQuestions
      )
    }

    console.log('[Grader] No questions found in class or submissions')
    // Priority 3: Fallback to localStorage (legacy/transition)
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
  }, [currentClass, classId, classSubmissions])

  // Initialize local state from submissions
  useEffect(() => {
    if (classSubmissions.length > 0 && Object.keys(localGrades).length === 0) {
      const newGrades: Record<string, Record<string, LocalGrade>> = {}
      const newNotes: Record<string, string> = {}
      classSubmissions.forEach((sub) => {
        newGrades[sub.id] = (sub.grades as Record<string, LocalGrade>) || {}
        newNotes[sub.id] = sub.graderNote || ''
      })
      setLocalGrades(newGrades)
      setSubmissionNotes(newNotes)
    }
  }, [classSubmissions, localGrades])

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

  const handleNoteChange = (submissionId: string, qId: string, note: string) => {
    setLocalGrades((prev) => {
      const subGrades = prev[submissionId] || {}
      const qGrade = subGrades[qId] || { criteria: [], score: 0, note: '' }
      return {
        ...prev,
        [submissionId]: {
          ...subGrades,
          [qId]: { ...qGrade, note },
        },
      }
    })
  }

  const [showOutcomeModal, setShowOutcomeModal] = useState(false)
  const [individualOutcomes, setIndividualOutcomes] = useState<
    Record<string, 'DAT' | 'CHO_HOC_LAI'>
  >({})

  // Initialize individual outcomes based on scores when opening modal
  useEffect(() => {
    if (showOutcomeModal && classSubmissions.length > 0) {
      const initial: Record<string, 'DAT' | 'CHO_HOC_LAI'> = {}
      classSubmissions.forEach((sub) => {
        const grades = localGrades[sub.id] || {}
        const answeredCount = Object.keys(sub.answers || {}).length
        const totalScore =
          answeredCount > 0
            ? Math.round(
                Object.values(grades).reduce((acc, g) => acc + (g.score || 0), 0) / answeredCount
              )
            : 0

        // Default to DAT if score >= 80, else CHO_HOC_LAI
        initial[sub.id] = totalScore >= 80 ? 'DAT' : 'CHO_HOC_LAI'
      })
      setIndividualOutcomes(initial)
    }
  }, [showOutcomeModal, classSubmissions, localGrades])

  const handleFinalSubmit = async () => {
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
      const outcome = individualOutcomes[subId] || 'CHO_HOC_LAI'

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
          status: 'done',
          totalScore,
          outcome,
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
      }, 500)
    }
    if (failCount > 0) {
      toast.error(`Lỗi khi lưu cho ${failCount} học viên`)
    }
    setShowOutcomeModal(false)
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
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-slate-50/50 text-sm text-foreground overflow-hidden">
      {/* Top Header Bar - Fixed & Refined */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 py-4 shadow-sm z-20 backdrop-blur-md">
        <div className="flex items-center gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-slate-100 transition-colors"
            onClick={() => void navigate({ to: '/manager/grading' })}
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-slate-900 truncate tracking-tight">
              {currentClass?.name || 'Chấm thi theo lớp'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                Chế độ: Chấm theo câu hỏi
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex rounded-xl font-bold border-slate-200 hover:bg-slate-50"
            onClick={() => void navigate({ to: '/manager/grading' })}
          >
            Hủy bỏ
          </Button>
          <Button
            size="sm"
            disabled={gradeMutation.isPending}
            className="rounded-xl px-5 font-bold shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95"
            onClick={() => setShowOutcomeModal(true)}
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

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="pt-10 pb-24 px-6 space-y-16 max-w-5xl mx-auto w-full">
          {questionBank.questions.map((q: any, qIdx: number) => {
            return (
              <section key={q.id} className="relative">
                <div className="flex items-start gap-4 mb-8">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-sm font-black shadow-inner">
                    {qIdx + 1}
                  </div>
                  <div className="flex-1 pt-1.5">
                    <h2 className="text-lg font-bold text-slate-900 leading-relaxed">{q.stem}</h2>
                    {q.options && q.options.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {q.options.map((opt: string, oi: number) => (
                          <span
                            key={oi}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 font-semibold shadow-sm"
                          >
                            <span className="text-primary mr-1">
                              {String.fromCharCode(65 + oi)}.
                            </span>{' '}
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 ml-0 md:ml-12">
                  {classSubmissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                      <p className="text-sm font-medium text-slate-400">
                        Chưa có học viên nào nộp bài.
                      </p>
                    </div>
                  ) : (
                    classSubmissions.map((sub) => {
                      const answer = (sub.answers as any)?.[q.id] || ''
                      const grade = localGrades[sub.id]?.[q.id] || {
                        criteria: [],
                        score: 0,
                        note: '',
                      }

                      return (
                        <div
                          key={sub.id}
                          className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
                        >
                          <div className="mb-5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <User className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-bold text-slate-800">
                                {sub.fullName}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <div
                                className={cn(
                                  'flex items-center gap-2 rounded-2xl px-4 py-1.5 transition-all',
                                  grade.score >= 90
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : grade.score >= 40
                                      ? 'bg-blue-50 text-blue-600'
                                      : 'bg-slate-50 text-slate-400'
                                )}
                              >
                                <span className="text-xs font-black tracking-tighter">
                                  {grade.score}%
                                </span>
                                {grade.score >= 90 && <CheckCircle2 className="h-3 w-3" />}
                              </div>
                            </div>
                          </div>

                          <div
                            className={cn(
                              'mb-6 rounded-2xl border-2 p-4 text-[13px] leading-relaxed transition-colors',
                              answer.trim()
                                ? 'border-slate-50 bg-slate-50/50 text-slate-700'
                                : 'border-dashed border-slate-100 text-slate-400 italic bg-transparent'
                            )}
                          >
                            {answer.trim() || 'Học viên không trả lời câu này'}
                          </div>

                          {/* Criteria Selection - Matching individual view style */}
                          <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 mt-5">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Đánh giá câu trả lời
                              </span>
                              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
                                {grade.score}%
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-6">
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
                                    className="h-5 w-5 rounded-md border-2 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    checked={grade.criteria.includes(c.id)}
                                    onCheckedChange={() => toggleCriteria(sub.id, q.id, c.id)}
                                  />
                                  <span>{c.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Per-Question Feedback */}
                          <div className="mt-5 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                              Nhận xét chi tiết cho câu hỏi này
                            </label>
                            <Textarea
                              placeholder="Nhập góp ý hoặc lý do trừ điểm cho câu trả lời này..."
                              value={grade.note || ''}
                              onChange={(e) => handleNoteChange(sub.id, q.id, e.target.value)}
                              className="min-h-[80px] text-[13px] resize-none rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-primary/20 transition-all"
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>
            )
          })}

          {/* Global notes section */}
          <section className="pt-16 border-t-2 border-slate-200 border-dashed">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Nhận xét chung cho từng học viên
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {classSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="font-extrabold text-slate-800">{sub.fullName}</span>
                  </div>
                  <Textarea
                    placeholder={`Nhập đánh giá tổng quát cho ${sub.fullName}...`}
                    value={submissionNotes[sub.id] || ''}
                    onChange={(e) =>
                      setSubmissionNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))
                    }
                    className="min-h-[120px] text-sm resize-none rounded-2xl border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-primary/20 transition-all"
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="py-16 flex justify-center">
            <Button
              size="lg"
              className="h-14 px-12 rounded-2xl font-black shadow-xl shadow-primary/20 text-lg hover:scale-105 transition-transform active:scale-95"
              onClick={() => setShowOutcomeModal(true)}
              disabled={gradeMutation.isPending}
            >
              {gradeMutation.isPending && <Loader2 className="h-6 w-6 animate-spin mr-3" />}
              Xác nhận & Hoàn tất chấm thi
            </Button>
          </div>
        </div>
      </div>

      {showOutcomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="my-auto w-full max-w-2xl scale-in-center rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-200">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Xác nhận kết quả lớp học
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Vui lòng kiểm tra lại kết quả của từng học viên trước khi hoàn tất.
              </p>
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-2 mb-8 space-y-3 custom-scrollbar">
              {classSubmissions.map((sub) => {
                const outcome = individualOutcomes[sub.id] || 'CHO_HOC_LAI'
                const grades = localGrades[sub.id] || {}
                const answeredCount = Object.keys(sub.answers || {}).length
                const totalScore =
                  answeredCount > 0
                    ? Math.round(
                        Object.values(grades).reduce((acc, g) => acc + (g.score || 0), 0) /
                          answeredCount
                      )
                    : 0

                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{sub.fullName}</p>
                      <p className="text-xs font-bold text-primary">Điểm: {totalScore}%</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={outcome === 'DAT' ? 'default' : 'outline'}
                        className={cn(
                          'rounded-xl h-9 px-4 font-bold transition-all',
                          outcome === 'DAT'
                            ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600'
                            : 'border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200'
                        )}
                        onClick={() =>
                          setIndividualOutcomes((prev) => ({ ...prev, [sub.id]: 'DAT' }))
                        }
                      >
                        Đạt (Pass)
                      </Button>
                      <Button
                        size="sm"
                        variant={outcome === 'CHO_HOC_LAI' ? 'default' : 'outline'}
                        className={cn(
                          'rounded-xl h-9 px-4 font-bold transition-all',
                          outcome === 'CHO_HOC_LAI'
                            ? 'bg-rose-600 hover:bg-rose-700 border-rose-600 text-white'
                            : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200'
                        )}
                        onClick={() =>
                          setIndividualOutcomes((prev) => ({ ...prev, [sub.id]: 'CHO_HOC_LAI' }))
                        }
                      >
                        Thi lại
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                className="h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-95"
                disabled={gradeMutation.isPending}
                onClick={() => void handleFinalSubmit()}
              >
                {gradeMutation.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin mr-3" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 mr-3" />
                )}
                Xác nhận & Hoàn tất tất cả
              </Button>
              <Button
                variant="ghost"
                className="h-12 rounded-xl text-slate-400 font-bold hover:text-slate-600"
                onClick={() => setShowOutcomeModal(false)}
                disabled={gradeMutation.isPending}
              >
                Quay lại chỉnh sửa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
