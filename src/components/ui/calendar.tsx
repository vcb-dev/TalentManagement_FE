import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      data-slot="daypicker"
      showOutsideDays={showOutsideDays}
      className={cn('rounded-md bg-card p-3 text-card-foreground', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-3',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        month_caption: 'flex justify-center pt-1 relative items-center pb-2 px-2',
        dropdowns: 'flex w-full items-center justify-center gap-2 text-sm font-medium',
        dropdown_root:
          'calendar-caption-dropdown relative flex h-10 min-h-10 w-full min-w-0 items-center justify-center rounded-lg border-2 px-2 shadow-sm transition-[border-color,background-color,box-shadow] duration-150',
        dropdown: 'absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0',
        caption_label:
          'inline-flex items-center gap-1 text-sm font-medium text-[hsl(168_42%_24%)] dark:text-foreground',
        chevron: 'size-3.5 shrink-0 text-[hsl(var(--accent))] opacity-90 dark:opacity-100',
        nav: 'space-x-1 flex items-center',
        nav_button:
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        button_previous:
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:bg-[hsl(var(--accent)/0.12)] hover:opacity-100 inline-flex items-center justify-center rounded-md absolute left-1',
        button_next:
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:bg-[hsl(var(--accent)/0.12)] hover:opacity-100 inline-flex items-center justify-center rounded-md absolute right-1',
        /* v9: month_grid = <table> — không đặt display:flex lên <td> (.day) vì sẽ vỡ lưới 7 cột */
        month_grid: 'w-full border-collapse',
        weekday:
          'text-muted-foreground h-10 w-10 p-0 text-center align-middle text-[0.8rem] font-normal',
        day: 'group/day relative h-10 w-10 p-0 text-center align-middle text-sm font-normal',
        day_button:
          'rdp-day_button box-border inline-flex h-10 min-h-10 w-10 min-w-10 items-center justify-center align-middle rounded-lg border-2 border-transparent p-0 text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-150 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed disabled:pointer-events-none',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled:
          'text-muted-foreground opacity-20 cursor-not-allowed pointer-events-none grayscale',
        day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'
