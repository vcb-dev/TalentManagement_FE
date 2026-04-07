import { ProgressStar } from '@/components/shared/ProgressStar'

export interface FiveStarRankProps {
  /** 0–5 sao (làm tròn). */
  filled: number
}

/** Xếp hạng 5 sao — dùng `ProgressStar` (icon dự án). */
export function FiveStarRank({ filled }: FiveStarRankProps) {
  const n = Math.min(5, Math.max(0, Math.round(filled)))
  return (
    <div className="flex items-center gap-0.5" aria-label={`Xếp hạng ${n}/5 sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <ProgressStar key={i} filled={i < n} variant="primary" className="h-5 w-5" />
      ))}
    </div>
  )
}
