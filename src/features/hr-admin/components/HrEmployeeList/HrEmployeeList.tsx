import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { InputFieldController } from '@/components/ui/form-controllers'
import { PaginationCardStepper } from '@/components/ui/pagination'
import { SkeletonEmployeeCardGrid, SkeletonStatTile } from '@/components/ui/skeleton'
import { employeeApi, type EmployeeEntity } from '@/features/hr-admin/api'
import { EmployeeTable } from '@/features/hr-admin/components/EmployeeTable'
import { useEmployeeTable } from '@/features/hr-admin/components/EmployeeTable/useEmployeeTable'
import type { EmployeeFilters } from '@/features/hr-admin/types'
import { useHrOrgSelectOptions } from '@/features/hr-admin/useHrOrgTree'
import { usePermission } from '@/hooks/usePermission'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/auth'
import { getRouteApi, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { Download, Layers, Loader2, Search, UserCheck, UserMinus, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { EmployeeCard } from './EmployeeCard'
import { EmployeeDetailSheet } from './EmployeeDetailSheet'
import {
  EmployeeFilterPopover,
  type EmployeeListFilterPatch,
  type EmployeeListFilterValue,
} from './EmployeeFilterPopover'
import { downloadEmployeesExcel } from './exportEmployeesExcel'

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
  const totalStatHint = 'mọi trạng thái làm việc'
  const { canId, role: viewerRole } = usePermission()
  /** BE ép `teamId` cho Leader. */
  const showTeamFilter = viewerRole !== 'LEADER'
  const { departments: orgDepartments, teamsByDept } = useHrOrgSelectOptions()
  const teamGroups = useMemo(
    () =>
      orgDepartments
        .map((d) => ({ ...d, teams: teamsByDept.get(d.value) ?? [] }))
        .filter((d) => d.teams.length > 0),
    [orgDepartments, teamsByDept]
  )
  const [isExporting, setIsExporting] = useState(false)
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
    isFetching,
    isPageResolved,
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
    const counts = pagination.statusCounts
    const total = counts
      ? counts.ACTIVE + counts.INACTIVE + counts.PROBATION + counts.RESERVED + counts.TRANSFERRED
      : pagination.total
    const onPage = employees
    const active = counts ? counts.ACTIVE : onPage.filter((e) => e.status === 'ACTIVE').length
    const inactive = counts ? counts.INACTIVE : onPage.filter((e) => e.status === 'INACTIVE').length
    const reserved = counts
      ? counts.RESERVED + counts.PROBATION + counts.TRANSFERRED
      : onPage.filter(
          (e) => e.status === 'RESERVED' || e.status === 'PROBATION' || e.status === 'TRANSFERRED'
        ).length
    const countedTotal = counts ? active + inactive + reserved : onPage.length
    const activePct = countedTotal > 0 ? Math.round((active / countedTotal) * 100) : 0
    return { total, active, inactive, reserved, activePct }
  }, [employees, pagination.total, pagination.statusCounts])

  const pageSize = Math.max(1, filters.pageSize)
  const totalPages = pagination.totalPages ?? Math.max(1, Math.ceil(pagination.total / pageSize))
  const rangeFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pageSize + 1
  const rangeTo = Math.min(pagination.page * pageSize, pagination.total)

  useEffect(() => {
    if (!isPageResolved || isFetching || filters.page <= totalPages) return
    setSelectedId(null)
    void navigate({
      to: '/hr-admin',
      search: (current) => ({
        ...current,
        page: totalPages,
        pageSize: targetPageSize,
      }),
      replace: true,
    })
  }, [filters.page, isFetching, isPageResolved, navigate, targetPageSize, totalPages])

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

  const appliedListFilter: EmployeeListFilterValue = {
    status: routeSearch.status ?? 'active',
    teamId: routeSearch.teamId,
    startMonth: routeSearch.startMonth,
    startYear: routeSearch.startYear,
    birthMonth: routeSearch.birthMonth,
  }

  /** Gộp với URL mới nhất (`prev`) để chọn liên tiếp không mất lọc trước; `undefined` = bỏ lọc. */
  const applyListFilter = (patch: EmployeeListFilterPatch) => {
    setSelectedId(null)
    void navigate({
      to: '/hr-admin',
      search: (prev) => {
        const next: typeof prev = { ...prev, ...patch, page: 1, pageSize: targetPageSize }
        // "Đang làm việc" là mặc định — bỏ param cho gọn link.
        if (next.status === 'active') delete next.status
        if (next.teamId === undefined) delete next.teamId
        if (next.startMonth === undefined) delete next.startMonth
        if (next.startYear === undefined) delete next.startYear
        if (next.birthMonth === undefined) delete next.birthMonth
        return next
      },
    })
  }

  const handleExportExcel = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const res = await employeeApi.getExportRows(filters)
      if (res.data.length === 0) {
        toast.info('Không có nhân sự phù hợp bộ lọc để xuất.')
        return
      }
      await downloadEmployeesExcel(
        res.data,
        `danh-sach-nhan-su-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`
      )
      toast.success(`Đã xuất ${res.data.length} nhân sự ra Excel.`)
    } catch {
      toast.error('Xuất Excel thất bại. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePageChange = (nextPage: number) => {
    if (isFetching) return
    setSelectedId(null)
    void navigate({
      to: '/hr-admin',
      search: (s) => ({ ...s, page: nextPage, pageSize: targetPageSize }),
    })
  }

  const pageTitle = 'Danh sách nhân sự'
  // const pageSubtitle =
  //   'Quản lý và theo dõi hiệu suất cũng như thành tích của nhân sự (HR, BOD, Quản lý dùng chung).'

  return (
    <div className="animate-page-entrance flex flex-col gap-4 pb-4 text-sm text-foreground">
      <div
      // className={cn(
      //   'page-shell scrollbar-hide overflow-x-hidden',
      //   selectedId ? 'lg:pr-[380px]' : undefined,
      //   viewMode === 'cards' &&
      //     (employees.length > 0 || pagination.total > 0) &&
      //     !selectedId &&
      //     'max-md:pb-[7.25rem]'
      // )}
      >
        {/* Tiêu đề + nút + thống kê — bố cục như code.html, giữ màu ô thống kê hiện tại */}
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-3">{pageTitle}</h1>
              {/* <p className="text-sm text-muted-foreground">{pageSubtitle}</p> */}
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
                className="h-auto gap-2 rounded-lg bg-[#006C49] px-5 py-2.5 text-sm font-semibold text-white"
                onClick={() => void handleExportExcel()}
                disabled={isExporting}
                title="Xuất toàn bộ nhân sự theo bộ lọc hiện tại"
              >
                {isExporting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-4" aria-hidden />
                )}
                {isExporting ? 'Đang xuất…' : 'Xuất Excel'}
              </Button>
            </div>
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
              title="Nhân sự đang làm việc"
              value={stats.active}
              icon={<UserCheck className="h-5 w-5" />}
              description={stats.total > 0 ? `${stats.activePct}% tổng nhân sự` : undefined}
              tone="success"
            />
            <StatCard
              title="Ngừng / bảo lưu"
              value={stats.inactive + stats.reserved}
              icon={<UserMinus className="h-5 w-5" />}
              description="đã nghỉ, bảo lưu, điều chuyển…"
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

        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
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
          <div className="flex min-w-0 flex-1 gap-3">
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

            <EmployeeFilterPopover
              value={appliedListFilter}
              onChange={applyListFilter}
              teamGroups={teamGroups}
              showTeamFilter={showTeamFilter}
            />
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
              busy={isFetching}
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
            busy={isFetching}
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
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2">
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
                busy={isFetching}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
