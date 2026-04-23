import { UserMinus, UserPlus, Users } from 'lucide-react'
import { useLearningOpsSummary } from '@/features/dashboard/hooks'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const quartOut = '[transition-timing-function:cubic-bezier(0.25,1,0.48,1)]'

export type ManagerHrSnapshotCardsProps = {
  reportYear: number
  rangeStartMonth: number
  rangeEndMonth: number
}

/**
 * Ba thẻ nhân sự (tổng / off / mới) — luôn hiển thị dưới bộ lọc kỳ, ngoài tab học tập & KPI.
 */
export function ManagerHrSnapshotCards({
  reportYear,
  rangeStartMonth,
  rangeEndMonth,
}: ManagerHrSnapshotCardsProps) {
  const { data, isLoading, isError, refetch, isFetching } = useLearningOpsSummary(
    reportYear,
    rangeStartMonth,
    rangeEndMonth,
    { enabled: true }
  )

  const inSingleMonth = rangeStartMonth === rangeEndMonth

  return (
    <div className="space-y-3">
      {isError ? (
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Không tải được thống kê nhân sự.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Thử lại
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            key: 'headcount',
            label: 'Tổng nhân sự (đang làm việc)',
            icon: Users,
            value: data?.totalHeadcount,
            sub: 'Không tính trạng thái đã nghỉ / inactive trên hồ sơ HR',
            accent: 'from-indigo-500/90 to-violet-600/90',
          },
          {
            key: 'off',
            label: inSingleMonth ? 'Nhân sự off trong tháng' : 'Nhân sự off trong kỳ',
            icon: UserMinus,
            value: data?.offboardedInPeriod,
            sub: 'Theo ngày nghỉ trong dữ liệu đồng bộ; thiếu ngày thì ước lượng theo lần cập nhật gần nhất',
            accent: 'from-slate-500/90 to-rose-600/85',
          },
          {
            key: 'new',
            label: inSingleMonth ? 'Nhân sự mới trong tháng' : 'Nhân sự mới trong kỳ',
            icon: UserPlus,
            value: data?.newHiresInPeriod,
            sub: 'Ngày vào làm (startDateWork) nằm trong kỳ đã chọn',
            accent: 'from-teal-500/90 to-emerald-600/90',
          },
        ].map((card, idx) => (
          <div
            key={card.key}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.06] p-5 shadow-[var(--shadow-game-float)]',
              quartOut,
              CARD_ENTRANCE_HOVER,
              'transition-all duration-300 hover:border-primary/25'
            )}
            style={staggerStyle(idx, 60)}
          >
            <div
              className={cn(
                'pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-30 blur-2xl',
                card.accent
              )}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                {isLoading || isFetching ? (
                  <Skeleton className="mt-3 h-10 w-16 rounded-md" />
                ) : (
                  <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-foreground">
                    {card.value ?? 0}
                  </p>
                )}
                <p className="mt-2 text-xs font-medium text-muted-foreground">{card.sub}</p>
              </div>
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg',
                  'bg-gradient-to-br',
                  card.accent
                )}
              >
                <card.icon className="h-6 w-6" strokeWidth={2} aria-hidden />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
