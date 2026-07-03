import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from './pageHeaderStyles'
import { ArrowLeft } from 'lucide-react'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  onBack?: () => void
}

export function PageHeader({ title, description, actions, onBack }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6',
        actions ? undefined : 'w-full'
      )}
    >
      <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
        <h1 className={cn(PAGE_HEADER_TITLE, 'flex items-center')}>
          {onBack && (
            <Button
              onClick={onBack}
              type="button"
              variant="ghost"
              size="icon"
              className="mr-3 shrink-0 rounded-full"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-6 w-6 text-foreground" />
            </Button>
          )}
          <span className={PAGE_HEADER_GRADIENT}>{title}</span>
        </h1>
        {description ? <p className={PAGE_HEADER_DESCRIPTION}>{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}
