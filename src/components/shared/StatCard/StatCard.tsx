import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatCardTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

export interface StatCardProps {
  title: string
  value: ReactNode
  icon?: ReactNode
  description?: string
  trend?: {
    value: number
    label?: string
  }
  tone?: StatCardTone
  className?: string
}

const toneClasses: Record<StatCardTone, { icon: string; trend: string }> = {
  default: { icon: 'bg-primary/10 text-primary', trend: 'text-muted-foreground' },
  success: {
    icon: 'bg-success/10 text-success-600 dark:bg-success-500/15 dark:text-success-100',
    trend: 'text-success-600',
  },
  warning: {
    icon: 'bg-warning/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-100',
    trend: 'text-warning-600',
  },
  danger: {
    icon: 'bg-danger/10 text-danger-600 dark:bg-danger-500/15 dark:text-danger-100',
    trend: 'text-danger-600',
  },
  info: { icon: 'bg-info/10 text-info', trend: 'text-info' },
}

export function StatCard({
  title,
  value,
  icon,
  description,
  trend,
  tone = 'default',
  className,
}: StatCardProps) {
  const colors = toneClasses[tone]

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          {trend !== undefined ? (
            <p className={cn('mt-1 text-xs font-medium', colors.trend)}>
              {trend.value >= 0 ? '+' : ''}
              {trend.value}
              {trend.label ? ` ${trend.label}` : ''}
            </p>
          ) : null}
        </div>
        {icon ? (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              colors.icon
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  )
}
