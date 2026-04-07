import { ProgressStar } from '@/components/shared/ProgressStar'
import { cn } from '@/lib/utils'

export interface StarGridProps {
  count: number
  activeIndex: number
  onSelect?: (index: number) => void
  /**
   * `progress` — sao đã đạt (theo tiến độ).
   * `select` — sao đang chọn để mở checklist (một sao được nhấn mạnh).
   */
  variant?: 'progress' | 'select'
}

export function StarGrid({ count, activeIndex, onSelect, variant = 'progress' }: StarGridProps) {
  const isSelect = variant === 'select'
  return (
    <div className="flex flex-wrap gap-2" role={isSelect ? 'radiogroup' : undefined} aria-label={isSelect ? 'Chọn mốc sao' : undefined}>
      {Array.from({ length: count }).map((_, i) => {
        const starNo = i + 1
        const selected = isSelect && starNo === activeIndex
        const filled = isSelect ? selected : i < activeIndex
        return (
          <button
            key={i}
            type="button"
            className={cn(
              'rounded-md border p-2 transition-colors hover:bg-muted',
              isSelect && selected ? 'border-primary bg-primary/10 ring-2 ring-primary/40' : 'border-border',
            )}
            onClick={() => onSelect?.(starNo)}
            aria-checked={isSelect ? selected : undefined}
            role={isSelect ? 'radio' : undefined}
            aria-label={isSelect ? `Sao ${starNo}` : undefined}
          >
            <ProgressStar filled={filled} />
          </button>
        )
      })}
    </div>
  )
}
