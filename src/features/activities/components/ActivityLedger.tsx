import type { CSSProperties, ReactNode } from 'react'
import { Check, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { StarEmblem } from '@/components/icons/StarEmblem'
import { ActionMenu } from '@/components/shared/ActionMenu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { activityDateBlock, activityStatus, type ActivityStatus } from '../activityTime'
import type { CompanyActivity } from '../types'
import { ActivityGem } from './ActivityGem'

/**
 * Danh sách như chuỗi ngọc: mỗi hoạt động là một viên trên sợi chỉ vàng — chỉ liền ở phần đã qua, nét đứt ở phần sắp tới.
 * Bố cục theo bề rộng tờ (`@container`) chứ không theo màn hình vì sidebar chiếm chỗ khác nhau giữa các vai trò.
 */
const ROW_GRID = 'grid grid-cols-[var(--gem-col)_minmax(0,1fr)]'
const ROW_PADDING = 'pl-1 pr-4 @xl:pr-7'
const GEM_SIZE = 'size-12 @xl:size-14 @3xl:size-16'
const RULE = 'border-vcb-ink/10'

const THREAD: Record<ActivityStatus, string> = {
  past: 'bg-vcb-gold',
  ongoing: 'bg-vcb-gold',
  upcoming:
    'bg-[repeating-linear-gradient(to_bottom,var(--color-vcb-gold)_0_5px,transparent_5px_10px)]',
}

function gemNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export function LedgerSheet({ children }: { children: ReactNode }) {
  return (
    // `pb-28` chừa chỗ cho nút trợ lý AI nổi góc phải — nếu không nó che nút xoá của dòng cuối.
    <div className="mx-auto max-w-6xl pb-28 pt-1 @container selection:bg-vcb-gold/30 selection:text-vcb-ink">
      <article
        className={cn(
          '[--gem-col:4.25rem] @xl:[--gem-col:6.5rem] @3xl:[--gem-col:8rem]',
          'overflow-hidden rounded-[1.75rem] bg-vcb-paper text-vcb-ink shadow-[0_1px_2px_rgb(0_41_31/0.08),0_30px_60px_-30px_rgb(0_41_31/0.45)]'
        )}
      >
        {children}
      </article>
    </div>
  )
}

/** Hoạ tiết ngăn cách kiểu tờ chương trình in: biểu tượng công ty giữa hai đường vàng. */
export function LedgerOrnament({ label }: { label: string }) {
  return (
    <div className="px-6 pb-3 pt-8 @xl:px-10 @xl:pb-4 @xl:pt-11">
      <h2 className="sr-only">{label}</h2>
      <div aria-hidden className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-vcb-gold" />
        <StarEmblem className="size-6" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-vcb-gold" />
      </div>
    </div>
  )
}

function RowStatus({ status }: { status: ActivityStatus }) {
  if (status === 'ongoing') {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-vcb-bronze @3xl:justify-end">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute size-full rounded-full bg-vcb-gold opacity-70 motion-safe:animate-ping" />
          <span className="relative size-2 rounded-full bg-vcb-bronze" />
        </span>
        Đang diễn ra
      </p>
    )
  }
  if (status === 'past') {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-vcb-ink/60 @3xl:justify-end">
        <Check className="size-3.5" aria-hidden />
        Đã kết thúc
      </p>
    )
  }
  return null
}

