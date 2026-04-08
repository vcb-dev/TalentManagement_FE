import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { AlertTriangle, Filter, Search } from 'lucide-react'
import { toast } from 'sonner'
import { EmployeeTable } from '@/features/hr-admin/components/EmployeeTable'
import { useEmployeeTable } from '@/features/hr-admin/components/EmployeeTable/useEmployeeTable'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import type { Role } from '@/types/auth'
import type { EmployeeFilters, EmployeeListStatus } from '@/features/hr-admin/types'
import { Button } from '@/components/ui/button'
import { SkeletonEmployeeCardGrid, SkeletonStatTile } from '@/components/ui/skeleton'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { EmployeeCard } from './EmployeeCard'
import { EmployeeDetailSheet } from './EmployeeDetailSheet'

const FILTERS: { key: 'all' | Role | 'reserved'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'MEMBER', label: 'Nhân viên' },
  { key: 'LEADER', label: 'Trưởng nhóm KPI' },
  { key: 'MANAGER', label: 'Quản lý' },
  { key: 'TEACHER', label: 'Người chấm' },
  { key: 'HR', label: 'HR' },
  { key: 'BOD', label: 'BOD' },
  { key: 'reserved', label: 'Bảo lưu' },
]

export interface HrEmployeeListProps {
  initialFilters?: Partial<EmployeeFilters>
}

