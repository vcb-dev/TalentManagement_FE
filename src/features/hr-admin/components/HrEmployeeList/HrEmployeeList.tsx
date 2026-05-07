import { useEffect, useMemo, useRef, useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useForm, useWatch } from 'react-hook-form'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { EmployeeTable } from '@/features/hr-admin/components/EmployeeTable'
import { useEmployeeTable } from '@/features/hr-admin/components/EmployeeTable/useEmployeeTable'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import type { EmployeeFilters } from '@/features/hr-admin/types'
import { Button } from '@/components/ui/button'
import { PaginationCardStepper } from '@/components/ui/pagination'
import { SkeletonEmployeeCardGrid, SkeletonStatTile } from '@/components/ui/skeleton'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { Form } from '@/components/ui/form'
import { InputFieldController } from '@/components/ui/form-controllers'
import { usePermission } from '@/hooks/usePermission'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import type { Role } from '@/types/auth'
import { EmployeeCard } from './EmployeeCard'
import { EmployeeDetailSheet } from './EmployeeDetailSheet'

const hrAdminListRoute = getRouteApi('/_protected/hr-admin/')

/** Thứ tự tab — khớp query `role` trên GET /employees (BE: parseAppRoleParam). */
const HR_DIRECTORY_ROLE_TAB_ORDER: Role[] = ['BOD', 'HR', 'MANAGER', 'LEADER', 'MEMBER', 'TEACHER']

const HR_ROLE_TABS: { value: 'all' | Role; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  ...HR_DIRECTORY_ROLE_TAB_ORDER.map((r) => ({ value: r, label: ROLE_LABEL_VI[r] })),
]

/** Cố định 15 nhân viên / trang (màn danh sách HR). */
const HR_EMPLOYEE_PAGE_SIZE = 15

export interface HrEmployeeListProps {
  initialFilters?: Partial<EmployeeFilters>
}

