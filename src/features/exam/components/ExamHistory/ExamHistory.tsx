import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { formatViDate } from '@/lib/date'
import type { z } from 'zod'
import { type examResultApiSchema } from '@/features/exam/schemas'

export type ExamResultRow = z.infer<typeof examResultApiSchema>

export interface ExamHistoryProps {
  rows: ExamResultRow[]
  isLoading: boolean
}

export function ExamHistory({ rows, isLoading }: ExamHistoryProps) {
  const columns: DataTableColumn<ExamResultRow>[] = [
    { id: 'employee', header: 'Nhân viên', cell: (r) => r.employeeId },
    { id: 'result', header: 'Kết quả', cell: (r) => r.result },
    { id: 'at', header: 'Thời điểm', cell: (r) => formatViDate(r.classifiedAt) },
  ]
  return <DataTable columns={columns} data={rows} isLoading={isLoading} />
}
