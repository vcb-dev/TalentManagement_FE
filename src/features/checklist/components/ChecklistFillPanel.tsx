import type { ReactNode } from 'react'
import { ArrowLeft, ClipboardList, Lock } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatChecklistTime } from '../checklistAnswers'
import type { ChecklistAnswers, ChecklistFillItem } from '../types'
import { ChecklistAnswersView } from './ChecklistAnswersView'
import { ChecklistFillList } from './ChecklistFillList'
import { ChecklistForm, ChecklistFormHeader } from './ChecklistForm'

export function ChecklistListSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  )
}

/**
 * Danh sách checklist của một người điền + form của checklist đang mở (`templateId`).
 * Dùng chung cho "Checklist của tôi" và màn trưởng nhóm điền cho nhân sự.
 */
export function ChecklistFillPanel({
  items,
  isLoading,
  templateId,
  onOpen,
  onClose,
  onSave,
  saving,
  formMeta,
  emptyTitle,
  emptyDescription,
}: {
  items: ChecklistFillItem[] | undefined
  isLoading: boolean
  templateId: string | undefined
  onOpen: (templateId: string) => void
  onClose: () => void
  onSave: (templateId: string, answers: ChecklistAnswers) => void
  saving: boolean
  /** Dòng phụ dưới tiêu đề form, vd. "Đang điền cho: …". */
  formMeta?: ReactNode
  emptyTitle: string
  emptyDescription: string
}) {
  if (isLoading) return <ChecklistListSkeleton />

  const open = templateId ? items?.find((i) => i.template.id === templateId) : undefined
  if (open) {
    const updated = open.response
      ? `Lần cập nhật gần nhất: ${formatChecklistTime(open.response.updatedAt)}`
      : 'Chưa điền'
    const meta = (
      <>
        {formMeta ? <>{formMeta} · </> : null}
        {updated}
      </>
    )

    if (!open.editable) {
      return (
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <ChecklistFormHeader
            title={open.template.title}
            description={open.template.description}
            meta={meta}
          />
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" aria-hidden />
            Checklist đã ngừng sử dụng hoặc không còn áp dụng cho team — chỉ xem lại bản đã điền.
          </div>
          <ChecklistAnswersView
            questions={open.template.questions}
            answers={open.response?.answers ?? {}}
          />
          <div>
            <Button type="button" variant="ghost" onClick={onClose}>
              <ArrowLeft className="size-4" aria-hidden />
              Quay lại
            </Button>
          </div>
        </div>
      )
    }

    return (
      <ChecklistForm
        key={open.template.id}
        template={open.template}
        initialAnswers={open.response?.answers}
        meta={meta}
        saving={saving}
        onBack={onClose}
        onSubmit={(answers) => onSave(open.template.id, answers)}
      />
    )
  }

  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card">
        <EmptyState
          icon={<ClipboardList className="size-6" aria-hidden />}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    )
  }

  const pending = items.filter((i) => i.editable && !i.response).length
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {pending > 0 ? (
          <>
            Còn <span className="font-semibold text-warning">{pending}</span> checklist chưa điền.
          </>
        ) : (
          'Đã điền đủ các checklist đang áp dụng — vẫn có thể mở ra sửa lại.'
        )}
      </p>
      <ChecklistFillList items={items} onOpen={onOpen} />
    </div>
  )
}
