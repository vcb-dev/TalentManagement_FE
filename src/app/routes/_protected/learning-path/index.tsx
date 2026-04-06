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

const levelIdSchema = z.enum([
  'tap_su',
  'biet_viec',
  'duoc_viec',
  'dong_gop_ket_qua',
  'tuong',
])

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
  const role = useAuthStore((s) => s.user?.role)
  if (role === 'MEMBER') {
    return <LearningPathMemberPage />
  }
  return <LearningPathPickerPage />
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

function LearningPathPickerPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const levelId = search.levelId as LevelCode
  const maxStars = STARS_PER_LEVEL[levelId] || 6
  const star = String(search.starId)
  const levelLabel = LEVEL_LABELS[levelId]

  return (
    <>
      <PageHeader
        title="Lộ trình học"
        description="Theo dõi năng lực theo từng cấp, làm nhiệm vụ theo từng mốc (sao), đánh dấu hoàn thành và nộp minh chứng khi được yêu cầu. Trang này giúp bạn chọn cấp và mốc trước khi vào checklist chi tiết."
      />

      <div className="space-y-6">
        <Card className="border-primary/15 bg-primary/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden />
              Bạn sẽ làm gì ở đây?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            <ol className="list-inside list-decimal space-y-2">
              <li>
                <span className="text-foreground">Chọn cấp năng lực</span> (Tập sự, Biết việc, …) — khung phù hợp với giai đoạn của bạn.
              </li>
              <li>
                <span className="text-foreground">Chọn mốc sao</span> — mỗi sao là một nhóm nhiệm vụ trong checklist.
              </li>
              <li>
                <span className="text-foreground">Mở checklist</span> — xem từng bước, đánh dấu hoàn thành và tải minh chứng nếu cần.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Chọn cấp năng lực</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cấp hiện tại: <span className="font-medium text-foreground">{levelLabel}</span>
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {LEVELS.map((id) => {
              const active = id === search.levelId
              return (
                <Link
                  key={id}
                  to="/learning-path"
                  search={{
                    levelId: id,
                    starId: clampStarForLevel(id, search.starId),
                  }}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/60 hover:text-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {LEVEL_LABELS[id]}
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Chọn mốc (sao)</CardTitle>
            {maxStars > 0 ? (
              <p className="text-sm text-muted-foreground">
                Nhấn một sao để chọn mốc tương ứng (đang chọn: sao {search.starId}). Sau đó dùng nút bên dưới để vào checklist.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ở cấp <span className="font-medium text-foreground">{levelLabel}</span>, lộ trình có thể được chia theo mục thay vì sao. Bạn vẫn mở checklist để xem nhiệm vụ chi tiết.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {maxStars > 0 ? (
              <StarGrid
                count={maxStars}
                activeIndex={search.starId}
                variant="select"
                onSelect={(starNo) => {
                  navigate({
                    to: '/learning-path',
                    search: { levelId: search.levelId, starId: starNo },
                  })
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Không có lưới sao cho cấp này — dùng nút bên dưới để vào checklist.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-5 w-5 text-primary" aria-hidden />
              3. Mở checklist
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Checklist hiển thị nhiệm vụ theo thứ tự, trạng thái đã làm / đang làm / chưa mở, và khu vực nộp file minh chứng.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{levelLabel}</span>
              {' · '}
              {maxStars > 0 ? `Sao ${star}` : 'Mục 1'}
            </p>
            <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
              <Link to="/learning-path/$levelId/$starId" params={{ levelId: search.levelId, starId: star }}>
                Vào checklist
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
