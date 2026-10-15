import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { OrgUserAvatar } from '@/components/shared/EmployeeAvatar'
import {
  BRAND_BTN_OUTLINE,
  BRAND_BTN_SOFT,
  BRAND_BTN_SOLID,
} from '@/components/shared/brandButtonStyles'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ProjectFormDialog,
  ProjectMembershipDialog,
} from '@/features/hr-admin/components/EmployeeProjects'
import { useAnyActionPending } from '@/features/hr-admin/hooks'
import {
  PROJECT_STATUS_LABEL,
  SHOW_PROJECT_ROLE,
  type EmployeeProjectMembership,
  type ProjectEntity,
  type ProjectMember,
  type ProjectStatus,
} from '@/features/hr-admin/projectApi'
import {
  useDeleteProject,
  useProjectMembers,
  useProjects,
  useRemoveProjectMember,
} from '@/features/hr-admin/projectHooks'
import { formatUserDateForReadonlyDisplay } from '@/features/profile/profileDateUtils'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import {
  ArrowDownAZ,
  ArrowUpZA,
  ChevronDown,
  CircleCheck,
  CirclePause,
  FolderKanban,
  FolderOpen,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  UserMinus,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { AddProjectMembersDialog } from './AddProjectMembersDialog'

type StatusFilter = 'all' | ProjectStatus
type SortKey = 'status' | 'name-asc' | 'name-desc' | 'most-members' | 'newest'

const STATUS_BADGE: Record<ProjectStatus, string> = {
  ACTIVE: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  PAUSED: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  COMPLETED: 'border-border bg-muted text-muted-foreground',
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd')
}

function periodText(from: string | null, to: string | null): string {
  const a = formatUserDateForReadonlyDisplay(from)
  const b = formatUserDateForReadonlyDisplay(to)
  if (a && b) return `${a} – ${b}`
  if (a) return `Từ ${a}`
  if (b) return `Đến ${b}`
  return '—'
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded px-2 py-0 text-[10px] font-bold uppercase tracking-wider',
        STATUS_BADGE[status]
      )}
    >
      {PROJECT_STATUS_LABEL[status]}
    </Badge>
  )
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ReactNode
  iconClass: string
  label: string
  value: number
}) {
  return (
    <Card className="border-border bg-card shadow-sm md:col-span-1">
      <CardContent className="flex items-center gap-2 p-2">
        <span
          className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconClass)}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
        </span>
      </CardContent>
    </Card>
  )
}

