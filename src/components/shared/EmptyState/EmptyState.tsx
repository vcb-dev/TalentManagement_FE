import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: ReactNode

  title: string

  description?: string

  action?: ReactNode

  className?: string

  compact?: boolean

  /** `subtle` — tông empty inline cũ (slate-400, không khung icon). */

  tone?: 'default' | 'subtle'
}

export function EmptyState({
  icon,

  title,

  description,

  action,

  className,

  compact = false,

  tone = 'default',
}: EmptyStateProps) {
  if (tone === 'subtle') {
    return (
      <div
        className={cn(
          'text-center',

          compact ? 'py-4' : 'py-6',

          className
        )}
      >
        {icon ? <div className="mb-2 flex justify-center text-slate-400">{icon}</div> : null}

        <p className="text-xs text-slate-400 dark:text-slate-500">{title}</p>

        {description ? (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{description}</p>
        ) : null}

        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-center',
        compact ? 'py-8' : 'py-12',
        className
      )}
    >
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}

      <div className="max-w-md space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>

        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
