import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Filter, Search } from 'lucide-react'
import { toast } from 'sonner'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { Button } from '@/components/ui/button'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { TeacherClassMemberCard } from './TeacherClassMemberCard'
import type { ClassMemberRow } from './teacherClassMemberTypes'

const MOCK_MEMBERS: ClassMemberRow[] = [
  { id: '1', name: 'Nguyễn Văn A', email: 'a@vcb.com', examResult: 'Đạt' },
  { id: '2', name: 'Trần Thị B', email: 'b@vcb.com', examResult: null },
  { id: '3', name: 'Lê Văn C', email: 'c@vcb.com', examResult: 'Bảo lưu' },
  { id: '4', name: 'Phạm Thị D', email: 'd@vcb.com', examResult: null },
  { id: '5', name: 'Hoàng Văn E', email: 'e@vcb.com', examResult: 'Đạt' },
]

const FILTERS: { key: 'all' | 'has' | 'none'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'has', label: 'Đã có KQ thi' },
  { key: 'none', label: 'Chưa có KQ' },
]

function membersForClass(classId: string): ClassMemberRow[] {
  if (classId === 'c1' || classId === 'c2') return MOCK_MEMBERS
  return MOCK_MEMBERS.slice(0, 2)
}

function classTitle(classId: string): string {
  if (classId === 'c1') return 'Lớp Tập sự — Kỳ Q1/2026'
  if (classId === 'c2') return 'Lớp Biết việc — Nhóm A'
  return `Lớp ${classId}`
}

export function TeacherClassDetailScreen({ classId }: { classId: string }) {
  const title = classTitle(classId)
  const members = membersForClass(classId)

  const [filterKey, setFilterKey] = useState<(typeof FILTERS)[number]['key']>('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = searchDraft.trim().toLowerCase()
    return members.filter((m) => {
      const hasResult = m.examResult != null && m.examResult.length > 0
      if (filterKey === 'has' && !hasResult) return false
      if (filterKey === 'none' && hasResult) return false
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.examResult?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [members, filterKey, searchDraft])

  const total = members.length
  const withResult = members.filter((m) => m.examResult != null && m.examResult.length > 0).length
  const withoutResult = total - withResult
  const page = 1
  const totalPages = 1

  const scrollToFilters = () => {
    document.getElementById('teacher-class-detail-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3.5rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="page-shell">
          <div className="mb-8 flex flex-col gap-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <Link
                  to="/teacher/classes"
                  className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  Danh sách lớp
                </Link>
                <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  <span className="bg-gradient-to-r from-primary via-teal-700 to-violet-700 bg-clip-text text-transparent">
                    {title}
                  </span>
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground">
                  Thông tin đầy đủ thành viên trong lớp — lịch sử thi từng người sẽ mở từ đây (nối API).
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
                  onClick={() => toast.info('Xuất danh sách thành viên lớp sẽ nối API sau.')}
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
                          Tổng thành viên
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-2xl font-bold leading-none text-transparent">
                            {total}
                          </span>
                          <span className="text-[10px] font-bold text-primary">trong lớp</span>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'done',
                    className:
                      'rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 via-card to-teal-50/80 p-5 shadow-[var(--shadow-card)] ring-1 ring-emerald-500/15',
                    body: (
                      <>
                        <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          Đã có KQ thi (lớp)
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-2xl font-bold leading-none text-emerald-700">{withResult}</span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                            đã cập nhật
                          </span>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'pending',
                    className:
                      'rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-card to-violet-50/50 p-5 shadow-[var(--shadow-card)] ring-1 ring-amber-400/20',
                    body: (
                      <>
                        <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          Chưa có KQ
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-2xl font-bold leading-none text-amber-800">{withoutResult}</span>
                          <span className="text-[10px] font-medium text-muted-foreground">chờ nối API</span>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'page',
                    className:
                      'rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-card to-fuchsia-50/40 p-5 shadow-[var(--shadow-card)] ring-1 ring-violet-400/15',
                    body: (
                      <>
                        <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          Trang
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-2xl font-bold leading-none text-violet-800">{page}</span>
                          <span className="text-[10px] font-medium text-muted-foreground">trên {totalPages} trang</span>
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
            id="teacher-class-detail-filters"
            className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-4"
          >
            <div className="scrollbar-hide flex min-w-0 w-full overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm">
              <div role="tablist" aria-label="Lọc kết quả thi" className="flex min-w-min gap-0.5">
                {FILTERS.map(({ key, label }) => {
                  const selected = filterKey === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
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
                placeholder="Tìm theo tên, email, kết quả…"
                className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                aria-label="Tìm thành viên"
              />
            </label>
          </div>

          {viewMode === 'table' ? (
            <div className="overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-primary/12 via-teal-500/8 to-violet-500/8">
                      <th className="px-4 py-3 font-semibold">Nhân viên</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Kết quả thi (lớp)</th>
                      <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr
                        key={m.id}
                        className="border-t border-border/80 bg-card transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <EmployeeAvatar name={m.name} className="h-8 w-8 text-xs" />
                            <span className="font-semibold text-foreground">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                        <td className="px-4 py-3">
                          {m.examResult ? (
                            <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                              {m.examResult}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="font-semibold"
                            onClick={() => toast.info('Lịch sử thi chi tiết — nối API')}
                          >
                            Lịch sử
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <span>
                  Trang {page} — {filtered.length} thành viên hiển thị
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
                {filtered.map((m, idx) => (
                  <TeacherClassMemberCard
                    key={m.id}
                    member={m}
                    cardIndex={idx}
                    selected={selectedId === m.id}
                    onSelect={() => setSelectedId((id) => (id === m.id ? null : m.id))}
                    onViewDetail={() => toast.info('Lịch sử thi chi tiết — nối API')}
                  />
                ))}
              </div>
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Không có thành viên phù hợp.</p>
              ) : null}
            </>
          )}

          {viewMode === 'cards' && filtered.length > 0 ? (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Hiển thị {filtered.length} / {total} thành viên
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
