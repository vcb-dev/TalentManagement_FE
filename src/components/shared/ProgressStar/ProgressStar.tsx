import { StarEmblem } from '@/components/icons/StarEmblem'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export interface ProgressStarProps {
  filled: boolean
  className?: string
  /** `gold` — sao vàng gamification; `primary` — tiến độ/lộ trình. */
  variant?: 'primary' | 'gold'
}

const progressStarVariants = cva('h-4 w-4', {
  variants: {
    variant: {
      primary: '',
      gold: '',
    },
    filled: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    {
      variant: 'primary',
      filled: false,
      className: 'opacity-45 grayscale',
    },
    {
      variant: 'gold',
      filled: true,
      className: 'drop-shadow-[0_1px_2px_rgba(180,120,0,0.35)]',
    },
    {
      variant: 'primary',
      filled: true,
      className: 'drop-shadow-[0_1px_2px_rgba(79,70,229,0.22)]',
    },
  ],
  defaultVariants: {
    variant: 'primary',
    filled: false,
  },
})

export function ProgressStar({ filled, className, variant = 'primary' }: ProgressStarProps) {
  return (
    <StarEmblem
      variant={filled ? 'filled' : 'empty'}
      className={cn(progressStarVariants({ variant, filled }), className)}
    />
  )
}
