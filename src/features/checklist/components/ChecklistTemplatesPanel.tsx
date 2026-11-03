import { useState } from 'react'
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { countChecklistQuestions, formatChecklistTime } from '../checklistAnswers'
import {
  useChecklistTemplate,
  useChecklistTemplates,
  useDeleteChecklistTemplate,
  useUpdateChecklistTemplate,
} from '../hooks'
import { CHECKLIST_KIND_LABEL, type ChecklistKind, type ChecklistTemplate } from '../types'
import { ChecklistListSkeleton } from './ChecklistFillPanel'
import { ChecklistPreview } from './ChecklistPreview'
import { ChecklistResponsesView } from './ChecklistResponsesView'
import { ChecklistTemplateBuilder } from './ChecklistTemplateBuilder'

/** `view` = xem form, `edit` = soạn (`new` | id), `responses` = xem câu trả lời. */
export type ChecklistAdminView = { view?: string; edit?: string; responses?: string }

const KIND_FILTERS: { value: ChecklistKind | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'SELF', label: CHECKLIST_KIND_LABEL.SELF },
  { value: 'LEADER', label: CHECKLIST_KIND_LABEL.LEADER },
]

const TEAM_PREVIEW = 3

function TemplateCard({
  template,
  onView,
  onEdit,
  onResponses,
  onToggleActive,
  onRemove,
}: {
  template: ChecklistTemplate
  onView: () => void
  onEdit: () => void
  onResponses: () => void
  onToggleActive: () => void
  onRemove: () => void
}) {
  const extraTeams = template.teams.length - TEAM_PREVIEW
  return (
    <li
      className={cn(
        'flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm',
        template.isActive ? 'border-border/80' : 'border-dashed border-border bg-muted/20'
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={template.kind === 'SELF' ? 'success' : 'warning'}
            className="px-2 py-0.5 text-xs"
          >
            {CHECKLIST_KIND_LABEL[template.kind]}
          </Badge>
          {!template.isActive ? (
            <Badge variant="muted" className="px-2 py-0.5 text-xs">
              Ngừng sử dụng
            </Badge>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onView}
          className="text-left font-semibold text-foreground hover:text-button hover:underline"
        >
          {template.title}
        </button>
        {template.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {template.teams.length === 0 ? (
            <span className="text-xs font-medium text-warning">Chưa gán team</span>
          ) : (
            <>
              {template.teams.slice(0, TEAM_PREVIEW).map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {t.name}
                </span>
              ))}
              {extraTeams > 0 ? (
                <span
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  title={template.teams.map((t) => t.name).join(', ')}
                >
                  +{extraTeams} team
                </span>
              ) : null}
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {countChecklistQuestions(template.questions)} câu hỏi · {template.responseCount} câu trả
          lời · sửa lúc {formatChecklistTime(template.updatedAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-1 border-t border-border/70 pt-3">
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={onView}>
          <FileText className="size-3.5" aria-hidden />
          Xem form
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={onResponses}>
          <ListChecks className="size-3.5" aria-hidden />
          Câu trả lời
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={onEdit}>
          <Pencil className="size-3.5" aria-hidden />
          Sửa
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          onClick={onToggleActive}
        >
          {template.isActive ? (
            <EyeOff className="size-3.5" aria-hidden />
          ) : (
            <Eye className="size-3.5" aria-hidden />
          )}
          {template.isActive ? 'Ngừng dùng' : 'Dùng lại'}
        </Button>
        {/* BE chỉ cho xoá mẫu chưa có câu trả lời — còn lại thì ngừng dùng. */}
        {template.responseCount === 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Xoá
          </Button>
        ) : null}
      </div>
    </li>
  )
}

/** Xem form đúng như người điền thấy (bấm thử được, không lưu) + lối tắt sang sửa / câu trả lời. */
function ViewTemplate({
  id,
  onNavigate,
}: {
  id: string
  onNavigate: (next: ChecklistAdminView) => void
}) {
  const { data, isLoading } = useChecklistTemplate(id)
  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />
  if (!data) return <p className="text-sm text-danger">Không tìm thấy checklist.</p>
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate({})}>
          <ArrowLeft className="size-4" aria-hidden />
          Danh sách checklist
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onNavigate({ responses: id })}>
            <ListChecks className="size-4" aria-hidden />
            Câu trả lời ({data.responseCount})
          </Button>
          <Button type="button" onClick={() => onNavigate({ edit: id })}>
            <Pencil className="size-4" aria-hidden />
            Sửa
          </Button>
        </div>
      </div>
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge
          variant={data.kind === 'SELF' ? 'success' : 'warning'}
          className="px-2 py-0.5 text-xs"
        >
          {CHECKLIST_KIND_LABEL[data.kind]}
        </Badge>
        {!data.isActive ? (
          <Badge variant="muted" className="px-2 py-0.5 text-xs">
            Ngừng sử dụng
          </Badge>
        ) : null}
        <span>
          {data.teams.length > 0
            ? `Team áp dụng: ${data.teams.map((t) => t.name).join(', ')}`
            : 'Chưa gán team'}
        </span>
      </div>
      <ChecklistPreview
        key={data.id}
        title={data.title}
        description={data.description}
        questions={data.questions}
      />
    </div>
  )
}

function EditTemplate({ id, onDone }: { id: string; onDone: () => void }) {
  const { data, isLoading } = useChecklistTemplate(id)
  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />
  if (!data) return <p className="text-sm text-danger">Không tìm thấy checklist.</p>
  return <ChecklistTemplateBuilder key={data.id} template={data} onDone={onDone} />
}

/** Admin (`checklist.manage`): danh sách mẫu, soạn mẫu, xem câu trả lời. */
export function ChecklistTemplatesPanel({
  view,
  onNavigate,
}: {
  view: ChecklistAdminView
  onNavigate: (next: ChecklistAdminView) => void
}) {
  const { data: templates = [], isLoading } = useChecklistTemplates()
  const update = useUpdateChecklistTemplate()
  const remove = useDeleteChecklistTemplate()
  const [kind, setKind] = useState<ChecklistKind | 'all'>('all')
  const [confirm, setConfirm] = useState<{
    action: 'deactivate' | 'delete'
    template: ChecklistTemplate
  } | null>(null)

  const back = () => onNavigate({})

  if (view.edit === 'new') return <ChecklistTemplateBuilder onDone={back} />
  if (view.edit) return <EditTemplate id={view.edit} onDone={back} />
  if (view.view) return <ViewTemplate id={view.view} onNavigate={onNavigate} />
  if (view.responses) return <ChecklistResponsesView templateId={view.responses} onBack={back} />

  const shown = kind === 'all' ? templates : templates.filter((t) => t.kind === kind)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex w-fit flex-wrap gap-1 rounded-xl border border-border/80 bg-card p-1 shadow-sm"
          role="tablist"
          aria-label="Lọc theo người điền"
        >
          {KIND_FILTERS.map((f) => (
            <Button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={kind === f.value}
              variant={kind === f.value ? 'default' : 'ghost'}
              size="sm"
              className={cn('rounded-lg text-xs', kind !== f.value && 'text-muted-foreground')}
              onClick={() => setKind(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button type="button" onClick={() => onNavigate({ edit: 'new' })}>
          <Plus className="size-4" aria-hidden />
          Tạo checklist
        </Button>
      </div>

      {isLoading ? (
        <ChecklistListSkeleton />
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card">
          <EmptyState
            icon={<ClipboardList className="size-6" aria-hidden />}
            title={templates.length === 0 ? 'Chưa có checklist nào' : 'Không có checklist loại này'}
            description="Tạo checklist (giống Google Form), chọn người điền và team áp dụng."
          />
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onView={() => onNavigate({ view: t.id })}
              onEdit={() => onNavigate({ edit: t.id })}
              onResponses={() => onNavigate({ responses: t.id })}
              onToggleActive={() =>
                t.isActive
                  ? setConfirm({ action: 'deactivate', template: t })
                  : update.mutate({ id: t.id, input: { isActive: true } })
              }
              onRemove={() => setConfirm({ action: 'delete', template: t })}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.action === 'delete' ? 'Xoá checklist?' : 'Ngừng sử dụng checklist?'}
        description={
          confirm?.action === 'delete'
            ? `"${confirm.template.title}" sẽ bị xoá vĩnh viễn.`
            : `Người điền sẽ không thấy "${confirm?.template.title ?? ''}" nữa. Câu trả lời đã có vẫn được giữ và có thể dùng lại sau.`
        }
        confirmLabel={confirm?.action === 'delete' ? 'Xoá' : 'Ngừng sử dụng'}
        destructive={confirm?.action === 'delete'}
        onConfirm={() => {
          if (!confirm) return
          if (confirm.action === 'delete') remove.mutate(confirm.template.id)
          else update.mutate({ id: confirm.template.id, input: { isActive: false } })
          setConfirm(null)
        }}
      />
    </div>
  )
}
