import { type ComponentProps, type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { Eye, EyeOff, FileText, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ManagerScreenLayout } from '@/features/manager/components/ManagerHub/ManagerScreenLayout'
import { ExamManagementTabs } from '@/features/manager/components/ManagerHub/ExamManagementTabs'
import {
  BRAND_BTN_OUTLINE,
  BRAND_BTN_SOLID,
  BRAND_TEXT,
} from '@/components/shared/brandButtonStyles'
import { FormDialog } from '@/components/shared/FormDialog'
import { FormSection } from '@/components/shared/FormSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonSubmissionCardList } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/axios'
import {
  useCreateExamPaper,
  useDeleteExamPaper,
  useExamPapers,
  useUpdateExamPaper,
} from '@/features/exam-papers/hooks'
import type { ExamPaperInput, ExamPaperQuestionInput } from '@/features/exam-papers/api'
import { examPapersApi } from '@/features/exam-papers/api'
import {
  DEFAULT_ESSAY_CRITERIA_WEIGHTS,
  sumCriteriaWeights,
  type EssayCriteriaWeights,
} from '@/features/exam-papers/criteria'
import { CriteriaWeightsField, NO_SPINNER } from './CriteriaWeightsField'

const OPTIONS_PER_MCQ = 4

type McqDraft = { stem: string; options: string[]; correctIndex: number }
type EssayDraft = { stem: string; criteriaWeights: EssayCriteriaWeights }

function emptyMcq(): McqDraft {
  return { stem: '', options: Array.from({ length: OPTIONS_PER_MCQ }, () => ''), correctIndex: 0 }
}

function emptyEssay(): EssayDraft {
  return { stem: '', criteriaWeights: { ...DEFAULT_ESSAY_CRITERIA_WEIGHTS } }
}

function AutoResizeTextarea({ className, value, ...props }: ComponentProps<typeof Textarea>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [value])

  return (
    <Textarea
      {...props}
      ref={textareaRef}
      value={value}
      rows={1}
      className={cn('resize-none overflow-y-hidden break-words', className)}
    />
  )
}

function toDraft(questions: ExamPaperQuestionInput[]): { mcq: McqDraft[]; essay: EssayDraft[] } {
  const mcq = questions
    .filter((q) => q.type === 'mcq')
    .map((q) => ({
      stem: q.stem,
      options:
        q.options && q.options.length > 0
          ? [...q.options]
          : Array.from({ length: OPTIONS_PER_MCQ }, () => ''),
      correctIndex: q.correctIndex ?? 0,
    }))
  const essay = questions
    .filter((q) => q.type === 'essay')
    .map((q) => ({
      stem: q.stem,
      criteriaWeights: { ...DEFAULT_ESSAY_CRITERIA_WEIGHTS, ...(q.criteriaWeights ?? {}) },
    }))
  // Không ép sẵn câu trống — đề có thể chỉ gồm trắc nghiệm hoặc chỉ tự luận
  return { mcq, essay }
}

function toQuestions(mcq: McqDraft[], essay: EssayDraft[]): ExamPaperQuestionInput[] {
  return [
    ...mcq.map((q, idx) => ({
      type: 'mcq' as const,
      stem: q.stem,
      options: q.options,
      correctIndex: q.correctIndex,
      points: 1,
      sortOrder: idx,
    })),
    ...essay.map((q, idx) => ({
      type: 'essay' as const,
      stem: q.stem,
      options: null,
      correctIndex: null,
      // Điểm câu tự luận không nhập tay nữa — chấm thuần theo % thang tiêu chí
      points: 1,
      criteriaWeights: q.criteriaWeights,
      sortOrder: mcq.length + idx,
    })),
  ]
}

