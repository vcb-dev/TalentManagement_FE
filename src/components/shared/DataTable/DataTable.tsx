import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface DataTableColumn<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  isLoading?: boolean
  isError?: boolean
  errorTitle?: string
  errorDescription?: string
  onRetry?: () => void
  retrying?: boolean
  emptyLabel?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  emptyIcon?: ReactNode
  renderMobileRow?: (row: T, index: number) => ReactNode
  getRowKey?: (row: T, index: number) => React.Key
  className?: string
  skeletonRows?: number
}

function TableOverlayRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-0">
        {children}
      </TableCell>
    </TableRow>
  )
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  isError = false,
  errorTitle,
  errorDescription,
  onRetry,
  retrying = false,
  emptyLabel = 'Không có dữ liệu',
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyIcon,
  renderMobileRow,
  getRowKey,
  className,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const emptyContent = (
    <EmptyState
      icon={emptyIcon}
      title={emptyTitle ?? emptyLabel}
      description={emptyDescription}
      action={emptyAction}
      compact
      className="py-8"
    />
  )

  const errorContent = (
    <ErrorState
      title={errorTitle}
      description={errorDescription}
      onRetry={onRetry}
      retrying={retrying}
      compact
      className="border-0 bg-transparent"
    />
  )

  const tableEl = (
    <Table className={cn('text-sm', className)}>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.id}>{c.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isError ? (
          <TableOverlayRow colSpan={columns.length}>{errorContent}</TableOverlayRow>
        ) : isLoading ? (
          Array.from({ length: skeletonRows }, (_, rowIdx) => (
            <TableRow key={rowIdx}>
              {columns.map((c) => (
                <TableCell key={c.id}>
                  <Skeleton
                    className={cn('h-4 rounded', c.id === columns[0]?.id ? 'w-3/4' : 'w-full')}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : data.length === 0 ? (
          <TableOverlayRow colSpan={columns.length}>{emptyContent}</TableOverlayRow>
        ) : (
          data.map((row, i) => (
            <TableRow key={getRowKey ? getRowKey(row, i) : i}>
              {columns.map((c) => (
                <TableCell key={c.id}>{c.cell(row)}</TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )

  if (!renderMobileRow) return tableEl

  const mobileState = isError ? (
    errorContent
  ) : isLoading ? (
    <div className="space-y-3 p-4" role="status" aria-busy aria-label="Đang tải bảng">
      {Array.from({ length: skeletonRows }, (_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  ) : data.length === 0 ? (
    emptyContent
  ) : null

  return (
    <>
      <div className={cn('md:hidden', !isLoading && !isError && data.length === 0 && 'rounded-lg')}>
        {mobileState ??
          data.map((row, i) => (
            <div
              key={getRowKey ? getRowKey(row, i) : i}
              className="rounded-lg border border-border bg-card p-4"
            >
              {renderMobileRow(row, i)}
            </div>
          ))}
      </div>
      <div className="hidden overflow-x-auto [scrollbar-width:thin] md:block">{tableEl}</div>
    </>
  )
}
