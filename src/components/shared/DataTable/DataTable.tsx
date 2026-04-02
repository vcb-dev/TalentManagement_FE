import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyLabel = 'Không có dữ liệu',
}: DataTableProps<T>) {
  return (
    <Table>
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
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell key={c.id}>{c.cell(row)}</TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
