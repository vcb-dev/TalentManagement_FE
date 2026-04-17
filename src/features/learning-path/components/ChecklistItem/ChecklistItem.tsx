import { Button } from '@/components/ui/button'
import type { ChecklistItem as ChecklistItemModel } from '@/types/learning'

export interface ChecklistItemProps {
  item: ChecklistItemModel
  unlocked: boolean
  completed: boolean
  onSubmitEvidence?: (itemId: string) => void
}

export function ChecklistItem({ item, unlocked, completed, onSubmitEvidence }: ChecklistItemProps) {
  return (
    <div
      className="rounded-md border p-3 text-sm opacity-100 data-[locked=true]:opacity-50"
      data-locked={!unlocked}
    >
      <div className="font-medium">{item.title}</div>
      {unlocked && !completed && onSubmitEvidence ? (
        <Button
          type="button"
          variant="ghost"
          className="mt-2 h-auto p-0 text-xs font-normal normal-case tracking-normal text-primary underline hover:bg-transparent hover:text-primary/90"
          onClick={() => onSubmitEvidence(item.id)}
        >
          Gửi minh chứng
        </Button>
      ) : null}
    </div>
  )
}
