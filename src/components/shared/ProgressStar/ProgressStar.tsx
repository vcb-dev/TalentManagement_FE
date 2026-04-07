import { StarEmblem } from '@/components/icons/StarEmblem'
import { cn } from '@/lib/utils'

export interface ProgressStarProps {
  filled: boolean
  className?: string
  /** `gold` — sao vàng gamification; `primary` — tiến độ/lộ trình. */
  variant?: 'primary' | 'gold'
}

export function ProgressStar({ filled, className, variant = 'primary' }: ProgressStarProps) {
  const gold = variant === 'gold'
  if (!filled) {
    return (
      <StarEmblem
        variant="empty"
        className={cn('h-4 w-4', gold ? '' : 'opacity-45 grayscale', className)}
      />
    )
  }
  return (
    <StarEmblem
      variant="filled"
      className={cn(
        'h-4 w-4',
        gold
          ? 'drop-shadow-[0_1px_2px_rgba(180,120,0,0.35)]'
          : 'drop-shadow-[0_1px_2px_rgba(79,70,229,0.22)]',
        className
      )}
    />
  )
}
