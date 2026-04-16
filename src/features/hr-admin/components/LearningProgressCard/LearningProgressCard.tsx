import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LevelBadge } from '@/components/shared/LevelBadge'
import { ProgressStar } from '@/components/shared/ProgressStar'
import type { LevelCode } from '@/lib/constants'
import { STARS_PER_LEVEL } from '@/lib/constants'

export interface LearningProgressCardProps {
  level: LevelCode
  currentStar: number
}

export function LearningProgressCard({ level, currentStar }: LearningProgressCardProps) {
  const max = STARS_PER_LEVEL[level]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl">Tiến độ lộ trình</CardTitle>
        <LevelBadge level={level} />
      </CardHeader>
      <CardContent className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <ProgressStar key={i} filled={i < currentStar} />
        ))}
      </CardContent>
    </Card>
  )
}
