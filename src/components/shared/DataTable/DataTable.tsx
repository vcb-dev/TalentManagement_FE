import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  emptyLabel?: string
  /** Dưới `md`: danh sách thẻ thay cho bảng. */
  renderMobileRow?: (row: T, index: number) => ReactNode
  getRowKey?: (row: T, index: number) => React.Key
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyLabel = 'Không có dữ liệu',
  renderMobileRow,
  getRowKey,
  className,
}: DataTableProps<T>) {
  const tableEl = (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.id}>{c.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={columns.length}>Đang tải…</TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length}>{emptyLabel}</TableCell>
          </TableRow>
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

  if (!renderMobileRow) {
    return tableEl
  }

  const mobileEmptyOrLoading = (
    <div className="p-4 text-sm text-muted-foreground">{isLoading ? 'Đang tải…' : emptyLabel}</div>
  )

  return (
    <>
      <div
        className={cn(
          'divide-y divide-border md:hidden',
          !isLoading && data.length === 0 && 'rounded-lg border border-border/60 bg-card/30'
        )}
      >
        {isLoading || data.length === 0
          ? mobileEmptyOrLoading
          : data.map((row, i) => (
              <div key={getRowKey ? getRowKey(row, i) : i} className="p-4">
                {renderMobileRow(row, i)}
              </div>
            ))}
      </div>
      <div className="hidden overflow-x-auto [scrollbar-width:thin] md:block">{tableEl}</div>
    </>
  )
}
