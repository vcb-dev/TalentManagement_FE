/** Đường dẫn sao gamification — thống nhất với dashboard / hồ sơ HR. */
export const GAME_STAR_PATH =
  'M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z'

export interface ProfileStarTierProps {
  variant: 'filled' | 'current' | 'empty'
}

/** Sao theo tier (đủ / đang học / trống) — dùng cho tiến độ cấp trong hồ sơ. */
export function ProfileStarTier({ variant }: ProfileStarTierProps) {
  if (variant === 'empty') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={24}
        height={24}
        className="shrink-0 text-star-gold-soft"
        aria-hidden
      >
        <path d={GAME_STAR_PATH} fill="none" stroke="currentColor" strokeWidth={1.5} />
      </svg>
    )
  }
  if (variant === 'current') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={24}
        height={24}
        className="shrink-0 text-star-gold-mid drop-shadow-[0_0_6px_rgba(212,160,23,0.45)]"
        aria-hidden
      >
        <path d={GAME_STAR_PATH} fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      className="shrink-0 text-star-gold drop-shadow-[0_1px_3px_rgba(180,120,0,0.35)]"
      aria-hidden
    >
      <path d={GAME_STAR_PATH} fill="currentColor" />
    </svg>
  )
}
