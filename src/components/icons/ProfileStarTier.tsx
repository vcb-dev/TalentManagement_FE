import { StarEmblem, type StarEmblemVariant } from './StarEmblem'
import { cn } from '@/lib/utils'

export interface ProfileStarTierProps {
  variant: 'filled' | 'current' | 'empty'
}

const toEmblem: Record<ProfileStarTierProps['variant'], StarEmblemVariant> = {
  empty: 'empty',
  current: 'current',
  filled: 'filled',
}

/** Sao theo tier (đủ / đang học / trống) — dùng cho tiến độ cấp trong hồ sơ. */
export function ProfileStarTier({ variant }: ProfileStarTierProps) {
  return (
    <StarEmblem
      variant={toEmblem[variant]}
      className={cn(
        'h-6 w-6 shrink-0',
        variant === 'filled' && 'drop-shadow-[0_1px_3px_rgba(180,120,0,0.35)]'
      )}
      aria-hidden
    />
  )
}
