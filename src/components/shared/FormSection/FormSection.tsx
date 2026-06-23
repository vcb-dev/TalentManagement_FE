import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface FormSectionProps {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function FormSection({ title, description, icon, children, className }: FormSectionProps) {
  return (
    <div className={cn('border-b border-border pb-6 last:border-b-0 last:pb-0', className)}>
      <div className="mb-4 flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
