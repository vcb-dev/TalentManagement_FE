import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

export type ManagerReportPeriod = {
  reportYear: number
  rangeStartMonth: number
  rangeEndMonth: number
}

type Props = {
  value: ManagerReportPeriod
  onChange: (next: ManagerReportPeriod) => void
  className?: string
}

function clampYear(y: number) {
  return Math.min(2035, Math.max(2020, y))
}

/**
 * Bộ lọc “Kỳ báo cáo (cùng năm)” — dùng chung cho tab Học tập · Thi cử và KPI/OKR (role Manager).
 */
export function ManagerSharedReportPeriodFilter({ value, onChange, className }: Props) {
  const { reportYear, rangeStartMonth, rangeEndMonth } = value

  const setReportYear = (y: number) => {
    if (!Number.isFinite(y)) return
    onChange({ ...value, reportYear: clampYear(y) })
  }

  const setFromMonth = (m: number) => {
    const mm = Math.min(12, Math.max(1, m))
    const end = rangeEndMonth < mm ? mm : rangeEndMonth
    onChange({ ...value, rangeStartMonth: mm, rangeEndMonth: end })
  }

  const setToMonth = (m: number) => {
    const mm = Math.min(12, Math.max(1, m))
    const start = rangeStartMonth > mm ? mm : rangeStartMonth
    onChange({ ...value, rangeStartMonth: start, rangeEndMonth: mm })
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-sm sm:p-5',
        'motion-safe:animate-[dash-fade-up_0.4s_ease-out_both] motion-reduce:animate-none',
        className
      )}
      aria-label="Kỳ báo cáo dùng chung"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Kỳ báo cáo (cùng năm)
        </span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
          {rangeStartMonth === rangeEndMonth
            ? `Tháng ${rangeStartMonth}/${reportYear}`
            : `Từ tháng ${rangeStartMonth} đến tháng ${rangeEndMonth}/${reportYear}`}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Năm</span>
          <Input
            type="number"
            min={2020}
            max={2035}
            value={reportYear}
            className="h-10 rounded-xl border-border bg-background text-sm tabular-nums"
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v)) setReportYear(v)
            }}
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Từ tháng</span>
          <Select value={String(rangeStartMonth)} onValueChange={(v) => setFromMonth(Number(v))}>
            <SelectTrigger className="h-10 rounded-xl border-border bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  Tháng {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Đến tháng</span>
          <Select value={String(rangeEndMonth)} onValueChange={(v) => setToMonth(Number(v))}>
            <SelectTrigger className="h-10 rounded-xl border-border bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  Tháng {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  )
}
