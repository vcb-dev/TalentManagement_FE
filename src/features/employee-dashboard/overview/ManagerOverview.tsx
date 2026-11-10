import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DEFAULT_OVERVIEW_HR_FILTER, type OverviewHrFilter } from '@/features/dashboard/api'
import { useOverviewSummary } from '@/features/dashboard/hooks'
import { cn } from '@/lib/utils'
import { HrOverviewSection } from './HrOverviewSection'
import { LearningOverviewSection } from './LearningOverviewSection'
import { periodLabel, type OverviewPeriod } from './overviewModel'

function OverviewSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải tổng quan">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}

/**
 * Nội dung "Tổng quan" của quản lý / BOD: Nhân sự rồi Lớp học, cùng một kỳ. Bộ lọc nhân sự chỉ áp cho
 * phần Nhân sự. Đổi kỳ / bộ lọc thì giữ số liệu cũ (mờ đi) cho tới khi có số mới — không nháy khung trống.
 */
export function ManagerOverview({ period }: { period: OverviewPeriod }) {
  const [hrFilter, setHrFilter] = useState<OverviewHrFilter>(DEFAULT_OVERVIEW_HR_FILTER)
  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useOverviewSummary(
    period.year,
    period.startMonth,
    period.endMonth,
    hrFilter
  )

  if (isError && !data) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        Không tải được số liệu tổng quan {periodLabel(period)}.{' '}
        <Button
          type="button"
          variant="ghost"
          className="h-auto p-0 font-semibold text-destructive underline hover:bg-transparent"
          onClick={() => void refetch()}
        >
          Thử lại
        </Button>
      </div>
    )
  }
  if (isLoading || !data) return <OverviewSkeleton />

  // Số đang hiển thị có thể là của kỳ trước (placeholder) — dùng kỳ trong dữ liệu cho mọi nhãn.
  const shownPeriod = data.period
  return (
    <div
      className={cn(
        'space-y-8 transition-opacity duration-200',
        isFetching && isPlaceholderData && 'opacity-60'
      )}
      aria-busy={isFetching}
    >
      <HrOverviewSection
        hr={data.hr}
        period={shownPeriod}
        filter={hrFilter}
        onFilterChange={setHrFilter}
      />
      <LearningOverviewSection
        learning={data.learning}
        activeStaff={data.hr.active}
        period={shownPeriod}
        today={data.today}
      />
    </div>
  )
}
