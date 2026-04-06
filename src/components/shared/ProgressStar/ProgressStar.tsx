import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProgressStarProps {
  filled: boolean
  className?: string
  /** `gold` — sao vàng gamification; `primary` — tiến độ/lộ trình. */
  variant?: 'primary' | 'gold'
}

export function ProgressStar({ filled, className, variant = 'primary' }: ProgressStarProps) {
  const gold = variant === 'gold'
  return (
    <Star
      className={cn(
        'h-4 w-4',
        gold
          ? filled
            ? 'fill-star-gold text-star-gold drop-shadow-[0_1px_2px_rgba(180,120,0,0.35)]'
            : 'fill-none stroke-[1.5] text-star-gold-mid'
          : filled
            ? 'fill-primary text-primary'
            : 'text-muted-foreground',
        className
      )}
    />
  )
}
