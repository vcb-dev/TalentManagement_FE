import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CARD_HOVER } from '@/lib/cardMotion'
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
      <span className="rounded-full border border-rose-200/70 bg-gradient-to-r from-rose-500/12 to-primary/8 px-3 py-1 text-sm font-bold text-rose-900 shadow-sm ring-1 ring-rose-500/10">
        Chờ chấm
      </span>
    )
  }
  if (row.status === 'grading') {
    return (
      <span className="rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-3 py-1 text-sm font-bold text-amber-950 shadow-sm ring-1 ring-amber-400/20">
        Đang chấm
      </span>
    )
  }
  return (
    <span className="rounded-full border border-emerald-200/70 bg-gradient-to-r from-emerald-500/12 to-teal-500/10 px-3 py-1 text-sm font-bold text-emerald-900 shadow-sm ring-1 ring-emerald-500/15">
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

  const rows = useMemo(() => {
    if (filter === 'all') return MOCK_GRADER_EXAM_ROWS
    return MOCK_GRADER_EXAM_ROWS.filter((r) => r.levelKey === filter)
  }, [filter])

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

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="page-toolbar-gradient">
        <div
          className="pointer-events-none absolute inset-0 opacity-25 motion-safe:animate-[dash-shimmer_10s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            background:
              'linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 90%)',
            backgroundSize: '200% 100%',
          }}
        />
        <div className="relative text-base font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-primary via-teal-700 to-violet-700 bg-clip-text text-transparent">
            Danh sách kỳ thi cần chấm
          </span>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-rose-200/70 bg-card/95 px-3 py-1.5 text-sm font-bold text-rose-800 shadow-sm backdrop-blur-sm ring-1 ring-rose-500/15 motion-safe:transition-transform motion-safe:hover:scale-[1.02]">
            {pendingTotal} bài chờ chấm
          </span>
          <span className="rounded-full border border-emerald-200/70 bg-gradient-to-r from-emerald-500/12 to-teal-500/10 px-3 py-1.5 text-sm font-semibold leading-snug text-emerald-950 shadow-sm ring-1 ring-emerald-500/12">
            {displayName} ({roleLabel}) · Được chỉ định
          </span>
        </div>
      </div>

      <div className="page-shell">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full border px-3.5 py-1 text-xs font-medium transition-colors',
                filter === f.key
                  ? 'border-primary/35 bg-gradient-to-r from-primary/12 to-teal-500/10 font-semibold text-primary shadow-sm ring-1 ring-primary/15'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:bg-primary/[0.06]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div
          className={cn(
            'overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10',
            CARD_HOVER
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-primary/12 via-teal-500/8 to-violet-500/8">
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
                      className="whitespace-nowrap border-b border-border px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.examId}
                    className={cn(
                      'border-b border-border transition-[background-color,box-shadow] duration-200 motion-safe:hover:bg-primary/[0.07]',
                      row.status === 'done' && 'opacity-45'
                    )}
                  >
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
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
                    <td className="px-3 py-3 align-middle">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-3 py-1 text-sm font-bold',
                          levelPillClass(row)
                        )}
                      >
                        {row.levelBadge}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-foreground">{row.className}</td>
                    <td className="px-3 py-3 align-middle text-muted-foreground">
                      {row.submittedAt}
                    </td>
                    <td className="px-3 py-3 align-middle">{statusBadge(row)}</td>
                    <td className="px-3 py-3 align-middle">
                      {row.status === 'pending' && (
                        <button
                          type="button"
                          className="whitespace-nowrap rounded-lg border border-button bg-button px-2.5 py-1 text-xs font-medium text-button-foreground hover:opacity-90"
                          onClick={() => goGrade(row)}
                        >
                          Chấm thi
                        </button>
                      )}
                      {row.status === 'grading' && (
                        <button
                          type="button"
                          className="whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/10"
                          onClick={() => goGrade(row)}
                        >
                          Tiếp tục
                        </button>
                      )}
                      {row.status === 'done' && (
                        <button
                          type="button"
                          className="whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/10"
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
  )
}
