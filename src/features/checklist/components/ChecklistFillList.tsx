import { CheckCircle2, ChevronRight, CircleDashed, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { countChecklistQuestions, formatChecklistTime } from '../checklistAnswers'
import type { ChecklistFillItem } from '../types'

/** Danh sách checklist người điền đang có — bấm để mở form điền / xem lại. */
export function ChecklistFillList({
  items,
  onOpen,
}: {
  items: ChecklistFillItem[]
  onOpen: (templateId: string) => void
}) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((item) => {
        const answered = Boolean(item.response)
        return (
          <li key={item.template.id}>
            <button
              type="button"
              onClick={() => onOpen(item.template.id)}
              className={cn(
                'group flex h-full w-full items-start gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-button/50 hover:bg-muted/30',
                item.editable ? 'border-border/80' : 'border-dashed border-border'
              )}
            >
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  answered ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning'
                )}
              >
                {answered ? (
                  <CheckCircle2 className="size-5" aria-hidden />
                ) : (
                  <CircleDashed className="size-5" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-foreground">{item.template.title}</p>
                {item.template.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.template.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <span>{countChecklistQuestions(item.template.questions)} câu hỏi</span>
                  <span aria-hidden>·</span>
                  {answered ? (
                    <span>Cập nhật {formatChecklistTime(item.response?.updatedAt)}</span>
                  ) : (
                    <span className="font-medium text-warning">Chưa điền</span>
                  )}
                  {!item.editable ? (
                    <Badge variant="muted" className="gap-1 px-1.5 py-0 text-[11px]">
                      <Lock className="size-3" aria-hidden />
                      Chỉ xem
                    </Badge>
                  ) : null}
                </div>
              </div>
              <ChevronRight
                className="mt-2 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
