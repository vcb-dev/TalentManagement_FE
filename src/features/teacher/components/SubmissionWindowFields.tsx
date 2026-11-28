import { useRef, useState } from 'react'
import { AlertTriangle, CalendarClock, Clock } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import {
  addDaysToDateIso,
  formatDateIsoVi,
  formatWindowLength,
  vnEpochMs,
  weekdayVi,
} from '@/features/teacher/submissionDeadline'
import { digitsOnlyMax2, joinTimeHm, splitTimeToParts } from '@/lib/time24h'
import { cn } from '@/lib/utils'

export type SubmissionWindowDraft = {
  openDate: string
  openTime: string
  closeDate: string
  closeTime: string
}

export function submissionWindowDraftError(d: SubmissionWindowDraft): string | null {
  if (!d.openDate) return 'Chọn ngày mở nhận bài.'
  if (!d.closeDate) return 'Chọn ngày của hạn chót.'
  if (vnEpochMs(d.closeDate, d.closeTime) <= vnEpochMs(d.openDate, d.openTime)) {
    return 'Hạn chót phải sau thời điểm mở nhận bài.'
  }
  return null
}

export function formatWindowPoint(dateIso: string, timeHm: string): string {
  return `${timeHm}, ${weekdayVi(dateIso)} ${formatDateIsoVi(dateIso)}`
}

const DEADLINE_PRESETS = [
  { days: 0, label: 'Cuối ngày mở' },
  { days: 1, label: '+1 ngày' },
  { days: 3, label: '+3 ngày' },
  { days: 7, label: '+1 tuần' },
] as const
const END_OF_DAY = '23:59'

function TimeHmInput({
  value,
  onChange,
  label,
  className,
}: {
  value: string
  onChange: (next: string) => void
  label: string
  className?: string
}) {
  const [hh, mm] = splitTimeToParts(value)
  const draftRef = useRef<{ part: 'h' | 'm'; text: string } | null>(null)
  const [draft, setDraftState] = useState<{ part: 'h' | 'm'; text: string } | null>(null)
  const setDraft = (next: { part: 'h' | 'm'; text: string } | null) => {
    draftRef.current = next
    setDraftState(next)
  }
  const minuteRef = useRef<HTMLInputElement>(null)

  const commit = (part: 'h' | 'm', text: string) =>
    onChange(part === 'h' ? joinTimeHm(text, mm) : joinTimeHm(hh, text))

  const partInput = (part: 'h' | 'm') => (
    <input
      ref={part === 'm' ? minuteRef : undefined}
      inputMode="numeric"
      maxLength={2}
      aria-label={`${label} — ${part === 'h' ? 'giờ' : 'phút'}`}
      value={draft?.part === part ? draft.text : part === 'h' ? hh : mm}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const text = digitsOnlyMax2(e.target.value)
        if (text.length === 2) {
          setDraft(null)
          commit(part, text)
          if (part === 'h') minuteRef.current?.focus()
        } else {
          setDraft({ part, text })
        }
      }}
      onBlur={() => {
        const d = draftRef.current
        if (d?.part === part) {
          setDraft(null)
          commit(part, d.text)
        }
      }}
      className="w-6 bg-transparent p-0 text-center text-sm font-semibold tabular-nums text-foreground outline-none"
    />
  )

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex h-10 w-[6.5rem] shrink-0 items-center gap-0.5 rounded-xl border border-border bg-background px-3 shadow-sm focus-within:ring-2 focus-within:ring-button/35',
        className
      )}
    >
      <Clock className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      {partInput('h')}
      <span className="font-semibold text-muted-foreground">:</span>
      {partInput('m')}
    </div>
  )
}

