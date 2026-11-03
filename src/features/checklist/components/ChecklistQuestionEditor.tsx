import { useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDown,
  ArrowUp,
  Circle,
  Columns3,
  Copy,
  Plus,
  Rows3,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { newChecklistId } from '../checklistAnswers'
import {
  CHECKLIST_LIMITS,
  CHECKLIST_QUESTION_TYPE_LABEL,
  CHECKLIST_QUESTION_TYPES,
  type ChecklistOption,
  type ChecklistQuestion,
  type ChecklistQuestionType,
} from '../types'
import { SquareCheckbox } from './SquareCheckbox'

const TEXT_HINT: Partial<Record<ChecklistQuestionType, string>> = {
  SHORT_TEXT: 'Người điền nhập câu trả lời ngắn (một dòng).',
  LONG_TEXT: 'Người điền nhập đoạn văn (nhiều dòng).',
  DATE: 'Người điền chọn một ngày trên lịch.',
}

const SCALE_MAX_CHOICES = [2, 3, 4, 5, 6, 7, 8, 9, 10]

export function newChecklistQuestion(
  type: ChecklistQuestionType = 'SINGLE_CHOICE'
): ChecklistQuestion {
  return withType(
    { id: newChecklistId('q'), type, title: '', description: null, required: false },
    type
  )
}

/** Đổi loại câu hỏi: khởi tạo lựa chọn / dòng / thang điểm nếu chưa có (giữ lại khi đổi qua lại). */
function withType(q: ChecklistQuestion, type: ChecklistQuestionType): ChecklistQuestion {
  const next: ChecklistQuestion = { ...q, type }
  if ((type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') && !next.options?.length) {
    next.options = [{ id: newChecklistId('o'), label: 'Lựa chọn 1' }]
  }
  if (type === 'GRID') {
    if (!next.rows?.length) next.rows = [{ id: newChecklistId('o'), label: 'Dòng 1' }]
    if (!next.options?.length) next.options = [{ id: newChecklistId('o'), label: 'Cột 1' }]
  }
  if (type === 'SCALE' && !next.scale) {
    next.scale = { min: 1, max: 5, minLabel: null, maxLabel: null }
  }
  if (type === 'SECTION') next.required = false
  return next
}

const trimOptions = (items: ChecklistOption[] | undefined) =>
  (items ?? []).map((o) => ({ id: o.id, label: o.label.trim() }))

/** Gửi BE đúng field của loại câu hỏi (bỏ options/rows/scale còn sót khi đã đổi loại). */
export function toQuestionPayload(q: ChecklistQuestion): ChecklistQuestion {
  const base: ChecklistQuestion = {
    id: q.id,
    type: q.type,
    title: q.title.trim(),
    description: q.description?.trim() || null,
    required: q.type !== 'SECTION' && q.required,
  }
  if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') {
    base.options = trimOptions(q.options)
  }
  if (q.type === 'GRID') {
    base.rows = trimOptions(q.rows)
    base.options = trimOptions(q.options)
  }
  if (q.type === 'SCALE' && q.scale) {
    base.scale = {
      ...q.scale,
      minLabel: q.scale.minLabel?.trim() || null,
      maxLabel: q.scale.maxLabel?.trim() || null,
    }
  }
  return base
}

/** Danh sách nhãn sửa được (lựa chọn / dòng / cột) — Enter thêm mục ngay dưới như Google Form. */
function OptionListEditor({
  items,
  onChange,
  noun,
  icon: Icon,
  disabled,
}: {
  items: ChecklistOption[]
  onChange: (items: ChecklistOption[]) => void
  /** "Lựa chọn" | "Dòng" | "Cột". */
  noun: string
  icon: LucideIcon
  disabled?: boolean
}) {
  const refs = useRef(new Map<string, HTMLInputElement>())
  const add = (afterIdx = items.length - 1) => {
    const item = { id: newChecklistId('o'), label: `${noun} ${items.length + 1}` }
    const next = [...items]
    next.splice(afterIdx + 1, 0, item)
    onChange(next)
    requestAnimationFrame(() => refs.current.get(item.id)?.select())
  }
  return (
    <div className="space-y-1.5">
      {items.map((o, idx) => (
        <div key={o.id} className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            ref={(el) => {
              if (el) refs.current.set(o.id, el)
              else refs.current.delete(o.id)
            }}
            value={o.label}
            onChange={(e) =>
              onChange(items.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))
            }
            onKeyDown={(e) => {
              // Enter = thêm mục ngay dưới; không submit form.
              if (e.key === 'Enter') {
                e.preventDefault()
                if (items.length < CHECKLIST_LIMITS.options) add(idx)
              }
            }}
            maxLength={CHECKLIST_LIMITS.optionLabel}
            disabled={disabled}
            className="h-9"
            aria-label={`${noun} ${idx + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => onChange(items.filter((x) => x.id !== o.id))}
            disabled={disabled || items.length <= 1}
            aria-label={`Xoá ${noun.toLowerCase()} ${idx + 1}`}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ))}
      {items.length < CHECKLIST_LIMITS.options ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={() => add()}
          disabled={disabled}
        >
          <Plus className="size-4" aria-hidden />
          Thêm {noun.toLowerCase()}
        </Button>
      ) : null}
    </div>
  )
}

export function ChecklistQuestionEditor({
  question,
  index,
  number,
  total,
  disabled,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  question: ChecklistQuestion
  /** Vị trí trong danh sách (để di chuyển lên / xuống). */
  index: number
  /** Số câu hiển thị (không tính tiêu đề phần); tiêu đề phần không có số. */
  number: number | undefined
  total: number
  disabled?: boolean
  onChange: (q: ChecklistQuestion) => void
  onMove: (delta: -1 | 1) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const isSection = question.type === 'SECTION'
  const isChoice = question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE'
  const itemLabel = isSection ? 'tiêu đề phần' : 'câu hỏi'

  return (
    <div
      className={cn(
        'rounded-2xl border shadow-sm',
        isSection ? 'mt-2 border-button/30 bg-button/5' : 'border-border/80 bg-card'
      )}
    >
      <div className="space-y-3 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className="mt-2.5 w-6 shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">
              {isSection ? '§' : `${number}.`}
            </span>
            <Input
              value={question.title}
              onChange={(e) => onChange({ ...question, title: e.target.value })}
              placeholder={isSection ? 'Tên phần, vd. Thiết bị làm việc' : 'Nội dung câu hỏi'}
              maxLength={CHECKLIST_LIMITS.title}
              disabled={disabled}
              className={cn('font-medium', isSection && 'font-bold text-button')}
              aria-label={isSection ? `Tên phần ${index + 1}` : `Nội dung câu ${number}`}
            />
          </div>
          <Select
            value={question.type}
            onValueChange={(v) => onChange(withType(question, v as ChecklistQuestionType))}
            disabled={disabled}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Loại câu hỏi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHECKLIST_QUESTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {CHECKLIST_QUESTION_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pl-8">
          <Input
            value={question.description ?? ''}
            onChange={(e) => onChange({ ...question, description: e.target.value })}
            placeholder={
              isSection ? 'Mô tả phần (không bắt buộc)' : 'Mô tả / hướng dẫn (không bắt buộc)'
            }
            maxLength={CHECKLIST_LIMITS.description}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label={isSection ? `Mô tả phần ${index + 1}` : `Mô tả câu ${number}`}
          />
        </div>

        {isSection ? null : (
          <div className="pl-8">
            {isChoice ? (
              <OptionListEditor
                items={question.options ?? []}
                onChange={(options) => onChange({ ...question, options })}
                noun="Lựa chọn"
                icon={question.type === 'SINGLE_CHOICE' ? Circle : Square}
                disabled={disabled}
              />
            ) : question.type === 'GRID' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Dòng
                  </p>
                  <OptionListEditor
                    items={question.rows ?? []}
                    onChange={(rows) => onChange({ ...question, rows })}
                    noun="Dòng"
                    icon={Rows3}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cột (mỗi dòng chọn 1)
                  </p>
                  <OptionListEditor
                    items={question.options ?? []}
                    onChange={(options) => onChange({ ...question, options })}
                    noun="Cột"
                    icon={Columns3}
                    disabled={disabled}
                  />
                </div>
              </div>
            ) : question.type === 'SCALE' && question.scale ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Select
                    value={String(question.scale.min)}
                    onValueChange={(v) =>
                      onChange({
                        ...question,
                        scale: { ...question.scale!, min: v === '0' ? 0 : 1 },
                      })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-20" aria-label="Điểm thấp nhất">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">đến</span>
                  <Select
                    value={String(question.scale.max)}
                    onValueChange={(v) =>
                      onChange({ ...question, scale: { ...question.scale!, max: Number(v) } })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-20" aria-label="Điểm cao nhất">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCALE_MAX_CHOICES.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={question.scale.minLabel ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...question,
                        scale: { ...question.scale!, minLabel: e.target.value },
                      })
                    }
                    placeholder={`Nhãn cho ${question.scale.min} (vd. Rất kém)`}
                    maxLength={CHECKLIST_LIMITS.scaleLabel}
                    disabled={disabled}
                    className="h-9"
                  />
                  <Input
                    value={question.scale.maxLabel ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...question,
                        scale: { ...question.scale!, maxLabel: e.target.value },
                      })
                    }
                    placeholder={`Nhãn cho ${question.scale.max} (vd. Rất tốt)`}
                    maxLength={CHECKLIST_LIMITS.scaleLabel}
                    disabled={disabled}
                    className="h-9"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">{TEXT_HINT[question.type]}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border/70 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onMove(-1)}
          disabled={disabled || index === 0}
          aria-label={`Đưa ${itemLabel} lên`}
        >
          <ArrowUp className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onMove(1)}
          disabled={disabled || index === total - 1}
          aria-label={`Đưa ${itemLabel} xuống`}
        >
          <ArrowDown className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onDuplicate}
          disabled={disabled || total >= CHECKLIST_LIMITS.questions}
          aria-label={`Nhân bản ${itemLabel}`}
        >
          <Copy className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Xoá ${itemLabel}`}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
        {isSection ? null : (
          <>
            <span className="mx-2 h-5 w-px bg-border" aria-hidden />
            <label className="flex cursor-pointer items-center gap-2 px-1 text-sm font-medium">
              <SquareCheckbox
                checked={question.required}
                onCheckedChange={(c) => onChange({ ...question, required: c === true })}
                disabled={disabled}
              />
              Bắt buộc
            </label>
          </>
        )}
      </div>
    </div>
  )
}
