import { useEffect, useState } from 'react'
import { ApprovalQueue } from './ApprovalQueue'
import { useApprovals, useApproveRequest, useRejectRequest } from '@/features/manager/hooks'
import { PromotionCelebrationModal } from '@/components/shared/PromotionCelebrationModal'
import type { LevelCode } from '@/lib/constants'

const LEVEL_CODE_MAP: Record<string, LevelCode> = {
  tap_su: 'tap_su',
  biet_viec: 'biet_viec',
  duoc_viec: 'duoc_viec',
  dong_gop_ket_qua: 'dong_gop_ket_qua',
  tuong: 'tuong',
}

export function ApprovalQueueContainer() {
  const { data, isLoading } = useApprovals()
  const approve = useApproveRequest()
  const reject = useRejectRequest()

  // ─── Celebration Modal State ───
  const [celebration, setCelebration] = useState<{
    fromLevel: LevelCode | null
    toLevel: LevelCode
    promotedName: string
    nextStarTopics?: Array<{ topic: string; objectives: string[] }>
  } | null>(null)

  // Watch for successful PROMOTED or STAR_UP result
  useEffect(() => {
    if (!approve.isSuccess || !approve.data) return
    const res = approve.data as any
    if (res?.status !== 'PROMOTED' && res?.status !== 'STAR_UP') return

    // Tìm tên nhân viên vừa thăng cấp từ danh sách
    const promotedUserId = res.id || (approve.variables as string)
    const person = data?.promotions?.find((p) => p.id === promotedUserId)
    const promotedName = person?.name || res.requesterName || 'Nhân viên'

    if (res.status === 'PROMOTED') {
      // Level promotion (e.g. tap_su → biet_viec)
      const fromLevel = LEVEL_CODE_MAP[res.fromLevel] ?? null
      const toLevel = LEVEL_CODE_MAP[res.toLevel] ?? 'biet_viec'
      setCelebration({
        fromLevel,
        toLevel,
        promotedName,
        nextStarTopics: res.nextStarTopics,
      })
    } else if (res.status === 'STAR_UP') {
      // Star promotion (e.g. Star 1 → Star 2 within biet_viec)
      const level = LEVEL_CODE_MAP[res.currentLevel] ?? 'biet_viec'
      setCelebration({
        fromLevel: level, // Same level
        toLevel: level, // Same level
        promotedName: `${promotedName} — ⭐ Sao ${res.currentStars}`,
        nextStarTopics: res.nextStarTopics,
      })
    }
  }, [approve.isSuccess, approve.data])

  return (
    <>
      <ApprovalQueue
        page={data}
        isLoading={isLoading}
        isApproving={approve.isPending ? (approve.variables as string) : null}
        onApprove={(id) => approve.mutate(id)}
        onReject={(id) => reject.mutate(id)}
      />

      {/* Celebration Modal khi thăng cấp thành công */}
      {celebration && (
        <PromotionCelebrationModal
          fromLevel={celebration.fromLevel}
          toLevel={celebration.toLevel}
          displayName={celebration.promotedName}
          nextStarTopics={celebration.nextStarTopics}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </>
  )
}

export { ApprovalQueue }