export function HrEmployeeList({ initialFilters }: HrEmployeeListProps) {
  const table = useEmployeeTable({ page: 1, pageSize: 48, ...initialFilters })
  const {
    employees,
    isLoading,
    pagination,
    onView,
    onEdit,
    onDeactivate,
    onPageChange,
    filters,
    setFilters,
  } = table

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '')

  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchDraft || undefined, page: 1 }))
      setSelectedId(null)
    }, 320)
    return () => window.clearTimeout(t)
  }, [searchDraft, setFilters])

  const selected = useMemo(
    () => employees.find((e) => e.id === selectedId) ?? null,
    [employees, selectedId]
  )

  const stats = useMemo(() => {
    const total = pagination.total
    const onPage = employees
    const active = onPage.filter((e) => e.status === 'ACTIVE').length
    const inactive = onPage.filter((e) => e.status === 'INACTIVE').length
    const reserved = onPage.filter(
      (e) => e.status === 'RESERVED' || e.status === 'PROBATION'
    ).length
    const pageCount = onPage.length
    const activePct = pageCount > 0 ? Math.round((active / pageCount) * 100) : 0
    return { total, active, inactive, reserved, pageCount, activePct }
  }, [employees, pagination.total])

  const totalPages = Math.max(1, Math.ceil(pagination.total / (filters.pageSize || 20)))

  const scrollToFilters = () => {
    document
      .getElementById('hr-emp-filters')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeFilter = useMemo(() => {
    if (filters.status === 'reserved') return 'reserved' as const
    if (filters.role) return filters.role
    return 'all' as const
  }, [filters.role, filters.status])

  const handlePageChange = (nextPage: number) => {
    setSelectedId(null)
    onPageChange(nextPage)
  }

  const setRoleFilter = (key: (typeof FILTERS)[number]['key']) => {
    setSelectedId(null)
    if (key === 'all') {
      setFilters((f) => ({ ...f, page: 1, role: undefined, status: undefined }))
      return
    }
    if (key === 'reserved') {
      setFilters((f) => ({
        ...f,
        page: 1,
        status: 'reserved' as EmployeeListStatus,
        role: undefined,
      }))
      return
    }
    setFilters((f) => ({ ...f, page: 1, role: key as Role, status: undefined }))
  }

  const pageTitle = 'Danh sách nhân sự'
  const pageSubtitle =
    'Quản lý và theo dõi hiệu suất cũng như thành tích của nhân sự (HR, BOD, Quản lý dùng chung).'

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3.5rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="page-shell">
          {/* Tiêu đề + nút + thống kê — bố cục như code.html, giữ màu ô thống kê hiện tại */}
          <div className="mb-8 flex flex-col gap-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
                <h1 className={PAGE_HEADER_TITLE}>
                  <span className={PAGE_HEADER_GRADIENT}>{pageTitle}</span>
                </h1>
                <p className={PAGE_HEADER_DESCRIPTION}>{pageSubtitle}</p>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-lg px-5 text-sm font-semibold shadow-sm"
                  asChild
                >
                  <Link to="/hr-admin/new">+ Thêm nhân sự</Link>
                </Button>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
                  onClick={() => toast.info('Xuất Excel sẽ được kết nối API sau.')}
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
                          Tổng nhân sự
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-2xl font-bold leading-none text-transparent">
                            {stats.total}
                          </span>
                          <span className="text-[10px] font-bold text-primary">
                            theo bộ lọc API
                          </span>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'active',
                    className:
                      'rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 via-card to-teal-50/80 p-5 shadow-[var(--shadow-card)] ring-1 ring-emerald-500/15',
                    body: (
                      <>
                        <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          Hoạt động
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-2xl font-bold leading-none text-emerald-700">
                            {stats.active}
                          </span>
                          {stats.pageCount > 0 ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                              {stats.activePct}% trang
                            </span>
                          ) : null}
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'inactive',
                    className:
                      'rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-card to-violet-50/50 p-5 shadow-[var(--shadow-card)] ring-1 ring-amber-400/20',
                    body: (
                      <>
                        <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          Ngừng / bảo lưu
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-2xl font-bold leading-none text-amber-800">
                            {stats.inactive + stats.reserved}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            trên trang hiện tại
                          </span>
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
                          <span className="text-2xl font-bold leading-none text-violet-800">
                            {pagination.page}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            trên {totalPages} trang
                          </span>
                        </div>
                      </>
                    ),
                  },
                ] as const
              ).map((s, i) => (
                <div
                  key={s.key}
                  className={cn(s.className, CARD_ENTRANCE_HOVER)}
                  style={staggerStyle(i)}
                >
                  {s.body}
                </div>
              ))}
            </div>
          </div>

          {/* Bộ lọc + tìm kiếm: mobile xếp dọc, lg chia đôi 50/50 */}
          <div
            id="hr-emp-filters"
            className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-4"
          >
            <div className="scrollbar-hide flex min-w-0 w-full overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm">
              <div
                role="tablist"
                aria-label="Lọc theo vai trò và trạng thái"
                className="flex min-w-min gap-0.5"
              >
                {FILTERS.map(({ key, label }) => {
                  const selected = activeFilter === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      id={`hr-emp-filter-${key}`}
                      className={cn(
                        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-colors md:text-[13px]',
                        selected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-primary'
                      )}
                      onClick={() => setRoleFilter(key)}
                    >
                      {key === 'reserved' ? (
                        <AlertTriangle
                          className={cn(
                            'size-3.5 shrink-0',
                            selected
                              ? 'text-primary-foreground'
                              : 'text-amber-500 dark:text-amber-400'
                          )}
                          strokeWidth={2.25}
                          aria-hidden
                        />
                      ) : null}
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
                placeholder="Tìm kiếm nhân sự..."
                className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                aria-label="Tìm kiếm nhân sự"
              />
            </label>
          </div>

          {viewMode === 'table' ? (
            <EmployeeTable
              employees={employees}
              isLoading={isLoading}
              onView={onView}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              pagination={pagination}
              onPageChange={handlePageChange}
              listMode="hr"
            />
          ) : isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 gap-y-3 md:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <SkeletonStatTile key={i} />
                ))}
              </div>
              <SkeletonEmployeeCardGrid count={10} />
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
                {employees.map((e: EmployeeEntity, idx) => (
                  <EmployeeCard
                    key={e.id}
                    cardIndex={idx}
                    employee={e}
                    selected={selectedId === e.id}
                    variant="hr"
                    onSelect={() => {
                      setSelectedId(e.id)
                    }}
                    onView={(ev) => {
                      ev.stopPropagation()
                      onView(e.id)
                    }}
                    onEdit={(ev) => {
                      ev.stopPropagation()
                      onEdit(e.id)
                    }}
                  />
                ))}
              </div>
              {employees.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Không có nhân viên phù hợp.
                </p>
              ) : null}
            </>
          )}

          {viewMode === 'cards' && employees.length > 0 ? (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Hiển thị {employees.length} / {pagination.total} nhân viên
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-button bg-button px-3 py-1.5 text-xs font-medium text-button-foreground"
                >
                  {pagination.page}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
                  disabled={pagination.page * (filters.pageSize ?? 20) >= pagination.total}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Tiếp →
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <EmployeeDetailSheet
          employee={selected}
          onClose={() => setSelectedId(null)}
          onDeactivate={(id) => {
            if (window.confirm('Vô hiệu hóa tài khoản nhân viên này?')) onDeactivate(id)
          }}
        />
      </div>
    </div>
  )
}
