import type { ChecklistItem as ChecklistItemModel } from '@/types/learning'

export interface ChecklistItemProps {
  item: ChecklistItemModel
  unlocked: boolean
  completed: boolean
  onSubmitEvidence?: (itemId: string) => void
}

export function ChecklistItem({ item, unlocked, completed, onSubmitEvidence }: ChecklistItemProps) {
  return (
    <div className="rounded-md border p-3 text-sm opacity-100 data-[locked=true]:opacity-50" data-locked={!unlocked}>
      <div className="font-medium">{item.title}</div>
      {unlocked && !completed && onSubmitEvidence ? (
        <button
          type="button"
          className="mt-2 text-xs text-primary underline"
          onClick={() => onSubmitEvidence(item.id)}
        >
          Gửi minh chứng
        </button>
      ) : null}
    </div>
  )
}
