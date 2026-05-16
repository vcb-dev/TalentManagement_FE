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
  default: { icon: 'text-primary bg-primary/10', trend: 'text-muted-foreground' },
  success: { icon: 'text-green-600 bg-green-50', trend: 'text-green-600' },
  warning: { icon: 'text-amber-600 bg-amber-50', trend: 'text-amber-600' },
  danger: { icon: 'text-red-600 bg-red-50', trend: 'text-red-600' },
  info: { icon: 'text-cyan-600 bg-cyan-50', trend: 'text-cyan-600' },
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
    <div className={cn('rounded-xl border border-border/80 bg-card p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          {trend !== undefined && (
            <p className={cn('mt-1 text-xs font-medium', colors.trend)}>
              {trend.value >= 0 ? '+' : ''}
              {trend.value}
              {trend.label ? ` ${trend.label}` : ''}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              colors.icon
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
