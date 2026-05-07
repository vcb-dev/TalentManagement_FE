import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  ArrowDownAZ,
  ArrowUpZA,
  Building2,
  ChevronDown,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/auth'
import {
  DIVISIONS_WITH_TEAMS_QUERY_KEY,
  orgCrudApi,
  organizationApi,
  teamMembersQueryKey,
  type EligibleUserRow,
  type OrgAdminDivisionRow,
  type OrgAdminTeamRow,
  type TeamMemberRow,
} from '@/features/organization/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { usePermission } from '@/hooks/usePermission'
import type { ApiError } from '@/types/api'

function readApiErrorMessage(err: unknown): string {
  if (isAxiosError<ApiError>(err)) {
    const m = err.response?.data?.message
    if (typeof m === 'string' && m.trim()) return m
    if (Array.isArray(m) && m.length) return m.join(', ')
  }
  if (err instanceof Error && err.message) return err.message
  return 'Đã xảy ra lỗi'
}

function OrgCrudNameDialog({
  open,
  title,
  description,
  name,
  onNameChange,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean
  title: string
  description?: string
  name: string
  onNameChange: (v: string) => void
  pending: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor="org-crud-name">Tên</Label>
          <Input
            id="org-crud-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Nhập tên…"
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSubmit()
              }
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button type="button" onClick={onSubmit} disabled={pending}>
            {pending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type DivisionFormValues = {
  name: string
  code: string
  description: string
  isActive: boolean
}

function DivisionFormDialog({
  open,
  mode,
  values,
  onChange,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: 'create' | 'edit'
  values: DivisionFormValues
  onChange: (next: DivisionFormValues) => void
  pending: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Thêm phòng ban' : 'Sửa phòng ban'}</DialogTitle>
          <DialogDescription>
            Phòng ban là đơn vị tổ chức cha chứa các team. Mã & mô tả chỉ bắt buộc nếu cần tra cứu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="division-name">
              Tên <span className="text-destructive">*</span>
            </Label>
            <Input
              id="division-name"
              value={values.name}
              onChange={(e) => onChange({ ...values, name: e.target.value })}
              placeholder="VD: Phòng Công nghệ"
              disabled={pending}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="division-code">Mã (tuỳ chọn)</Label>
            <Input
              id="division-code"
              value={values.code}
              onChange={(e) => onChange({ ...values, code: e.target.value })}
              placeholder="VD: CNTT"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="division-desc">Mô tả (tuỳ chọn)</Label>
            <Textarea
              id="division-desc"
              value={values.description}
              onChange={(e) => onChange({ ...values, description: e.target.value })}
              placeholder="Ghi chú ngắn gọn về phòng ban…"
              rows={3}
              disabled={pending}
            />
          </div>
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="division-active"
              checked={values.isActive}
              onCheckedChange={(v) => onChange({ ...values, isActive: v === true })}
              disabled={pending}
            />
            <div className="space-y-0.5">
              <Label htmlFor="division-active" className="cursor-pointer">
                Đang hoạt động
              </Label>
              <p className="text-xs text-muted-foreground">
                Bỏ đánh dấu nếu muốn lưu trữ phòng ban mà không xoá team.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button type="button" onClick={onSubmit} disabled={pending}>
            {pending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OrgCrudConfirmDialog({
  open,
  title,
  body,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  body: string
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? 'Đang xóa…' : 'Xóa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OrgStructureLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-8 md:px-4">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 max-w-[85%] rounded-lg" />
        <Skeleton className="h-4 w-full max-w-xl rounded" />
      </div>
      <Skeleton className="h-11 w-48 rounded-full" />
      <div className="space-y-4 pt-2" role="status" aria-busy aria-label="Đang tải cấu trúc">
        <span className="sr-only">Đang tải cấu trúc tổ chức…</span>
        {[0, 1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="flex flex-row flex-wrap items-center gap-4 border-b border-border/60 bg-muted/20 py-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-3 w-56 max-w-full rounded" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-28 rounded-full" />
                <Skeleton className="h-9 w-24 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="py-4">
              <Skeleton className="h-24 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function HrOrgStructure() {
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<string>>(new Set())
  const [membersTeamId, setMembersTeamId] = useState<string | null>(null)
  const [orgSearch, setOrgSearch] = useState('')
  const deferredOrgSearch = useDeferredValue(orgSearch)
  const [expandedAllTeamsByDept, setExpandedAllTeamsByDept] = useState<Record<string, boolean>>({})
  type TeamCountFilter = 'all' | 'with-teams' | 'without-teams'
  type StatusFilter = 'all' | 'active-only' | 'inactive-only'
  type SortKey = 'name-asc' | 'name-desc' | 'most-teams' | 'most-members'
  const [teamCountFilter, setTeamCountFilter] = useState<TeamCountFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name-asc')

  const queryClient = useQueryClient()
  const { canId } = usePermission()
  const canManageOrg = canId('hr.org.manage')

  type OrgCrudModal =
    | null
    | { kind: 'dept-create' }
    | { kind: 'dept-edit'; dept: OrgAdminDivisionRow }
    | { kind: 'dept-delete'; dept: OrgAdminDivisionRow }
    | { kind: 'team-create'; dept: OrgAdminDivisionRow }
    | { kind: 'team-edit'; team: OrgAdminTeamRow }
    | { kind: 'team-delete'; team: OrgAdminTeamRow }

  const [crudModal, setCrudModal] = useState<OrgCrudModal>(null)
  const [crudName, setCrudName] = useState('')
  const emptyDivisionForm = useMemo<DivisionFormValues>(
    () => ({ name: '', code: '', description: '', isActive: true }),
    []
  )
  const [divisionForm, setDivisionForm] = useState<DivisionFormValues>(emptyDivisionForm)

  const invalidateOrgStructure = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: DIVISIONS_WITH_TEAMS_QUERY_KEY })
  }, [queryClient])

  const createDeptM = useMutation({
    mutationFn: (payload: {
      name: string
      code?: string
      description?: string
      isActive?: boolean
    }) => orgCrudApi.createDivision(payload),
    onSuccess: () => {
      toast.success('Đã tạo phòng ban')
      setCrudModal(null)
      setDivisionForm(emptyDivisionForm)
      invalidateOrgStructure()
    },
    onError: (e) => toast.error(readApiErrorMessage(e)),
  })

  const updateDeptM = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: {
        name?: string
        code?: string
        description?: string
        isActive?: boolean
      }
    }) => orgCrudApi.updateDivision(id, payload),
    onSuccess: () => {
      toast.success('Đã cập nhật phòng ban')
      setCrudModal(null)
      setDivisionForm(emptyDivisionForm)
      invalidateOrgStructure()
    },
    onError: (e) => toast.error(readApiErrorMessage(e)),
  })

  const deleteDeptM = useMutation({
    mutationFn: (id: string) => orgCrudApi.deleteDivision(id),
    onSuccess: () => {
      toast.success('Đã xóa phòng ban')
      setCrudModal(null)
      invalidateOrgStructure()
    },
    onError: (e) => toast.error(readApiErrorMessage(e)),
  })

  const createTeamM = useMutation({
    mutationFn: ({ name, divisionId }: { name: string; divisionId: string }) =>
      orgCrudApi.createTeam(name, divisionId),
    onSuccess: () => {
      toast.success('Đã tạo team')
      setCrudModal(null)
      setCrudName('')
      invalidateOrgStructure()
    },
    onError: (e) => toast.error(readApiErrorMessage(e)),
  })

  const updateTeamM = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => orgCrudApi.updateTeam(id, { name }),
    onSuccess: () => {
      toast.success('Đã cập nhật team')
      setCrudModal(null)
      setCrudName('')
      invalidateOrgStructure()
    },
    onError: (e) => toast.error(readApiErrorMessage(e)),
  })

  const deleteTeamM = useMutation({
    mutationFn: (id: string) => orgCrudApi.deleteTeam(id),
    onSuccess: (_data, id) => {
      toast.success('Đã xóa team')
      setCrudModal(null)
      setMembersTeamId((cur) => (cur === id ? null : cur))
      invalidateOrgStructure()
    },
    onError: (e) => toast.error(readApiErrorMessage(e)),
  })

  const orgCrudPending =
    createDeptM.isPending ||
    updateDeptM.isPending ||
    deleteDeptM.isPending ||
    createTeamM.isPending ||
    updateTeamM.isPending ||
    deleteTeamM.isPending

  const openCreateDepartment = useCallback(() => {
    setDivisionForm(emptyDivisionForm)
    setCrudModal({ kind: 'dept-create' })
  }, [emptyDivisionForm])

  const openEditDepartment = useCallback((dept: OrgAdminDivisionRow) => {
    setDivisionForm({
      name: dept.name,
      code: dept.code ?? '',
      description: dept.description ?? '',
      isActive: dept.isActive,
    })
    setCrudModal({ kind: 'dept-edit', dept })
  }, [])

  const openCreateTeamForDept = useCallback((dept: OrgAdminDivisionRow) => {
    setCrudName('')
    setCrudModal({ kind: 'team-create', dept })
  }, [])

  const submitDivisionForm = useCallback(() => {
    const name = divisionForm.name.trim()
    if (!name) {
      toast.error('Vui lòng nhập tên phòng ban')
      return
    }
    const code = divisionForm.code.trim()
    const description = divisionForm.description.trim()
    if (crudModal?.kind === 'dept-create') {
      createDeptM.mutate({
        name,
        code: code || undefined,
        description: description || undefined,
        isActive: divisionForm.isActive,
      })
    } else if (crudModal?.kind === 'dept-edit') {
      updateDeptM.mutate({
        id: crudModal.dept.id,
        payload: {
          name,
          code,
          description,
          isActive: divisionForm.isActive,
        },
      })
    }
  }, [crudModal, divisionForm, createDeptM, updateDeptM])

  const submitNameModal = useCallback(() => {
    const name = crudName.trim()
    if (!name) {
      toast.error('Vui lòng nhập tên')
      return
    }
    if (!crudModal) return
    if (crudModal.kind === 'team-create')
      createTeamM.mutate({ name, divisionId: crudModal.dept.id })
    else if (crudModal.kind === 'team-edit') updateTeamM.mutate({ id: crudModal.team.id, name })
  }, [crudModal, crudName, createTeamM, updateTeamM])

  const submitDeleteModal = useCallback(() => {
    if (!crudModal) return
    if (crudModal.kind === 'dept-delete') deleteDeptM.mutate(crudModal.dept.id)
    if (crudModal.kind === 'team-delete') deleteTeamM.mutate(crudModal.team.id)
  }, [crudModal, deleteDeptM, deleteTeamM])

  const structureQ = useQuery({
    queryKey: DIVISIONS_WITH_TEAMS_QUERY_KEY,
    queryFn: () => organizationApi.listDivisionsWithTeams(),
    enabled: !isMockApiEnabled(),
  })

  useEffect(() => {
    const list = structureQ.data
    if (!list?.length) return
    const id = window.setTimeout(() => {
      setExpandedDeptIds((prev) => {
        if (prev.size > 0) return prev
        return new Set([list[0]!.id])
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [structureQ.data])

  const toggleTeamMembers = useCallback((deptId: string, teamId: string) => {
    setExpandedDeptIds((prev) => new Set(prev).add(deptId))
    setMembersTeamId((cur) => (cur === teamId ? null : teamId))
  }, [])

  const membersQ = useQuery({
    queryKey: membersTeamId
      ? teamMembersQueryKey(membersTeamId)
      : ['organization', 'team-members', 'none'],
    queryFn: () => organizationApi.getTeamMembers(membersTeamId!),
    enabled: Boolean(membersTeamId) && !isMockApiEnabled(),
  })

  const departments = useMemo(() => structureQ.data ?? [], [structureQ.data])
  const summary = useMemo(() => {
    const deptCount = departments.length
    const teamCount = departments.reduce((acc, d) => acc + d.teams.length, 0)
    const memberCount = departments.reduce(
      (acc, d) => acc + d.teams.reduce((sum, t) => sum + t._count.users, 0),
      0
    )
    return { deptCount, teamCount, memberCount }
  }, [departments])
  const filteredDepartments = useMemo(() => {
    const q = deferredOrgSearch.trim().toLowerCase()
    let list: OrgAdminDivisionRow[] = departments
    if (q) {
      list = list
        .map((dept) => {
          const deptMatched =
            dept.name.toLowerCase().includes(q) ||
            dept.id.toLowerCase().includes(q) ||
            (dept.code ?? '').toLowerCase().includes(q)
          if (deptMatched) return dept
          const teams = dept.teams.filter((team) => {
            return team.name.toLowerCase().includes(q) || team.id.toLowerCase().includes(q)
          })
          return { ...dept, teams }
        })
        .filter((dept) => {
          const deptMatched =
            dept.name.toLowerCase().includes(q) ||
            dept.id.toLowerCase().includes(q) ||
            (dept.code ?? '').toLowerCase().includes(q)
          return deptMatched || dept.teams.length > 0
        })
    }
    if (teamCountFilter === 'with-teams') {
      list = list.filter((d) => d.teams.length > 0)
    } else if (teamCountFilter === 'without-teams') {
      list = list.filter((d) => d.teams.length === 0)
    }
    if (statusFilter === 'active-only') {
      list = list.filter((d) => d.isActive)
    } else if (statusFilter === 'inactive-only') {
      list = list.filter((d) => !d.isActive)
    }
    const sorted = [...list]
    if (sortKey === 'name-asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    } else if (sortKey === 'name-desc') {
      sorted.sort((a, b) => b.name.localeCompare(a.name, 'vi'))
    } else if (sortKey === 'most-teams') {
      sorted.sort((a, b) => b.teams.length - a.teams.length || a.name.localeCompare(b.name, 'vi'))
    } else if (sortKey === 'most-members') {
      const sumMembers = (d: OrgAdminDivisionRow) =>
        d.teams.reduce((acc, t) => acc + t._count.users, 0)
      sorted.sort((a, b) => sumMembers(b) - sumMembers(a) || a.name.localeCompare(b.name, 'vi'))
    }
    return sorted
  }, [departments, deferredOrgSearch, teamCountFilter, statusFilter, sortKey])

  const hasActiveFilter =
    Boolean(orgSearch.trim()) ||
    teamCountFilter !== 'all' ||
    statusFilter !== 'all' ||
    sortKey !== 'name-asc'

  let activeMemberContext: { team: OrgAdminTeamRow; deptName: string } | null = null
  if (membersTeamId) {
    for (const d of departments) {
      const t = d.teams.find((x) => x.id === membersTeamId)
      if (t) {
        activeMemberContext = { team: t, deptName: d.name }
        break
      }
    }
  }

  const mockBanner = isMockApiEnabled()

  if (structureQ.isLoading && !mockBanner) {
    return <OrgStructureLoading />
  }

  if (structureQ.isError && !mockBanner) {
    return (
      <div className="mx-auto max-w-[1400px] px-3 py-10 md:px-4">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-base font-medium text-destructive">
              Không tải được dữ liệu. Kiểm tra quyền{' '}
              <code className="rounded bg-muted px-1">hr.org.manage</code> và kết nối API.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-8 md:px-4">
      <div
        className={cn(
          'mb-8 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent p-4 md:p-6',
          PAGE_HEADER_SURFACE
        )}
      >
        <h1 className={PAGE_HEADER_TITLE}>
          <span className={PAGE_HEADER_GRADIENT}>Phòng ban & Team</span>
        </h1>
        <p className={PAGE_HEADER_DESCRIPTION}>
          Một phòng ban (đơn vị tổ chức) chứa nhiều team. Mở rộng từng phòng ban để xem team và
          thành viên. Nếu có quyền <code className="rounded bg-muted px-1">hr.org.manage</code>, bạn
          có thể thêm / sửa / xóa phòng ban và team qua API{' '}
          <code className="rounded bg-muted px-1">/org/divisions</code> và{' '}
          <code className="rounded bg-muted px-1">/org/teams</code>.
        </p>
      </div>

      {mockBanner && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/10 shadow-none">
          <CardContent className="py-3 text-sm text-amber-950 dark:text-amber-100">
            Đang bật mock API — quản trị org thật cần tắt mock và gọi server.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card shadow-sm">
            <CardContent className="py-3">
              <p className="text-xs font-medium text-primary">Phòng ban</p>
              <p className="text-2xl font-semibold text-foreground tabular-nums drop-shadow-sm">
                {summary.deptCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-accent/40 bg-gradient-to-br from-accent/15 via-card to-card shadow-sm">
            <CardContent className="py-3">
              <p className="text-xs font-medium text-accent">Team</p>
              <p className="text-2xl font-semibold text-foreground tabular-nums drop-shadow-sm">
                {summary.teamCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-blue-500/35 bg-gradient-to-br from-blue-500/15 via-card to-card shadow-sm">
            <CardContent className="py-3">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Thành viên (gộp team)
              </p>
              <p className="text-2xl font-semibold text-foreground tabular-nums drop-shadow-sm">
                {summary.memberCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-accent/25 bg-gradient-to-r from-card via-muted/25 to-accent/10 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="pl-9"
                placeholder="Tìm theo tên / mã phòng ban, team..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canManageOrg && !mockBanner ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={openCreateDepartment}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Phòng ban
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-primary/35 text-primary hover:bg-primary/10"
                onClick={() => setExpandedDeptIds(new Set(filteredDepartments.map((d) => d.id)))}
              >
                Mở tất cả
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-accent hover:bg-accent/15 hover:text-accent"
                onClick={() => setExpandedDeptIds(new Set())}
              >
                Thu gọn
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <Label className="shrink-0 text-xs font-medium text-muted-foreground">Team</Label>
              <Select
                value={teamCountFilter}
                onValueChange={(v) => setTeamCountFilter(v as TeamCountFilter)}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="with-teams">Có team</SelectItem>
                  <SelectItem value="without-teams">Chưa có team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Label className="shrink-0 text-xs font-medium text-muted-foreground">
                Trạng thái
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active-only">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive-only">Ngưng dùng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Label className="shrink-0 text-xs font-medium text-muted-foreground">Sắp xếp</Label>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                  <SelectItem value="most-teams">Nhiều team nhất</SelectItem>
                  <SelectItem value="most-members">Nhiều thành viên nhất</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {filteredDepartments.length}/{departments.length} phòng ban
              </span>
              {hasActiveFilter ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setOrgSearch('')
                    setTeamCountFilter('all')
                    setStatusFilter('all')
                    setSortKey('name-asc')
                  }}
                >
                  Xóa lọc
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {departments.length === 0 && !structureQ.isLoading && (
          <Card className="border-dashed border-2 border-border/80 bg-muted/15 shadow-none">
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <FolderOpen className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">Chưa có phòng ban</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Hãy tạo phòng ban trước. Sau khi có phòng ban, bạn mới có thể tạo team trong phòng
                  ban đó.
                </p>
              </div>
              {canManageOrg && !mockBanner ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={openCreateDepartment}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Tạo phòng ban đầu tiên
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
        <Accordion
          type="multiple"
          className="space-y-4"
          value={Array.from(expandedDeptIds)}
          onValueChange={(vals) => setExpandedDeptIds(new Set(vals))}
        >
          {filteredDepartments.map((dept) => (
            <AccordionItem
              key={dept.id}
              value={dept.id}
              className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm transition-[box-shadow,ring,border-color] data-[state=open]:border-primary/35 data-[state=open]:shadow-[0_10px_40px_rgb(106_90_224/0.16)] data-[state=open]:ring-1 data-[state=open]:ring-primary/20"
            >
              <div className="flex items-start gap-1 border-b border-border/60 bg-gradient-to-r from-primary/10 via-card to-accent/10 px-2 py-3 sm:gap-2 sm:px-4 sm:py-4">
                <AccordionTrigger className="-mx-1 flex min-w-0 flex-1 justify-start gap-0 py-1 sm:-mx-0">
                  <ChevronDown className="chevron-accordion mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                  <Building2 className="mx-2 mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold leading-snug">{dept.name}</span>
                      {dept.code ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/5 font-mono text-[11px] font-normal uppercase tracking-wide text-primary"
                        >
                          {dept.code}
                        </Badge>
                      ) : null}
                      {!dept.isActive && (
                        <Badge
                          variant="outline"
                          className="border-destructive/50 bg-destructive/10 text-destructive"
                        >
                          Ngưng dùng
                        </Badge>
                      )}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/10 font-normal tabular-nums text-primary"
                      >
                        {dept.teams.length} team
                      </Badge>
                      {dept.description ? (
                        <span className="line-clamp-1 max-w-[420px] text-xs text-muted-foreground/90">
                          {dept.description}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </AccordionTrigger>
                {canManageOrg && !mockBanner ? (
                  <div
                    className="flex shrink-0 items-center gap-1 pt-0.5"
                    onClick={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 rounded-full px-2.5 text-xs"
                      onClick={() => openCreateTeamForDept(dept)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Team
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label="Sửa phòng ban"
                      onClick={() => openEditDepartment(dept)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive/80 hover:text-destructive"
                      aria-label="Xóa phòng ban"
                      onClick={() => setCrudModal({ kind: 'dept-delete', dept })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
              <AccordionContent className="px-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow className="border-b border-border/80 bg-gradient-to-r from-primary/10 via-muted/20 to-accent/10 hover:bg-muted/25">
                        <TableHead className="w-[28%] pl-6">Team</TableHead>
                        <TableHead className="max-w-[260px]">Leader</TableHead>
                        <TableHead className="w-[108px]">Thành viên</TableHead>
                        <TableHead className="pr-6 text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dept.teams.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={4} className="py-10 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <p className="text-sm text-muted-foreground">
                                Chưa có team trong phòng ban này.
                              </p>
                              {canManageOrg && !mockBanner ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="rounded-full"
                                  onClick={() => openCreateTeamForDept(dept)}
                                >
                                  <Plus className="mr-1 h-3.5 w-3.5" />
                                  Tạo team đầu tiên
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        (expandedAllTeamsByDept[dept.id] ? dept.teams : dept.teams.slice(0, 6)).map(
                          (team) => (
                            <FragmentTeamRow
                              key={team.id}
                              team={team}
                              membersOpen={membersTeamId === team.id}
                              onOpenMembers={() => toggleTeamMembers(dept.id, team.id)}
                              canManageOrg={canManageOrg}
                              mockBanner={mockBanner}
                              onEditTeam={() => {
                                setCrudName(team.name)
                                setCrudModal({ kind: 'team-edit', team })
                              }}
                              onDeleteTeam={() => setCrudModal({ kind: 'team-delete', team })}
                            />
                          )
                        )
                      )}
                    </TableBody>
                  </Table>
                  {dept.teams.length > 6 ? (
                    <div className="flex justify-center border-t border-border/60 bg-gradient-to-r from-primary/5 to-accent/5 px-4 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedAllTeamsByDept((prev) => ({
                            ...prev,
                            [dept.id]: !prev[dept.id],
                          }))
                        }
                      >
                        {expandedAllTeamsByDept[dept.id]
                          ? 'Thu gọn team'
                          : `Xem thêm ${dept.teams.length - 6} team`}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {orgSearch.trim() && filteredDepartments.length === 0 ? (
          <Card className="border-dashed border-border/80 bg-muted/15 shadow-none">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Không có phòng ban hoặc team nào khớp từ khóa tìm kiếm.
            </CardContent>
          </Card>
        ) : null}
      </div>

      {activeMemberContext && membersTeamId && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setMembersTeamId(null)
          }}
        >
          <DialogContent className="flex h-[min(92vh,900px)] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
            <TeamMembersPanel
              teamId={activeMemberContext.team.id}
              teamName={activeMemberContext.team.name}
              deptLabel={activeMemberContext.deptName}
              members={membersQ.data?.members ?? []}
              loading={membersQ.isLoading}
              canManage={canManageOrg && !mockBanner}
            />
          </DialogContent>
        </Dialog>
      )}

      <DivisionFormDialog
        open={Boolean(
          crudModal && (crudModal.kind === 'dept-create' || crudModal.kind === 'dept-edit')
        )}
        mode={crudModal?.kind === 'dept-edit' ? 'edit' : 'create'}
        values={divisionForm}
        onChange={setDivisionForm}
        pending={orgCrudPending}
        onClose={() => {
          setCrudModal(null)
          setDivisionForm(emptyDivisionForm)
        }}
        onSubmit={submitDivisionForm}
      />

      <OrgCrudNameDialog
        open={Boolean(
          crudModal && (crudModal.kind === 'team-create' || crudModal.kind === 'team-edit')
        )}
        title={
          crudModal?.kind === 'team-create'
            ? `Thêm team trong «${crudModal.dept.name}»`
            : crudModal?.kind === 'team-edit'
              ? 'Sửa team'
              : ''
        }
        description={
          crudModal?.kind === 'team-create'
            ? `Team sẽ được gán cứng vào phòng ban «${crudModal.dept.name}». Sau đó bạn có thể gán nhân sự cho team.`
            : undefined
        }
        name={crudName}
        onNameChange={setCrudName}
        pending={orgCrudPending}
        onClose={() => {
          setCrudModal(null)
          setCrudName('')
        }}
        onSubmit={submitNameModal}
      />

      <OrgCrudConfirmDialog
        open={Boolean(
          crudModal && (crudModal.kind === 'dept-delete' || crudModal.kind === 'team-delete')
        )}
        title={crudModal?.kind === 'dept-delete' ? 'Xóa phòng ban?' : 'Xóa team?'}
        body={
          crudModal?.kind === 'dept-delete'
            ? `Xóa phòng ban «${crudModal.dept.name}»? Thao tác có thể thất bại nếu còn nhân sự tham chiếu.`
            : crudModal?.kind === 'team-delete'
              ? `Xóa team «${crudModal.team.name}»? Thao tác có thể thất bại nếu còn nhân sự tham chiếu.`
              : ''
        }
        pending={orgCrudPending}
        onClose={() => setCrudModal(null)}
        onConfirm={submitDeleteModal}
      />
    </div>
  )
}

function FragmentTeamRow({
  team,
  membersOpen,
  onOpenMembers,
  canManageOrg,
  mockBanner,
  onEditTeam,
  onDeleteTeam,
}: {
  team: OrgAdminTeamRow
  membersOpen: boolean
  onOpenMembers: () => void
  canManageOrg: boolean
  mockBanner: boolean
  onEditTeam: () => void
  onDeleteTeam: () => void
}) {
  return (
    <TableRow
      className={cn(
        'group transition-colors odd:bg-muted/[0.16] even:bg-card hover:bg-primary/[0.06]',
        membersOpen && 'bg-primary/[0.10]'
      )}
    >
      <TableCell className="pl-6 align-top">
        <div className="font-semibold text-foreground">{team.name}</div>
      </TableCell>
      <TableCell className="max-w-[260px] align-top text-sm text-muted-foreground">—</TableCell>
      <TableCell className="align-top">
        <Badge variant="outline" className="border-accent/35 bg-accent/10 tabular-nums text-accent">
          {team._count.users}
        </Badge>
      </TableCell>
      <TableCell className="pr-6 text-right align-top">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canManageOrg && !mockBanner ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Sửa team"
                onClick={onEditTeam}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-destructive/80 hover:text-destructive"
                aria-label="Xóa team"
                onClick={onDeleteTeam}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant={membersOpen ? 'secondary' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={onOpenMembers}
          >
            <Users className="h-3.5 w-3.5" />
            {membersOpen ? 'Đóng' : 'Thành viên'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

const MEMBER_STATUS_VI: Record<TeamMemberRow['status'], string> = {
  ACTIVE: 'Đang làm việc',
  INACTIVE: 'Đã nghỉ việc',
  PROBATION: 'Thử việc',
  RESERVED: 'Dự bị / bảo lưu',
}

function memberStatusBadgeClassName(status: TeamMemberRow['status']) {
  return cn(
    'font-normal',
    status === 'INACTIVE' && 'border-destructive/45 text-destructive',
    status === 'PROBATION' && 'border-amber-500/45 text-amber-800 dark:text-amber-100',
    status === 'RESERVED' && 'border-blue-500/40 text-blue-800 dark:text-blue-100',
    status === 'ACTIVE' && 'border-emerald-600/35 text-emerald-800 dark:text-emerald-100'
  )
}

function memberRowDisplayName(m: TeamMemberRow): string {
  return m.displayName?.trim() || m.email?.trim() || m.userId.slice(0, 8)
}

function memberRowInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]![0]
    const b = parts[parts.length - 1]![0]
    return `${a}${b}`.toUpperCase()
  }
  const p = name.trim()
  if (p.length >= 2) return p.slice(0, 2).toUpperCase()
  return `${p[0] ?? '?'}?`.toUpperCase()
}

function TeamMemberAvatarCell({ m }: { m: TeamMemberRow }) {
  const label = memberRowDisplayName(m)
  const raw = m.avatarUrl?.trim()
  const src = raw && /^https?:\/\//i.test(raw) ? raw : null
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
        loading="lazy"
      />
    )
  }
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-primary/5 text-xs font-semibold text-primary ring-1 ring-primary/15"
      aria-hidden
    >
      {memberRowInitials(label)}
    </div>
  )
}

function memberRowRole(m: TeamMemberRow): Role {
  const r = m.role
  if (
    r === 'MEMBER' ||
    r === 'LEADER' ||
    r === 'MANAGER' ||
    r === 'HR' ||
    r === 'TEACHER' ||
    r === 'BOD'
  )
    return r
  return 'MEMBER'
}

function memberRowStatus(m: TeamMemberRow): TeamMemberRow['status'] {
  const s = m.status
  if (s === 'ACTIVE' || s === 'INACTIVE' || s === 'PROBATION' || s === 'RESERVED') return s
  return 'ACTIVE'
}

function TeamMembersPanel({
  teamId,
  teamName,
  deptLabel,
  members,
  loading,
  canManage,
}: {
  teamId: string
  teamName: string
  deptLabel: string
  members: TeamMemberRow[]
  loading: boolean
  canManage: boolean
}) {
  const [tableFilter, setTableFilter] = useState('')
  const deferredTableFilter = useDeferredValue(tableFilter)
  const queryClient = useQueryClient()

  const [addOpen, setAddOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<TeamMemberRow | null>(null)

  const invalidateMembers = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: teamMembersQueryKey(teamId) })
    void queryClient.invalidateQueries({ queryKey: DIVISIONS_WITH_TEAMS_QUERY_KEY })
  }, [queryClient, teamId])

  const addMemberM = useMutation({
    mutationFn: (userId: string) => organizationApi.addTeamMember(teamId, userId),
    onSuccess: (data) => {
      if (data.movedFromTeamId) {
        toast.success('Đã chuyển nhân sự sang team này (đã gỡ khỏi team cũ)')
        void queryClient.invalidateQueries({
          queryKey: teamMembersQueryKey(data.movedFromTeamId),
        })
      } else {
        toast.success('Đã thêm thành viên vào team')
      }
      invalidateMembers()
      void queryClient.invalidateQueries({ queryKey: ['organization', 'eligible-users'] })
    },
    onError: (e) => toast.error(readApiErrorMessage(e)),
  })

  const removeMemberM = useMutation({
    mutationFn: (userId: string) => organizationApi.removeTeamMember(teamId, userId),
    onSuccess: () => {
      toast.success('Đã xoá thành viên khỏi team')
      setPendingRemove(null)
      invalidateMembers()
    },
    onError: (e) => toast.error(readApiErrorMessage(e)),
  })

  const filteredMembers = useMemo(() => {
    const q = deferredTableFilter.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => {
      const name = (m.displayName ?? '').toLowerCase()
      const email = (m.email ?? '').toLowerCase()
      const code = (m.employeeCodePrimary ?? '').toLowerCase()
      const role = ROLE_LABEL_VI[memberRowRole(m)].toLowerCase()
      const st = MEMBER_STATUS_VI[memberRowStatus(m)].toLowerCase()
      return (
        name.includes(q) ||
        email.includes(q) ||
        code.includes(q) ||
        role.includes(q) ||
        st.includes(q)
      )
    })
  }, [members, deferredTableFilter])

  const existingMemberIds = useMemo(() => new Set(members.map((m) => m.userId)), [members])

  return (
    <>
      <DialogHeader className="shrink-0 space-y-1 border-b border-border/70 bg-gradient-to-r from-primary/[0.08] via-card to-card px-6 py-5 pr-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Thành viên team
        </p>
        <DialogTitle className="text-left text-xl font-semibold">
          <span className="text-primary">{teamName}</span>
          <span className="font-normal text-muted-foreground"> · {deptLabel}</span>
        </DialogTitle>
        <DialogDescription asChild>
          <div className="text-left">
            <span className="mt-2 block text-xs text-muted-foreground">
              {canManage
                ? 'Quản lý thành viên trực tiếp trong team: bấm "Thêm thành viên" để gán nhân sự, hoặc xoá khỏi team qua nút trong cột "Hành động".'
                : 'Chỉ xem danh sách thành viên. Để thêm / xoá thành viên cần quyền hr.org.manage.'}
            </span>
          </div>
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/50 bg-muted/15 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <Label htmlFor="team-members-table-filter" className="text-xs text-muted-foreground">
                Tìm trong bảng
              </Label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="team-members-table-filter"
                  className="pl-9"
                  placeholder="Tên, email, mã NV, vai trò, trạng thái…"
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            {canManage ? (
              <Button
                type="button"
                className="sm:shrink-0"
                onClick={() => setAddOpen(true)}
                disabled={addMemberM.isPending}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Thêm thành viên
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-2 pb-2 sm:px-4 sm:pb-4">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">Chưa có thành viên trong team.</p>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setAddOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Thêm thành viên đầu tiên
                </Button>
              ) : null}
            </div>
          ) : (
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[52px] pl-3">Avatar</TableHead>
                  <TableHead className="min-w-[140px]">Tên thành viên</TableHead>
                  <TableHead className="min-w-[180px]">Email</TableHead>
                  <TableHead className="min-w-[130px]">Vai trò</TableHead>
                  <TableHead className="min-w-[130px]">Trạng thái</TableHead>
                  {canManage ? (
                    <TableHead className="w-[96px] text-right pr-3">Hành động</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={canManage ? 6 : 5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Không có dòng nào khớp bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((m) => {
                    const role = memberRowRole(m)
                    const status = memberRowStatus(m)
                    const removing = removeMemberM.isPending && removeMemberM.variables === m.userId
                    return (
                      <TableRow key={m.userId} className="group">
                        <TableCell className="pl-3 align-middle">
                          <TeamMemberAvatarCell m={m} />
                        </TableCell>
                        <TableCell className="align-middle font-medium">
                          <div className="max-w-[220px] truncate">{memberRowDisplayName(m)}</div>
                          {m.employeeCodePrimary ? (
                            <div className="truncate text-xs font-normal text-muted-foreground">
                              <span className="font-medium text-muted-foreground/90">Mã NV:</span>{' '}
                              {m.employeeCodePrimary}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="align-middle text-sm text-muted-foreground">
                          <span className="line-clamp-2 break-all">{m.email ?? '—'}</span>
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm">{ROLE_LABEL_VI[role]}</span>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <Badge variant="outline" className={memberStatusBadgeClassName(status)}>
                            {MEMBER_STATUS_VI[status]}
                          </Badge>
                        </TableCell>
                        {canManage ? (
                          <TableCell className="pr-3 text-right align-middle">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setPendingRemove(m)}
                              disabled={removing}
                              title="Xoá khỏi team"
                            >
                              <UserMinus className="mr-1.5 h-4 w-4" />
                              {removing ? 'Đang xoá…' : 'Xoá'}
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {canManage && addOpen ? (
        <AddTeamMemberDialog
          teamId={teamId}
          teamName={teamName}
          existingMemberIds={existingMemberIds}
          pending={addMemberM.isPending}
          onClose={() => setAddOpen(false)}
          onPick={(userId) => addMemberM.mutate(userId)}
        />
      ) : null}

      {canManage ? (
        <OrgCrudConfirmDialog
          open={Boolean(pendingRemove)}
          title="Xoá thành viên khỏi team?"
          body={
            pendingRemove
              ? `Sẽ gỡ «${memberRowDisplayName(pendingRemove)}» khỏi team «${teamName}». Hành động này không xoá tài khoản; có thể thêm lại sau.`
              : ''
          }
          pending={removeMemberM.isPending}
          onClose={() => {
            if (!removeMemberM.isPending) setPendingRemove(null)
          }}
          onConfirm={() => {
            if (pendingRemove) removeMemberM.mutate(pendingRemove.userId)
          }}
        />
      ) : null}
    </>
  )
}

function AddTeamMemberDialog({
  teamId,
  teamName,
  existingMemberIds,
  pending,
  onClose,
  onPick,
}: {
  teamId: string
  teamName: string
  existingMemberIds: Set<string>
  pending: boolean
  onClose: () => void
  onPick: (userId: string) => void
}) {
  const [q, setQ] = useState('')
  const deferredQ = useDeferredValue(q)

  const eligibleQ = useQuery({
    queryKey: ['organization', 'eligible-users', teamId, deferredQ.trim()] as const,
    queryFn: () => organizationApi.searchEligibleUsers(teamId, deferredQ.trim() || undefined, 20),
    enabled: !isMockApiEnabled(),
    staleTime: 15_000,
  })

  const rows = useMemo(() => {
    const list = eligibleQ.data ?? []
    return list.filter((r) => !existingMemberIds.has(r.userId))
  }, [eligibleQ.data, existingMemberIds])

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onClose()
      }}
    >
      <DialogContent className="flex h-[min(86vh,720px)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/70 px-6 py-5">
          <DialogTitle>Thêm thành viên vào «{teamName}»</DialogTitle>
          <DialogDescription>
            Tìm theo tên, email hoặc mã nhân viên. Nhân sự đang thuộc team khác sẽ được chuyển sang
            team này khi bạn chọn.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-border/50 px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Nhập từ khoá…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              autoComplete="off"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-3 py-2 sm:px-4">
          {eligibleQ.isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {deferredQ.trim()
                  ? 'Không tìm thấy nhân sự phù hợp.'
                  : 'Gõ để tìm nhân sự cần thêm vào team.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((r) => (
                <EligibleUserRowItem
                  key={r.userId}
                  row={r}
                  pending={pending}
                  onPick={() => onPick(r.userId)}
                />
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/70 px-6 py-3 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EligibleUserRowItem({
  row,
  pending,
  onPick,
}: {
  row: EligibleUserRow
  pending: boolean
  onPick: () => void
}) {
  const name = row.displayName?.trim() || row.email?.trim() || '—'
  return (
    <li className="flex items-center gap-3 px-2 py-2.5 sm:px-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
        {row.avatarUrl ? (
          <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{(name[0] ?? '?').toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {row.employeeCodePrimary ? <span>{row.employeeCodePrimary}</span> : null}
          {row.email ? <span className="truncate">{row.email}</span> : null}
        </div>
        {row.currentTeamName ? (
          <div className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
            Đang thuộc team: {row.currentTeamName} (sẽ chuyển sang team mới)
          </div>
        ) : (
          <div className="mt-0.5 text-[11px] text-muted-foreground">Chưa thuộc team nào</div>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={onPick}
        disabled={pending}
      >
        <UserPlus className="mr-1.5 h-4 w-4" />
        Thêm
      </Button>
    </li>
  )
}
