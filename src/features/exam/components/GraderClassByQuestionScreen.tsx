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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface GraderClassByQuestionScreenProps {
  classId: string
  scheduleId?: string
}

const CRITERIA_WEIGHTS: Record<string, number> = {
  ly_thuyet: 40,
  thuc_te: 50,
  trinh_bay: 10,
}

const RUBRIC_CRITERIA_MAP = {
  suy_ngam: {
    chua_dat: 10,
    dat: 25,
    tot: 40,
  },
  ket_noi: {
    chua_dat: 10,
    dat: 20,
    tot: 30,
  },
  phat_trien: {
    chua_dat: 10,
    dat: 20,
    tot: 30,
  },
}

type LocalGrade = { criteria: string[]; score: number; note: string; isGraded?: boolean }

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
  const [fileGrades, setFileGrades] = useState<Record<string, { score: string; comment: string }>>(
    {}
  )
  const [rubricGrades, setRubricGrades] = useState<
    Record<string, Record<string, 'chua_dat' | 'dat' | 'tot' | null>>
  >({})

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
    if (scheduleId && currentClass?.schedules) {
      const schedule = (currentClass.schedules as any[]).find(
        (s) => s.id.toLowerCase() === scheduleId.toLowerCase()
      )
      if (schedule?.examQuestions) {
        console.log('[Grader] Found questions in the current class schedule list')
        return schedule.examQuestions
      }
    }

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

  const isFileExam = useMemo(() => {
    const schedule = currentClass?.schedules?.find((s: any) => s.id === scheduleId)
    if (schedule?.location === 'Nộp bài trực tuyến') return true

    return classSubmissions.some((s) => {
      const answers = s.answers as any
      return answers && typeof answers === 'object' && 'fileUrl' in answers
    })
  }, [currentClass, scheduleId, classSubmissions])

  const gradingType = (questionBank as any)?.gradingType || 'direct'

  // Initialize rubric grades from existing submissions
  useEffect(() => {
    if (isFileExam && classSubmissions.length > 0 && Object.keys(rubricGrades).length === 0) {
      const initRubric: Record<string, Record<string, 'chua_dat' | 'dat' | 'tot' | null>> = {}
      classSubmissions.forEach((sub) => {
        const subRubric = (sub.grades as any)?.rubric_reading || {}
        initRubric[sub.id] = {
          suy_ngam: subRubric.suy_ngam || null,
          ket_noi: subRubric.ket_noi || null,
          phat_trien: subRubric.phat_trien || null,
        }
      })
      setRubricGrades(initRubric)
    }
  }, [isFileExam, classSubmissions, rubricGrades])

  const handleRubricChange = (
    subId: string,
    criteriaId: string,
    value: 'chua_dat' | 'dat' | 'tot' | null
  ) => {
    setRubricGrades((prev) => {
      const nextStudent = {
        ...(prev[subId] || { suy_ngam: null, ket_noi: null, phat_trien: null }),
        [criteriaId]: value,
      }

      // Auto-calculate score and update fileGrades.score
      let total = 0
      let hasSelection = false
      Object.entries(nextStudent).forEach(([cId, val]) => {
        if (val) {
          hasSelection = true
          total += RUBRIC_CRITERIA_MAP[cId as 'suy_ngam' | 'ket_noi' | 'phat_trien']?.[val] || 0
        }
      })

      setFileGrades((prevFile) => ({
        ...prevFile,
        [subId]: {
          ...prevFile[subId],
          score: hasSelection ? String(total) : '',
        },
      }))

      return {
        ...prev,
        [subId]: nextStudent,
      }
    })
  }

  // Initialize file grades from existing submissions
  useEffect(() => {
    if (isFileExam && classSubmissions.length > 0 && Object.keys(fileGrades).length === 0) {
      const init: Record<string, { score: string; comment: string }> = {}
      classSubmissions.forEach((sub) => {
        init[sub.id] = {
          score: sub.totalScore != null ? String(sub.totalScore) : '',
          comment: sub.graderNote || '',
        }
      })
      setFileGrades(init)
    }
  }, [isFileExam, classSubmissions])

  const handleFileGradeChange = (subId: string, field: 'score' | 'comment', value: string) => {
    setFileGrades((prev) => ({
      ...prev,
      [subId]: { ...prev[subId], [field]: value },
    }))
  }

  const handleFileExamSaveDraft = async () => {
    let successCount = 0
    let failCount = 0
    for (const sub of classSubmissions) {
      const grade = fileGrades[sub.id]
      if (!grade) continue
      const score = grade.score ? parseInt(grade.score, 10) : 0
      const gradesPayload =
        gradingType === 'rubric_reading' ? { rubric_reading: rubricGrades[sub.id] || {} } : {}

      try {
        await gradeMutation.mutateAsync({
          submissionId: sub.id,
          grades: gradesPayload,
          graderNote: grade.comment,
          status: 'grading',
          totalScore: score,
        })
        successCount++
      } catch {
        failCount++
      }
    }
    if (successCount > 0) toast.success(`Đã lưu bản nháp cho ${successCount} học viên`)
    if (failCount > 0) toast.error(`Lỗi khi lưu cho ${failCount} học viên`)
  }

  const handleFileExamComplete = async () => {
    for (const sub of classSubmissions) {
      const grade = fileGrades[sub.id]
      if (gradingType === 'rubric_reading') {
        const studentRubric = rubricGrades[sub.id] || {}
        const incomplete =
          !studentRubric.suy_ngam || !studentRubric.ket_noi || !studentRubric.phat_trien
        if (incomplete) {
          toast.error(
            `Vui lòng đánh giá đủ tất cả các tiêu chí trong bảng Rubric cho học viên ${sub.fullName}`
          )
          return
        }
      } else {
        if (!grade || !grade.score) {
          toast.error(`Vui lòng nhập điểm cho ${sub.fullName}`)
          return
        }
        const scoreNum = parseInt(grade.score, 10)
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
          toast.error(`Điểm của ${sub.fullName} phải từ 0 đến 100`)
          return
        }
      }
    }

    let successCount = 0
    let failCount = 0
    for (const sub of classSubmissions) {
      const grade = fileGrades[sub.id]
      const score = grade?.score ? parseInt(grade.score, 10) : 0
      const outcome = score >= 80 ? 'DAT' : 'CHO_HOC_LAI'
      const gradesPayload =
        gradingType === 'rubric_reading' ? { rubric_reading: rubricGrades[sub.id] || {} } : {}

      try {
        await gradeMutation.mutateAsync({
          submissionId: sub.id,
          grades: gradesPayload,
          graderNote: grade?.comment || '',
          status: 'done',
          totalScore: score,
          outcome,
        })
        successCount++
      } catch {
        failCount++
      }
    }
    if (successCount > 0) {
      toast.success(`Đã hoàn thành chấm bài cho ${successCount} học viên`)
      setTimeout(() => void navigate({ to: '/manager/grading' }), 500)
    }
    if (failCount > 0) toast.error(`Lỗi khi lưu cho ${failCount} học viên`)
  }

  // Initialize local state from submissions
  useEffect(() => {
    if (classSubmissions.length > 0 && Object.keys(localGrades).length === 0) {
      const newGrades: Record<string, Record<string, LocalGrade>> = {}
      const newNotes: Record<string, string> = {}
      classSubmissions.forEach((sub) => {
        const rawGrades = (sub.grades as Record<string, LocalGrade>) || {}
        // Map existing grades to include isGraded flag
        const mappedGrades: Record<string, LocalGrade> = {}
        Object.entries(rawGrades).forEach(([qId, g]) => {
          mappedGrades[qId] = { ...g, isGraded: true }
        })
        newGrades[sub.id] = mappedGrades
        newNotes[sub.id] = sub.graderNote || ''
      })
      setLocalGrades(newGrades)
      setSubmissionNotes(newNotes)
    }
  }, [classSubmissions, localGrades])

  const toggleCriteria = (submissionId: string, qId: string, criteriaId: string) => {
    setLocalGrades((prev) => {
      const subGrades = prev[submissionId] || {}
      const qGrade = subGrades[qId] || { criteria: [], score: 0, note: '', isGraded: false }
      const isSelected = qGrade.criteria.includes(criteriaId)
      const newCriteria = isSelected
        ? qGrade.criteria.filter((c) => c !== criteriaId)
        : [...qGrade.criteria, criteriaId]
      const newScore = newCriteria.reduce((sum, c) => sum + (CRITERIA_WEIGHTS[c] || 0), 0)

      return {
        ...prev,
        [submissionId]: {
          ...subGrades,
          [qId]: { ...qGrade, criteria: newCriteria, score: newScore, isGraded: true },
        },
      }
    })
  }

  const markAsZero = (submissionId: string, qId: string) => {
    setLocalGrades((prev) => {
      const subGrades = prev[submissionId] || {}
      return {
        ...prev,
        [submissionId]: {
          ...subGrades,
          [qId]: { criteria: [], score: 0, note: subGrades[qId]?.note || '', isGraded: true },
        },
      }
    })
  }

  const handleNoteChange = (submissionId: string, qId: string, note: string) => {
    setLocalGrades((prev) => {
      const subGrades = prev[submissionId] || {}
      const qGrade = subGrades[qId] || { criteria: [], score: 0, note: '', isGraded: false }
      return {
        ...prev,
        [submissionId]: {
          ...subGrades,
          [qId]: { ...qGrade, note, isGraded: true },
        },
      }
    })
  }

  const [showOutcomeModal, setShowOutcomeModal] = useState(false)

  const handleOpenOutcomeModal = () => {
    // Validation: Ensure ALL questions for ALL students are graded (even empty ones)
    for (const sub of classSubmissions) {
      const subGrades = localGrades[sub.id] || {}
      const questions = questionBank?.questions || []

      for (const q of questions) {
        const g = subGrades[q.id]
        if (!g || !g.isGraded) {
          toast.error(`Bạn chưa chấm điểm cho học viên ${sub.fullName}`)

          // Find and scroll to the ungraded item
          const element = document.getElementById(`sub-${sub.id}-q-${q.id}`)
          if (element) {
            // Use a bit of delay to ensure smooth scrolling
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })

            // Add a strong visual highlight
            element.classList.add('ring-8', 'ring-red-500', 'ring-offset-4', 'duration-500')
            setTimeout(() => {
              element.classList.remove('ring-8', 'ring-red-500', 'ring-offset-4')
            }, 3000)
          }
          return
        }
      }
    }

    setShowOutcomeModal(true)
  }

  const handleSaveDraft = async () => {
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

      const totalQuestionCount = questionBank?.questions?.length || 0
      const totalScore =
        totalQuestionCount > 0
          ? Math.round(
              Object.values(grades || {}).reduce((acc, g) => acc + (g.score || 0), 0) /
                totalQuestionCount
            )
          : 0

      try {
        await gradeMutation.mutateAsync({
          submissionId: subId,
          grades,
          graderNote,
          status: 'grading',
          totalScore,
        })
        successCount++
      } catch {
        failCount++
      }
    }

    if (successCount > 0) {
      toast.success(`Đã lưu bản nháp cho ${successCount} học viên`)
    }
    if (failCount > 0) {
      toast.error(`Lỗi khi lưu nháp cho ${failCount} học viên`)
    }
  }

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

      // Calculate total score based on TOTAL questions in the bank (Your original formula logic)
      const totalQuestionCount = questionBank?.questions?.length || 0
      const totalScore =
        totalQuestionCount > 0
          ? Math.round(
              Object.values(grades || {}).reduce((acc, g) => acc + (g.score || 0), 0) /
                totalQuestionCount
            )
          : 0

      const outcome = totalScore >= 80 ? 'DAT' : 'CHO_HOC_LAI'

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

  if (isFileExam) {
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-slate-50/50 text-sm text-foreground overflow-hidden">
        {/* Top Header Bar */}
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
                {currentClass?.name || 'Lớp học'} - Bài thi tự luận/Nộp file
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Chế độ: Chấm bài thi nộp file
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={gradeMutation.isPending}
              className="rounded-xl px-5 font-bold border-primary text-primary hover:bg-primary/5 transition-all active:scale-95"
              onClick={() => void handleFileExamSaveDraft()}
            >
              {gradeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Lưu bản nháp
            </Button>
            <Button
              size="sm"
              disabled={gradeMutation.isPending}
              className="rounded-xl px-5 font-bold shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95"
              onClick={() => void handleFileExamComplete()}
            >
              {gradeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Hoàn thành
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-900 mb-6">
                Bài nộp từ học viên ({classSubmissions.length})
              </h2>

              {classSubmissions.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                  <p className="text-slate-400 font-semibold text-sm">
                    Chưa có học viên nào nộp bài thi.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-4 font-bold text-slate-600">Học viên</th>
                        <th className="px-4 py-4 font-bold text-slate-600">File bài làm</th>
                        <th className="px-4 py-4 font-bold text-slate-600 text-center">
                          Trạng thái
                        </th>
                        {gradingType === 'rubric_reading' ? (
                          <>
                            <th className="px-4 py-4 font-bold text-slate-600 w-[180px]">
                              Suy ngẫm (40đ)
                            </th>
                            <th className="px-4 py-4 font-bold text-slate-600 w-[180px]">
                              Kết nối (30đ)
                            </th>
                            <th className="px-4 py-4 font-bold text-slate-600 w-[180px]">
                              Phát triển (30đ)
                            </th>
                            <th className="px-4 py-4 font-bold text-slate-600 text-center w-[90px]">
                              Điểm
                            </th>
                          </>
                        ) : (
                          <th className="px-4 py-4 font-bold text-slate-600 text-center w-[120px]">
                            Điểm (0-100)
                          </th>
                        )}
                        <th className="px-4 py-4 font-bold text-slate-600 w-[240px]">Nhận xét</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classSubmissions.map((sub) => {
                        const answers = sub.answers as any
                        const rawFileUrl: string = answers?.fileUrl || ''
                        const fileUrl = rawFileUrl.startsWith('/uploads/')
                          ? `${apiBase}${rawFileUrl}`
                          : rawFileUrl
                        const fileName = answers?.fileName || 'Tài liệu'
                        const grade = fileGrades[sub.id] || { score: '', comment: '' }
                        const studentRubric = rubricGrades[sub.id] || {
                          suy_ngam: null,
                          ket_noi: null,
                          phat_trien: null,
                        }

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 font-bold text-slate-800 whitespace-nowrap">
                              {sub.fullName}
                            </td>
                            <td className="px-4 py-4">
                              {fileUrl ? (
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold text-xs bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                                >
                                  📄 {fileName}
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">Chưa nộp file</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap',
                                  sub.status === 'done'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : sub.status === 'grading'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-rose-100 text-rose-700'
                                )}
                              >
                                {sub.status === 'done'
                                  ? 'Đã chấm'
                                  : sub.status === 'grading'
                                    ? 'Đang chấm'
                                    : 'Chờ chấm'}
                              </span>
                            </td>
                            {gradingType === 'rubric_reading' ? (
                              <>
                                {/* Suy ngẫm */}
                                <td className="px-4 py-4">
                                  <Select
                                    value={studentRubric.suy_ngam || ''}
                                    onValueChange={(val) =>
                                      handleRubricChange(sub.id, 'suy_ngam', val as any)
                                    }
                                    disabled={sub.status === 'done'}
                                  >
                                    <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 bg-white font-bold text-xs">
                                      <SelectValue placeholder="Chọn..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 p-1 shadow-2xl">
                                      <SelectItem
                                        value="chua_dat"
                                        className="rounded-lg py-1.5 text-xs font-bold text-slate-700"
                                      >
                                        Chưa đạt (10đ)
                                      </SelectItem>
                                      <SelectItem
                                        value="dat"
                                        className="rounded-lg py-1.5 text-xs font-bold text-slate-700"
                                      >
                                        Đạt (25đ)
                                      </SelectItem>
                                      <SelectItem
                                        value="tot"
                                        className="rounded-lg py-1.5 text-xs font-bold text-slate-700"
                                      >
                                        Tốt (40đ)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>

                                {/* Kết nối */}
                                <td className="px-4 py-4">
                                  <Select
                                    value={studentRubric.ket_noi || ''}
                                    onValueChange={(val) =>
                                      handleRubricChange(sub.id, 'ket_noi', val as any)
                                    }
                                    disabled={sub.status === 'done'}
                                  >
                                    <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 bg-white font-bold text-xs">
                                      <SelectValue placeholder="Chọn..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 p-1 shadow-2xl">
                                      <SelectItem
                                        value="chua_dat"
                                        className="rounded-lg py-1.5 text-xs font-bold text-slate-700"
                                      >
                                        Chưa đạt (10đ)
                                      </SelectItem>
                                      <SelectItem
                                        value="dat"
                                        className="rounded-lg py-1.5 text-xs font-bold text-slate-700"
                                      >
                                        Đạt (20đ)
                                      </SelectItem>
                                      <SelectItem
                                        value="tot"
                                        className="rounded-lg py-1.5 text-xs font-bold text-slate-700"
                                      >
                                        Tốt (30đ)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>

                                {/* Phát triển */}
                                <td className="px-4 py-4">
                                  <Select
                                    value={studentRubric.phat_trien || ''}
                                    onValueChange={(val) =>
                                      handleRubricChange(sub.id, 'phat_trien', val as any)
                                    }
                                    disabled={sub.status === 'done'}
                                  >
                                    <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 bg-white font-bold text-xs">
                                      <SelectValue placeholder="Chọn..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 p-1 shadow-2xl">
                                      <SelectItem
                                        value="chua_dat"
                                        className="rounded-lg py-1.5 text-xs font-bold text-slate-700"
                                      >
                                        Chưa đạt (10đ)
                                      </SelectItem>
                                      <SelectItem
                                        value="dat"
                                        className="rounded-lg py-1.5 text-xs font-bold text-slate-700"
                                      >
                                        Đạt (20đ)
                                      </SelectItem>
                                      <SelectItem
                                        value="tot"
                                        className="rounded-lg py-1.5 text-xs font-bold text-slate-700"
                                      >
                                        Tốt (30đ)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>

                                {/* Điểm hiển thị tự động */}
                                <td className="px-4 py-4 text-center">
                                  <span className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-800">
                                    {grade.score ? `${grade.score}đ` : '—'}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  placeholder="—"
                                  value={grade.score}
                                  onChange={(e) =>
                                    handleFileGradeChange(sub.id, 'score', e.target.value)
                                  }
                                  className="w-20 mx-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold text-slate-800 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </td>
                            )}
                            <td className="px-4 py-4">
                              <textarea
                                placeholder="Nhập nhận xét..."
                                value={grade.comment}
                                onChange={(e) =>
                                  handleFileGradeChange(sub.id, 'comment', e.target.value)
                                }
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
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
              <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">
                Chế độ: Chấm theo câu hỏi
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            disabled={gradeMutation.isPending}
            className="rounded-xl px-5 font-bold shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95"
            onClick={handleSaveDraft}
          >
            {gradeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lưu bản nháp
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
                          id={`sub-${sub.id}-q-${q.id}`}
                          className={cn(
                            'group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5',
                            !grade.isGraded && 'border-red-300 bg-red-50/20'
                          )}
                        >
                          <div className="mb-5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800">
                                  {sub.fullName}
                                </span>
                                {!grade.isGraded && (
                                  <span className="text-xs font-black text-red-600 animate-pulse uppercase tracking-wider">
                                    ⚠️ Chưa chấm bài này
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div
                                className={cn(
                                  'flex items-center gap-2 rounded-2xl px-4 py-1.5 transition-all',
                                  !grade.isGraded
                                    ? 'bg-slate-100 text-slate-400'
                                    : grade.score >= 90
                                      ? 'bg-emerald-50 text-emerald-600'
                                      : grade.score >= 40
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'bg-rose-50 text-rose-600'
                                )}
                              >
                                <span className="text-xs font-black tracking-tighter">
                                  {grade.isGraded ? `${grade.score}%` : '??%'}
                                </span>
                                {grade.isGraded && grade.score >= 90 && (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            className={cn(
                              'mb-6 whitespace-pre-wrap rounded-2xl border-2 p-4 text-sm leading-relaxed transition-colors',
                              answer.trim()
                                ? 'border-slate-50 bg-slate-50/50 text-slate-700'
                                : 'border-dashed border-slate-100 text-slate-400 italic bg-transparent'
                            )}
                          >
                            {answer.trim()
                              ? answer.replace(/([^\n])\s*(\+)/g, '$1\n$2')
                              : 'Học viên không trả lời câu này'}
                          </div>

                          {/* Criteria Selection - Matching individual view style */}
                          <div
                            className={cn(
                              'rounded-xl border p-4 mt-5 transition-colors',
                              grade.isGraded
                                ? 'border-primary/10 bg-primary/5'
                                : 'border-red-200 bg-red-50/30'
                            )}
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Đánh giá câu trả lời
                              </span>
                              {grade.isGraded && (
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
                                  {grade.score}%
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-3">
                              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-rose-600 hover:opacity-80 transition-all">
                                <Checkbox
                                  className="h-5 w-5 rounded-full border-2 border-rose-300 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                                  checked={
                                    grade.isGraded &&
                                    grade.score === 0 &&
                                    grade.criteria.length === 0
                                  }
                                  onCheckedChange={() => markAsZero(sub.id, q.id)}
                                />
                                <span>Không đạt / 0%</span>
                              </label>

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
                                    className="h-5 w-5 rounded-full border-2 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
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
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                              Nhận xét chi tiết cho câu hỏi này
                            </label>
                            <Textarea
                              placeholder="Nhập góp ý hoặc lý do trừ điểm cho câu trả lời này..."
                              value={grade.note || ''}
                              onChange={(e) => handleNoteChange(sub.id, q.id, e.target.value)}
                              className="min-h-[80px] text-sm resize-none rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-primary/20 transition-all"
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
              onClick={handleOpenOutcomeModal}
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
                const grades = localGrades[sub.id] || {}
                const totalQuestionCount = questionBank?.questions?.length || 0
                const totalScore =
                  totalQuestionCount > 0
                    ? Math.round(
                        Object.values(grades).reduce((acc, g) => acc + (g.score || 0), 0) /
                          totalQuestionCount
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

                    <div className="flex items-center">
                      <span
                        className={cn(
                          'rounded-full px-4 py-1.5 text-xs font-black tracking-tight flex items-center gap-2 border',
                          totalScore === 100
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : totalScore >= 80
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                        )}
                      >
                        {totalScore === 100 ? (
                          <>
                            <span>🟢</span> 100% - ĐẠT
                          </>
                        ) : totalScore >= 80 ? (
                          <>
                            <span>🟡</span> {totalScore}% - ĐẠT
                          </>
                        ) : (
                          <>
                            <span>🔴</span> {totalScore}% - THI LẠI
                          </>
                        )}
                      </span>
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
