import { memo, useMemo, type ReactNode } from 'react'
import { ChevronRight, FileText, GraduationCap, Layers, Route } from 'lucide-react'
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
const CONNECTOR = 'bg-gradient-to-b from-[#006C49]/35 to-[#006C49]/15'

function StepChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-start gap-1 rounded-xl bg-[#006C49]/[0.08] px-2.5 py-1 text-xs font-semibold leading-4 text-[#006C49]">
      {icon}
      {/* Tên lộ trình liên kết khá dài — cho xuống dòng thay vì cắt trên màn hẹp. */}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  )
}

function StepChips({ step }: { step: DashboardRoadmapStep }) {
  const chips: ReactNode[] = []
  if (step.linkedCourseTitle) {
    chips.push(
      <StepChip key="linked" icon={<Route className="size-3.5 shrink-0" aria-hidden />}>
        {step.linkedCourseTitle}
      </StepChip>
    )
  }
  if (step.sectionCount > 0) {
    chips.push(
      <StepChip key="sections" icon={<Layers className="size-3.5 shrink-0" aria-hidden />}>
        {step.sectionCount} học phần
      </StepChip>
    )
  }
  if (step.materialCount > 0) {
    chips.push(
      <StepChip key="materials" icon={<FileText className="size-3.5 shrink-0" aria-hidden />}>
        {step.materialCount} tài liệu
      </StepChip>
    )
  }
  return chips.length ? <span className="mt-2 flex flex-wrap gap-1.5">{chips}</span> : null
}

/**
 * Một mốc trên đường lộ trình. Thẻ cao bằng thẻ 5 cấp độ bên cạnh, nên các mốc (trừ mốc cuối) giãn đều
 * phần chiều cao còn dư — đoạn nối dưới mỗi mốc kéo dài theo, mạch lộ trình liền từ trên xuống.
 */
function StepRow({
  step,
  index,
  isFirst,
  isLast,
}: {
  step: DashboardRoadmapStep
  index: number
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <li
      className={cn(
        'flex motion-safe:animate-[dash-fade-up_0.5s_ease-out_both] motion-reduce:animate-none',
        !isLast && 'flex-1'
      )}
      style={{ animationDelay: `${120 + index * 70}ms` }}
    >
      <Link
        to="/courses"
        search={{ courseId: step.courseId, pathId: step.pathId }}
        className="group flex flex-1 gap-4 rounded-2xl px-2 outline-none transition-colors hover:bg-[#006C49]/[0.05] focus-visible:ring-2 focus-visible:ring-[#006C49]/40"
      >
        <span className="flex w-10 shrink-0 flex-col items-center" aria-hidden>
          <span className={cn('h-3 w-0.5 shrink-0 rounded-full', !isFirst && CONNECTOR)} />
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#006C49]/30 bg-card text-base font-black tabular-nums text-[#006C49] shadow-sm shadow-[#006C49]/10 transition-all duration-200 group-hover:scale-105 group-hover:border-[#006C49] group-hover:bg-[#006C49] group-hover:text-white group-hover:shadow-md group-hover:shadow-[#006C49]/30">
            {step.number}
          </span>
          <span className={cn('min-h-4 w-0.5 flex-1 rounded-full', !isLast && CONNECTOR)} />
        </span>

        <span className="min-w-0 flex-1 pb-5 pt-3">
          <span className="block text-xs font-bold uppercase tracking-widest text-[#006C49]/80">
            Bước {step.number}
          </span>
          <span className="mt-0.5 block break-words text-lg font-bold leading-snug text-foreground">
            {step.title}
            {step.caption ? (
              <span className="ml-2 whitespace-nowrap text-xs font-semibold text-muted-foreground">
                {step.caption}
              </span>
            ) : null}
          </span>
          {step.description ? (
            <span className="mt-1 line-clamp-2 block text-sm leading-snug text-muted-foreground">
              {step.description}
            </span>
          ) : null}
          <StepChips step={step} />
        </span>

        <ChevronRight
          className="mt-[30px] size-4 shrink-0 text-muted-foreground/40 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-[#006C49]"
          aria-hidden
        />
      </Link>
    </li>
  )
}

function RoadmapSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-8 px-2 pt-3" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-3 w-14 rounded-md" />
            <Skeleton className="h-5 rounded-md" style={{ width: `${50 + ((i * 17) % 35)}%` }} />
          </div>
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
 * phần / khoá "theo lộ trình khác" (chỉ hiện nhãn). Chưa theo dõi tiến độ — mỗi bước mở đúng khoá học
 * trên /courses.
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
      <header className="mb-5">
        <h4
          id="dash-training-roadmap-title"
          className="flex items-center gap-2 text-lg font-black text-foreground"
        >
          <GraduationCap className="h-5 w-5 shrink-0 text-[#006C49]" strokeWidth={2} aria-hidden />
          Lộ trình đào tạo
        </h4>
        {shown ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#006C49]/[0.06] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{shown.course.title}</p>
              {shown.course.description?.trim() ? (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {shown.course.description.trim()}
                </p>
              ) : null}
            </div>
            {shown.steps.length > 0 ? (
              <span className="shrink-0 rounded-full bg-[#006C49] px-3 py-1 text-xs font-bold tabular-nums text-white shadow-sm shadow-[#006C49]/25">
                {shown.steps.length} bước
              </span>
            ) : null}
          </div>
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
          <ol className="flex flex-1 flex-col" aria-label={`Các bước của ${shown.course.title}`}>
            {shown.steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                index={i}
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
