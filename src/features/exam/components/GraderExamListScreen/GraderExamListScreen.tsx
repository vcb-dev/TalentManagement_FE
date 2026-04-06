import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Filter } from 'lucide-react'
import { toast } from 'sonner'
import { CARD_ENTRANCE_HOVER, SECTION_FADE_UP, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import {
  MOCK_GRADER_EXAM_ROWS,
  countPendingGrader,
  type GraderExamRow,
} from '@/features/exam/mock/mockGraderExamRows'

const FILTERS: { key: GraderExamRow['levelKey'] | 'all'; label: string }[] = [
  { key: 'all', label: 'Tất cả lớp' },
  { key: 'tap_su', label: 'Tập sự' },
  { key: 'biet_viec', label: 'Biết việc' },
  { key: 'duoc_viec', label: 'Được việc' },
  { key: 'dong_gop', label: 'Đóng góp KQ' },
]

function statusBadge(row: GraderExamRow) {
  if (row.status === 'pending') {
    return (
      <span className="inline-flex rounded-full border border-rose-200/80 bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700">
        Chờ chấm
      </span>
    )
  }
  if (row.status === 'grading') {
    return (
      <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-800">
        Đang chấm
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
      Đã chấm
    </span>
  )
}

function levelPillClass(row: GraderExamRow): string {
  if (row.levelBadge.includes('Tập sự'))
    return 'border border-border bg-secondary/80 text-muted-foreground'
  if (row.levelBadge.includes('Biết việc'))
    return 'border border-primary/25 bg-primary/12 text-primary'
  if (row.levelBadge.includes('Được việc'))
    return 'border border-violet-300/50 bg-violet-500/10 text-violet-900 ring-1 ring-violet-500/10'
  return 'border border-border bg-secondary/80 text-muted-foreground'
}

export function GraderExamListScreen() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [onlyPending, setOnlyPending] = useState(false)

  const rows = useMemo(() => {
    let list =
      filter === 'all' ? MOCK_GRADER_EXAM_ROWS : MOCK_GRADER_EXAM_ROWS.filter((r) => r.levelKey === filter)
    if (onlyPending) list = list.filter((r) => r.status === 'pending')
    return list
  }, [filter, onlyPending])

  const pendingTotal = countPendingGrader(MOCK_GRADER_EXAM_ROWS)
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const displayName = user?.name ?? 'Người chấm'

  const goGrade = (row: GraderExamRow) => {
    void navigate({
      to: '/exam/$examId/grade',
      params: { examId: row.examId },
      search: { employeeId: row.employeeId },
    })
  }

  const scrollToFilters = () => {
    document.getElementById('grader-exam-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const rowStaggerBase = FILTERS.length + 2

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3.5rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="page-shell">
          <div className="mb-8 flex flex-col gap-8">
            <div
              className={cn(
                'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
                SECTION_FADE_UP
              )}
            >
              <div>
                <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  <span className="bg-gradient-to-r from-primary via-teal-700 to-violet-700 bg-clip-text text-transparent">
                    Danh sách kỳ thi cần chấm
                  </span>
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{pendingTotal} bài chờ chấm</span>
                  {' · '}
                  {displayName} ({roleLabel}) — được chỉ định chấm. Danh sách bài nộp theo lớp; mở chi tiết để
                  chấm hoặc xem lại (dữ liệu minh họa).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                  onClick={scrollToFilters}
                >
                  <Filter className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  Bộ lọc
                </button>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors',
                    onlyPending
                      ? 'border-button bg-button text-button-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                  onClick={() => setOnlyPending((v) => !v)}
                >
                  {onlyPending ? 'Hiện tất cả' : 'Chỉ chờ chấm'}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
                  onClick={() => toast.info('Xuất danh sách chấm thi sẽ nối API sau.')}
                >
                  Xuất dữ liệu
                </button>
              </div>
            </div>

            <div id="grader-exam-filters" className="flex flex-wrap gap-2">
              {FILTERS.map((f, i) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-xs transition-colors',
                    CARD_ENTRANCE_HOVER,
                    filter === f.key
                      ? 'border-primary/35 bg-card font-bold text-primary shadow-sm'
                      : 'border-border bg-card font-medium text-muted-foreground hover:bg-muted/50'
                  )}
                  style={staggerStyle(i, 45)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div
              className={cn(
                'overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm',
                SECTION_FADE_UP
              )}
              style={staggerStyle(FILTERS.length, 55)}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-primary/[0.06] text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      {[
                        'Thí sinh',
                        'Cấp độ / Sao',
                        'Lớp thi',
                        'Ngày nộp',
                        'Trạng thái',
                        'Thao tác',
                      ].map((h) => (
                        <th
                          key={h}
                          className={cn(
                            'whitespace-nowrap px-6 py-4',
                            h === 'Ngày nộp' || h === 'Trạng thái' || h === 'Thao tác'
                              ? 'text-center'
                              : 'text-left'
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, rowIdx) => (
                  <tr
                    key={row.examId}
                    className={cn(
                      'transition-colors hover:bg-primary/[0.05]',
                      CARD_ENTRANCE_HOVER
                    )}
                    style={staggerStyle(rowStaggerBase + rowIdx, 42)}
                  >
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            row.avatarClass
                          )}
                        >
                          {row.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-foreground">
                            {row.examineeName}
                          </div>
                          <div className="text-xs text-muted-foreground">{row.examineeMeta}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-3 py-1 text-sm font-bold',
                          levelPillClass(row)
                        )}
                      >
                        {row.levelBadge}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle text-foreground">{row.className}</td>
                    <td className="px-6 py-4 align-middle text-center text-muted-foreground">
                      {row.submittedAt}
                    </td>
                    <td className="px-6 py-4 align-middle text-center">{statusBadge(row)}</td>
                    <td className="px-6 py-4 align-middle text-center">
                      {row.status === 'pending' && (
                        <button
                          type="button"
                          className="whitespace-nowrap rounded-lg border border-button bg-button px-4 py-1.5 text-xs font-bold text-button-foreground shadow-sm transition-transform hover:opacity-90 active:scale-95 motion-safe:hover:scale-[1.02]"
                          onClick={() => goGrade(row)}
                        >
                          Chấm thi
                        </button>
                      )}
                      {row.status === 'grading' && (
                        <button
                          type="button"
                          className="whitespace-nowrap rounded-lg border border-border bg-card px-4 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted/60"
                          onClick={() => goGrade(row)}
                        >
                          Tiếp tục
                        </button>
                      )}
                      {row.status === 'done' && (
                        <button
                          type="button"
                          className="whitespace-nowrap rounded-lg border border-border bg-card px-4 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/40"
                          onClick={() => goGrade(row)}
                        >
                          Xem lại
                        </button>
                      )}
                    </td>
                  </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
