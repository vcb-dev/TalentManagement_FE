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
      className={cn(
        'rounded-[2rem] bg-card p-4 shadow-2xl border border-slate-100 dark:border-slate-800 animate-calendar-pop',
        className
      )}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'space-y-6',
        caption: 'flex justify-center pt-2 relative items-center mb-4',
        month_caption:
          'flex justify-center pt-2 relative items-center pb-4 px-4 border-b border-slate-50 dark:border-slate-800',
        dropdowns:
          'flex w-full items-center justify-center gap-3 text-sm font-bold uppercase tracking-wider',
        dropdown_root:
          'calendar-caption-dropdown relative flex h-11 min-h-11 w-full min-w-0 items-center justify-center rounded-2xl border-2 px-3 transition-all duration-300 hover:shadow-lg',
        dropdown: 'absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0',
        caption_label:
          'inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary dark:text-foreground',
        chevron: 'size-4 shrink-0 text-primary opacity-90',
        nav: 'space-x-2 flex items-center',
        nav_button:
          'h-9 w-9 bg-slate-50 dark:bg-slate-900/50 p-0 opacity-70 hover:opacity-100 hover:bg-primary hover:text-white inline-flex items-center justify-center rounded-xl transition-all duration-300 shadow-sm',
        nav_button_previous: 'absolute left-2',
        nav_button_next: 'absolute right-2',
        button_previous:
          'h-9 w-9 bg-slate-50 dark:bg-slate-900/50 p-0 opacity-70 hover:bg-primary hover:text-white hover:opacity-100 inline-flex items-center justify-center rounded-xl absolute left-2 transition-all duration-300',
        button_next:
          'h-9 w-9 bg-slate-50 dark:bg-slate-900/50 p-0 opacity-70 hover:bg-primary hover:text-white hover:opacity-100 inline-flex items-center justify-center rounded-xl absolute right-2 transition-all duration-300',
        month_grid: 'w-full border-collapse',
        week: 'flex w-full mt-2',
        weekdays: 'flex',
        weekday:
          'text-slate-400 h-10 w-10 p-0 text-center align-middle text-xs font-black uppercase tracking-widest',
        day: 'group/day relative h-11 w-11 p-0 text-center align-middle text-sm font-medium',
        day_button:
          'rdp-day_button box-border inline-flex h-10 min-h-10 w-10 min-w-10 items-center justify-center align-middle rounded-xl border-2 border-transparent p-0 text-sm font-bold transition-all duration-300 hover:shadow-md active:scale-95',
        day_outside: 'text-slate-300 dark:text-slate-600 opacity-50',
        day_disabled:
          'text-slate-200 dark:text-slate-800 opacity-20 cursor-not-allowed pointer-events-none grayscale',
        day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'
