import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, Eye, Heading, Loader2, Pencil, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  checklistQuestionNumbers,
  newChecklistId,
  validateChecklistTemplate,
} from '../checklistAnswers'
import { useCreateChecklistTemplate, useUpdateChecklistTemplate } from '../hooks'
import {
  CHECKLIST_LIMITS,
  type ChecklistKind,
  type ChecklistQuestion,
  type ChecklistTemplate,
  type ChecklistTemplateInput,
} from '../types'
import { ChecklistPreview } from './ChecklistPreview'
import {
  ChecklistQuestionEditor,
  newChecklistQuestion,
  toQuestionPayload,
} from './ChecklistQuestionEditor'
import { ChecklistTeamPicker } from './ChecklistTeamPicker'

const KIND_OPTIONS: { value: ChecklistKind; label: string; hint: string }[] = [
  {
    value: 'SELF',
    label: 'Nhân sự tự điền',
    hint: 'Mỗi nhân sự thuộc team áp dụng tự điền checklist về bản thân. Chỉ người đó (và admin) xem được.',
  },
  {
    value: 'LEADER',
    label: 'Trưởng nhóm phụ trách điền',
    hint: 'Trưởng nhóm phụ trách (trường trong hồ sơ nhân sự) điền cho từng nhân sự mình phụ trách. Nhân sự không thấy bản này.',
  },
]

function toDraft(t: ChecklistTemplate | undefined): ChecklistTemplateInput {
  if (!t) {
    return {
      title: '',
      description: null,
      kind: 'SELF',
      teamIds: [],
      questions: [newChecklistQuestion()],
    }
  }
  return {
    title: t.title,
    description: t.description,
    kind: t.kind,
    teamIds: t.teams.map((x) => x.id),
    questions: t.questions,
  }
}

/** Soạn mẫu checklist kiểu Google Form — tạo mới khi không truyền `template`. */
export function ChecklistTemplateBuilder({
  template,
  onDone,
}: {
  template?: ChecklistTemplate
  onDone: () => void
}) {
  const [draft, setDraft] = useState<ChecklistTemplateInput>(() => toDraft(template))
  const [preview, setPreview] = useState(false)
  const create = useCreateChecklistTemplate()
  const update = useUpdateChecklistTemplate()
  const saving = create.isPending || update.isPending
  const responseCount = template?.responseCount ?? 0

  const setQuestions = (fn: (qs: ChecklistQuestion[]) => ChecklistQuestion[]) =>
    setDraft((d) => ({ ...d, questions: fn(d.questions) }))
  const numbers = checklistQuestionNumbers(draft.questions)

  const save = () => {
    const payload: ChecklistTemplateInput = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      questions: draft.questions.map(toQuestionPayload),
    }
    const error = validateChecklistTemplate(payload)
    if (error) {
      toast.error(error)
      return
    }
    if (template) {
      update.mutate({ id: template.id, input: payload }, { onSuccess: onDone })
    } else {
      create.mutate(payload, { onSuccess: onDone })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={saving}>
          <ArrowLeft className="size-4" aria-hidden />
          Danh sách checklist
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreview((p) => !p)}
            disabled={saving}
          >
            {preview ? (
              <Pencil className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
            {preview ? 'Tiếp tục soạn' : 'Xem trước'}
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {template ? 'Lưu thay đổi' : 'Tạo checklist'}
          </Button>
        </div>
      </div>

      {preview ? (
        <ChecklistPreview
          title={draft.title.trim() || 'Checklist chưa đặt tên'}
          description={draft.description?.trim() || null}
          questions={draft.questions.map(toQuestionPayload)}
        />
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {responseCount > 0 ? (
            <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning-muted/60 px-4 py-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <p>
                Checklist đã có <span className="font-semibold">{responseCount}</span> câu trả lời.
                Câu trả lời cũ vẫn giữ theo từng câu hỏi; câu hỏi bị xoá sẽ không hiện nữa, lựa chọn
                bị xoá hiện là “(lựa chọn đã xoá)”. Không đổi được người điền.
              </p>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="h-2 bg-button" aria-hidden />
            <div className="space-y-3 p-5 sm:p-6">
              <Input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Tên checklist, vd. Checklist hội nhập tuần đầu"
                maxLength={CHECKLIST_LIMITS.title}
                disabled={saving}
                className="h-12 text-lg font-bold"
                aria-label="Tên checklist"
              />
              <Textarea
                value={draft.description ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Mô tả / hướng dẫn chung (không bắt buộc)"
                maxLength={CHECKLIST_LIMITS.description}
                disabled={saving}
                rows={2}
                aria-label="Mô tả checklist"
              />
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Ai điền checklist này?</Label>
              <RadioGroup
                value={draft.kind}
                onValueChange={(v) => setDraft((d) => ({ ...d, kind: v as ChecklistKind }))}
                disabled={saving || responseCount > 0}
                className="grid gap-2 sm:grid-cols-2"
              >
                {KIND_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    htmlFor={`checklist-kind-${o.value}`}
                    className={cn(
                      'flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors',
                      draft.kind === o.value
                        ? 'border-button/60 bg-button/5'
                        : 'border-border hover:bg-muted/40',
                      responseCount > 0 && 'cursor-not-allowed opacity-70'
                    )}
                  >
                    <RadioGroupItem
                      id={`checklist-kind-${o.value}`}
                      value={o.value}
                      className="mt-0.5"
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold">{o.label}</span>
                      <span className="block text-xs text-muted-foreground">{o.hint}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Team áp dụng</Label>
              <p className="text-xs text-muted-foreground">
                Nhân sự thuộc team (chính hoặc phụ) được chọn sẽ được gắn checklist này.
              </p>
              <ChecklistTeamPicker
                value={draft.teamIds}
                onChange={(teamIds) => setDraft((d) => ({ ...d, teamIds }))}
                knownTeams={template?.teams}
                disabled={saving}
              />
            </div>
          </div>

          {draft.questions.map((q, idx) => (
            <ChecklistQuestionEditor
              key={q.id}
              question={q}
              index={idx}
              number={numbers.get(q.id)}
              total={draft.questions.length}
              disabled={saving}
              onChange={(next) => setQuestions((qs) => qs.map((x) => (x.id === q.id ? next : x)))}
              onMove={(delta) =>
                setQuestions((qs) => {
                  const next = [...qs]
                  const [item] = next.splice(idx, 1)
                  next.splice(idx + delta, 0, item!)
                  return next
                })
              }
              onDuplicate={() =>
                setQuestions((qs) => {
                  const copy: ChecklistQuestion = {
                    ...q,
                    id: newChecklistId('q'),
                    options: q.options?.map((o) => ({ ...o, id: newChecklistId('o') })),
                    rows: q.rows?.map((r) => ({ ...r, id: newChecklistId('o') })),
                  }
                  const next = [...qs]
                  next.splice(idx + 1, 0, copy)
                  return next
                })
              }
              onRemove={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
            />
          ))}

          {draft.questions.length < CHECKLIST_LIMITS.questions ? (
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
              <Button
                type="button"
                variant="outline"
                className="h-12 border-dashed"
                onClick={() => setQuestions((qs) => [...qs, newChecklistQuestion()])}
                disabled={saving}
              >
                <Plus className="size-4" aria-hidden />
                Thêm câu hỏi
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 border-dashed"
                onClick={() => setQuestions((qs) => [...qs, newChecklistQuestion('SECTION')])}
                disabled={saving}
              >
                <Heading className="size-4" aria-hidden />
                Thêm tiêu đề phần
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
