import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { format, isValid, parseISO, startOfDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type DatePickerProps = {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  min?: string
  max?: string
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
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selectedDate = parseDateString(value)
  const minDate = parseDateString(min)
  const maxDate = parseDateString(max)

  const dayDisabled = React.useCallback(
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
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          captionLayout="dropdown"
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
          disabled={dayDisabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
