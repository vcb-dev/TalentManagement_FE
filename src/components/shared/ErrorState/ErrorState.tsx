import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  title: string

  description?: string

  onRetry?: () => void

  retrying?: boolean

  className?: string

  compact?: boolean

  /** `inline` — gọn hơn, dùng khi nhúng trong card/list nhỏ thay vì chiếm cả khối trang. */
  variant?: 'default' | 'inline'
}

export function ErrorState({
  title,
  description,
  onRetry,
  retrying = false,
  className,
  compact = false,
  variant = 'default',
}: ErrorStateProps) {
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 text-center',
          compact ? 'p-3' : 'p-4',
          className
        )}
      >
        <p className="text-sm font-medium text-destructive">{title}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry} disabled={retrying}>
            {retrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Thử lại
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 text-center',
        compact ? 'py-8' : 'py-12',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>

      <div className="max-w-md space-y-1 px-4">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry} disabled={retrying}>
          {retrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Thử lại
        </Button>
      ) : null}
    </div>
  )
}
