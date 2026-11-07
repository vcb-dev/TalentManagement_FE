import * as React from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

type TimePickerProps = Omit<React.ComponentProps<'button'>, 'value' | 'onChange'> & {
  /** `HH:mm` (24h), rỗng = chưa chọn. */
  value?: string
  onChange: (value: string) => void
  placeholder?: string
}

function TimeOptions({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: string[]
  selected: string | undefined
  onSelect: (option: string) => void
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-1.5 text-xs font-semibold text-muted-foreground" aria-hidden>
        {label}
      </p>
      <div className="grid grid-cols-6 gap-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-label={`${option} ${label.toLowerCase()}`}
            aria-pressed={option === selected}
            onClick={() => onSelect(option)}
            className={cn(
              'h-9 w-10 rounded-lg text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button',
              option === selected
                ? 'bg-button text-button-foreground'
                : 'text-foreground hover:bg-muted'
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Chọn giờ 24h bằng cách bấm — không nhập tay, không AM/PM. Lưới hiện đủ giờ và phút (bước 5 phút) nên
 * không cần cuộn. Chọn giờ thì popover vẫn mở để chọn tiếp phút; đã có giờ mà chọn phút thì đóng lại.
 */
export function TimePicker({
  value,
  onChange,
  disabled,
  placeholder = 'Chọn giờ',
  className,
  ...triggerProps
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hour, minute] = value ? value.split(':') : []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          {...triggerProps}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-12 w-full justify-start rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-left text-sm font-bold shadow-sm transition-all hover:border-primary hover:bg-slate-50 active:scale-[0.98]',
            value ? 'border-primary/20 bg-primary/5 text-primary' : 'font-medium text-slate-400',
            className
          )}
        >
          <Clock className={cn('mr-2 h-4 w-4', value ? 'text-primary' : 'text-slate-400')} />
          <span className="tabular-nums">{value || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto space-y-3 rounded-2xl p-3" align="start" sideOffset={8}>
        <TimeOptions
          label="Giờ"
          options={HOURS}
          selected={hour}
          onSelect={(next) => onChange(`${next}:${minute ?? '00'}`)}
        />
        <TimeOptions
          label="Phút"
          options={MINUTES}
          selected={minute}
          onSelect={(next) => {
            onChange(`${hour ?? '00'}:${next}`)
            if (hour) setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
