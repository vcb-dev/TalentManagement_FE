import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  checklistQuestionNumbers,
  cleanChecklistAnswers,
  missingRequiredQuestions,
} from '../checklistAnswers'
import {
  CHECKLIST_LIMITS,
  type ChecklistAnswers,
  type ChecklistAnswerValue,
  type ChecklistQuestion,
} from '../types'
import { SquareCheckbox } from './SquareCheckbox'

type FormTemplate = {
  title: string
  description: string | null
  questions: ChecklistQuestion[]
}

export function ChecklistFormHeader({
  title,
  description,
  meta,
  showRequiredNote,
}: {
  title: string
  description: string | null
  meta?: ReactNode
  showRequiredNote?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="h-2 bg-button" aria-hidden />
      <div className="space-y-2 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        {description ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{description}</p>
        ) : null}
        {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
        {showRequiredNote ? (
          <p className="text-xs font-medium text-danger">* Câu hỏi bắt buộc</p>
        ) : null}
      </div>
    </div>
  )
}

function ScaleInput({
  question,
  value,
  disabled,
  onChange,
}: {
  question: ChecklistQuestion
  value: number | undefined
  disabled?: boolean
  onChange: (v: number | undefined) => void
}) {
  const min = question.scale?.min ?? 1
  const max = question.scale?.max ?? 5
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={question.title}>
        {points.map((p) => {
          const selected = value === p
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(selected && !question.required ? undefined : p)}
              className={cn(
                'flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                selected
                  ? 'border-transparent bg-button text-button-foreground'
                  : 'border-border bg-background hover:bg-muted'
              )}
            >
              {p}
            </button>
          )
        })}
      </div>
      {question.scale?.minLabel || question.scale?.maxLabel ? (
        <div className="flex max-w-md justify-between gap-4 text-xs text-muted-foreground">
          <span>
            {min} = {question.scale?.minLabel ?? '—'}
          </span>
          <span>
            {max} = {question.scale?.maxLabel ?? '—'}
          </span>
        </div>
      ) : null}
    </div>
  )
}

/** Lưới chọn kiểu Google Form: mỗi dòng chọn 1 cột. Cột co giãn để 3–4 cột vừa màn hình điện thoại. */
function GridInput({
  question,
  value,
  disabled,
  onChange,
}: {
  question: ChecklistQuestion
  value: ChecklistAnswerValue | undefined
  disabled?: boolean
  onChange: (v: ChecklistAnswerValue | undefined) => void
}) {
  const rows = question.rows ?? []
  const cols = question.options ?? []
  const picked: Record<string, string> =
    typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
  const pick = (rowId: string, colId: string) => {
    const next = { ...picked, [rowId]: colId }
    onChange(next)
  }
  const hasPick = Object.values(picked).some(Boolean)

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        {/* Nhãn dòng / cột tự xuống dòng; chỉ cuộn ngang khi quá nhiều cột so với màn hình. */}
        <div
          className="grid w-full items-stretch"
          style={{
            gridTemplateColumns: `minmax(6.5rem, 1.6fr) repeat(${cols.length}, minmax(3.75rem, 1fr))`,
            minWidth: `calc(6.5rem + ${cols.length} * 3.75rem)`,
          }}
        >
          <div />
          {cols.map((c) => (
            <div
              key={c.id}
              className="flex items-end justify-center px-1 pb-2 text-center text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs"
            >
              {c.label}
            </div>
          ))}
          {rows.map((r, i) => {
            const cell = cn('flex items-center py-2.5', i % 2 === 0 && 'bg-muted/40')
            return (
              <RadioGroup
                key={r.id}
                value={picked[r.id] ?? ''}
                onValueChange={(v) => pick(r.id, v)}
                disabled={disabled}
                className="contents"
                aria-label={r.label}
              >
                <div className={cn(cell, 'rounded-l-lg pl-3 pr-2 text-sm')}>{r.label}</div>
                {cols.map((c, ci) => (
                  <div
                    key={c.id}
                    className={cn(cell, 'justify-center', ci === cols.length - 1 && 'rounded-r-lg')}
                  >
                    <RadioGroupItem value={c.id} aria-label={`${r.label}: ${c.label}`} />
                  </div>
                ))}
              </RadioGroup>
            )
          })}
        </div>
      </div>
      {!question.required && hasPick && !disabled ? (
        <button
          type="button"
          className="px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => onChange(undefined)}
        >
          Bỏ chọn tất cả
        </button>
      ) : null}
    </div>
  )
}

