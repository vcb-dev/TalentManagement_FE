import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { InfoHint } from '@/components/shared/InfoHint'
import { cn } from '@/lib/utils'
import { formatCount, pct, type RankedRow, type SplitPart } from './overviewModel'

/**
 * Khối dựng trang "Tổng quan" quản lý. Màu dữ liệu chỉ nằm trên vạch / cột (biến `--viz-*`, `--button`);
 * chữ và số luôn dùng màu chữ để đọc được ở cả giao diện sáng / tối.
 */

export type OverviewLink = { to: string; search?: Record<string, unknown> }

/** Tiêu đề một khu vực lớn (Nhân sự / Lớp học) + dòng mô tả + nút bên phải. */
export function SectionTitle({
  id,
  title,
  meta,
  action,
}: {
  id: string
  title: string
  meta?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {meta ? <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function OverviewCard({
  title,
  meta,
  hint,
  action,
  className,
  children,
}: {
  title: string
  meta?: ReactNode
  hint?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-border/80 bg-card p-4 shadow-[var(--shadow-card)] sm:p-5',
        className
      )}
      aria-label={title}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {title}
            {hint ? <InfoHint text={hint} label={`Cách tính: ${title}`} /> : null}
          </h3>
          {meta ? <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

/** Nút "Xem …" nhỏ ở góc thẻ / đầu khu vực. */
export function OverviewMoreLink({ link, children }: { link: OverviewLink; children: ReactNode }) {
  return (
    <Link
      to={link.to}
      search={link.search}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md text-xs font-medium text-button underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button/40"
    >
      {children}
      <ChevronRight className="size-3.5" aria-hidden />
    </Link>
  )
}

/**
 * Ô chỉ số: nhãn · số lớn · dòng phụ, thêm biểu đồ nhỏ ở đáy (nếu có). Có `link` thì cả ô bấm được.
 * Số lớn dùng chữ số tỷ lệ (không `tabular-nums`) cho gọn mắt.
 */
export function StatTile({
  label,
  value,
  sub,
  hint,
  link,
  footer,
}: {
  label: string
  value: string
  sub?: ReactNode
  hint?: string
  link?: OverviewLink
  footer?: ReactNode
}) {
  const body = (
    <>
      <p className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
        {label}
        {hint ? <InfoHint text={hint} label={`Cách tính: ${label}`} /> : null}
      </p>
      <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-foreground">
        {value}
      </p>
      {sub ? <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div> : null}
      {footer ? <div className="mt-auto pt-3">{footer}</div> : null}
    </>
  )
  const shell =
    'flex min-w-0 flex-col rounded-xl border border-border/80 bg-card p-4 shadow-[var(--shadow-card)]'
  if (!link) return <div className={shell}>{body}</div>
  return (
    <Link
      to={link.to}
      search={link.search}
      className={cn(
        shell,
        'transition-colors hover:border-button/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button/40'
      )}
    >
      {body}
    </Link>
  )
}

/**
 * 12 cột nhỏ (biểu đồ phụ trong ô chỉ số): tháng trong kỳ tô màu nhấn, tháng khác xám nhạt.
 * Chỉ để nhìn xu hướng — số liệu đầy đủ nằm ở biểu đồ "Biến động" bên dưới.
 */
export function MiniColumns({
  values,
  highlight,
  color,
  label,
}: {
  values: number[]
  highlight: boolean[]
  color: string
  label: string
}) {
  const max = Math.max(1, ...values)
  return (
    <div className="flex h-7 items-end gap-[3px]" role="img" aria-label={label}>
      {values.map((v, i) => (
        <span
          key={i}
          className="min-w-0 flex-1 rounded-t-[2px]"
          style={{
            height: v > 0 ? `${Math.max(8, (v / max) * 100)}%` : '2px',
            background: highlight[i] ? color : 'var(--viz-none)',
          }}
        />
      ))}
    </div>
  )
}

/** Thước đo một tỷ lệ (vd. % nhân sự đang đi học): vạch đầy màu nhấn trên nền cùng màu nhạt. */
export function Meter({ value, label }: { value: number | null; label: string }) {
  const v = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-button/12"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
    >
      <div className="h-full rounded-full bg-button" style={{ width: `${v}%` }} />
    </div>
  )
}

/**
 * Thanh chia tỷ lệ mỏng (một tổng chia nhiều phần), khe 2px giữa các phần. Số liệu đọc ở danh sách
 * cạnh bên (`SplitLegend`), di chuột từng phần xem tên + số.
 */
export function SplitBar({
  parts,
  total,
  label,
  className,
}: {
  parts: SplitPart[]
  total: number
  label: string
  className?: string
}) {
  const shown = parts.filter((p) => p.count > 0)
  return (
    <div
      className={cn('flex h-2.5 w-full gap-[2px]', className)}
      role="img"
      aria-label={`${label}: ${shown.map((p) => `${p.label} ${p.count}`).join(', ')}`}
    >
      {total > 0 ? (
        shown.map((p) => (
          <span
            key={p.key}
            className="h-full min-w-[3px] first:rounded-l-full last:rounded-r-full"
            style={{ flexGrow: p.count, flexBasis: 0, background: p.color }}
            title={`${p.label}: ${formatCount(p.count)} (${pct(p.count, total)}%)`}
          />
        ))
      ) : (
        <span className="h-full w-full rounded-full bg-muted" />
      )}
    </div>
  )
}

/** Danh sách đi kèm `SplitBar`: chấm màu · tên · số · %. */
export function SplitLegend({ parts, total }: { parts: SplitPart[]; total: number }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {parts.map((p) => (
        <li
          key={p.key}
          className="flex items-center gap-2 text-sm"
          title={
            p.members && p.members.length > 1
              ? p.members.map((m) => `${m.label}: ${m.count}`).join(' · ')
              : undefined
          }
        >
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="min-w-0 flex-1 truncate text-foreground/90">{p.label}</span>
          <span className="font-semibold tabular-nums text-foreground">{formatCount(p.count)}</span>
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
            {pct(p.count, total)}%
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Phân bố theo nhóm có thứ tự (thâm niên, độ tuổi): cột một màu, số ghi trên đầu cột, nhóm lớn nhất
 * đậm hơn để mắt bắt ngay.
 */
export function BucketColumns({
  buckets,
  label,
}: {
  buckets: Array<{ key: string; label: string; count: number }>
  label: string
}) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0)
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <div
      className="grid min-h-44 flex-1 gap-2"
      style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
      role="img"
      aria-label={`${label}: ${buckets.map((b) => `${b.label} ${b.count}`).join(', ')}`}
    >
      {buckets.map((b) => (
        <div
          key={b.key}
          className="flex min-w-0 flex-col"
          title={`${b.label}: ${formatCount(b.count)} người (${pct(b.count, total) ?? 0}%)`}
        >
          {/* Vùng vẽ riêng (trừ nhãn) để cột cao nhất vẫn chừa chỗ cho số trên đầu cột. */}
          <div className="flex flex-1 flex-col items-center justify-end">
            <span className="mb-1 text-sm font-semibold tabular-nums text-foreground">
              {formatCount(b.count)}
            </span>
            <span
              className={cn(
                'w-full max-w-7 rounded-t-[4px]',
                b.count === max ? 'bg-button' : 'bg-button/45 dark:bg-button/75'
              )}
              style={{ height: `${(b.count / max) * 82}%`, minHeight: b.count > 0 ? 3 : 1 }}
            />
          </div>
          <span className="flex h-9 items-start justify-center border-t border-border pt-1.5 text-center text-[11px] leading-tight text-muted-foreground">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Thanh ngang xếp hạng (nhiều → ít), một màu. Dòng có `teamId` + `linkFor` thì bấm được để mở danh sách
 * nhân sự đã lọc.
 */
export function RankedBars({
  rows,
  total,
  linkFor,
}: {
  rows: RankedRow[]
  total: number
  linkFor?: (row: RankedRow) => OverviewLink | null
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const link = linkFor?.(r) ?? null
        const muted = r.key === 'rest' || r.key === 'none'
        const inner = (
          <>
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-sm text-foreground/90" title={r.label}>
                {r.label}
                {r.sublabel ? (
                  <span className="ml-1.5 text-xs text-muted-foreground">{r.sublabel}</span>
                ) : null}
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatCount(r.count)}
              </span>
              <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                {pct(r.count, total)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted/70">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(1.5, (r.count / max) * 100)}%`,
                  background: muted ? 'var(--viz-removed)' : 'hsl(var(--button))',
                }}
              />
            </div>
          </>
        )
        return (
          <li key={r.key}>
            {link ? (
              <Link
                to={link.to}
                search={link.search}
                className="block rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button/40"
              >
                {inner}
              </Link>
            ) : (
              <div className="px-2 py-1.5">{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Nút chọn dạng viên thuốc (đổi chế độ xem trong một thẻ). */
export function ChoiceChips<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-border/80 p-0.5"
      role="group"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-button text-button-foreground'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
