import { StarEmblem, type StarEmblemVariant } from './StarEmblem'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export interface ProfileStarTierProps {
  variant: 'filled' | 'current' | 'empty'
  className?: string
}

const toEmblem: Record<ProfileStarTierProps['variant'], StarEmblemVariant> = {
  empty: 'empty',
  current: 'current',
  filled: 'filled',
}

const profileStarTierVariants = cva('h-6 w-6 shrink-0', {
  variants: {
    variant: {
      filled: 'drop-shadow-[0_1px_3px_rgba(180,120,0,0.35)]',
      current: '',
      empty: '',
    },
  },
  defaultVariants: {
    variant: 'empty',
  },
})

/** Sao theo tier (đủ / đang học / trống) — dùng cho tiến độ cấp trong hồ sơ. */
export function ProfileStarTier({ variant, className }: ProfileStarTierProps) {
  return (
    <StarEmblem
      variant={toEmblem[variant]}
      className={cn(profileStarTierVariants({ variant }), className)}
      aria-hidden
    />
  )
}
