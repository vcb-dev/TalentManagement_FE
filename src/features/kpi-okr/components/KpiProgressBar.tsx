import { cn } from '@/lib/utils'

export function KpiProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number | null | undefined
  className?: string
  barClassName?: string
}) {
  const v = value == null ? 0 : Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 min-w-[64px] flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn('h-full rounded-full bg-indigo-500 transition-all', barClassName)}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-500">{v}%</span>
    </div>
  )
}

export function EvalToggleGroup({
  value,
  onChange,
  disabled,
}: {
  value: 'OK' | 'NOT' | undefined
  onChange: (v: 'OK' | 'NOT' | undefined) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value === 'OK' ? undefined : 'OK')}
        className={cn(
          'rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors',
          value === 'OK'
            ? 'bg-emerald-600 text-white'
            : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
        )}
      >
        OK
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value === 'NOT' ? undefined : 'NOT')}
        className={cn(
          'rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors',
          value === 'NOT'
            ? 'bg-rose-600 text-white'
            : 'text-slate-500 hover:bg-rose-50 hover:text-rose-700'
        )}
      >
        NOT
      </button>
    </div>
  )
}