function ProjectMembersTable({
  project,
  open,
  canEdit,
  onAdd,
  onEdit,
  onRemove,
}: {
  project: ProjectEntity
  open: boolean
  canEdit: boolean
  onAdd: () => void
  onEdit: (member: ProjectMember) => void
  onRemove: (member: ProjectMember) => void
}) {
  const { data: members = [], isLoading, isError } = useProjectMembers(project.id, open)
  const anyActionPending = useAnyActionPending()
  const pastCount = members.filter((m) => !m.isActive).length
  const [showPast, setShowPast] = useState(false)
  const rows = showPast ? members : members.filter((m) => m.isActive)
  const canAdd = canEdit && project.status !== 'COMPLETED'

  if (isLoading) {
    return (
      <div className="space-y-2 p-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  if (isError) {
    return <p className="p-5 text-sm text-destructive">Không tải được danh sách nhân sự.</p>
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="border-b border-border/80 bg-muted/30 hover:bg-muted/30">
              <TableHead className="h-9 w-[30%] pl-6 text-[11px] uppercase tracking-wider">
                Nhân sự
              </TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider">
                Nhóm / phòng ban
              </TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider">
                {SHOW_PROJECT_ROLE ? 'Vai trò trong dự án' : 'Ghi chú'}
              </TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider">Thời gian</TableHead>
              {canEdit ? (
                <TableHead className="h-9 pr-6 text-right text-[11px] uppercase tracking-wider">
                  Thao tác
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={canEdit ? 5 : 4} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      {members.length === 0
                        ? 'Chưa có nhân sự trong dự án này.'
                        : 'Không còn ai đang tham gia dự án này.'}
                    </p>
                    {canAdd ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className={cn('rounded-lg', BRAND_BTN_SOFT)}
                        onClick={onAdd}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Thêm nhân sự
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((m) => (
                <TableRow key={m.membershipId} className={cn(!m.isActive && 'opacity-60')}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <OrgUserAvatar name={m.name} avatarUrl={m.avatarUrl} className="h-8 w-8" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            to="/hr-admin/$employeeId"
                            params={{ employeeId: m.userId }}
                            className="truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {m.name}
                          </Link>
                          {!m.isActive ? (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              Đã rời
                            </Badge>
                          ) : null}
                          {m.isEmployeeInactive ? (
                            <Badge
                              variant="outline"
                              className="h-5 border-danger/50 bg-danger-muted px-1.5 text-[10px] text-danger"
                            >
                              Đã nghỉ việc
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {[m.employeeCode, m.email].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p className="text-foreground">{m.teamName ?? m.departmentName ?? '—'}</p>
                    {m.teamName &&
                    m.departmentName &&
                    m.departmentName.trim().toLowerCase() !== m.teamName.trim().toLowerCase() ? (
                      <p className="text-xs text-muted-foreground">{m.departmentName}</p>
                    ) : null}
                  </TableCell>
                  {SHOW_PROJECT_ROLE ? (
                    <TableCell className="text-sm">
                      {m.roleInProject ?? <span className="text-muted-foreground">—</span>}
                      {m.note ? (
                        <p className="line-clamp-1 text-xs text-muted-foreground">{m.note}</p>
                      ) : null}
                    </TableCell>
                  ) : (
                    <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                      {m.note ? <p className="line-clamp-2">{m.note}</p> : '—'}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {periodText(m.joinedAt, m.leftAt)}
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="pr-6 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                          aria-label={`Sửa tham gia dự án của ${m.name}`}
                          disabled={anyActionPending}
                          onClick={() => onEdit(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-md text-danger/80 hover:text-danger"
                          aria-label={`Gỡ ${m.name} khỏi dự án`}
                          disabled={anyActionPending}
                          onClick={() => onRemove(m)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {pastCount > 0 || (canAdd && rows.length > 0) ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-6 py-2.5">
          {pastCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => setShowPast((v) => !v)}
            >
              {showPast ? 'Ẩn người đã rời dự án' : `Hiện cả ${pastCount} người đã rời dự án`}
            </Button>
          ) : (
            <span />
          )}
          {canAdd && rows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn('h-8 rounded-md px-2.5 text-xs', BRAND_BTN_SOFT)}
              onClick={onAdd}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Thêm nhân sự
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function HrProjects() {
  const { canId } = usePermission()
  const canEdit = canId('hr.employees.edit')
  const { data: projects = [], isLoading, isError } = useProjects()
  const deleteProject = useDeleteProject()
  const removeMember = useRemoveProjectMember()

  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [formProject, setFormProject] = useState<{ project: ProjectEntity | null } | null>(null)
  const [addMemberProject, setAddMemberProject] = useState<ProjectEntity | null>(null)
  const [editMember, setEditMember] = useState<{
    project: ProjectEntity
    member: ProjectMember
  } | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{
    project: ProjectEntity
    member: ProjectMember
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectEntity | null>(null)

  // Đối tượng ổn định — hộp thoại reset form mỗi khi `membership` đổi tham chiếu.
  const editMembership = useMemo<EmployeeProjectMembership | null>(
    () =>
      editMember
        ? {
            id: editMember.member.membershipId,
            projectId: editMember.project.id,
            projectName: editMember.project.name,
            projectStatus: editMember.project.status,
            roleInProject: editMember.member.roleInProject,
            joinedAt: editMember.member.joinedAt,
            leftAt: editMember.member.leftAt,
            note: editMember.member.note,
            isActive: editMember.member.isActive,
            assignedByName: null,
            updatedAt: '',
          }
        : null,
    [editMember]
  )

  const counts = useMemo(
    () => ({
      ACTIVE: projects.filter((p) => p.status === 'ACTIVE').length,
      PAUSED: projects.filter((p) => p.status === 'PAUSED').length,
      COMPLETED: projects.filter((p) => p.status === 'COMPLETED').length,
    }),
    [projects]
  )

  const visibleProjects = useMemo(() => {
    const q = fold(deferredSearch.trim())
    const filtered = projects.filter(
      (p) =>
        (statusFilter === 'all' || p.status === statusFilter) &&
        (!q || fold(p.name).includes(q) || fold(p.description ?? '').includes(q))
    )
    // 'status' = thứ tự BE trả về (Đang chạy → Tạm dừng → Đã kết thúc, rồi theo tên).
    if (sortKey === 'status') return filtered
    const sorted = [...filtered]
    if (sortKey === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    if (sortKey === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name, 'vi'))
    if (sortKey === 'most-members') sorted.sort((a, b) => b.activeMemberCount - a.activeMemberCount)
    if (sortKey === 'newest') sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return sorted
  }, [projects, deferredSearch, statusFilter, sortKey])

  const hasActiveFilter = Boolean(search) || statusFilter !== 'all' || sortKey !== 'status'

  return (
    <div className="animate-page-entrance flex flex-col gap-4 pb-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <div className="col-span-2 flex flex-col justify-center rounded-xl border border-border bg-card p-3 md:col-span-3">
            <h1 className="text-2xl font-bold tracking-tight">Dự án</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Quản lý dự án và nhân sự đang tham gia từng dự án.
            </p>
          </div>
          <StatCard
            icon={<Play className="h-4 w-4" />}
            iconClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            label="Đang chạy"
            value={counts.ACTIVE}
          />
          <StatCard
            icon={<CirclePause className="h-4 w-4" />}
            iconClass="bg-amber-500/10 text-amber-700 dark:text-amber-300"
            label="Tạm dừng"
            value={counts.PAUSED}
          />
          <StatCard
            icon={<CircleCheck className="h-4 w-4" />}
            iconClass="bg-muted text-muted-foreground"
            label="Đã kết thúc"
            value={counts.COMPLETED}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-sm">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 border-none bg-muted/40 pl-9 text-sm shadow-none"
              placeholder="Tìm theo tên / mô tả dự án..."
              aria-label="Tìm dự án"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-[150px] border-none bg-muted/40 text-xs font-medium shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi trạng thái</SelectItem>
              {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-9 w-[180px] border-none bg-muted/40 text-xs font-medium shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Theo trạng thái</SelectItem>
              <SelectItem value="name-asc">
                <span className="flex items-center gap-2">
                  <ArrowDownAZ className="h-3.5 w-3.5" /> Tên A → Z
                </span>
              </SelectItem>
              <SelectItem value="name-desc">
                <span className="flex items-center gap-2">
                  <ArrowUpZA className="h-3.5 w-3.5" /> Tên Z → A
                </span>
              </SelectItem>
              <SelectItem value="most-members">Nhiều nhân sự nhất</SelectItem>
              <SelectItem value="newest">Mới tạo nhất</SelectItem>
            </SelectContent>
          </Select>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              className={cn('rounded-lg', BRAND_BTN_SOLID)}
              onClick={() => setFormProject({ project: null })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Dự án
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn('rounded-lg', BRAND_BTN_OUTLINE)}
            onClick={() => setExpanded(new Set(visibleProjects.map((p) => p.id)))}
          >
            Mở tất cả
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-lg"
            onClick={() => setExpanded(new Set())}
          >
            Thu gọn
          </Button>
          <span className="text-xs text-muted-foreground">
            {visibleProjects.length}/{projects.length} dự án
          </span>
          {hasActiveFilter ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 rounded-md px-2 text-xs"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
                setSortKey('status')
              }}
            >
              Xóa lọc
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <Card className="border-danger/40 shadow-none">
            <CardContent className="py-6 text-sm text-danger">
              Không tải được danh sách dự án. Kiểm tra quyền và kết nối máy chủ.
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="border-2 border-dashed border-border/80 bg-muted/15 shadow-none">
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <FolderOpen className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">Chưa có dự án</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Tạo dự án rồi thêm nhân sự tham gia — dự án cũng hiện trong hồ sơ từng nhân sự.
                </p>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  className={cn('rounded-lg', BRAND_BTN_SOLID)}
                  onClick={() => setFormProject({ project: null })}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Tạo dự án đầu tiên
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : visibleProjects.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Không có dự án nào khớp bộ lọc.
          </p>
        ) : (
          <Accordion
            type="multiple"
            className="space-y-4"
            value={Array.from(expanded)}
            onValueChange={(vals) => setExpanded(new Set(vals))}
          >
            {visibleProjects.map((project) => (
              <AccordionItem
                key={project.id}
                value={project.id}
                className="group/card overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-primary/30 data-[state=open]:border-primary/30"
              >
                <div className="flex items-center gap-1 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:gap-2 sm:px-5 sm:py-3">
                  <AccordionTrigger className="-mx-1 flex min-w-0 flex-1 justify-start gap-0 py-0.5 sm:-mx-0">
                    <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                    <FolderKanban className="mx-2 h-5 w-5 shrink-0 text-primary" />
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-bold leading-snug">{project.name}</span>
                        <ProjectStatusBadge status={project.status} />
                      </span>
                      <span className="flex flex-col gap-0.5 text-xs font-normal text-muted-foreground">
                        <span>
                          {project.activeMemberCount} nhân sự đang tham gia
                          {project.startDate || project.endDate
                            ? ` · ${periodText(project.startDate, project.endDate)}`
                            : null}
                        </span>
                        {project.description ? (
                          <span className="line-clamp-2 w-full min-w-0 text-xs text-muted-foreground/90 sm:line-clamp-1 sm:max-w-[520px]">
                            {project.description}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </AccordionTrigger>
                  {canEdit ? (
                    <div
                      className="flex shrink-0 items-center gap-1 transition-opacity md:opacity-0 md:focus-within:opacity-100 md:group-hover/card:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      {project.status !== 'COMPLETED' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className={cn('h-8 rounded-md px-2.5 text-xs', BRAND_BTN_SOFT)}
                          onClick={() => setAddMemberProject(project)}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Nhân sự
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                        aria-label={`Sửa dự án ${project.name}`}
                        onClick={() => setFormProject({ project })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-md text-danger/80 hover:text-danger"
                        aria-label={`Xoá dự án ${project.name}`}
                        onClick={() => setDeleteTarget(project)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <AccordionContent className="px-0 pb-0">
                  <ProjectMembersTable
                    project={project}
                    open={expanded.has(project.id)}
                    canEdit={canEdit}
                    onAdd={() => setAddMemberProject(project)}
                    onEdit={(member) => setEditMember({ project, member })}
                    onRemove={(member) => setRemoveTarget({ project, member })}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {canEdit ? (
        <>
          <ProjectFormDialog
            open={formProject !== null}
            onOpenChange={(open) => {
              if (!open) setFormProject(null)
            }}
            project={formProject?.project ?? null}
            onCreated={(created) => setExpanded((prev) => new Set(prev).add(created.id))}
          />
          {addMemberProject ? (
            <AddProjectMembersDialog
              project={addMemberProject}
              open
              onOpenChange={(open) => {
                if (!open) setAddMemberProject(null)
              }}
            />
          ) : null}
          {editMember ? (
            <ProjectMembershipDialog
              employeeId={editMember.member.userId}
              employeeName={editMember.member.name}
              open
              onOpenChange={(open) => {
                if (!open) setEditMember(null)
              }}
              membership={editMembership}
              assignedProjectIds={[]}
            />
          ) : null}
          <ConfirmDialog
            open={removeTarget !== null}
            onOpenChange={(open) => {
              if (!open) setRemoveTarget(null)
            }}
            title="Gỡ nhân sự khỏi dự án?"
            description={`Xoá hẳn dòng tham gia của ${removeTarget?.member.name ?? ''} trong "${removeTarget?.project.name ?? ''}". Nếu chỉ thôi tham gia, hãy bấm Sửa và điền ngày rời dự án để giữ lịch sử.`}
            confirmLabel="Gỡ khỏi dự án"
            destructive
            onConfirm={() => {
              if (removeTarget) {
                removeMember.mutate({
                  employeeId: removeTarget.member.userId,
                  membershipId: removeTarget.member.membershipId,
                })
              }
              setRemoveTarget(null)
            }}
          />
          <ConfirmDialog
            open={deleteTarget !== null}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null)
            }}
            title="Xoá dự án?"
            description={`Chỉ xoá được dự án chưa từng có ai tham gia (vd. tạo nhầm). Dự án đã có nhân sự thì hãy chuyển trạng thái "Đã kết thúc" để giữ lịch sử.`}
            confirmLabel="Xoá dự án"
            destructive
            onConfirm={() => {
              if (deleteTarget) deleteProject.mutate(deleteTarget.id)
              setDeleteTarget(null)
            }}
          />
        </>
      ) : null}
    </div>
  )
}