function PaperBuilderForm({
  initial,
  onCancel,
  onSubmit,
  isSaving,
}: {
  initial: {
    code: string
    title: string
    description: string
    isActive: boolean
    passScore: number
    questions: ExamPaperQuestionInput[]
  }
  onCancel: () => void
  onSubmit: (input: ExamPaperInput) => void
  isSaving: boolean
}) {
  const [code, setCode] = useState(initial.code)
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [passScore, setPassScore] = useState(initial.passScore)
  const draft = toDraft(initial.questions)
  const [mcq, setMcq] = useState<McqDraft[]>(draft.mcq)
  const [essay, setEssay] = useState<EssayDraft[]>(draft.essay)

  const updateMcq = (index: number, patch: Partial<McqDraft>) => {
    setMcq((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }
  const updateMcqOption = (index: number, optionIndex: number, value: string) => {
    setMcq((prev) =>
      prev.map((q, i) =>
        i === index
          ? { ...q, options: q.options.map((o, oi) => (oi === optionIndex ? value : o)) }
          : q
      )
    )
  }
  const updateEssay = (index: number, patch: Partial<EssayDraft>) => {
    setEssay((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên đề thi')
      return
    }
    if (mcq.length + essay.length === 0) {
      toast.error('Đề thi cần ít nhất 1 câu hỏi (trắc nghiệm hoặc tự luận)')
      return
    }
    if (!Number.isInteger(passScore) || passScore < 0 || passScore > 100) {
      toast.error('Ngưỡng điểm đạt phải là số nguyên từ 0 đến 100')
      return
    }
    for (const [idx, q] of mcq.entries()) {
      if (!q.stem.trim()) {
        toast.error(`Câu trắc nghiệm ${idx + 1}: thiếu nội dung`)
        return
      }
      if (q.options.some((o) => !o.trim())) {
        toast.error(`Câu trắc nghiệm ${idx + 1}: thiếu đáp án`)
        return
      }
    }
    for (const [idx, q] of essay.entries()) {
      if (!q.stem.trim()) {
        toast.error(`Câu tự luận ${idx + 1}: thiếu nội dung`)
        return
      }
      const total = sumCriteriaWeights(q.criteriaWeights)
      if (total !== 100) {
        toast.error(
          `Câu tự luận ${idx + 1}: tổng thang điểm 3 tiêu chí phải bằng 100% (hiện là ${total}%)`
        )
        return
      }
    }
    onSubmit({
      code: code.trim() || undefined,
      title: title.trim(),
      description: description.trim() || null,
      isActive,
      passScore,
      questions: toQuestions(mcq, essay),
    })
  }

  const [autoFocusKey, setAutoFocusKey] = useState<string | null>(null)
  const addMcq = () => {
    setAutoFocusKey(`mcq-${mcq.length}`)
    setMcq((prev) => [...prev, emptyMcq()])
  }
  const addEssay = () => {
    setAutoFocusKey(`essay-${essay.length}`)
    setEssay((prev) => [...prev, emptyEssay()])
  }

  const addButton = (onClick: () => void, label: string) => (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn('h-8 min-h-8 gap-1.5 rounded-lg px-3 text-xs', BRAND_BTN_OUTLINE)}
      onClick={onClick}
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </Button>
  )

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      title={initial.code ? `Chỉnh sửa đề ${initial.code}` : 'Thêm đề thi'}
      description="Đề có thể gồm trắc nghiệm, tự luận hoặc cả hai."
      icon={<FileText className="size-5" />}
      preventDismiss
      className="max-w-4xl"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{mcq.length}</span> trắc
            nghiệm ·{' '}
            <span className="font-semibold tabular-nums text-foreground">{essay.length}</span> tự
            luận
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              className={cn('px-5', BRAND_BTN_SOLID)}
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Đang lưu...' : 'Lưu đề thi'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <FormSection title="Thông tin đề">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
            <Field label="Tên đề thi" htmlFor="paper-title" required>
              <Input
                id="paper-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Đề thi Editor tháng 7"
                className="h-10 rounded-xl text-sm"
              />
            </Field>
            <Field label="Mã đề" htmlFor="paper-code" hint="Trống = tự sinh">
              <Input
                id="paper-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: DE_01"
                className={cn('h-10 rounded-xl text-sm', code && 'font-mono')}
              />
            </Field>
          </div>
          <Field
            label="Mô tả"
            htmlFor="paper-description"
            hint="Ghi chú nội bộ, học viên không thấy"
          >
            <Textarea
              id="paper-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mục tiêu, phạm vi kiến thức, nguồn câu hỏi..."
              className="min-h-[72px] rounded-xl text-sm"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Ngưỡng điểm đạt" htmlFor="paper-pass-score">
              <div className="relative w-32">
                <Input
                  id="paper-pass-score"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={passScore}
                  onChange={(e) => setPassScore(Number(e.target.value) || 0)}
                  className={cn(
                    'h-10 rounded-xl pr-8 text-sm font-semibold tabular-nums',
                    NO_SPINNER
                  )}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Chấm xong đạt từ ngưỡng này sẽ tự được đánh giá &quot;Đạt&quot;.
              </p>
            </Field>
            <label
              htmlFor="paper-active"
              className={cn(
                'flex cursor-pointer items-start gap-3 self-start rounded-xl border p-3 transition-colors md:mt-5',
                isActive ? 'border-button/40 bg-button/5' : 'border-border hover:bg-muted/40'
              )}
            >
              <Checkbox
                id="paper-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
                className="mt-0.5 border-button focus-visible:ring-button/35 data-[state=checked]:bg-button data-[state=checked]:text-white"
              />
              <span>
                <span className="block text-sm font-semibold text-foreground">Kích hoạt đề</span>
                <span className="block text-xs text-muted-foreground">
                  Chỉ đề đang kích hoạt mới chọn được khi tạo lịch thi.
                </span>
              </span>
            </label>
          </div>
        </FormSection>

        <FormSection
          title={`Câu trắc nghiệm (${mcq.length})`}
          description="Bấm chữ cái A–D để đánh dấu đáp án đúng."
          action={addButton(addMcq, 'Thêm câu')}
        >
          {mcq.length === 0 ? (
            <EmptyQuestions text="Chưa có câu trắc nghiệm — có thể bỏ trống nếu đề chỉ gồm tự luận." />
          ) : (
            <ol className="space-y-3">
              {mcq.map((q, idx) => (
                <li key={idx} className="rounded-xl border border-border/80 bg-muted/20 p-4">
                  <QuestionHeader
                    index={idx}
                    label="trắc nghiệm"
                    onRemove={() => setMcq((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <AutoResizeTextarea
                      value={q.stem}
                      onChange={(e) => updateMcq(idx, { stem: e.target.value })}
                      placeholder="Nội dung câu hỏi"
                      aria-label={`Nội dung câu trắc nghiệm ${idx + 1}`}
                      autoFocus={autoFocusKey === `mcq-${idx}`}
                      className="min-h-[52px] rounded-xl bg-card text-sm leading-relaxed"
                    />
                  </QuestionHeader>
                  <div
                    className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:pl-9"
                    role="radiogroup"
                    aria-label={`Đáp án đúng của câu ${idx + 1}`}
                  >
                    {q.options.map((opt, oi) => {
                      const correct = q.correctIndex === oi
                      const letter = String.fromCharCode(65 + oi)
                      return (
                        <div
                          key={oi}
                          className={cn(
                            'flex items-center gap-1 rounded-xl border bg-card p-1 transition-colors',
                            correct ? 'border-button ring-1 ring-button/20' : 'border-border'
                          )}
                        >
                          <label
                            className={cn(
                              'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-xs font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-button/35',
                              correct
                                ? 'bg-button text-white'
                                : 'bg-muted text-muted-foreground hover:bg-button/10 hover:text-button'
                            )}
                            title={correct ? 'Đáp án đúng' : 'Đánh dấu là đáp án đúng'}
                          >
                            <input
                              type="radio"
                              name={`mcq-${idx}-correct`}
                              checked={correct}
                              onChange={() => updateMcq(idx, { correctIndex: oi })}
                              aria-label={`Đáp án ${letter} đúng`}
                              className="sr-only"
                            />
                            {letter}
                          </label>
                          <Input
                            value={opt}
                            onChange={(e) => updateMcqOption(idx, oi, e.target.value)}
                            placeholder={`Đáp án ${letter}`}
                            aria-label={`Câu ${idx + 1}, đáp án ${letter}`}
                            className="h-8 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
                          />
                        </div>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </FormSection>

        <FormSection
          title={`Câu tự luận (${essay.length})`}
          description="Giáo viên chấm theo % của 3 tiêu chí; tổng phải bằng 100%."
          action={addButton(addEssay, 'Thêm câu')}
        >
          {essay.length === 0 ? (
            <EmptyQuestions text="Chưa có câu tự luận — có thể bỏ trống nếu đề chỉ gồm trắc nghiệm." />
          ) : (
            <ol className="space-y-3">
              {essay.map((q, idx) => (
                <li key={idx} className="rounded-xl border border-border/80 bg-muted/20 p-4">
                  <QuestionHeader
                    index={idx}
                    label="tự luận"
                    onRemove={() => setEssay((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <AutoResizeTextarea
                      value={q.stem}
                      onChange={(e) => updateEssay(idx, { stem: e.target.value })}
                      placeholder="Nội dung câu hỏi tự luận"
                      aria-label={`Nội dung câu tự luận ${idx + 1}`}
                      autoFocus={autoFocusKey === `essay-${idx}`}
                      className="min-h-[72px] rounded-xl bg-card text-sm leading-relaxed"
                    />
                  </QuestionHeader>
                  <div className="mt-3 sm:pl-9">
                    <CriteriaWeightsField
                      value={q.criteriaWeights}
                      onChange={(criteriaWeights) => updateEssay(idx, { criteriaWeights })}
                      showDescriptions
                      idPrefix={`essay-${idx}`}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </FormSection>
      </div>
    </FormDialog>
  )
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function QuestionHeader({
  index,
  label,
  onRemove,
  children,
}: {
  index: number
  label: string
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-card text-xs font-bold tabular-nums text-foreground ring-1 ring-border">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="mt-1 size-8 min-h-8 shrink-0 rounded-lg text-muted-foreground hover:bg-danger-muted hover:text-danger"
        onClick={onRemove}
        aria-label={`Xóa câu ${label} ${index + 1}`}
        title="Xóa câu"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function EmptyQuestions({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
      {text}
    </p>
  )
}

export function ExamPapersManagementScreen() {
  const { data: papers = [], isLoading, isError, error, refetch, isFetching } = useExamPapers()
  const createPaper = useCreateExamPaper()
  const updatePaper = useUpdateExamPaper()
  const deletePaper = useDeleteExamPaper()

  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDetail, setEditingDetail] = useState<{
    code: string
    title: string
    description: string
    isActive: boolean
    passScore: number
    questions: ExamPaperQuestionInput[]
  } | null>(null)

  const startEdit = async (id: string) => {
    try {
      const detail = await examPapersApi.getById(id)
      setEditingDetail({
        code: detail.code,
        title: detail.title,
        description: detail.description ?? '',
        isActive: detail.isActive,
        passScore: detail.passScore,
        questions: detail.questions,
      })
      setEditingId(id)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">Quản lý đề thi</h1>
          <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Tạo, sửa, xóa các đề thi — trắc nghiệm, tự luận hoặc kết hợp cả hai — dùng cho lịch thi.
            Khi lịch thi gán nhiều đề, mỗi thành viên sẽ được gán ngẫu nhiên 1 đề khi tham gia thi.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ExamManagementTabs active="/manager/exam-papers" className="mb-0" />
          <Button
            type="button"
            className={cn('h-10 gap-2 rounded-lg px-4 text-sm font-semibold', BRAND_BTN_SOLID)}
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4" />
            Thêm đề thi
          </Button>
        </div>
      </div>
      <div className="mb-8 flex flex-col gap-6">
        {isError ? (
          <ErrorState
            title="Không tải được danh sách đề thi"
            description={getApiErrorMessage(error)}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : isLoading ? (
          <SkeletonSubmissionCardList count={3} />
        ) : papers.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="Chưa có đề thi nào"
            description="Tạo đề thi đầu tiên để dùng khi thiết lập lịch thi."
            action={
              <Button
                type="button"
                className={cn('gap-2', BRAND_BTN_SOLID)}
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4" />
                Thêm đề thi
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {papers.map((p) => (
              <Card
                key={p.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('text-xs font-bold tracking-wider', BRAND_TEXT)}>
                      {p.code}
                    </span>
                    <Badge
                      variant={p.isActive ? 'success' : 'muted'}
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    >
                      {p.isActive ? 'Đang dùng' : 'Đã tắt'}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'h-7 w-7 rounded-md text-muted-foreground hover:bg-[#006C49]/10',
                        BRAND_TEXT
                      )}
                      onClick={() => void startEdit(p.id)}
                      title="Sửa đề"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() =>
                        updatePaper.mutate({ id: p.id, input: { isActive: !p.isActive } })
                      }
                      title={p.isActive ? 'Tắt kích hoạt' : 'Kích hoạt'}
                    >
                      {p.isActive ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                          title="Xóa đề"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xóa đề thi {p.code}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {p.submissionCount > 0
                              ? `Đề này đã có ${p.submissionCount} bài thi — không thể xóa, hãy tắt kích hoạt thay vì xóa.`
                              : 'Hành động này không thể hoàn tác.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={p.submissionCount > 0}
                            onClick={() => deletePaper.mutate(p.id)}
                          >
                            Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <h3 className="mb-1 truncate text-sm font-bold text-foreground">{p.title}</h3>
                {p.description ? (
                  <p className="mb-4 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                ) : (
                  <div className="mb-4" />
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span>{p.mcqCount} trắc nghiệm</span>
                  <span className="text-border">•</span>
                  <span>{p.essayCount} tự luận</span>
                  <span className="text-border">•</span>
                  <span>{p.submissionCount} bài đã nộp</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {isCreating ? (
        <PaperBuilderForm
          initial={{
            code: '',
            title: '',
            description: '',
            isActive: true,
            passScore: 80,
            questions: [],
          }}
          isSaving={createPaper.isPending}
          onCancel={() => setIsCreating(false)}
          onSubmit={(input) => createPaper.mutate(input, { onSuccess: () => setIsCreating(false) })}
        />
      ) : null}

      {editingId && editingDetail ? (
        <PaperBuilderForm
          initial={editingDetail}
          isSaving={updatePaper.isPending}
          onCancel={() => {
            setEditingId(null)
            setEditingDetail(null)
          }}
          onSubmit={(input) =>
            updatePaper.mutate(
              { id: editingId, input },
              {
                onSuccess: () => {
                  setEditingId(null)
                  setEditingDetail(null)
                },
              }
            )
          }
        />
      ) : null}
    </ManagerScreenLayout>
  )
}
