import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { StarEmblem } from '@/components/icons/StarEmblem'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { shiftMonth, vnMonthOf } from '../activityTime'
import type { ActivityMonth, CompanyActivity } from '../types'
import { MonthRibbon } from './MonthRibbon'

const HERO_IMAGE = '/Image_VCB/ra_khoi_2026.jpg'
const ON_DARK_FOCUS =
  'focus-visible:ring-2 focus-visible:ring-vcb-cream focus-visible:ring-offset-0'
const MONTH_BUTTON = cn(
  'size-9 rounded-full border border-vcb-gold/60 bg-transparent text-vcb-gold-soft hover:bg-vcb-gold/20 hover:text-vcb-cream @xl:size-10',
  ON_DARK_FOCUS
)

/** Đầu trang: ảnh tập thể công ty phủ tông xanh ngọc, tiêu đề lớn, đổi tháng và dải ngày của tháng. */
export function ActivityHero({
  month,
  summary,
  activities,
  spotlightBelow,
  onMonthChange,
  onSelectActivity,
  onAdd,
}: {
  month: ActivityMonth
  /** `null` khi chưa có dữ liệu. */
  summary: string | null
  activities: CompanyActivity[]
  /** Có tấm vé đè lên mép dưới thì chừa chỗ để không che dải ngày. */
  spotlightBelow: boolean
  onMonthChange: (month: ActivityMonth) => void
  onSelectActivity: (activity: CompanyActivity) => void
  /** Chỉ truyền khi người xem có quyền thêm. */
  onAdd?: () => void
}) {
  const current = vnMonthOf()
  const isCurrentMonth = current.year === month.year && current.month === month.month

  return (
    <header
      className={cn(
        'relative isolate overflow-hidden bg-vcb-emerald-mid text-vcb-cream',
        spotlightBelow ? 'pb-20 @xl:pb-24' : 'pb-7 @xl:pb-9'
      )}
    >
      <img
        src={HERO_IMAGE}
        alt=""
        className="absolute inset-0 -z-20 size-full object-cover object-[72%_92%] opacity-90 mix-blend-luminosity motion-safe:[animation:activity-hero-settle_1500ms_cubic-bezier(0.16,1,0.3,1)_backwards]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-vcb-emerald from-20% via-vcb-emerald/80 via-55% to-vcb-emerald/20"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-3/5 bg-gradient-to-t from-vcb-emerald from-25% to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-2/5 bg-gradient-to-b from-vcb-emerald/75 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-2.5 -z-10 rounded-[1.25rem] border border-vcb-gold/40 @xl:inset-3.5"
      />

      <div className="px-6 pt-6 @xl:px-11 @xl:pt-8">
        <div className="flex items-start justify-between gap-3">
          <StarEmblem className="size-10 @xl:size-12" />
          {onAdd ? (
            <Button
              type="button"
              size="sm"
              onClick={onAdd}
              className={cn(
                'bg-vcb-gold font-semibold text-vcb-ink hover:bg-vcb-gold-soft active:bg-vcb-gold',
                ON_DARK_FOCUS
              )}
            >
              <Plus className="size-4" aria-hidden />
              Thêm hoạt động
            </Button>
          ) : null}
        </div>

        <h1 className="mt-3 font-serif text-[clamp(2.625rem,8cqw,4.75rem)] font-medium leading-[1.04] tracking-normal text-vcb-cream @xl:mt-4">
          <span className="block">Danh sách</span>
          <span className="block">hoạt động</span>
        </h1>
        <p className="mt-1.5 font-serif text-[clamp(1.25rem,2.8cqw,1.75rem)] italic text-vcb-gold-soft">
          Viễn Chí Bảo
        </p>

        {/* Đổi tháng nằm ngay trên dải ngày của tháng đó — gộp một hàng để đầu trang không đẩy danh sách xuống quá xa. */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 @xl:mt-7">
          <div className="inline-flex items-center gap-2 @xl:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={MONTH_BUTTON}
              aria-label="Tháng trước"
              onClick={() => onMonthChange(shiftMonth(month, -1))}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <p
              className="min-w-[6.4em] text-center font-serif text-[clamp(1.25rem,2.8cqw,1.75rem)] text-vcb-cream"
              aria-live="polite"
            >
              Tháng {month.month}/{month.year}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={MONTH_BUTTON}
              aria-label="Tháng sau"
              onClick={() => onMonthChange(shiftMonth(month, 1))}
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
          {isCurrentMonth ? null : (
            <button
              type="button"
              onClick={() => onMonthChange(current)}
              className={cn(
                'rounded text-sm font-semibold text-vcb-gold-soft underline-offset-4 hover:underline focus-visible:outline-none',
                ON_DARK_FOCUS
              )}
            >
              Về tháng này
            </button>
          )}
          <p className="min-h-5 text-sm tabular-nums text-vcb-cream/85 @xl:ml-auto">{summary}</p>
        </div>

        <div className="mt-4 @xl:mt-5">
          <MonthRibbon month={month} activities={activities} onSelect={onSelectActivity} />
        </div>
      </div>
    </header>
  )
}
