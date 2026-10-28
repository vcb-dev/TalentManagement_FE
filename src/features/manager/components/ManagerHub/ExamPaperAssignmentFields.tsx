import { useMemo, useState } from 'react'
import { Check, Loader2, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useExamPapers } from '@/features/exam-papers/hooks'

const DURATION_PRESETS = [45, 60, 90, 120, 180]

/** Ô "Thời gian làm bài" + các mốc nhanh; `endTimePreview` = giờ kết thúc tính từ giờ bắt đầu. */
export function ExamDurationField({
  durationInput,
  onDurationChange,
  endTimePreview,
}: {
  durationInput: string
  onDurationChange: (value: string) => void
  /** Chuỗi giờ kết thúc dự kiến — bỏ trống nếu chưa có giờ bắt đầu để tính. */
  endTimePreview?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="exam-duration" className="block text-xs font-semibold text-muted-foreground">
        Thời gian làm bài
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Input
            id="exam-duration"
            inputMode="numeric"
            value={durationInput}
            onChange={(e) => onDurationChange(e.target.value.replace(/\D/g, ''))}
            placeholder="120"
            className="h-10 w-28 rounded-xl pr-11 font-semibold tabular-nums"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            phút
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn nhanh">
          {DURATION_PRESETS.map((min) => {
            const selected = durationInput === String(min)
            return (
              <button
                key={min}
                type="button"
                aria-pressed={selected}
                className={cn(
                  'h-8 rounded-lg border px-2.5 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button/35',
                  selected
                    ? 'border-button bg-button text-white'
                    : 'border-border bg-card text-muted-foreground hover:border-button/40 hover:text-foreground'
                )}
                onClick={() => onDurationChange(String(min))}
              >
                {min}′
              </button>
            )
          })}
        </div>
      </div>
      {endTimePreview ? (
        <p className="text-xs text-muted-foreground">
          Kết thúc lúc{' '}
          <span className="font-semibold tabular-nums text-foreground">{endTimePreview}</span>
        </p>
      ) : null}
    </div>
  )
}

/** Checklist chọn đề đang kích hoạt (có tìm kiếm, chọn tất cả) cho lịch thi. */
export function ExamPaperPicker({
  selectedPaperIds,
  onTogglePaper,
}: {
  selectedPaperIds: string[]
  onTogglePaper: (paperId: string) => void
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
    for (const p of filteredPapers) {
      const isSelected = selectedPaperIds.includes(p.id)
      if (allFilteredSelected ? isSelected : !isSelected) onTogglePaper(p.id)
    }
  }

  if (loadingPapers) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-muted/20 py-6">
        <Loader2 className="h-4 w-4 animate-spin text-button" />
      </div>
    )
  }

  if (activePapers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Chưa có đề thi nào đang kích hoạt — tạo đề ở tab Đề thi trước.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã hoặc tên đề..."
            aria-label="Tìm đề thi"
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
        <button
          type="button"
          onClick={toggleSelectAllFiltered}
          disabled={filteredPapers.length === 0}
          className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-semibold text-button hover:bg-button/10 disabled:pointer-events-none disabled:opacity-40"
        >
          {allFilteredSelected ? 'Bỏ chọn hết' : 'Chọn tất cả'}
        </button>
      </div>

      {filteredPapers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Không tìm thấy đề nào khớp với &quot;{search}&quot;.
        </p>
      ) : (
        <ul className="max-h-60 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-muted/20 p-1.5">
          {filteredPapers.map((p) => {
            const checked = selectedPaperIds.includes(p.id)
            return (
              <li key={p.id}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-button/35',
                    checked
                      ? 'border-button/40 bg-card shadow-sm'
                      : 'border-transparent hover:bg-card'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTogglePaper(p.id)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'flex size-[18px] shrink-0 items-center justify-center rounded-md border transition-colors',
                      checked ? 'border-button bg-button text-white' : 'border-border bg-card'
                    )}
                    aria-hidden
                  >
                    {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {p.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      <span className="font-mono">{p.code}</span> · {p.mcqCount} trắc nghiệm ·{' '}
                      {p.essayCount} tự luận
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
