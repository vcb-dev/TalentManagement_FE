import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from './pageHeaderStyles'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6',
        actions ? undefined : 'w-full',
      )}
    >
      <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
        <h1 className={PAGE_HEADER_TITLE}>
          <span className={PAGE_HEADER_GRADIENT}>{title}</span>
        </h1>
        {description ? <p className={PAGE_HEADER_DESCRIPTION}>{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}
