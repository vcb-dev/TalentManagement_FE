import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { formatViDate } from '@/lib/date'
import type { z } from 'zod'
import { type examSummaryApiSchema } from '@/features/exam/schemas'

export type ExamRow = z.infer<typeof examSummaryApiSchema>

export interface ExamListProps {
  exams: ExamRow[]
  isLoading: boolean
  onOpen?: (id: string) => void
}

export function ExamList({ exams, isLoading, onOpen }: ExamListProps) {
  const columns: DataTableColumn<ExamRow>[] = [
    { id: 'title', header: 'Kỳ thi', cell: (e) => e.title },
    {
      id: 'scheduled',
      header: 'Lịch',
      cell: (e) => formatViDate(e.scheduledAt),
    },
    { id: 'status', header: 'Trạng thái', cell: (e) => e.status },
    {
      id: 'open',
      header: '',
      cell: (e) =>
        onOpen ? (
          <button type="button" className="text-primary underline" onClick={() => onOpen(e.id)}>
            Mở
          </button>
        ) : null,
    },
  ]

  return <DataTable columns={columns} data={exams} isLoading={isLoading} />
}
