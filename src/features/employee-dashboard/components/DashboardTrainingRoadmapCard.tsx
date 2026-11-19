import { memo, useMemo } from 'react'
import { ChevronRight, GraduationCap } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  buildDashboardRoadmap,
  type DashboardRoadmapStep,
} from '@/features/courses/dashboardRoadmap'
import { useCourse, useCourses } from '@/features/courses/hooks'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'

/** Đường nối giữa các mốc — cùng màu xanh thương hiệu của thẻ "Lộ trình 5 cấp độ Lao động tri thức". */
const CONNECTOR = 'bg-[#006C49]/20'

function StepRow({
  step,
  isFirst,
  isLast,
}: {
  step: DashboardRoadmapStep
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <li>
      <Link
        to="/courses"
        search={{ courseId: step.courseId, pathId: step.pathId }}
        className="group flex gap-3 rounded-xl px-2 outline-none transition-colors hover:bg-[#006C49]/[0.06] focus-visible:ring-2 focus-visible:ring-[#006C49]/40"
      >
        {/* Mốc lệch xuống 8px cho thẳng hàng dòng đầu của tên; 2 đoạn nối trên/dưới ghép liền giữa các dòng. */}
        <span className="flex w-8 shrink-0 flex-col items-center" aria-hidden>
          <span className={cn('h-2 w-0.5 shrink-0', !isFirst && CONNECTOR)} />
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#006C49]/30 bg-card text-sm font-black tabular-nums text-[#006C49] transition-colors group-hover:border-[#006C49] group-hover:bg-[#006C49] group-hover:text-white">
            {step.number}
          </span>
          <span className={cn('min-h-2 w-0.5 flex-1', !isLast && CONNECTOR)} />
        </span>
        <span className="min-w-0 flex-1 break-words py-2.5 text-[15px] font-bold leading-7 text-foreground">
          <span className="sr-only">Bước {step.number}: </span>
          {step.title}
          {step.caption ? (
            <span className="ml-2 whitespace-nowrap text-xs font-semibold text-muted-foreground">
              {step.caption}
            </span>
          ) : null}
        </span>
        <ChevronRight
          className="mt-[18px] size-4 shrink-0 text-muted-foreground/50 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-[#006C49]"
          aria-hidden
        />
      </Link>
    </li>
  )
}

function RoadmapSkeleton() {
  return (
    <div className="space-y-3 px-2 pt-2" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className="h-4 rounded-md" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
        </div>
      ))}
    </div>
  )
}

function EmptyNote({ children }: { children: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/80 p-6 text-center text-sm font-semibold text-muted-foreground">
      <GraduationCap className="size-9 text-[#006C49]/60" strokeWidth={1.75} aria-hidden />
      {children}
    </div>
  )
}

/**
 * Thẻ "Lộ trình đào tạo" ở trang cá nhân (thay "Tiến độ mốc học"): các khoá học của lộ trình admin chọn
 * "Hiện ở trang cá nhân" trên /courses — mỗi khoá học là một bước (`buildDashboardRoadmap`), không bung học
 * phần / khoá "theo lộ trình khác". Chưa theo dõi tiến độ — mỗi bước mở đúng khoá học trên /courses.
 */
export const DashboardTrainingRoadmapCard = memo(function DashboardTrainingRoadmapCard({
  staggerIndex,
}: {
  staggerIndex: number
}) {
  const { data: courses, isLoading: listLoading } = useCourses(false)
  const featuredId = useMemo(() => courses?.find((c) => c.showOnDashboard)?.id, [courses])
  const { data: course, isLoading: detailLoading, isError } = useCourse(featuredId, false)
  const steps = useMemo(() => (course ? buildDashboardRoadmap(course) : null), [course])

  const loading = listLoading || detailLoading
  const shown = !loading && !isError && course && steps ? { course, steps } : null

  return (
    <section
      className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-accent/20 p-6"
      style={staggerStyle(staggerIndex, 55)}
      aria-labelledby="dash-training-roadmap-title"
      aria-busy={loading}
    >
      <header className="mb-4">
        <h4
          id="dash-training-roadmap-title"
          className="flex items-center gap-2 text-lg font-black text-foreground"
        >
          <GraduationCap className="h-5 w-5 shrink-0 text-[#006C49]" strokeWidth={2} aria-hidden />
          Lộ trình đào tạo
        </h4>
        {shown ? (
          <p className="mt-1 pl-7 text-sm font-semibold text-muted-foreground">
            {shown.course.title}
            {shown.steps.length > 0 ? ` · ${shown.steps.length} bước` : null}
          </p>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col">
        {loading ? (
          <RoadmapSkeleton />
        ) : !shown ? (
          <EmptyNote>Chưa có lộ trình đào tạo nào được chọn hiển thị ở trang cá nhân.</EmptyNote>
        ) : shown.steps.length === 0 ? (
          <EmptyNote>Lộ trình đang được cập nhật khoá học.</EmptyNote>
        ) : (
          <ol aria-label={`Các bước của ${shown.course.title}`}>
            {shown.steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                isFirst={i === 0}
                isLast={i === shown.steps.length - 1}
              />
            ))}
          </ol>
        )}

        <div className="mt-auto pt-5">
          <Button asChild className="h-auto w-full rounded-xl py-3.5 text-sm font-black">
            <Link
              to="/courses"
              search={shown ? { courseId: shown.course.id } : {}}
              className="flex w-full items-center justify-center"
            >
              {shown ? 'Mở lộ trình đào tạo' : 'Xem lộ trình đào tạo'}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
})
