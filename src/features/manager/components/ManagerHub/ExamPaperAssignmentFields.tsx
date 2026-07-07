import { useMemo, useState } from 'react'
import { Check, FileText, Loader2, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useExamPapers } from '@/features/exam-papers/hooks'

const DURATION_PRESETS = [45, 60, 90, 120, 180]

/**
 * Ô "Thời gian làm bài" + checklist chọn đề từ kho (có tìm kiếm) — dùng chung giữa modal
 * tạo/sửa lịch thi và modal gán đề theo lớp, để 2 nơi luôn cùng một hành vi gán ExamPaper.
 */
export function ExamPaperAssignmentFields({
  durationInput,
  onDurationChange,
  selectedPaperIds,
  onTogglePaper,
  endTimePreview,
}: {
  durationInput: string
  onDurationChange: (value: string) => void
  selectedPaperIds: string[]
  onTogglePaper: (paperId: string) => void
  /** Chuỗi giờ kết thúc dự kiến để hiển thị gợi ý — bỏ trống nếu không có giờ bắt đầu để tính. */
  endTimePreview?: string
}) {
  const { data: examPapers = [], isLoading: loadingPapers } = useExamPapers()
  const activePapers = useMemo(() => examPapers.filter((p) => p.isActive), [examPapers])
  const [search, setSearch] = useState('')

  const filteredPapers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return activePapers
    return activePapers.filter(
      (p) => p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
    )
  }, [activePapers, search])

  const allFilteredSelected =
    filteredPapers.length > 0 && filteredPapers.every((p) => selectedPaperIds.includes(p.id))

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      filteredPapers.forEach((p) => {
        if (selectedPaperIds.includes(p.id)) onTogglePaper(p.id)
      })
    } else {
      filteredPapers.forEach((p) => {
        if (!selectedPaperIds.includes(p.id)) onTogglePaper(p.id)
      })
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground ml-1">
          Thời gian làm bài (phút)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            inputMode="numeric"
            value={durationInput}
            onChange={(e) => onDurationChange(e.target.value.replace(/\D/g, ''))}
            placeholder="120"
            className="h-10 w-28 rounded-xl font-bold"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {DURATION_PRESETS.map((min) => (
              <Button
                key={min}
                type="button"
                size="sm"
                variant={durationInput === String(min) ? 'default' : 'outline'}
                className="h-7 rounded-lg px-2.5 text-xs font-bold"
                onClick={() => onDurationChange(String(min))}
              >
                {min}
              </Button>
            ))}
          </div>
        </div>
        <p className="ml-1 text-xs text-muted-foreground">
          Giờ kết thúc = giờ thi + thời gian làm bài
          {endTimePreview ? ` (kết thúc ${endTimePreview})` : ''}.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-muted-foreground ml-1 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Đề thi ({selectedPaperIds.length} đã chọn)
          </label>
          {activePapers.length > 0 ? (
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              disabled={filteredPapers.length === 0}
              className="text-xs font-bold text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
            >
              {allFilteredSelected ? 'Bỏ chọn hết' : 'Chọn tất cả'}
            </button>
          ) : null}
        </div>

        {activePapers.length > 0 ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã đề hoặc tên đề..."
              className="h-9 w-full rounded-xl pl-9 pr-8 text-sm"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}

        {loadingPapers ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-muted/20 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : activePapers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            Chưa có đề thi nào đang kích hoạt — tạo đề ở màn Đề thi.
          </p>
        ) : filteredPapers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            Không tìm thấy đề nào khớp với &quot;{search}&quot;.
          </p>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border bg-muted/10 p-1.5">
            {filteredPapers.map((p) => {
              const checked = selectedPaperIds.includes(p.id)
              return (
                <label
                  key={p.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors',
                    checked
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-transparent hover:bg-muted/40'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border',
                      checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card'
                    )}
                  >
                    {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTogglePaper(p.id)}
                    className="sr-only"
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
              )
            })}
          </div>
        )}
        <p className="ml-1 text-xs text-muted-foreground">
          Chọn nhiều đề — mỗi học viên sẽ được gán ngẫu nhiên 1 đề khi vào thi.
        </p>
      </div>
    </>
  )
}
