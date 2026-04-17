import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, type ButtonProps, buttonVariants } from '@/components/ui/button'

/** Label for the previous-page control (Unicode escapes). */
const LABEL_PREV_PAGE = 'Tr\u01B0\u1EDBc'

type PageToken = number | 'ellipsis'

/** Build 1 2 3 ... last page tokens for the numbered bar. */
function getVisiblePageTokens(page: number, totalPages: number, siblingCount: number): PageToken[] {
  const t = Math.max(1, totalPages)
  const p = Math.min(Math.max(1, page), t)

  if (t <= 7) {
    return Array.from({ length: t }, (_, i) => i + 1)
  }

  const left = Math.max(2, p - siblingCount)
  const right = Math.min(t - 1, p + siblingCount)
  const tokens: PageToken[] = [1]

  if (left > 2) {
    tokens.push('ellipsis')
  }

  for (let i = left; i <= right; i++) {
    tokens.push(i)
  }

  if (right < t - 1) {
    tokens.push('ellipsis')
  }

  tokens.push(t)
  return tokens
}

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="Phân trang"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
)
Pagination.displayName = 'Pagination'

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn('flex flex-row flex-wrap items-center gap-1', className)}
      {...props}
    />
  )
)
PaginationContent.displayName = 'PaginationContent'

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('', className)} {...props} />
)
PaginationItem.displayName = 'PaginationItem'

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>

type PaginationLinkProps = {
  isActive?: boolean
} & Omit<ButtonProps, 'variant' | 'size' | 'type'> & {
    size?: ButtonSize
  }

const PaginationLink = ({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) => (
  <Button
    type="button"
    aria-current={isActive ? 'page' : undefined}
    variant={isActive ? 'outline' : 'ghost'}
    size={size}
    className={className}
    {...props}
  />
)
PaginationLink.displayName = 'PaginationLink'

const PaginationPrevious = ({ className, ...props }: ButtonProps) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    className={cn('gap-1', className)}
    aria-label={`Trang ${LABEL_PREV_PAGE}`}
    {...props}
  >
    <ChevronLeft className="h-4 w-4 shrink-0" />
    <span>{LABEL_PREV_PAGE}</span>
  </Button>
)
PaginationPrevious.displayName = 'PaginationPrevious'

const PaginationNext = ({ className, ...props }: ButtonProps) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    className={cn('gap-1', className)}
    aria-label="Trang sau"
    {...props}
  >
    <span>Sau</span>
    <ChevronRight className="h-4 w-4 shrink-0" />
  </Button>
)
PaginationNext.displayName = 'PaginationNext'

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">Thêm trang</span>
  </span>
)
PaginationEllipsis.displayName = 'PaginationEllipsis'

export interface NumberedPaginationBarProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  busy?: boolean
  /** Neighbor pages on each side of the current page (default 1). */
  siblingCount?: number
  className?: string
  contentClassName?: string
}

/** Previous | numbered pages | next; for custom outer layout. */
export function NumberedPaginationBar({
  page,
  totalPages,
  onPageChange,
  busy = false,
  siblingCount = 1,
  className,
  contentClassName,
}: NumberedPaginationBarProps) {
  const tp = Math.max(1, totalPages)
  const p = Math.min(Math.max(1, page), tp)
  const tokens = React.useMemo(
    () => getVisiblePageTokens(p, tp, siblingCount),
    [p, tp, siblingCount]
  )

  return (
    <Pagination className={cn('mx-0 w-auto', className)}>
      <PaginationContent className={contentClassName}>
        <PaginationItem>
          <PaginationPrevious disabled={p <= 1 || busy} onClick={() => onPageChange(p - 1)} />
        </PaginationItem>
        {tokens.map((token, idx) => (
          <PaginationItem key={typeof token === 'number' ? `page-${token}` : `gap-${idx}`}>
            {token === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                size="sm"
                isActive={token === p}
                className={cn('min-w-9', token === p && 'pointer-events-none')}
                disabled={busy}
                onClick={() => {
                  if (token !== p) onPageChange(token)
                }}
              >
                {token}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext disabled={p >= tp || busy} onClick={() => onPageChange(p + 1)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export interface PaginationPrevNextProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  busy?: boolean
  siblingCount?: number
  className?: string
}

/** Table footer control; put row summary outside this component. */
export function PaginationPrevNext({
  page,
  totalPages,
  onPageChange,
  busy = false,
  siblingCount = 1,
  className,
}: PaginationPrevNextProps) {
  return (
    <NumberedPaginationBar
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      busy={busy}
      siblingCount={siblingCount}
      className={className}
    />
  )
}

export interface PaginationCardStepperProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  busy?: boolean
  siblingCount?: number
  className?: string
}

/** Card grids: right-aligned, same numbered logic. */
export function PaginationCardStepper({
  page,
  totalPages,
  onPageChange,
  busy = false,
  siblingCount = 1,
  className,
}: PaginationCardStepperProps) {
  return (
    <NumberedPaginationBar
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      busy={busy}
      siblingCount={siblingCount}
      className={cn('justify-end', className)}
    />
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
