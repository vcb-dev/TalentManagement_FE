import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { StarGrid } from '@/features/learning-path/components/StarGrid'

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

export const Route = createFileRoute('/_protected/learning-path/')({
  validateSearch: (raw) => learningSearchSchema.parse(raw),
  component: LearningPathIndex,
})

function LearningPathIndex() {
  const search = Route.useSearch()
  const star = String(search.starId)
  return (
    <>
      <PageHeader title="Lộ trình học" />
      <StarGrid count={6} activeIndex={search.starId} />
      <div className="mt-4">
        <Link
          to="/learning-path/$levelId/$starId"
          params={{ levelId: search.levelId, starId: star }}
          className="text-sm text-primary underline"
        >
          Mở checklist cấp {search.levelId} — sao {star}
        </Link>
      </div>
    </>
  )
}