export function SubmissionWindowFields({
  value,
  onChange,
  labelClassName,
  controlClassName,
  idPrefix,
}: {
  value: SubmissionWindowDraft
  onChange: (next: SubmissionWindowDraft) => void
  labelClassName?: string
  controlClassName?: string
  idPrefix: string
}) {
  const set = (patch: Partial<SubmissionWindowDraft>) => onChange({ ...value, ...patch })
  const error = submissionWindowDraftError(value)
  const openMs = value.openDate ? vnEpochMs(value.openDate, value.openTime) : NaN
  const closeMs = value.closeDate ? vnEpochMs(value.closeDate, value.closeTime) : NaN
  const closedAlready = !error && closeMs <= Date.now()
  const label = cn('block text-xs font-semibold text-muted-foreground', labelClassName)
  const dateClass = cn('h-10 min-w-0 flex-1 rounded-xl', controlClassName)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <fieldset className="min-w-0 space-y-1.5">
          <legend id={`${idPrefix}-open`} className={label}>
            Mở nhận bài
          </legend>
          <div className="flex gap-2">
            <DatePicker
              value={value.openDate}
              onChange={(openDate) => {
                if (openDate && value.openDate && value.closeDate) {
                  const gapDays = Math.round(
                    (vnEpochMs(value.closeDate, '00:00') - vnEpochMs(value.openDate, '00:00')) /
                      86_400_000
                  )
                  if (openDate > value.closeDate) {
                    set({ openDate, closeDate: addDaysToDateIso(openDate, Math.max(0, gapDays)) })
                    return
                  }
                }
                set({ openDate })
              }}
              className={dateClass}
            />
            <TimeHmInput
              label="Giờ mở nhận bài"
              value={value.openTime}
              onChange={(openTime) => set({ openTime })}
              className={controlClassName}
            />
          </div>
        </fieldset>
        <fieldset className="min-w-0 space-y-1.5">
          <legend id={`${idPrefix}-close`} className={label}>
            Hạn chót nộp bài
          </legend>
          <div className="flex gap-2">
            <DatePicker
              value={value.closeDate}
              onChange={(closeDate) => set({ closeDate })}
              min={value.openDate || undefined}
              className={dateClass}
            />
            <TimeHmInput
              label="Giờ hạn chót"
              value={value.closeTime}
              onChange={(closeTime) => set({ closeTime })}
              className={controlClassName}
            />
          </div>
        </fieldset>
      </div>

      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Chọn nhanh hạn chót"
      >
        <span className="mr-1 text-xs text-muted-foreground">Hạn chót nhanh (23:59):</span>
        {DEADLINE_PRESETS.map((p) => {
          const target = value.openDate ? addDaysToDateIso(value.openDate, p.days) : ''
          const selected = !!target && value.closeDate === target && value.closeTime === END_OF_DAY
          return (
            <button
              key={p.days}
              type="button"
              disabled={!value.openDate}
              aria-pressed={selected}
              onClick={() => set({ closeDate: target, closeTime: END_OF_DAY })}
              className={cn(
                'h-7 rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button/35 disabled:pointer-events-none disabled:opacity-40',
                selected
                  ? 'border-button bg-button text-white'
                  : 'border-border bg-card text-muted-foreground hover:border-button/40 hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-button/20 bg-button/5 px-3 py-2.5 text-sm text-foreground">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-button" aria-hidden />
          <p className="min-w-0">
            Học viên nộp bài từ{' '}
            <span className="font-semibold tabular-nums">
              {formatWindowPoint(value.openDate, value.openTime)}
            </span>{' '}
            đến{' '}
            <span className="font-semibold tabular-nums">
              {formatWindowPoint(value.closeDate, value.closeTime)}
            </span>
            <span className="text-muted-foreground">
              {' '}
              · mở trong {formatWindowLength(closeMs - openMs)}
            </span>
            {closedAlready ? (
              <span className="mt-1 block text-xs font-semibold text-warning">
                Hạn chót này đã qua — học viên chưa nộp sẽ không nộp được nữa.
              </span>
            ) : null}
          </p>
        </div>
      )}
    </div>
  )
}
