import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface DashboardSectionProps {
  title: ReactNode

  description?: ReactNode

  icon?: ReactNode

  /** Phần tử hiển thị bên phải tiêu đề, ví dụ bộ lọc kỳ báo cáo. */
  action?: ReactNode

  /** Icon/badge giải thích cách tính, hiển thị cạnh tiêu đề. */
  hint?: ReactNode

  className?: string

  contentClassName?: string

  children: ReactNode
}

export function DashboardSection({
  title,
  description,
  icon,
  action,
  hint,
  className,
  contentClassName,
  children,
}: DashboardSectionProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {hint}
            </div>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={cn('p-5', contentClassName)}>{children}</div>
    </section>
  )
}
