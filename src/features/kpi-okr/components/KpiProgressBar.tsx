import { cn } from '@/lib/utils'

// ── KpiProgressBar ──

interface KpiProgressBarProps {
  value: number | null | undefined
  className?: string
  barClassName?: string
}

export function KpiProgressBar({ value, className, barClassName }: KpiProgressBarProps) {
  const pct = value != null ? Math.min(Math.max(value, 0), 100) : 0
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn('flex-1 rounded-full bg-slate-200 dark:bg-slate-700', barClassName ?? 'h-2')}
      >
        <div
          className={cn('rounded-full transition-all', color, barClassName ?? 'h-2')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="min-w-[2.5rem] text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">
        {value != null ? `${Math.round(pct)}%` : '—'}
      </span>
    </div>
  )
}

// ── EvalToggleGroup ──

const EVAL_OPTIONS = [
  { value: 'EXCELLENT', label: 'Xuất sắc', color: 'bg-emerald-500 text-white' },
  { value: 'GOOD', label: 'Tốt', color: 'bg-blue-500 text-white' },
  { value: 'AVERAGE', label: 'Đạt', color: 'bg-amber-500 text-white' },
  { value: 'BELOW_AVERAGE', label: 'Chưa đạt', color: 'bg-red-500 text-white' },
] as const

interface EvalToggleGroupProps {
  value: string | undefined | null
  onChange: (value: string) => void
}

export function EvalToggleGroup({ value, onChange }: EvalToggleGroupProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {EVAL_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cn(
            'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
            value === opt.value
              ? opt.color
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
