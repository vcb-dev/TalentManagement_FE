import { useEffect, useState, useCallback } from 'react'
import type { LevelCode } from '@/lib/constants'

export type PromotionCelebration = {
  fromLevel: LevelCode | null
  toLevel: LevelCode
  promotedAt: string
  displayName: string
  nextStarTopics?: Array<{ topic: string; objectives: string[] }>
}

interface UsePromotionDetectionParams {
  isLoading: boolean
  meDashboard: any // Replace with your dashboard type when available
  userId: string | undefined
  greetingName: string
}

/**
 * Detects recent promotions (level-up or star-up within 7 days)
 * and manages celebration state with localStorage dismissal.
 *
 * Extracted from EmployeeLearningDashboard.tsx.
 */
export function usePromotionDetection({
  isLoading,
  meDashboard,
  userId,
  greetingName,
}: UsePromotionDetectionParams) {
  const [celebration, setCelebration] = useState<PromotionCelebration | null>(null)

  useEffect(() => {
    if (isLoading || !meDashboard) return

    const history = meDashboard.promotionHistory ?? []
    if (history.length === 0) return

    const now = Date.now()
    const detectWindowMs = 7 * 24 * 60 * 60 * 1000
    const recentPromo = history.find((p: any) => {
      const isLevelUp = p.toLevel && (!p.fromLevel || p.fromLevel !== p.toLevel)
      const isStarUp =
        p.fromLevel &&
        p.toLevel &&
        p.fromLevel === p.toLevel &&
        (p.note?.toLowerCase().includes('sao') || p.note?.includes('⭐'))
      if (!isLevelUp && !isStarUp) return false
      return now - new Date(p.promotedAt).getTime() < detectWindowMs
    })

    if (!recentPromo) return

    const dismissKey = `promo_seen_${userId}_${new Date(recentPromo.promotedAt).getTime()}`
    if (localStorage.getItem(dismissKey)) return

    setCelebration({
      fromLevel: recentPromo.fromLevel as LevelCode,
      toLevel: recentPromo.toLevel as LevelCode,
      promotedAt: recentPromo.promotedAt,
      displayName: recentPromo.note?.includes('Sao')
        ? `${greetingName} — ${recentPromo.note}`
        : greetingName,
      nextStarTopics: (meDashboard as any).nextStarTopics,
    })
  }, [isLoading, meDashboard, userId, greetingName])

  const dismiss = useCallback(() => {
    if (celebration && userId) {
      const dismissKey = `promo_seen_${userId}_${new Date(celebration.promotedAt).getTime()}`
      localStorage.setItem(dismissKey, '1')
    }
    setCelebration(null)
  }, [celebration, userId])

  return { celebration, dismiss }
}
