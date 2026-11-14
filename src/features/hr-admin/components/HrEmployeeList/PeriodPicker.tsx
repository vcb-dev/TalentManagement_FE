import { useMemo, useState } from 'react'
import { vi } from 'date-fns/locale'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** Phần nào có giá trị thì lọc theo phần đó: ngày = đủ 3, tháng = tháng + năm, năm = chỉ năm. */
export type PeriodValue = { day?: number; month?: number; year?: number }
export type PeriodMode = 'day' | 'month' | 'year'

const MODES: Array<{ value: PeriodMode; label: string }> = [
  { value: 'day', label: 'Ngày' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
]

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Nhãn trên nút; `null` = chưa lọc. Link cũ chỉ có tháng (không năm) vẫn hiển thị được. */
export function periodLabel(v: PeriodValue): string | null {
  const { day, month, year } = v
  if (day && month && year) return `Ngày ${pad2(day)}/${pad2(month)}/${year}`
  if (month && year) return `Tháng ${pad2(month)}/${year}`
  if (month) return `Tháng ${month} · mọi năm`
  if (year) return `Năm ${year}`
  if (day) return `Ngày ${day} · mọi tháng`
  return null
}

/** Chế độ mở sẵn khi bật bộ chọn — theo giá trị đang lọc, chưa lọc thì "Tháng". */
export function periodMode(v: PeriodValue): PeriodMode {
  if (v.day) return 'day'
  if (v.month) return 'month'
  if (v.year) return 'year'
  return 'month'
}

export function isPeriodSet(v: PeriodValue): boolean {
  return v.day !== undefined || v.month !== undefined || v.year !== undefined
}

const gridButton =
  'h-10 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button/40'

function gridButtonState(selected: boolean, isCurrent: boolean) {
  if (selected) return 'bg-button text-white shadow-sm hover:bg-button/90'
  return cn(
    'text-foreground hover:bg-button/10 hover:text-button',
    isCurrent && 'ring-1 ring-inset ring-button/40 font-semibold text-button'
  )
}

export interface PeriodPickerProps {
  id?: string
  value: PeriodValue
  /** Luôn gửi đủ 3 key (key `undefined` = bỏ lọc phần đó). */
  onChange: (next: {
    day: number | undefined
    month: number | undefined
    year: number | undefined
  }) => void
  /** Năm nhỏ nhất cho phép chọn. */
  minYear: number
  placeholder?: string
  triggerClassName?: string
  'aria-label'?: string
}

/**
 * Bộ chọn thời gian theo Ngày / Tháng / Năm trong một ô: lịch ngày, lưới 12 tháng (đổi năm bằng
 * mũi tên) hoặc lưới năm. Chọn xong tự đóng; "Bỏ lọc" xoá cả 3 phần.
 */
export function PeriodPicker({
  id,
  value,
  onChange,
  minYear,
  placeholder = 'Mọi thời gian',
  triggerClassName,
  'aria-label': ariaLabel,
}: PeriodPickerProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const maxYear = currentYear + 1
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<PeriodMode>(() => periodMode(value))
  const [viewYear, setViewYear] = useState(value.year ?? currentYear)
  const label = periodLabel(value)

  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i),
    [maxYear, minYear]
  )
  const selectedDate =
    value.day && value.month && value.year
      ? new Date(value.year, value.month - 1, value.day)
      : undefined

  const commit = (next: PeriodValue) => {
    onChange({ day: next.day, month: next.month, year: next.year })
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          // Mở lại → về đúng chế độ / năm đang lọc.
          setMode(periodMode(value))
          setViewYear(value.year ?? currentYear)
        }
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-label={ariaLabel ? `${ariaLabel}: ${label ?? placeholder}` : undefined}
          className={cn(
            'h-10 w-full justify-between gap-2 px-3 text-sm font-medium',
            label ? 'text-foreground' : 'text-muted-foreground',
            triggerClassName
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{label ?? placeholder}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(21.5rem,calc(100vw-2rem))] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-border/70 p-2">
          <div
            role="radiogroup"
            aria-label="Lọc theo"
            className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
          >
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  'h-8 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button/40',
                  mode === m.value
                    ? 'bg-card text-button shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Theo {m.label.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {mode === 'day' ? (
          <Calendar
            mode="single"
            locale={vi}
            selected={selectedDate}
            // Đang lọc tháng / năm → mở lịch ngay tại tháng đó để chọn ngày cho nhanh.
            defaultMonth={
              selectedDate ?? (value.year ? new Date(value.year, (value.month ?? 1) - 1, 1) : now)
            }
            captionLayout="dropdown"
            // Đổi tháng / năm bằng 2 ô chọn trên đầu lịch — mũi tên mặc định đè lên lưới ngày khi
            // lịch nằm gọn trong popover.
            hideNavigation
            formatters={{ formatMonthDropdown: (month: Date) => `Tháng ${month.getMonth() + 1}` }}
            startMonth={new Date(minYear, 0, 1)}
            endMonth={new Date(maxYear, 11, 31)}
            onSelect={(date) => {
              if (!date) return
              commit({ day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear() })
            }}
            className="mx-auto w-fit animate-none rounded-none border-0 p-3 shadow-none"
            classNames={{
              // Nhãn tháng / năm gọn một dòng (mặc định chữ in hoa giãn rộng, "Tháng 10" bị xuống dòng).
              caption_label:
                'inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-foreground',
              dropdown_root:
                'calendar-caption-dropdown relative flex h-10 min-h-10 w-full min-w-0 items-center justify-center rounded-xl border px-3 transition-colors hover:bg-muted/50',
            }}
          />
        ) : null}

        {mode === 'month' ? (
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Năm trước"
                disabled={viewYear <= minYear}
                onClick={() => setViewYear((y) => y - 1)}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <span className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">
                Năm {viewYear}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Năm sau"
                disabled={viewYear >= maxYear}
                onClick={() => setViewYear((y) => y + 1)}
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const selected = !value.day && value.month === m && value.year === viewYear
                const isCurrent = viewYear === currentYear && m === now.getMonth() + 1
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => commit({ month: m, year: viewYear })}
                    className={cn(gridButton, gridButtonState(selected, isCurrent))}
                  >
                    Tháng {m}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {mode === 'year' ? (
          <div className="max-h-64 overflow-y-auto p-3">
            <div className="grid grid-cols-3 gap-1.5">
              {years.map((y) => {
                const selected = !value.day && !value.month && value.year === y
                return (
                  <button
                    key={y}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => commit({ year: y })}
                    className={cn(
                      gridButton,
                      'tabular-nums',
                      gridButtonState(selected, y === currentYear)
                    )}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-border/70 px-3 py-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {label ? `Đang lọc: ${label}` : 'Chưa lọc thời gian'}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2 text-xs font-semibold text-muted-foreground hover:text-danger"
            disabled={!isPeriodSet(value)}
            onClick={() => commit({})}
          >
            <X className="size-3.5" aria-hidden />
            Bỏ lọc
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
