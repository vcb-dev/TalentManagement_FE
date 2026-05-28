import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { endOfMonth, format, isValid, parseISO, startOfDay, startOfMonth } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type LockToMonth = {
  /** Năm (4 chữ số) */
  year: number
  /** Tháng 1..12 */
  month: number
}

type DatePickerProps = {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  min?: string
  max?: string
  /**
   * Khoá lịch chỉ cho chọn ngày trong đúng tháng/năm này — ẩn nút điều hướng,
   * chặn chuyển sang tháng/năm khác qua dropdown.
   */
  lockToMonth?: LockToMonth
  /** Nhãn hiển thị trên nút (vd. "Hôm nay, 19/05/2026") thay cho dd/MM/yyyy */
  displayLabel?: string
  /** Toolbar: ô cố định ~5.5rem, không w-full. */
  size?: 'default' | 'toolbar'
}

function parseDateString(value?: string): Date | undefined {
  if (!value) return undefined
  const parsed = parseISO(value)
  if (!isValid(parsed)) return undefined
  return parsed
}

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = 'Chọn ngày',
  className,
  min,
  max,
  lockToMonth,
  displayLabel,
  size = 'default',
}: DatePickerProps) {
  const isToolbar = size === 'toolbar'
  const [open, setOpen] = React.useState(false)
  const selectedDate = parseDateString(value)

  const lockedFirstDay = React.useMemo(
    () =>
      lockToMonth ? startOfMonth(new Date(lockToMonth.year, lockToMonth.month - 1, 1)) : undefined,
    [lockToMonth]
  )
  const lockedLastDay = React.useMemo(
    () =>
      lockToMonth ? endOfMonth(new Date(lockToMonth.year, lockToMonth.month - 1, 1)) : undefined,
    [lockToMonth]
  )

  const minDate = lockedFirstDay ?? parseDateString(min)
  const maxDate = lockedLastDay ?? parseDateString(max)

  const isBeforeMin = React.useCallback(
    (date: Date) => Boolean(minDate && startOfDay(date) < startOfDay(minDate)),
    [minDate]
  )

  const isDayDisabled = React.useCallback(
    (date: Date) => {
      if (isBeforeMin(date)) return true
      if (maxDate && startOfDay(date) > startOfDay(maxDate)) return true
      return false
    },
    [isBeforeMin, maxDate]
  )

  const isDayHidden = React.useCallback((date: Date) => isBeforeMin(date), [isBeforeMin])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            isToolbar
              ? 'h-9 w-full min-w-0 justify-start rounded-lg border border-slate-200 bg-white px-2.5 py-0 text-left text-xs font-medium text-slate-800 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/30 active:scale-100'
              : 'h-12 w-full justify-start rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-left text-sm font-bold shadow-sm transition-all hover:border-primary hover:bg-slate-50 active:scale-[0.98]',
            !selectedDate && (isToolbar ? 'text-slate-400' : 'text-slate-400 font-medium'),
            selectedDate &&
              (isToolbar
                ? 'border-indigo-300/70 text-indigo-900'
                : 'border-primary/20 bg-primary/5 text-primary'),
            className
          )}
        >
          <CalendarIcon
            className={cn(
              isToolbar ? 'mr-1 h-3 w-3 shrink-0' : 'mr-2 h-4 w-4',
              selectedDate ? (isToolbar ? 'text-indigo-600' : 'text-primary') : 'text-slate-400'
            )}
          />
          {displayLabel ??
            (selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: vi }) : placeholder)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden p-0 rounded-[2.5rem] border-none shadow-2xl animate-in zoom-in-95 duration-200"
        align="start"
        sideOffset={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate ?? lockedFirstDay ?? minDate}
          month={lockToMonth ? lockedFirstDay : undefined}
          startMonth={lockedFirstDay ?? minDate}
          endMonth={lockedLastDay}
          disableNavigation={Boolean(lockToMonth)}
          captionLayout={lockToMonth ? 'label' : 'dropdown'}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
          disabled={isDayDisabled}
          hidden={minDate ? isDayHidden : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}
