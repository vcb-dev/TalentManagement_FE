import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Filter, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { TeacherClassCard } from './TeacherClassCard'
import type { TeacherClassRow, TeacherClassTrack } from './teacherClassTypes'

const FILTERS: { key: 'all' | TeacherClassTrack; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'tap_su', label: 'Tập sự' },
  { key: 'biet_viec', label: 'Biết việc' },
]

/** Lớp do Manager/HR xếp — giảng viên xem & hỗ trợ; dữ liệu sẽ nối API. */
const MOCK_CLASSES: TeacherClassRow[] = [
  {
    id: 'c1',
    title: 'Lớp Tập sự',
    periodBadge: 'Kỳ Q1/2026',
    examLine: 'Kỳ thi Tập sự → Biết việc',
    memberCount: 12,
    metaIcon: 'trending',
    accent: 'primary',
    track: 'tap_su',
  },
  {
    id: 'c2',
    title: 'Lớp Biết việc – Nhóm A',
    periodBadge: 'Kỳ thi Biết việc',
    examLine: 'Đào tạo kỹ năng chuyên sâu',
    memberCount: 8,
    metaIcon: 'school',
    accent: 'amber',
    track: 'biet_viec',
  },
]

const REPUTATION_SCORE = '4.8/5'

export function TeacherClassesScreen() {
  const [filterKey, setFilterKey] = useState<(typeof FILTERS)[number]['key']>('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = searchDraft.trim().toLowerCase()
    return MOCK_CLASSES.filter((c) => {
      if (filterKey !== 'all' && c.track !== filterKey) return false
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) ||
        c.examLine.toLowerCase().includes(q) ||
        c.periodBadge.toLowerCase().includes(q)
      )
    })
  }, [filterKey, searchDraft])

  const totalMembers = MOCK_CLASSES.reduce((a, c) => a + c.memberCount, 0)
  const classCount = MOCK_CLASSES.length
  const avgPerClass =
    classCount > 0 ? Math.round((totalMembers / classCount) * 10) / 10 : 0
  const totalPages = 1
  const page = 1

  const scrollToFilters = () => {
    document.getElementById('teacher-class-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeFilter = filterKey

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3.5rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="page-shell">
          <div className="mb-8 flex flex-col gap-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  <span className="bg-gradient-to-r from-primary via-teal-700 to-violet-700 bg-clip-text text-transparent">
                    Lớp được phân công
                  </span>
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground">
                  Danh sách lớp do quản lý đào tạo xếp — cùng giao diện danh mục như HR, tối ưu cho giảng
                  viên theo dõi và mở chi tiết (dữ liệu minh họa).
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
                    viewMode === 'table'
                      ? 'border-button bg-button text-button-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                  onClick={() => setViewMode((v) => (v === 'cards' ? 'table' : 'cards'))}
                >
                  {viewMode === 'cards' ? 'Dạng bảng' : 'Dạng thẻ'}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
                  onClick={() => toast.info('Xuất danh sách lớp sẽ nối API sau.')}
                >
                  Xuất dữ liệu
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  {
                    key: 'total',
                    className:
                      'rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.09] via-card to-teal-500/[0.06] p-5 shadow-[var(--shadow-card)] ring-1 ring-primary/10',
                    body: (
                      <>
                        <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          Tổng học viên
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-2xl font-bold leading-none text-transparent">
                            {totalMembers}
                          </span>
                          <span className="text-[10px] font-bold text-primary">toàn bộ lớp</span>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'classes',
                    className:
                      'rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 via-card to-teal-50/80 p-5 shadow-[var(--shadow-card)] ring-1 ring-emerald-500/15',
                    body: (
                      <>
                        <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          Lớp phụ trách
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-2xl font-bold leading-none text-emerald-700">{classCount}</span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                            đang mở
                          </span>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'avg',
                    className:
                      'rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-card to-violet-50/50 p-5 shadow-[var(--shadow-card)] ring-1 ring-amber-400/20',
                    body: (
                      <>
                        <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          TB học viên / lớp
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-2xl font-bold leading-none text-amber-800">{avgPerClass}</span>
                          <span className="text-[10px] font-medium text-muted-foreground">ước lượng</span>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'feedback',
                    className:
                      'rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-card to-fuchsia-50/40 p-5 shadow-[var(--shadow-card)] ring-1 ring-violet-400/15',
                    body: (
                      <>
                        <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          Phản hồi (minh họa)
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-2xl font-bold leading-none text-violet-800">{REPUTATION_SCORE}</span>
                          <span className="text-[10px] font-medium text-muted-foreground">điểm uy tín</span>
                        </div>
                      </>
                    ),
                  },
                ] as const
              ).map((s, i) => (
                <div key={s.key} className={cn(s.className, CARD_ENTRANCE_HOVER)} style={staggerStyle(i)}>
                  {s.body}
                </div>
              ))}
            </div>
          </div>

          <div
            id="teacher-class-filters"
            className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-4"
          >
            <div className="scrollbar-hide flex min-w-0 w-full overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm">
              <div role="tablist" aria-label="Lọc theo lộ trình" className="flex min-w-min gap-0.5">
                {FILTERS.map(({ key, label }) => {
                  const selected = activeFilter === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      id={`teacher-class-filter-${key}`}
                      className={cn(
                        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-colors md:text-[13px]',
                        selected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-primary'
                      )}
                      onClick={() => setFilterKey(key)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <label className="relative flex min-h-[42px] w-full min-w-0 items-center rounded-xl border border-border bg-card px-3 shadow-sm ring-1 ring-border/60">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                placeholder="Tìm theo tên lớp, kỳ thi, lộ trình…"
                className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                aria-label="Tìm lớp"
              />
            </label>
          </div>

          {viewMode === 'table' ? (
            <div className="overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-primary/12 via-teal-500/8 to-violet-500/8">
                      <th className="px-4 py-3 font-semibold">Tên lớp</th>
                      <th className="px-4 py-3 font-semibold">Kỳ / nhãn</th>
                      <th className="px-4 py-3 font-semibold">Lộ trình và nội dung</th>
                      <th className="px-4 py-3 font-semibold text-right">Học viên</th>
                      <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-t border-border/80 bg-card transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold text-foreground">{c.title}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                              c.accent === 'primary'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-amber-100 text-amber-900'
                            )}
                          >
                            {c.periodBadge}
                          </span>
                        </td>
                        <td className="max-w-[280px] px-4 py-3 text-muted-foreground">{c.examLine}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                          {c.memberCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm" className="font-semibold" asChild>
                            <Link to="/teacher/classes/$classId" params={{ classId: c.id }}>
                              Chi tiết
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <span>
                  Trang {page} — {filtered.length} lớp hiển thị
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled>
                    Trước
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled>
                    Tiếp
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'grid gap-8 gap-y-4',
                  selectedId
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                )}
              >
                {filtered.map((c, idx) => (
                  <TeacherClassCard
                    key={c.id}
                    classRow={c}
                    cardIndex={idx}
                    selected={selectedId === c.id}
                    onSelect={() => setSelectedId((id) => (id === c.id ? null : c.id))}
                  />
                ))}
              </div>
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Không có lớp phù hợp.</p>
              ) : null}
            </>
          )}

          {viewMode === 'cards' && filtered.length > 0 ? (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Hiển thị {filtered.length} / {MOCK_CLASSES.length} lớp
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
                  disabled={page <= 1}
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-button bg-button px-3 py-1.5 text-xs font-medium text-button-foreground"
                >
                  {page}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
                  disabled={page >= totalPages}
                >
                  Tiếp →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
