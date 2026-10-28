import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface FormSectionProps {
  title: string
  description?: string
  /** Nút hành động bên phải tiêu đề (vd. "Thêm câu"). */
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function FormSection({ title, description, action, children, className }: FormSectionProps) {
  return (
    <div className={cn('border-b border-border pb-6 last:border-b-0 last:pb-0', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
