import type { LevelCode } from '@/lib/constants'
import { LEVEL_LABELS, LEVELS, STARS_PER_LEVEL } from '@/lib/constants'
import type { MyProfilePage } from './types'

function clampStar(levelId: LevelCode, starId: number): number {
  const max = STARS_PER_LEVEL[levelId] || 6
  if (max <= 0) return 1
  return Math.min(Math.max(1, starId), max)
}

/** Suy ra cấp/sao checklist từ hồ sơ — khớp với phân công của quản lý. */
export function resolveLearningPlacement(page: MyProfilePage): { levelId: LevelCode; starId: number } {
  if (page.placement) {
    return {
      levelId: page.placement.levelId,
      starId: clampStar(page.placement.levelId, page.placement.starId),
    }
  }
  const title = page.currentLevel.title.trim()
  const levelId = (LEVELS.find((code) => LEVEL_LABELS[code] === title) ?? 'biet_viec') as LevelCode
  const starId = clampStar(levelId, page.currentLevel.currentStarIndex || 1)
  return { levelId, starId }
}
