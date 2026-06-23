import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useForm, useWatch } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { Layers, Search, UserCheck, UserMinus, Users } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { toast } from 'sonner'
import { EmployeeTable } from '@/features/hr-admin/components/EmployeeTable'
import { useEmployeeTable } from '@/features/hr-admin/components/EmployeeTable/useEmployeeTable'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import type { EmployeeFilters } from '@/features/hr-admin/types'
import { Button } from '@/components/ui/button'
import { PaginationCardStepper } from '@/components/ui/pagination'
import { SkeletonEmployeeCardGrid, SkeletonStatTile } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { getApiErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { Form } from '@/components/ui/form'
import { InputFieldController } from '@/components/ui/form-controllers'
import { usePermission } from '@/hooks/usePermission'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import type { Role } from '@/types/auth'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { EmployeeCard } from './EmployeeCard'
import { EmployeeDetailSheet } from './EmployeeDetailSheet'

const hrAdminListRoute = getRouteApi('/_protected/hr-admin/')

/** Thứ tự tab — khớp query `role` trên GET /employees (BE: parseAppRoleParam). */
const HR_DIRECTORY_ROLE_TAB_ORDER: Role[] = ['BOD', 'HR', 'MANAGER', 'LEADER', 'MEMBER', 'TEACHER']

const HR_ROLE_TABS: { value: 'all' | Role; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  ...HR_DIRECTORY_ROLE_TAB_ORDER.map((r) => ({ value: r, label: ROLE_LABEL_VI[r] })),
]

/** Dưới breakpoint `sm` (640px): 10 nhân viên / trang + lưới 2 cột. */
function useHrDirectoryMobileLayout() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(max-width: 639px)')
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(max-width: 639px)').matches,
    () => false
  )
}

const HR_EMPLOYEE_PAGE_SIZE_DESKTOP = 15
const HR_EMPLOYEE_PAGE_SIZE_MOBILE = 10

export interface HrEmployeeListProps {
  initialFilters?: Partial<EmployeeFilters>
}

