import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useBulkCreateExamSchedules } from '@/features/editor-classes/hooks'
import type { bulkExamScheduleResultApiSchema } from '@/features/editor-classes/schemas'
import { useExamPapers } from '@/features/exam-papers/hooks'
import { addMinutesToHm } from '@/lib/examScheduleTime'

type BulkResult = z.infer<typeof bulkExamScheduleResultApiSchema>

const FIELD_LABEL = 'mb-1 block text-xs font-semibold text-muted-foreground'

function BulkScheduleForm({ onResult }: { onResult: (r: BulkResult) => void }) {
  const { data: papers = [], isLoading: loadingPapers } = useExamPapers()
  const bulkCreate = useBulkCreateExamSchedules()
  const [dateIso, setDateIso] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [durationInput, setDurationInput] = useState('90')
  const [topic, setTopic] = useState('Thi định kỳ lớp Editor')
  const activePapers = papers.filter((p) => p.isActive)

  // Mặc định chọn tất cả đề đang kích hoạt (hành vi cũ) — chỉ dùng danh sách tự chọn khi người dùng đã chỉnh
  const [touchedPapers, setTouchedPapers] = useState(false)
  const [pickedPaperIds, setPickedPaperIds] = useState<string[]>([])
  const selectedPaperIds = touchedPapers ? pickedPaperIds : activePapers.map((p) => p.id)

  const togglePaper = (paperId: string) => {
    setTouchedPapers(true)
    setPickedPaperIds(
      selectedPaperIds.includes(paperId)
        ? selectedPaperIds.filter((id) => id !== paperId)
        : [...selectedPaperIds, paperId]
    )
  }

  const submit = (dryRun: boolean) => {
    if (!dateIso) return
    const durationMin = Number.parseInt(durationInput.trim(), 10)
    if (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > 1440) {
      toast.error('Thời gian làm bài phải từ 1 đến 1440 phút')
      return
    }
    if (selectedPaperIds.length === 0) {
      toast.error('Chọn ít nhất 1 đề thi')
      return
    }
    bulkCreate.mutate(
      {
        dateIso,
        startTime,
        endTime: addMinutesToHm(startTime, durationMin),
        topic,
        paperIds: selectedPaperIds,
        durationMinutes: durationMin,
        dryRun,
      },
      { onSuccess: onResult }
    )
  }

  const disabled = !dateIso || bulkCreate.isPending || selectedPaperIds.length === 0

  return (
    <div className="min-w-0">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <label htmlFor="editor-bulk-date" className={FIELD_LABEL}>
            Ngày thi
          </label>
          <Input
            id="editor-bulk-date"
            type="date"
            value={dateIso}
            onChange={(e) => setDateIso(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="editor-bulk-start" className={FIELD_LABEL}>
            Giờ bắt đầu
          </label>
          <Input
            id="editor-bulk-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="editor-bulk-duration" className={FIELD_LABEL}>
            Thời gian làm bài (phút)
          </label>
          <Input
            id="editor-bulk-duration"
            inputMode="numeric"
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value.replace(/\D/g, ''))}
            placeholder="90"
          />
        </div>
        <div>
          <label htmlFor="editor-bulk-topic" className={FIELD_LABEL}>
            Chủ đề
          </label>
          <Input id="editor-bulk-topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
      </div>

      <div className="mt-3">
        <p className={FIELD_LABEL}>Đề thi ({selectedPaperIds.length} đã chọn)</p>
        {loadingPapers ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-muted/20 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : activePapers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            Chưa có đề thi nào đang kích hoạt — tạo đề ở tab Đề thi trước.
          </p>
        ) : (
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/10 p-1.5">
            {activePapers.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-primary/5"
              >
                <input
                  type="checkbox"
                  checked={selectedPaperIds.includes(p.id)}
                  onChange={() => togglePaper(p.id)}
                  className="h-4 w-4 shrink-0 rounded border-border"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-foreground">
                    <span className="font-mono text-primary">{p.code}</span> · {p.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {p.mcqCount} trắc nghiệm · {p.essayCount} tự luận
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Giờ kết thúc = giờ bắt đầu + thời gian làm bài
        {durationInput
          ? ` (kết thúc ${addMinutesToHm(startTime, Number.parseInt(durationInput, 10) || 0)})`
          : ''}
        . Mỗi thành viên sẽ được gán ngẫu nhiên 1 trong các đề đã chọn khi vào thi. Giáo viên chấm
        được phân công chấm chéo (không chấm lớp mình dạy).
      </p>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={disabled} onClick={() => submit(true)}>
          Xem trước
        </Button>
        <Button type="button" disabled={disabled} onClick={() => submit(false)}>
          {bulkCreate.isPending ? 'Đang tạo...' : 'Tạo lịch thi'}
        </Button>
      </div>
    </div>
  )
}

function BulkResultList({ result }: { result: BulkResult }) {
  return (
    <section className="min-w-0 border-t border-border pt-4" aria-live="polite">
      <h3 className="text-sm font-bold text-foreground">
        {result.dryRun ? 'Xem trước lịch thi' : 'Đã tạo lịch thi'} ngày {result.dateIso}
      </h3>
      <div className="mt-2 space-y-2">
        {result.classes.map((c) => (
          <div
            key={c.classId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs"
          >
            <span className="font-semibold text-foreground">{c.className}</span>
            {c.skipped ? (
              <Badge variant="muted">{c.skipReason ?? 'Bỏ qua'}</Badge>
            ) : (
              <span className="text-muted-foreground">
                Chấm chéo bởi: {c.graderName ?? '—'} · {c.paperCount} đề
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Tạo lịch thi hàng loạt cho mọi lớp Editor đang mở (chấm chéo giữa các leader) — đặt ở trang Lịch thi
 * & Đề thi (chuyển từ trang Quản lý lớp học 2026-11-19). BE yêu cầu `manager.classes`.
 */
export function EditorBulkExamDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [result, setResult] = useState<BulkResult | null>(null)
  const handleOpenChange = (next: boolean) => {
    if (!next) setResult(null)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tạo lịch thi cho tất cả lớp Editor</DialogTitle>
          <DialogDescription>
            Các lớp Editor được tạo lịch thi cùng ngày giờ (lớp bị bỏ qua sẽ ghi lý do). Bấm "Xem
            trước" để kiểm tra lớp nào được tạo và ai chấm chéo trước khi tạo thật.
          </DialogDescription>
        </DialogHeader>
        <BulkScheduleForm onResult={setResult} />
        {result ? <BulkResultList result={result} /> : null}
      </DialogContent>
    </Dialog>
  )
}
