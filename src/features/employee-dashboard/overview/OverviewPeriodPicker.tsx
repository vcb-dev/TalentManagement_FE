import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  matchPreset,
  periodLabel,
  presetPeriod,
  type OverviewPeriod,
  type OverviewPreset,
} from './overviewModel'

const PRESETS: Array<{ value: OverviewPreset; label: string }> = [
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'ytd', label: 'Từ đầu năm' },
]

const MIN_YEAR = 2020

/**
 * Kỳ báo cáo (trong một năm): nút nhanh + ô chọn năm / khoảng tháng. Bấm tháng thứ nhất = chọn một
 * tháng; bấm tháng thứ hai = kéo thành khoảng (đảo chiều nếu chọn ngược).
 */
export function OverviewPeriodPicker({
  value,
  onChange,
}: {
  value: OverviewPeriod
  onChange: (next: OverviewPeriod) => void
}) {
  const preset = matchPreset(value)
  const [open, setOpen] = useState(false)
  /** Tháng đã bấm lần đầu, đang chờ bấm tháng kết thúc. */
  const [anchor, setAnchor] = useState<number | null>(null)
  const maxYear = new Date().getFullYear() + 1

  const pickMonth = (m: number) => {
    if (anchor === null) {
      setAnchor(m)
      onChange({ ...value, startMonth: m, endMonth: m })
      return
    }
    onChange({ ...value, startMonth: Math.min(anchor, m), endMonth: Math.max(anchor, m) })
    setAnchor(null)
    setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex rounded-lg border border-border/80 bg-card p-0.5"
        role="group"
        aria-label="Kỳ nhanh"
      >
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={preset === p.value}
            onClick={() => onChange(presetPeriod(p.value))}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              preset === p.value
                ? 'bg-button text-button-foreground'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          setAnchor(null)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Chọn kỳ báo cáo, đang xem ${periodLabel(value)}`}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50',
              preset ? 'border-border' : 'border-button/45 bg-button/5'
            )}
          >
            <CalendarRange className="size-4 text-muted-foreground" aria-hidden />
            <span className="tabular-nums">{periodLabel(value)}</span>
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-3">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Năm trước"
              disabled={value.year <= MIN_YEAR}
              onClick={() => onChange({ ...value, year: value.year - 1 })}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold tabular-nums">{value.year}</span>
            <button
              type="button"
              aria-label="Năm sau"
              disabled={value.year >= maxYear}
              onClick={() => onChange({ ...value, year: value.year + 1 })}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const inRange = m >= value.startMonth && m <= value.endMonth
              const edge = m === value.startMonth || m === value.endMonth
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={inRange}
                  onClick={() => pickMonth(m)}
                  className={cn(
                    'h-9 rounded-md text-sm tabular-nums transition-colors',
                    edge
                      ? 'bg-button font-semibold text-button-foreground'
                      : inRange
                        ? 'bg-button/12 font-medium text-foreground'
                        : 'text-foreground/85 hover:bg-muted'
                  )}
                >
                  T{m}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {anchor === null
              ? 'Bấm một tháng để xem riêng tháng đó, bấm thêm tháng thứ hai để chọn khoảng.'
              : `Từ T${anchor} — bấm tháng kết thúc.`}
          </p>
        </PopoverContent>
      </Popover>
    </div>
  )
}
