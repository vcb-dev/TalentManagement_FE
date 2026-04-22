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
}: DatePickerProps) {
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

  const isDayDisabled = React.useCallback(
    (date: Date) => {
      const d = startOfDay(date)
      if (minDate && d < startOfDay(minDate)) return true
      if (maxDate && d > startOfDay(maxDate)) return true
      return false
    },
    [minDate, maxDate]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-start rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-normal',
            !selectedDate && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: vi }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden p-0"
        align="start"
        /*
         * Radix mặc định auto-focus phần tử đầu tiên trong content. Với
         * `captionLayout="dropdown"`, đó là <select> tháng/năm (opacity-0) —
         * trên Windows có thể làm dropdown native mở ngay khi mở popover.
         * Giữ focus trên trigger; user Tab / click vào lịch như bình thường.
         */
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate ?? lockedFirstDay}
          month={lockToMonth ? lockedFirstDay : undefined}
          startMonth={lockedFirstDay}
          endMonth={lockedLastDay}
          disableNavigation={Boolean(lockToMonth)}
          captionLayout={lockToMonth ? 'label' : 'dropdown'}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
          disabled={isDayDisabled}
        />
      </PopoverContent>
    </Popover>
  )
}