export function HrEmployeeList({ initialFilters }: HrEmployeeListProps) {
  const routeSearch = hrAdminListRoute.useSearch()
  const totalStatHint = 'theo tab vai trò và tìm kiếm'
  const { canId } = usePermission()
  const canCreate = canId('hr.employees.create')
  const canEdit = canId('hr.employees.edit')
  const canDeactivate = canId('hr.employees.deactivate') || canId('hr.employees.edit')
  const navigate = hrAdminListRoute.useNavigate()
  const isHrDirectoryMobileGrid = useHrDirectoryMobileLayout()
  const targetPageSize = isHrDirectoryMobileGrid
    ? HR_EMPLOYEE_PAGE_SIZE_MOBILE
    : HR_EMPLOYEE_PAGE_SIZE_DESKTOP

  const table = useEmployeeTable(initialFilters ?? {})
  const {
    employees,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    pagination,
    onView,
    onEdit,
    onDeactivate,
    onReactivate,
    confirmPending,
    onConfirmPending,
    onCancelPending,
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
    if (filters.pageSize === targetPageSize) return
    const oldSize = Math.max(1, filters.pageSize)
    const oldPage = filters.page
    const newPage = Math.floor(((oldPage - 1) * oldSize) / targetPageSize) + 1
    void navigate({
      to: '/hr-admin',
      search: (s) => ({ ...s, pageSize: targetPageSize, page: newPage }),
    })
  }, [filters.page, filters.pageSize, navigate, targetPageSize])

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
        search: (s) => ({ ...s, page: 1, pageSize: targetPageSize }),
      })
    }, 320)
    return () => window.clearTimeout(t)
  }, [searchDraft, targetPageSize])

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
        const base = { ...prev, page: 1, pageSize: targetPageSize }
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
      search: (s) => ({ ...s, page: nextPage, pageSize: targetPageSize }),
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
          selectedId ? 'lg:pr-[380px]' : undefined,
          viewMode === 'cards' &&
            (employees.length > 0 || pagination.total > 0) &&
            !selectedId &&
            'max-md:pb-[7.25rem]'
        )}
      >
        {/* Tiêu đề + nút + thống kê — bố cục như code.html, giữ màu ô thống kê hiện tại */}
        <div className="mb-8 flex flex-col gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <PageHeader
              title={pageTitle}
              description={pageSubtitle}
              gradientTitle
              surface
              variant="flat"
              className="min-w-0 flex-1 border-0 pb-0"
              actions={
                <>
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
                </>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Tổng nhân sự"
              value={stats.total}
              icon={<Users className="h-5 w-5" />}
              description={totalStatHint}
              tone="default"
            />
            <StatCard
              title="Hoạt động"
              value={stats.active}
              icon={<UserCheck className="h-5 w-5" />}
              description={
                stats.pageCount > 0 ? `${stats.activePct}% trên trang hiện tại` : undefined
              }
              tone="success"
            />
            <StatCard
              title="Ngừng / bảo lưu"
              value={stats.inactive + stats.reserved}
              icon={<UserMinus className="h-5 w-5" />}
              description="trên trang hiện tại"
              tone="warning"
            />
            <StatCard
              title="Trang"
              value={pagination.page}
              icon={<Layers className="h-5 w-5" />}
              description={`trên ${totalPages} trang`}
              tone="info"
            />
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
                <Button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  variant={selected ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'rounded-lg px-2.5 py-2 text-xs font-semibold sm:px-3 sm:text-sm',
                    !selected && 'text-muted-foreground'
                  )}
                  onClick={() => applyRoleTab(tab.value)}
                >
                  {tab.label}
                </Button>
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
          <div className="mb-5 hidden flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-3 shadow-sm ring-1 ring-border/50 backdrop-blur-sm sm:px-4 md:flex">
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

        {isError ? (
          <ErrorState
            title="Không tải được danh sách nhân viên"
            description={getApiErrorMessage(error)}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : viewMode === 'table' ? (
          <EmployeeTable
            employees={employees}
            isLoading={isLoading}
            isError={isError}
            errorDescription={getApiErrorMessage(error)}
            onRetry={() => void refetch()}
            retrying={isFetching}
            onView={onView}
            onEdit={onEdit}
            onDeactivate={onDeactivate}
            onReactivate={onReactivate}
            pagination={pagination}
            onPageChange={handlePageChange}
            listMode="hr"
            canEdit={canEdit}
            canDeactivate={canDeactivate}
            emptyTitle="Không có nhân viên phù hợp"
            emptyDescription="Thử đổi bộ lọc hoặc tìm kiếm với từ khóa khác."
          />
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 gap-y-3 md:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonStatTile key={i} />
              ))}
            </div>
            <SkeletonEmployeeCardGrid count={targetPageSize} />
          </div>
        ) : (
          <>
            <div
              className={cn(
                'grid gap-3 gap-y-3 md:gap-8 md:gap-y-4',
                selectedId
                  ? 'grid-cols-2 lg:grid-cols-4'
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
              )}
            >
              {employees.map((e: EmployeeEntity, idx) => (
                <div key={e.id} className="min-w-0">
                  <EmployeeCard
                    cardIndex={idx}
                    employee={e}
                    selected={selectedId === e.id}
                    variant="hr"
                    compact={isHrDirectoryMobileGrid}
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
                </div>
              ))}
            </div>
            {employees.length === 0 ? (
              <EmptyState
                title="Không có nhân viên phù hợp"
                description="Thử đổi bộ lọc hoặc tìm kiếm với từ khóa khác."
                compact
              />
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

      <ConfirmDialog
        open={confirmPending !== null}
        onOpenChange={(open) => {
          if (!open) onCancelPending()
        }}
        title={
          confirmPending?.type === 'deactivate'
            ? 'Vô hiệu hóa tài khoản?'
            : 'Kích hoạt lại tài khoản?'
        }
        description={
          confirmPending?.type === 'deactivate'
            ? 'Nhân viên sẽ không thể đăng nhập sau khi bị vô hiệu hóa.'
            : 'Nhân viên sẽ được khôi phục quyền đăng nhập.'
        }
        confirmLabel={confirmPending?.type === 'deactivate' ? 'Vô hiệu hóa' : 'Kích hoạt'}
        destructive={confirmPending?.type === 'deactivate'}
        onConfirm={onConfirmPending}
      />

      {viewMode === 'cards' && (employees.length > 0 || pagination.total > 0) && !selectedId ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-3 py-2.5 shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-background/80 md:hidden"
          style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2">
            <span className="text-center text-xs font-medium text-muted-foreground sm:text-left">
              {pagination.total === 0
                ? 'Không có nhân viên phù hợp'
                : `Hiển thị ${rangeFrom}–${rangeTo} trong ${pagination.total} nhân viên`}
            </span>
            <div className="min-w-0 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
              <PaginationCardStepper
                className="min-w-min justify-center"
                page={pagination.page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
