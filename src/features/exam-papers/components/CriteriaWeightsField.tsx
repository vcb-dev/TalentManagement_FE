import { Input } from '@/components/ui/input'
import {
  ESSAY_CRITERIA,
  sumCriteriaWeights,
  type EssayCriteriaWeights,
} from '@/features/exam-papers/criteria'
import { cn } from '@/lib/utils'

const SEGMENT_TONES = ['bg-button', 'bg-button/60', 'bg-button/30']

/** Ẩn nút tăng/giảm của input number (đè lên ký hiệu %). */
export const NO_SPINNER =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

/** 3 ô % cho thang điểm tự luận (Đúng lý thuyết / Ví dụ thực tế / Trình bày) + thanh tổng phải = 100%. */
export function CriteriaWeightsField({
  value,
  onChange,
  showDescriptions = false,
  idPrefix,
}: {
  value: EssayCriteriaWeights
  onChange: (next: EssayCriteriaWeights) => void
  showDescriptions?: boolean
  idPrefix: string
}) {
  const total = sumCriteriaWeights(value)
  const ok = total === 100

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {ESSAY_CRITERIA.map((c, i) => {
          const id = `${idPrefix}-${c.id}`
          return (
            <div
              key={c.id}
              className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-card p-3"
            >
              <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className={cn('size-2 shrink-0 rounded-full', SEGMENT_TONES[i])}
                  aria-hidden
                />
                {c.label}
              </label>
              {showDescriptions ? (
                <p className="text-xs leading-snug text-muted-foreground">{c.desc}</p>
              ) : null}
              <div className="relative mt-auto pt-1">
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={value[c.id]}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      [c.id]: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    })
                  }
                  className={cn('h-9 pr-8 text-sm font-semibold tabular-nums', NO_SPINNER)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          {ESSAY_CRITERIA.map((c, i) => (
            <div
              key={c.id}
              className={cn('h-full transition-[width] duration-300 ease-out', SEGMENT_TONES[i])}
              style={{ width: `${Math.min(100, value[c.id] || 0)}%` }}
            />
          ))}
        </div>
        <span
          className={cn(
            'shrink-0 text-xs font-semibold tabular-nums',
            ok ? 'text-success' : 'text-danger'
          )}
          aria-live="polite"
        >
          Tổng {total}%{ok ? '' : ' · cần đúng 100%'}
        </span>
      </div>
    </div>
  )
}