export function HrEmployeeList({ initialFilters }: HrEmployeeListProps) {
  const routeSearch = hrAdminListRoute.useSearch()
  const totalStatHint = 'theo tab vai trò và tìm kiếm'
  const { canId } = usePermission()
  const canCreate = canId('hr.employees.create')
  const canEdit = canId('hr.employees.edit')
  const canDeactivate = canId('hr.employees.deactivate')
  const navigate = hrAdminListRoute.useNavigate()

  const table = useEmployeeTable(initialFilters ?? {})
  const {
    employees,
    isLoading,
    pagination,
    onView,
    onEdit,
    onDeactivate,
    onReactivate,
    filters,
    setFilters,
  } = table

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const searchForm = useForm<{ searchDraft: string }>({
    defaultValues: { searchDraft: filters.search ?? '' },
  })
  const { control } = searchForm
  const searchDraft = useWatch({ control, name: 'searchDraft' })
  /** Bo qua lan debounce dau (giu page tu URL khi vao truc tiep ?page=2). */
  const skipInitialSearchDebounce = useRef(true)
  /** Tránh đưa `setFilters` vào deps: nó đổi mỗi khi URL đổi `page` → effect chạy lại và sau debounce reset page về 1. */
  const setFiltersRef = useRef(setFilters)
  const navigateForSearchRef = useRef(navigate)
  setFiltersRef.current = setFilters
  navigateForSearchRef.current = navigate

  useEffect(() => {
    if (filters.pageSize === HR_EMPLOYEE_PAGE_SIZE) return
    void navigate({
      to: '/hr-admin',
      search: (s) => ({ ...s, pageSize: HR_EMPLOYEE_PAGE_SIZE, page: 1 }),
    })
  }, [filters.pageSize, navigate])

  useEffect(() => {
    searchForm.reset({ searchDraft: filters.search ?? '' })
  }, [filters.search, searchForm])

  useEffect(() => {
    if (skipInitialSearchDebounce.current) {
      skipInitialSearchDebounce.current = false
      return
    }
    const draft = searchDraft
    const t = window.setTimeout(() => {
      setFiltersRef.current((f) => ({ ...f, search: draft || undefined, page: 1 }))
      setSelectedId(null)
      void navigateForSearchRef.current({
        to: '/hr-admin',
        search: (s) => ({ ...s, page: 1, pageSize: HR_EMPLOYEE_PAGE_SIZE }),
      })
    }, 320)
    return () => window.clearTimeout(t)
  }, [searchDraft])

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

  const pageSize = Math.max(1, filters.pageSize)
  const totalPages = pagination.totalPages ?? Math.max(1, Math.ceil(pagination.total / pageSize))
  const rangeFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pageSize + 1
  const rangeTo = Math.min(pagination.page * pageSize, pagination.total)

  const applyRoleTab = (tab: 'all' | Role) => {
    setSelectedId(null)
    void navigate({
      to: '/hr-admin',
      search: (prev) => {
        const base = { ...prev, page: 1, pageSize: HR_EMPLOYEE_PAGE_SIZE }
        if (tab === 'all') {
          const { role: _r, ...rest } = base
          return rest
        }
        return { ...base, role: tab }
      },
    })
  }

  const handlePageChange = (nextPage: number) => {
    setSelectedId(null)
    void navigate({
      to: '/hr-admin',
      search: (s) => ({ ...s, page: nextPage, pageSize: HR_EMPLOYEE_PAGE_SIZE }),
    })
  }

  const pageTitle = 'Danh sách nhân sự'
  const pageSubtitle =
    'Quản lý và theo dõi hiệu suất cũng như thành tích của nhân sự (HR, BOD, Quản lý dùng chung).'

  return (
    <div className="-m-5 bg-gradient-to-b from-slate-50/95 via-slate-100/70 to-slate-100/90 pb-8 text-sm text-foreground md:-m-6 lg:-m-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div
        className={cn(
          'page-shell scrollbar-hide overflow-x-hidden',
          selectedId ? 'lg:pr-[380px]' : undefined
        )}
      >
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
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'inline-flex h-auto rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors',
                  viewMode === 'table'
                    ? 'border-button bg-button text-button-foreground'
                    : 'border-border/80 bg-card/90 text-foreground backdrop-blur-sm hover:bg-muted'
                )}
                onClick={() => setViewMode((v) => (v === 'cards' ? 'table' : 'cards'))}
              >
                {viewMode === 'cards' ? 'Dạng bảng' : 'Dạng thẻ'}
              </Button>
              {canCreate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-lg px-5 text-sm font-semibold shadow-sm"
                  asChild
                >
                  <Link to="/hr-admin/new">+ Thêm nhân sự</Link>
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-auto rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                onClick={() => toast.info('Xuất Excel sẽ được kết nối API sau.')}
              >
                Xuất dữ liệu
              </Button>
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
                        <span className="text-[10px] font-bold text-primary">{totalStatHint}</span>
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

        {/* Tab vai trò (GET /employees?role=) — và tìm kiếm */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div
            className="flex shrink-0 flex-wrap items-center gap-1 rounded-xl border border-border/80 bg-card/90 p-1 shadow-sm ring-1 ring-border/60 backdrop-blur-sm"
            role="tablist"
            aria-label="Lọc theo vai trò nhân sự"
          >
            {HR_ROLE_TABS.map((tab) => {
              const selected =
                tab.value === 'all'
                  ? routeSearch.role === undefined
                  : routeSearch.role === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={cn(
                    'rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm',
                    selected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  onClick={() => applyRoleTab(tab.value)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div className="min-w-0 flex-1">
            <Form {...searchForm}>
              <div className="relative flex min-h-[42px] w-full min-w-0 items-center rounded-xl border border-border/80 bg-card/90 px-3 shadow-sm ring-1 ring-border/60 backdrop-blur-sm">
                <InputFieldController
                  control={control}
                  name="searchDraft"
                  type="search"
                  placeholder="Tìm kiếm nhân sự..."
                  aria-label="Tìm kiếm nhân sự"
                  className="min-w-0 flex-1"
                  wrapperClassName="min-w-0 flex-1"
                  startSlot={<Search className="size-4 text-muted-foreground" aria-hidden />}
                  inputClassName="h-auto min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm shadow-none focus-visible:ring-0"
                />
              </div>
            </Form>
          </div>
        </div>

        {viewMode === 'cards' && (employees.length > 0 || pagination.total > 0) ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-3 shadow-sm ring-1 ring-border/50 backdrop-blur-sm sm:px-4">
            <span className="text-xs font-medium text-muted-foreground">
              {pagination.total === 0
                ? 'Không có nhân viên phù hợp'
                : `Hiển thị ${rangeFrom}–${rangeTo} trong ${pagination.total} nhân viên`}
            </span>
            <PaginationCardStepper
              page={pagination.page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        ) : null}

        {viewMode === 'table' ? (
          <EmployeeTable
            employees={employees}
            isLoading={isLoading}
            onView={onView}
            onEdit={onEdit}
            onDeactivate={onDeactivate}
            onReactivate={onReactivate}
            pagination={pagination}
            onPageChange={handlePageChange}
            listMode="hr"
            canEdit={canEdit}
            canDeactivate={canDeactivate}
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
      </div>

      <EmployeeDetailSheet
        employee={selected}
        onClose={() => setSelectedId(null)}
        onDeactivate={onDeactivate}
        onReactivate={onReactivate}
        canDeactivate={canDeactivate}
        canReactivate={canEdit}
      />
    </div>
  )
}
