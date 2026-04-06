import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { EmployeeTable } from '@/features/hr-admin/components/EmployeeTable'
import { useEmployeeTable } from '@/features/hr-admin/components/EmployeeTable/useEmployeeTable'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import type { Role } from '@/types/auth'
import type { EmployeeFilters, EmployeeListStatus } from '@/features/hr-admin/types'
import { MANAGER_TEAM_OPTIONS } from '@/features/manager/constants/managerTeams'
import { ManagerHubNav } from '@/features/manager/components/ManagerHub/ManagerHubNav'
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
  { key: 'HR_ADMIN', label: 'HR' },
  { key: 'BOD', label: 'BOD' },
  { key: 'reserved', label: '⚠️ Bảo lưu' },
]

export interface HrEmployeeListProps {
  initialFilters?: Partial<EmployeeFilters>
  /** `team` — Manager; `leader` — Trưởng nhóm KPI (giao diện giống HR, không menu Manager). */
  variant?: 'hr' | 'team' | 'leader'
  teamOptions?: readonly { id: string; label: string }[]
}

export function HrEmployeeList({
  initialFilters,
  variant = 'hr',
  teamOptions = MANAGER_TEAM_OPTIONS,
}: HrEmployeeListProps) {
  const isTeam = variant === 'team'
  const isLeader = variant === 'leader'
  const isTeamMode = isTeam || isLeader
  const [teamId, setTeamId] = useState(() => teamOptions[0]?.id ?? '')

  const table = useEmployeeTable(
    isTeamMode ? { page: 1, pageSize: 48, teamId } : { page: 1, pageSize: 48, ...initialFilters },
    isTeamMode ? (isLeader ? { leaderScope: true } : { managerScope: true }) : undefined
  )
  const { employees, isLoading, pagination, onView, onEdit, onDeactivate, onPageChange, filters, setFilters } =
    table

  useEffect(() => {
    if (!isTeamMode) return
    setFilters((f) => ({ ...f, teamId, page: 1 }))
  }, [teamId, isTeamMode, setFilters])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '')

  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchDraft || undefined, page: 1 }))
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
    const reserved = onPage.filter((e) => e.status === 'RESERVED' || e.status === 'PROBATION').length
    return { total, active, inactive, reserved, pageCount: onPage.length }
  }, [employees, pagination.total])

  const activeFilter = useMemo(() => {
    if (filters.status === 'reserved') return 'reserved' as const
    if (filters.role) return filters.role
    return 'all' as const
  }, [filters.role, filters.status])

  useEffect(() => {
    setSelectedId(null)
  }, [pagination.page])

  const setRoleFilter = (key: (typeof FILTERS)[number]['key']) => {
    if (key === 'all') {
      setFilters((f) => ({ ...f, page: 1, role: undefined, status: undefined }))
      return
    }
    if (key === 'reserved') {
      setFilters((f) => ({ ...f, page: 1, status: 'reserved' as EmployeeListStatus, role: undefined }))
      return
    }
    setFilters((f) => ({ ...f, page: 1, role: key as Role, status: undefined }))
  }

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3.5rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      {/* Thanh công cụ trang */}
      <div className="page-toolbar-gradient gap-3">
        <div
          className="pointer-events-none absolute inset-0 opacity-25 motion-safe:animate-[dash-shimmer_10s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            background: 'linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 90%)',
            backgroundSize: '200% 100%',
          }}
        />
        <div className="relative text-base font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-primary via-teal-700 to-violet-700 bg-clip-text text-transparent">
            {isTeamMode ? 'Nhân sự trong team' : 'Danh sách nhân sự'}
          </span>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          {isTeamMode ? (
            <label className="relative flex min-w-[170px] items-center gap-1.5 rounded-lg border border-primary/20 bg-card/90 px-3 py-1.5 text-sm text-foreground shadow-sm backdrop-blur-sm ring-1 ring-primary/10">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">Team</span>
              <select
                className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent text-sm font-semibold text-foreground outline-none"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                aria-label="Chọn team"
              >
                {teamOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="relative flex min-w-[190px] items-center gap-1.5 rounded-lg border border-primary/20 bg-card/90 px-3 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur-sm ring-1 ring-primary/10">
            <Search className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <input
              type="search"
              placeholder="Tìm tên, email..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={cn(
              'whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors',
              viewMode === 'table'
                ? 'border-button bg-button text-button-foreground shadow-sm'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
            onClick={() => setViewMode((v) => (v === 'cards' ? 'table' : 'cards'))}
          >
            {viewMode === 'cards' ? '☰ Dạng bảng' : '▦ Dạng thẻ'}
          </button>
          {!isTeamMode ? (
            <Button type="button" size="sm" className="h-8 rounded-lg text-xs" asChild>
              <Link to="/hr-admin/new">+ Thêm nhân sự</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {isTeam && !isLeader ? <ManagerHubNav /> : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="page-shell">
          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 gap-y-3 md:grid-cols-4">
            {(
              [
                {
                  key: 'total',
                  className:
                    'rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.09] via-card to-teal-500/[0.06] px-4 py-3.5 shadow-[var(--shadow-card)] ring-1 ring-primary/10 transition-shadow motion-safe:hover:shadow-md',
                  body: (
                    <>
                      <div className="mb-1 text-xs font-semibold text-primary">👥 Tổng nhân sự</div>
                      <div className="bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-[28px] font-extrabold leading-tight text-transparent">
                        {stats.total}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">theo bộ lọc API</div>
                    </>
                  ),
                },
                {
                  key: 'active',
                  className:
                    'rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 via-card to-teal-50/80 px-4 py-3.5 shadow-[var(--shadow-card)] ring-1 ring-emerald-500/15 transition-shadow motion-safe:hover:shadow-md',
                  body: (
                    <>
                      <div className="mb-1 text-xs font-semibold text-emerald-800">✅ Hoạt động (trang)</div>
                      <div className="text-[28px] font-extrabold leading-tight text-emerald-700">{stats.active}</div>
                      <div className="mt-1 text-xs text-muted-foreground">trên {stats.pageCount} người hiển thị</div>
                    </>
                  ),
                },
                {
                  key: 'inactive',
                  className:
                    'rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-card to-violet-50/50 px-4 py-3.5 shadow-[var(--shadow-card)] ring-1 ring-amber-400/20 transition-shadow motion-safe:hover:shadow-md',
                  body: (
                    <>
                      <div className="mb-1 text-xs font-semibold text-amber-900">⏸ Ngừng / bảo lưu</div>
                      <div className="text-[28px] font-extrabold leading-tight text-amber-800">
                        {stats.inactive + stats.reserved}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">trên trang hiện tại</div>
                    </>
                  ),
                },
                {
                  key: 'page',
                  className:
                    'rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-card to-fuchsia-50/40 px-4 py-3.5 shadow-[var(--shadow-card)] ring-1 ring-violet-400/15 transition-shadow motion-safe:hover:shadow-md',
                  body: (
                    <>
                      <div className="mb-1 text-xs font-semibold text-violet-900">📄 Trang</div>
                      <div className="text-[28px] font-extrabold leading-tight text-violet-800">{pagination.page}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        / {Math.max(1, Math.ceil(pagination.total / (filters.pageSize || 20)))}
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

          {/* Filter pills */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Lọc:</span>
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={cn(
                  'rounded-full border px-3.5 py-1 text-xs font-medium transition-colors',
                  activeFilter === key
                    ? 'border-primary/35 bg-gradient-to-r from-primary/12 to-teal-500/10 font-semibold text-primary shadow-sm ring-1 ring-primary/15'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:bg-primary/[0.06] hover:text-foreground'
                )}
                onClick={() => setRoleFilter(key)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="ml-auto rounded-lg border border-primary/20 bg-card px-3 py-1.5 text-xs font-medium text-primary shadow-sm ring-1 ring-primary/10 hover:bg-primary/[0.07] md:text-sm"
              onClick={() => toast.info('Xuất Excel sẽ được kết nối API sau.')}
            >
              Xuất Excel
            </button>
          </div>

          {viewMode === 'table' ? (
            <EmployeeTable
              employees={employees}
              isLoading={isLoading}
              onView={onView}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              pagination={pagination}
              onPageChange={onPageChange}
              listMode={isTeamMode ? 'team' : 'hr'}
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
                  'grid gap-3',
                  selectedId
                    ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                )}
              >
                {employees.map((e: EmployeeEntity, idx) => (
                  <EmployeeCard
                    key={e.id}
                    cardIndex={idx}
                    employee={e}
                    selected={selectedId === e.id}
                    variant={isTeamMode ? 'team' : 'hr'}
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
                <p className="py-8 text-center text-sm text-muted-foreground">Không có nhân viên phù hợp.</p>
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
                  onClick={() => onPageChange(pagination.page - 1)}
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
                  onClick={() => onPageChange(pagination.page + 1)}
                >
                  Tiếp →
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <EmployeeDetailSheet
          employee={selected}
          variant={isLeader ? 'leader' : isTeam ? 'team' : 'hr'}
          teamId={teamId}
          onClose={() => setSelectedId(null)}
          onDeactivate={(id) => {
            if (window.confirm('Vô hiệu hóa tài khoản nhân viên này?')) onDeactivate(id)
          }}
        />
      </div>
    </div>
  )
}