export function ChecklistSectionCard({
  title,
  description,
}: {
  title: string
  description: string | null
}) {
  return (
    <div className="mt-2 rounded-2xl border border-button/25 bg-button/5 px-5 py-4 sm:px-6">
      <h3 className="text-base font-bold text-button sm:text-lg">{title}</h3>
      {description ? (
        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export function ChecklistQuestionInput({
  question,
  value,
  disabled,
  onChange,
}: {
  question: ChecklistQuestion
  value: ChecklistAnswerValue | undefined
  disabled?: boolean
  onChange: (v: ChecklistAnswerValue | undefined) => void
}) {
  const inputId = `checklist-${question.id}`
  switch (question.type) {
    case 'SINGLE_CHOICE':
      return (
        <div className="space-y-2">
          <RadioGroup
            value={typeof value === 'string' ? value : ''}
            onValueChange={(v) => onChange(v)}
            disabled={disabled}
            className="gap-1"
          >
            {question.options?.map((o) => (
              <label
                key={o.id}
                htmlFor={`${inputId}-${o.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/60"
              >
                <RadioGroupItem id={`${inputId}-${o.id}`} value={o.id} />
                <span>{o.label}</span>
              </label>
            ))}
          </RadioGroup>
          {!question.required && typeof value === 'string' && value && !disabled ? (
            <button
              type="button"
              className="px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => onChange(undefined)}
            >
              Bỏ chọn
            </button>
          ) : null}
        </div>
      )
    case 'MULTIPLE_CHOICE': {
      const picked = Array.isArray(value) ? value : []
      return (
        <div className="space-y-1">
          {question.options?.map((o) => (
            <label
              key={o.id}
              htmlFor={`${inputId}-${o.id}`}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/60"
            >
              <SquareCheckbox
                id={`${inputId}-${o.id}`}
                checked={picked.includes(o.id)}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onChange(
                    checked === true ? [...picked, o.id] : picked.filter((id) => id !== o.id)
                  )
                }
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )
    }
    case 'SHORT_TEXT':
      return (
        <Input
          id={inputId}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={CHECKLIST_LIMITS.shortText}
          disabled={disabled}
          placeholder="Câu trả lời của bạn"
          className="max-w-xl"
        />
      )
    case 'LONG_TEXT':
      return (
        <Textarea
          id={inputId}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={CHECKLIST_LIMITS.longText}
          disabled={disabled}
          placeholder="Câu trả lời của bạn"
          rows={4}
        />
      )
    case 'SCALE':
      return (
        <ScaleInput
          question={question}
          value={typeof value === 'number' ? value : undefined}
          disabled={disabled}
          onChange={onChange}
        />
      )
    case 'DATE':
      return (
        <div className="max-w-xs">
          <DatePicker
            value={typeof value === 'string' ? value : ''}
            onChange={(v) => onChange(v || undefined)}
            disabled={disabled}
            placeholder="Chọn ngày"
          />
        </div>
      )
    case 'GRID':
      return <GridInput question={question} value={value} disabled={disabled} onChange={onChange} />
    default:
      return null
  }
}

export function ChecklistQuestionCard({
  question,
  number,
  invalid,
  children,
}: {
  question: ChecklistQuestion
  /** Số thứ tự hiển thị (không tính tiêu đề phần). */
  number: number | undefined
  invalid?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-card p-5 shadow-sm sm:p-6',
        invalid ? 'border-danger/60 ring-1 ring-danger/30' : 'border-border/80'
      )}
    >
      <div className="mb-3 space-y-1">
        <p className="text-sm font-semibold text-foreground sm:text-base">
          <span className="mr-1 text-muted-foreground">{number}.</span>
          {question.title}
          {question.required ? <span className="ml-1 text-danger">*</span> : null}
        </p>
        {question.description ? (
          <p className="whitespace-pre-line text-xs text-muted-foreground">
            {question.description}
          </p>
        ) : null}
        {question.type === 'MULTIPLE_CHOICE' && (question.options?.length ?? 0) > 1 ? (
          <p className="text-xs italic text-muted-foreground">Có thể chọn nhiều đáp án</p>
        ) : null}
      </div>
      {children}
      {invalid ? (
        <p className="mt-2 text-xs font-medium text-danger">
          {question.type === 'GRID' ? 'Cần chọn cho mỗi dòng' : 'Câu hỏi này là bắt buộc'}
        </p>
      ) : null}
    </div>
  )
}

/** Các mục của form (tiêu đề phần + câu hỏi) — dùng chung cho form điền và xem trước. */
export function ChecklistFormItems({
  questions,
  answers,
  invalidIds,
  disabled,
  onChange,
}: {
  questions: ChecklistQuestion[]
  answers: ChecklistAnswers
  invalidIds?: ReadonlySet<string>
  disabled?: boolean
  onChange: (id: string, v: ChecklistAnswerValue | undefined) => void
}) {
  const numbers = checklistQuestionNumbers(questions)
  return (
    <>
      {questions.map((q) =>
        q.type === 'SECTION' ? (
          <ChecklistSectionCard key={q.id} title={q.title} description={q.description} />
        ) : (
          <div key={q.id} id={`checklist-q-${q.id}`}>
            <ChecklistQuestionCard
              question={q}
              number={numbers.get(q.id)}
              invalid={invalidIds?.has(q.id)}
            >
              <ChecklistQuestionInput
                question={q}
                value={answers[q.id]}
                disabled={disabled}
                onChange={(v) => onChange(q.id, v)}
              />
            </ChecklistQuestionCard>
          </div>
        )
      )}
    </>
  )
}

/** Form điền checklist kiểu Google Form — mỗi câu hỏi một thẻ, câu bắt buộc chặn ở FE trước khi gửi. */
export function ChecklistForm({
  template,
  initialAnswers,
  meta,
  saving,
  onSubmit,
  onBack,
}: {
  template: FormTemplate
  initialAnswers: ChecklistAnswers | null | undefined
  meta?: ReactNode
  saving?: boolean
  onSubmit: (answers: ChecklistAnswers) => void
  onBack: () => void
}) {
  // Chỉ đọc `initialAnswers` lúc mount — nơi dùng đặt `key` theo checklist để mở lại là form mới.
  const [answers, setAnswers] = useState<ChecklistAnswers>(() => ({ ...(initialAnswers ?? {}) }))
  const [submitted, setSubmitted] = useState(false)

  const missing = useMemo(
    () => new Set(missingRequiredQuestions(template.questions, answers).map((q) => q.id)),
    [template.questions, answers]
  )

  const setAnswer = (id: string, v: ChecklistAnswerValue | undefined) =>
    setAnswers((prev) => {
      const next = { ...prev }
      if (v === undefined) delete next[id]
      else next[id] = v
      return next
    })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (missing.size > 0) {
      document
        .getElementById(`checklist-q-${[...missing][0]}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onSubmit(cleanChecklistAnswers(template.questions, answers))
  }

  return (
    <form className="mx-auto flex max-w-3xl flex-col gap-4" onSubmit={submit} noValidate>
      <ChecklistFormHeader
        title={template.title}
        description={template.description}
        meta={meta}
        showRequiredNote={template.questions.some((q) => q.required)}
      />
      <ChecklistFormItems
        questions={template.questions}
        answers={answers}
        invalidIds={submitted ? missing : undefined}
        disabled={saving}
        onChange={setAnswer}
      />
      {submitted && missing.size > 0 ? (
        <p className="text-center text-sm font-medium text-danger">
          Còn {missing.size} câu bắt buộc chưa trả lời.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
          <ArrowLeft className="size-4" aria-hidden />
          Quay lại
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Lưu checklist
        </Button>
      </div>
    </form>
  )
}
