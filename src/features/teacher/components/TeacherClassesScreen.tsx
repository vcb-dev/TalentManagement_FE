import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Filter, Search } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { PaginationCardStepper, PaginationPrevNext } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import { useTeacherClasses } from '@/features/teacher/hooks'
import { TeacherClassCard } from './TeacherClassCard'
import type { TeacherClassRow, TeacherClassTrack } from './teacherClassTypes'

const FILTERS: { key: 'all' | TeacherClassTrack; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'tap_su', label: 'Tập sự' },
  { key: 'biet_viec', label: 'Biết việc' },
]

export function TeacherClassesScreen() {
  const filtersForm = useForm<{ filterKey: (typeof FILTERS)[number]['key']; searchDraft: string }>({
    defaultValues: { filterKey: 'all', searchDraft: '' },
  })
  const filterKey = useWatch({ control: filtersForm.control, name: 'filterKey' }) ?? 'all'
  const searchDraft = useWatch({ control: filtersForm.control, name: 'searchDraft' }) ?? ''
  const deferredSearchDraft = useDeferredValue(searchDraft)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: teacherClassesRaw = [] } = useTeacherClasses()
  const rows: TeacherClassRow[] = useMemo(
    () =>
      teacherClassesRaw
        .filter((r) => r.levelFrom === 'tap_su' || r.levelFrom === 'biet_viec')
        .map((r) => ({
          id: r.id,
          title: r.name,
          periodBadge: r.examDate
            ? `Thi: ${new Date(r.examDate).toLocaleDateString('vi-VN')}`
            : 'Chưa có lịch thi',
          examLine: `${r.levelFrom === 'tap_su' ? 'Tập sự' : 'Biết việc'} -> ${r.levelTo}`,
          memberCount: r.memberCount,
          metaIcon: r.levelFrom === 'tap_su' ? 'trending' : 'school',
          accent: r.levelFrom === 'tap_su' ? 'primary' : 'amber',
          track: r.levelFrom as TeacherClassTrack,
        })),
    [teacherClassesRaw]
  )

  const filtered = useMemo(() => {
    const q = deferredSearchDraft.trim().toLowerCase()
    return rows.filter((c) => {
      if (filterKey !== 'all' && c.track !== filterKey) return false
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) ||
        c.examLine.toLowerCase().includes(q) ||
        c.periodBadge.toLowerCase().includes(q)
      )
    })
  }, [rows, filterKey, deferredSearchDraft])

  const totalPages = 1
  const page = 1

  const scrollToFilters = () => {
    document
      .getElementById('teacher-class-filters')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeFilter = filterKey

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3.5rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="page-shell">
          <div className="mb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
                <h1 className={PAGE_HEADER_TITLE}>
                  <span className={PAGE_HEADER_GRADIENT}>Lớp được phân công</span>
                </h1>
                <p className={PAGE_HEADER_DESCRIPTION}>
                  Lớp do quản lý gán cho bạn. Vào chi tiết để xem thành viên, chấm điểm và{' '}
                  <strong className="font-semibold text-foreground">xếp lịch học buổi</strong> (API{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                    /teacher/classes/:id/schedules
                  </code>
                  ).
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
                      onClick={() => filtersForm.setValue('filterKey', key)}
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
              <Controller
                control={filtersForm.control}
                name="searchDraft"
                render={({ field }) => (
                  <input
                    type="search"
                    placeholder="Tìm theo tên lớp, kỳ thi, lộ trình…"
                    className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
                    aria-label="Tìm lớp"
                    {...field}
                  />
                )}
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
                      <tr
                        key={c.id}
                        className="border-t border-border/80 bg-card transition-colors hover:bg-muted/30"
                      >
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
                        <td className="max-w-[280px] px-4 py-3 text-muted-foreground">
                          {c.examLine}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                          {c.memberCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="default"
                            size="sm"
                            className="min-w-[7.5rem] font-semibold"
                            asChild
                          >
                            <Link to="/teacher/classes/$classId" params={{ classId: c.id }}>
                              Xem chi tiết
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
                <PaginationPrevNext page={page} totalPages={totalPages} onPageChange={() => {}} />
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
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Không có lớp phù hợp.
                </p>
              ) : null}
            </>
          )}

          {viewMode === 'cards' && filtered.length > 0 ? (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Hiển thị {filtered.length} / {rows.length} lớp
              </span>
              <PaginationCardStepper page={page} totalPages={totalPages} onPageChange={() => {}} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
