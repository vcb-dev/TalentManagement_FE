import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
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
          <Button
            type="button"
            variant="ghost"
            className="h-auto p-0 font-normal normal-case tracking-normal text-primary underline hover:bg-transparent"
            onClick={() => onOpen(e.id)}
          >
            Mở
          </Button>
        ) : null,
    },
  ]

  return <DataTable columns={columns} data={exams} isLoading={isLoading} />
}