export function LedgerRow({
  index,
  activity,
  canManage,
  flashing,
  onEdit,
  onDelete,
}: {
  index: number
  activity: CompanyActivity
  canManage: boolean
  /** Vừa được chọn từ dải ngày — sáng lên một nhịp để mắt tìm thấy. */
  flashing: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const status = activityStatus(activity)
  const { date, detail } = activityDateBlock(activity)
  const isPast = status === 'past'
  const enter = { animationDelay: `${Math.min(index, 12) * 55}ms` } satisfies CSSProperties

  return (
    <li
      id={`activity-${activity.id}`}
      className={cn(
        ROW_GRID,
        'group/row scroll-mt-24 transition-colors duration-500',
        flashing
          ? 'bg-vcb-gold/30'
          : status === 'ongoing'
            ? 'bg-vcb-gold/[0.13]'
            : 'hover:bg-vcb-gold/[0.07]'
      )}
    >
      <div className="relative flex items-center justify-center">
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 group-first/row:top-1/2 group-last/row:bottom-1/2',
            THREAD[status]
          )}
        />
        <span
          className={cn(
            'relative transition-transform duration-300 ease-out group-hover/row:scale-110 motion-safe:[animation:activity-gem-in_650ms_cubic-bezier(0.16,1,0.3,1)_backwards]',
            status === 'ongoing' &&
              'motion-safe:[animation:activity-gem-in_650ms_cubic-bezier(0.16,1,0.3,1)_backwards,activity-gem-live_2400ms_ease-in-out_1s_infinite]'
          )}
          style={enter}
        >
          <ActivityGem tone={status} number={gemNumber(index)} className={GEM_SIZE} />
        </span>
      </div>
      <div
        className={cn(
          'relative grid gap-x-6 gap-y-2 border-t py-4 group-first/row:border-t-0 @xl:py-5 @3xl:items-center',
          ROW_PADDING,
          RULE,
          canManage
            ? '@3xl:grid-cols-[minmax(0,1fr)_13.5rem_auto]'
            : '@3xl:grid-cols-[minmax(0,1fr)_13.5rem]'
        )}
      >
        <div className="min-w-0 space-y-1">
          <h3
            className={cn(
              'break-words font-serif text-[clamp(1.1875rem,2.5cqw,1.5625rem)] font-medium leading-snug tracking-normal transition-colors duration-200 group-hover/row:text-vcb-emerald-mid',
              isPast && 'text-vcb-ink/60',
              canManage && 'pr-8 @xl:pr-16 @3xl:pr-0'
            )}
          >
            {activity.title}
          </h3>
          <p className="flex items-start gap-1.5 text-sm text-vcb-ink/70">
            <MapPin className="mt-1 size-3.5 shrink-0" aria-label="Địa điểm" />
            <span className="min-w-0 break-words">{activity.location}</span>
          </p>
        </div>
        <div className="@3xl:text-right">
          <p
            className={cn(
              'font-serif text-[1.25rem] leading-tight @xl:text-[1.5rem]',
              isPast ? 'text-vcb-ink/60' : 'text-vcb-emerald-mid'
            )}
          >
            {date}
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-vcb-ink/70">{detail}</p>
          <RowStatus status={status} />
        </div>
        {canManage ? (
          <div className="absolute right-2 top-2 @xl:right-3 @xl:top-3 @3xl:static">
            <ActionMenu
              items={[
                { label: 'Sửa', icon: <Pencil className="size-4" />, onClick: onEdit },
                {
                  label: 'Xoá',
                  icon: <Trash2 className="size-4 text-danger" />,
                  onClick: onDelete,
                  variant: 'destructive',
                },
              ]}
              triggerLabel={`Thao tác với hoạt động ${activity.title}`}
              className="@xl:hidden"
            />
            <div className="hidden items-center gap-0.5 @xl:flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-vcb-ink/60 hover:bg-vcb-emerald-mid/10 hover:text-vcb-emerald-mid"
                aria-label={`Sửa hoạt động ${activity.title}`}
                onClick={onEdit}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-danger hover:bg-danger/10 hover:text-danger"
                aria-label={`Xoá hoạt động ${activity.title}`}
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  )
}

/** Khung ngọc trống cuối chuỗi — admin bấm để thêm, mang sẵn số thứ tự tiếp theo. */
export function LedgerAddRow({ nextIndex, onClick }: { nextIndex: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        ROW_GRID,
        'group w-full text-left transition-colors duration-200 hover:bg-vcb-gold/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vcb-bronze'
      )}
    >
      <span className="flex items-center justify-center py-3">
        <ActivityGem
          tone="blank"
          number={gemNumber(nextIndex)}
          className={cn(GEM_SIZE, 'transition-transform duration-300 group-hover:scale-110')}
        />
      </span>
      <span
        className={cn(
          'flex items-center gap-2 border-t text-sm font-semibold text-vcb-bronze',
          ROW_PADDING,
          RULE
        )}
      >
        <Plus className="size-4" aria-hidden />
        Thêm hoạt động
      </span>
    </button>
  )
}

export function LedgerMessage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 px-6 pb-12 pt-4 text-center @xl:pb-16">
      <p className="text-balance font-serif text-[clamp(1.375rem,3cqw,1.875rem)] leading-snug">
        {title}
      </p>
      <p className="text-sm text-vcb-ink/70">{children}</p>
    </div>
  )
}

export function LedgerPanel({ children }: { children: ReactNode }) {
  return <div className="p-4 @xl:p-6">{children}</div>
}

export function LedgerSkeletonRows() {
  return (
    <div aria-busy>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={ROW_GRID}>
          <div aria-hidden className="flex items-center justify-center py-3">
            <Skeleton className={cn(GEM_SIZE, 'rounded-2xl')} />
          </div>
          <div className={cn('space-y-2 border-t py-5', ROW_PADDING, RULE)}>
            <Skeleton className="h-6 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-1/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}
