import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight, ListChecks, Sparkles } from 'lucide-react'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChecklistStarScreen } from '@/features/learning-path/components/ChecklistStarScreen'
import { StarGrid } from '@/features/learning-path/components/StarGrid'
import { useMyProfilePage } from '@/features/profile/hooks'
import { resolveLearningPlacement } from '@/features/profile/resolveLearningPlacement'
import { LEVEL_LABELS, LEVELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

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

import { RoadmapCrud } from '@/features/manager/components/RoadmapCrud'

function LearningPathIndex() {
  const role = useAuthStore((s) => s.user?.role)
  if (role === 'MEMBER') {
    return <LearningPathMemberPage />
  }
  return <RoadmapCrud />
}

function LearningPathMemberPage() {
  const { data: profile, isLoading, isError } = useMyProfilePage()

  if (isLoading) {
    return (
      <>
        <PageHeader title="Lộ trình học" description="Đang tải thông tin lộ trình của bạn…" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </>
    )
  }

  if (isError || !profile) {
    return (
      <>
        <PageHeader title="Lộ trình học" />
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Không tải được hồ sơ. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.
          </CardContent>
        </Card>
      </>
    )
  }

  const { levelId, starId } = resolveLearningPlacement(profile)
  const starStr = String(starId)

  return (
    <>
      <PageHeader
        title="Lộ trình học"
        description={`${profile.currentLevel.progressLine} — Cấp và mốc do quản lý phân công; mọi điều chỉnh vị trí thực hiện qua quản lý. Phía dưới là checklist và nộp minh chứng trên cùng một trang.`}
      />
      <ChecklistStarScreen levelId={levelId} starId={starStr} embedInLearningPath />
    </>
  )
}
