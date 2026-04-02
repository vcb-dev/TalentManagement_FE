import type { LevelCode } from '@/lib/constants'
import { LEVEL_LABELS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'

export interface LevelBadgeProps {
  level: LevelCode
}

export function LevelBadge({ level }: LevelBadgeProps) {
  return <Badge variant="muted">{LEVEL_LABELS[level]}</Badge>
}
