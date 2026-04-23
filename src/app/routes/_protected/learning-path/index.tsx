import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChecklistStarScreen } from '@/features/learning-path/components/ChecklistStarScreen'
import { useMyProfilePage } from '@/features/profile/hooks'
import { LEVEL_LABELS, LEVELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
import { RoadmapCrud } from '@/features/manager/components/RoadmapCrud'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const levelIdSchema = z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong'])

const learningSearchSchema = z.object({
  levelId: levelIdSchema.optional().default('biet_viec'),
  starId: z.coerce.number().int().min(1).max(6).optional().default(1),
})

function clampStarForLevel(levelId: LevelCode, starId: number): number {
  const max = STARS_PER_LEVEL[levelId] || 6
  if (max <= 0) return 1
  return Math.min(Math.max(1, starId), max)
}

export const Route = createFileRoute('/_protected/learning-path/')({
  validateSearch: (raw) => {
    const parsed = learningSearchSchema.parse(raw)
    return {
      ...parsed,
      starId: clampStarForLevel(parsed.levelId as LevelCode, parsed.starId),
    }
  },
  component: LearningPathIndex,
})

function LearningPathIndex() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role

  const isAdminOrManager = role === 'MANAGER' || role === 'HR' || role === 'BOD'

  if (isAdminOrManager) {
    return <RoadmapCrud />
  }

  return <LearningPathMemberPage />
}

function LearningPathMemberPage() {
  const { data: profile, isLoading, isError } = useMyProfilePage()
  const search = Route.useSearch()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="p-8">
        <PageHeader title="Lộ trình học" description="Đang tải thông tin lộ trình của bạn…" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="p-8">
        <PageHeader title="Lộ trình học" />
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Không tải được hồ sơ. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentLevelId = (search.levelId as LevelCode) || profile.placement?.levelId || 'tap_su'
  const currentStarId = search.starId || profile.placement?.starId || 1
  const starStr = String(currentStarId)

  return (
    <div className="p-8">
      <PageHeader
        title="Lộ trình học"
        description={`${profile.currentLevel.progressLine} — Cấp và mốc do quản lý phân công.`}
      />

      <div className="mt-8">
        <ChecklistStarScreen levelId={currentLevelId} starId={starStr} embedInLearningPath />
      </div>
    </div>
  )
}
