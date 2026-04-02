import { ProgressStar } from '@/components/shared/ProgressStar'

export interface StarGridProps {
  count: number
  activeIndex: number
  onSelect?: (index: number) => void
}

export function StarGrid({ count, activeIndex, onSelect }: StarGridProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          className="rounded-md border border-border p-2 hover:bg-muted"
          onClick={() => onSelect?.(i + 1)}
        >
          <ProgressStar filled={i < activeIndex} />
        </button>
      ))}
    </div>
  )
}
