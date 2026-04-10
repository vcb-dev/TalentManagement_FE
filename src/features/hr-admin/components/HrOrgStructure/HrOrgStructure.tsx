import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  ChevronDown,
  FolderOpen,
  Hash,
  Pencil,
  Plus,
  Search,
  UserMinus,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/auth'
import {
  DEPTS_WITH_TEAMS_QUERY_KEY,
  organizationApi,
  teamMembersQueryKey,
  type OrgAdminDepartmentRow,
  type OrgAdminTeamRow,
  type TeamMemberRow,
} from '@/features/organization/api'
import { employeeApi, type EmployeeEntity } from '@/features/hr-admin/api'
import { ORG_TREE_KEY } from '@/features/hr-admin/useHrOrgTree'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { toast } from 'sonner'

/** Ô tìm rỗng → trả về '' ngay; có ký tự → debounce để tránh gọi API mỗi lần gõ. */
function useEmployeePickSearch(raw: string, ms: number): string {
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = raw.trim()
    if (t === '') {
      const clearZero = window.setTimeout(() => setDebounced(''), 0)
      return () => window.clearTimeout(clearZero)
    }
    const id = window.setTimeout(() => setDebounced(t), ms)
    return () => window.clearTimeout(id)
  }, [raw, ms])
  return raw.trim() === '' ? '' : debounced
}

function invalidateOrgQueries(qc: ReturnType<typeof useQueryClient>, teamId?: string) {
  void qc.invalidateQueries({ queryKey: DEPTS_WITH_TEAMS_QUERY_KEY })
  void qc.invalidateQueries({ queryKey: ORG_TREE_KEY })
  void qc.invalidateQueries({ queryKey: ['organization-departments'] })
  if (teamId) void qc.invalidateQueries({ queryKey: teamMembersQueryKey(teamId) })
}

function OrgStructureLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-8 md:px-4">
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
  const qc = useQueryClient()
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<string>>(new Set())
  const [membersTeamId, setMembersTeamId] = useState<string | null>(null)
  const [empSearch, setEmpSearch] = useState('')
  const pickSearch = useEmployeePickSearch(empSearch, 320)

  const [deptModal, setDeptModal] = useState<
    null | { mode: 'create' } | { mode: 'edit'; dept: OrgAdminDepartmentRow }
  >(null)
  const [teamModal, setTeamModal] = useState<
    | null
    | { mode: 'create'; departmentId: string; departmentName: string }
    | { mode: 'edit'; team: OrgAdminTeamRow; departmentName: string }
  >(null)

  const structureQ = useQuery({
    queryKey: DEPTS_WITH_TEAMS_QUERY_KEY,
    queryFn: () => organizationApi.listDepartmentsWithTeams(),
    enabled: !isMockApiEnabled(),
  })

  useEffect(() => {
    const list = structureQ.data
    if (!list?.length) return
    const id = window.setTimeout(() => {
      setExpandedDeptIds((prev) => {
        if (prev.size > 0) return prev
        return new Set(list.map((d) => d.id))
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [structureQ.data])

  useEffect(() => {
    const id = window.setTimeout(() => setEmpSearch(''), 0)
    return () => window.clearTimeout(id)
  }, [membersTeamId])

  const toggleTeamMembers = useCallback((deptId: string, teamId: string) => {
    setExpandedDeptIds((prev) => new Set(prev).add(deptId))
    setMembersTeamId((cur) => (cur === teamId ? null : teamId))
  }, [])

  const createDept = useMutation({
    mutationFn: (body: { name: string }) => organizationApi.createDepartment(body),
    onSuccess: () => {
      toast.success('Đã tạo phòng ban')
      invalidateOrgQueries(qc)
      setDeptModal(null)
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? e.message ?? 'Lỗi tạo phòng ban')
    },
  })

  const patchDept = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; isActive?: boolean } }) =>
      organizationApi.patchDepartment(id, body),
    onSuccess: () => {
      toast.success('Đã cập nhật phòng ban')
      invalidateOrgQueries(qc)
      setDeptModal(null)
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? e.message ?? 'Lỗi cập nhật')
    },
  })

  const createTeam = useMutation({
    mutationFn: (body: { name: string; departmentId: string; leaderUserId?: string | null }) =>
      organizationApi.createTeam(body),
    onSuccess: () => {
      toast.success('Đã tạo team')
      invalidateOrgQueries(qc)
      setTeamModal(null)
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? e.message ?? 'Lỗi tạo team')
    },
  })

  const patchTeam = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: { name?: string; leaderUserId?: string | null }
    }) => organizationApi.patchTeam(id, body),
    onSuccess: (_, v) => {
      toast.success('Đã cập nhật team')
      invalidateOrgQueries(qc, v.id)
      setTeamModal(null)
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? e.message ?? 'Lỗi cập nhật team')
    },
  })

  const addMembers = useMutation({
    mutationFn: ({ teamId, userIds }: { teamId: string; userIds: string[] }) =>
      organizationApi.addTeamMembers(teamId, userIds),
    onSuccess: (data, v) => {
      toast.success(`Đã thêm ${data.added} thành viên`)
      invalidateOrgQueries(qc, v.teamId)
      setEmpSearch('')
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? e.message ?? 'Lỗi thêm thành viên')
    },
  })

  const removeMembers = useMutation({
    mutationFn: ({ teamId, userIds }: { teamId: string; userIds: string[] }) =>
      organizationApi.removeTeamMembers(teamId, userIds),
    onSuccess: (data, v) => {
      toast.success(`Đã gỡ ${data.removed} thành viên khỏi team`)
      invalidateOrgQueries(qc, v.teamId)
      setTeamModal((prev) => {
        if (prev?.mode !== 'edit' || prev.team.id !== v.teamId) return prev
        const lid = prev.team.leaderUserId
        if (!lid || !v.userIds.includes(lid)) return prev
        return {
          ...prev,
          team: { ...prev.team, leaderUserId: null, leader: null },
        }
      })
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? e.message ?? 'Lỗi gỡ thành viên')
    },
  })

  const membersQ = useQuery({
    queryKey: membersTeamId
      ? teamMembersQueryKey(membersTeamId)
      : ['organization', 'team-members', 'none'],
    queryFn: () => organizationApi.getTeamMembers(membersTeamId!),
    enabled: Boolean(membersTeamId) && !isMockApiEnabled(),
  })

  const empPickQ = useQuery({
    queryKey: ['employees-org-pick', pickSearch],
    queryFn: () =>
      employeeApi.getAll({
        page: 1,
        pageSize: 80,
        search: pickSearch || undefined,
        status: 'active',
      }),
    enabled: Boolean(membersTeamId) && !isMockApiEnabled(),
  })

  const memberIdSet = useMemo(() => {
    const rows = membersQ.data?.members ?? []
    return new Set(rows.map((m) => m.userId))
  }, [membersQ.data?.members])

  const departments = useMemo(() => structureQ.data ?? [], [structureQ.data])

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
      <div className="mx-auto max-w-6xl px-3 py-10 md:px-4">
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
    <TooltipProvider delayDuration={280}>
      <div className="mx-auto max-w-6xl px-3 py-8 md:px-4">
        <div className={cn('mb-8', PAGE_HEADER_SURFACE)}>
          <h1 className={PAGE_HEADER_TITLE}>
            <span className={PAGE_HEADER_GRADIENT}>Phòng ban & Team</span>
          </h1>
          <p className={PAGE_HEADER_DESCRIPTION}>
            Một phòng ban có nhiều team. Mở rộng từng phòng ban để xem bảng team; tạo — sửa — và gán
            trưởng nhóm, thành viên.
          </p>
        </div>

        {mockBanner && (
          <Card className="mb-6 border-amber-500/40 bg-amber-500/10 shadow-none">
            <CardContent className="py-3 text-sm text-amber-950 dark:text-amber-100">
              Đang bật mock API — quản trị org thật cần tắt mock và gọi server.
            </CardContent>
          </Card>
        )}

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => setDeptModal({ mode: 'create' })}>
            <Plus className="h-4 w-4" />
            Thêm phòng ban
          </Button>
        </div>

        <div className="space-y-4">
          {departments.length === 0 && !structureQ.isLoading && (
            <Card className="border-dashed border-2 border-border/80 bg-muted/15 shadow-none">
              <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <FolderOpen className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">Chưa có phòng ban</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Tạo phòng ban đầu tiên rồi thêm các team bên thuộc phòng ban.
                  </p>
                </div>
                <Button type="button" onClick={() => setDeptModal({ mode: 'create' })}>
                  <Plus className="h-4 w-4" />
                  Thêm phòng ban
                </Button>
              </CardContent>
            </Card>
          )}
          <Accordion
            type="multiple"
            className="space-y-4"
            value={Array.from(expandedDeptIds)}
            onValueChange={(vals) => setExpandedDeptIds(new Set(vals))}
          >
            {departments.map((dept) => (
              <AccordionItem
                key={dept.id}
                value={dept.id}
                className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-[box-shadow,ring] data-[state=open]:shadow-[0_10px_40px_rgb(106_90_224/0.12)] data-[state=open]:ring-1 data-[state=open]:ring-primary/20"
              >
                <div className="flex flex-col gap-3 border-b border-border/60 bg-gradient-to-r from-muted/35 via-card to-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-4">
                  <AccordionTrigger className="-mx-1 flex-1 justify-start gap-0 py-1 sm:-mx-0">
                    <ChevronDown className="chevron-accordion mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                    <Building2 className="mx-2 mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold leading-snug">{dept.name}</span>
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
                        <Badge variant="muted" className="font-normal tabular-nums">
                          {dept.teams.length} team
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-help items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[11px]">
                              <Hash className="h-3 w-3" />
                              {dept.id.slice(0, 8)}…
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="max-w-sm break-all font-mono text-xs"
                          >
                            {dept.id}
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </span>
                  </AccordionTrigger>
                  <div
                    className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end"
                    role="presentation"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeptModal({ mode: 'edit', dept })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa phòng ban
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setTeamModal({
                          mode: 'create',
                          departmentId: dept.id,
                          departmentName: dept.name,
                        })
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm team
                    </Button>
                  </div>
                </div>
                <AccordionContent className="px-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[640px]">
                      <TableHeader>
                        <TableRow className="border-b border-border/80 bg-muted/25 hover:bg-muted/25">
                          <TableHead className="w-[28%] pl-6">Team</TableHead>
                          <TableHead className="max-w-[260px]">Leader</TableHead>
                          <TableHead className="w-[108px]">Thành viên</TableHead>
                          <TableHead className="pr-6 text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dept.teams.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={4} className="py-12 text-center">
                              <p className="text-sm text-muted-foreground">
                                Chưa có team trong phòng ban này.
                              </p>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="mt-4"
                                onClick={() =>
                                  setTeamModal({
                                    mode: 'create',
                                    departmentId: dept.id,
                                    departmentName: dept.name,
                                  })
                                }
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Thêm team đầu tiên
                              </Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          dept.teams.map((team) => (
                            <FragmentTeamRow
                              key={team.id}
                              team={team}
                              membersOpen={membersTeamId === team.id}
                              onOpenMembers={() => toggleTeamMembers(dept.id, team.id)}
                              onEditTeam={() =>
                                setTeamModal({ mode: 'edit', team, departmentName: dept.name })
                              }
                            />
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
                teamId={membersTeamId}
                teamName={activeMemberContext.team.name}
                deptLabel={activeMemberContext.deptName}
                teamLeaderUserId={activeMemberContext.team.leaderUserId}
                members={membersQ.data?.members ?? []}
                loading={membersQ.isLoading}
                empSearch={empSearch}
                setEmpSearch={setEmpSearch}
                empRows={empPickQ.data?.data ?? []}
                empLoading={empPickQ.isLoading}
                memberIdSet={memberIdSet}
                onAdd={(userId) => addMembers.mutate({ teamId: membersTeamId, userIds: [userId] })}
                onRemove={(userId) => {
                  if (typeof window !== 'undefined' && !window.confirm('Gỡ nhân sự khỏi team này?'))
                    return
                  removeMembers.mutate({ teamId: membersTeamId, userIds: [userId] })
                }}
                addPending={addMembers.isPending}
                removePending={removeMembers.isPending}
                onClose={() => setMembersTeamId(null)}
              />
            </DialogContent>
          </Dialog>
        )}

        {deptModal?.mode === 'create' && (
          <DeptCreateModal
            onClose={() => setDeptModal(null)}
            onSubmit={(v) => createDept.mutate(v)}
            busy={createDept.isPending}
          />
        )}
        {deptModal?.mode === 'edit' && (
          <DeptEditModal
            dept={deptModal.dept}
            onClose={() => setDeptModal(null)}
            onSubmit={(body) => patchDept.mutate({ id: deptModal.dept.id, body })}
            busy={patchDept.isPending}
          />
        )}
        {teamModal?.mode === 'create' && (
          <TeamCreateModal
            departmentName={teamModal.departmentName}
            onClose={() => setTeamModal(null)}
            onSubmit={(v) =>
              createTeam.mutate({
                name: v.name,
                departmentId: teamModal.departmentId,
                leaderUserId: v.leaderUserId ?? null,
              })
            }
            busy={createTeam.isPending}
          />
        )}
        {teamModal?.mode === 'edit' && (
          <TeamEditModal
            key={`${teamModal.team.id}:${teamModal.team.name}:${teamModal.team.leaderUserId ?? ''}`}
            team={teamModal.team}
            departmentName={teamModal.departmentName}
            onClose={() => setTeamModal(null)}
            onSubmit={(body) => patchTeam.mutate({ id: teamModal.team.id, body })}
            busy={patchTeam.isPending}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

function FragmentTeamRow({
  team,
  membersOpen,
  onOpenMembers,
  onEditTeam,
}: {
  team: OrgAdminTeamRow
  membersOpen: boolean
  onOpenMembers: () => void
  onEditTeam: () => void
}) {
  const hasLeader = Boolean(team.leader || team.leaderUserId)
  const leaderLabel = team.leader
    ? [team.leader.displayName, team.leader.email, team.leader.employeeCodePrimary]
        .filter(Boolean)
        .join(' · ') || team.leaderUserId?.slice(0, 8)
    : team.leaderUserId
      ? `UUID: ${team.leaderUserId.slice(0, 8)}…`
      : null

  return (
    <TableRow className={cn('group transition-colors', membersOpen && 'bg-primary/[0.04]')}>
      <TableCell className="pl-6 align-top">
        <div className="font-semibold text-foreground">{team.name}</div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-left font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Hash className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{team.id.slice(0, 10)}…</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-md break-all font-mono text-xs">
            ID đầy đủ: {team.id}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="max-w-[260px] align-top text-sm">
        {hasLeader && leaderLabel ? (
          <span className="line-clamp-2 text-muted-foreground">{leaderLabel}</span>
        ) : (
          <span className="text-muted-foreground/90 italic">Chưa gán trưởng nhóm</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        <Badge variant="muted" className="tabular-nums">
          {team._count.memberships}
        </Badge>
      </TableCell>
      <TableCell className="pr-6 text-right align-top">
        <div className="flex flex-wrap justify-end gap-2">
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground hover:text-foreground"
            onClick={onEditTeam}
          >
            <Pencil className="h-3.5 w-3.5" />
            Sửa team
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

/** Avatar chữ cái — leader picker / danh sách employee chưa có URL ảnh. */
function LeaderPickerAvatar({ displayName }: { displayName: string }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-primary/5 text-sm font-semibold text-primary ring-1 ring-primary/15"
      aria-hidden
    >
      {memberRowInitials(displayName)}
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
  teamId: _teamId,
  teamName,
  deptLabel,
  teamLeaderUserId,
  members,
  loading,
  empSearch,
  setEmpSearch,
  empRows,
  empLoading,
  memberIdSet,
  onAdd,
  onRemove,
  addPending,
  removePending,
  onClose: _onClose,
}: {
  teamId: string
  teamName: string
  deptLabel: string
  teamLeaderUserId: string | null
  members: TeamMemberRow[]
  loading: boolean
  empSearch: string
  setEmpSearch: (s: string) => void
  empRows: EmployeeEntity[]
  empLoading: boolean
  memberIdSet: Set<string>
  onAdd: (userId: string) => void
  onRemove: (userId: string) => void
  addPending: boolean
  removePending: boolean
  onClose: () => void
}) {
  const [addPopoverOpen, setAddPopoverOpen] = useState(false)
  const [tableFilter, setTableFilter] = useState('')

  const filteredMembers = useMemo(() => {
    const q = tableFilter.trim().toLowerCase()
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
  }, [members, tableFilter])

  return (
    <>
      <DialogHeader className="shrink-0 space-y-1 border-b border-border/70 bg-gradient-to-r from-primary/[0.08] via-card to-card px-6 py-5 pr-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quản lý thành viên
        </p>
        <DialogTitle className="text-left text-xl font-semibold">
          <span className="text-primary">{teamName}</span>
          <span className="font-normal text-muted-foreground"> · {deptLabel}</span>
        </DialogTitle>
        <DialogDescription asChild>
          <div className="text-left">
            <span className="sr-only">Định danh team</span>
            <span className="mt-2 block text-xs text-muted-foreground">
              Lọc bảng bằng ô tìm bên dưới. Thêm người qua danh bạ.
            </span>
          </div>
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/50 bg-muted/15 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <Label htmlFor="team-members-table-filter" className="text-xs text-muted-foreground">
                Tìm trong bảng
              </Label>
              <Search className="pointer-events-none absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="team-members-table-filter"
                className="mt-1.5 pl-9"
                placeholder="Tên, email, mã NV, vai trò, trạng thái…"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Popover modal={false} open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0 rounded-full"
                >
                  <Plus className="h-4 w-4" />
                  Thêm từ danh bạ
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={8}
                className="flex w-[min(calc(100vw-1.5rem),420px)] flex-col overflow-hidden p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="border-b border-border/70 bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                  Tìm trong danh bạ công ty · nhấn{' '}
                  <span className="font-medium text-foreground">Thêm</span> để gán vào team
                </div>
                <div className="p-3 pt-2">
                  <Input
                    className="h-10"
                    placeholder="Tên hoặc email…"
                    value={empSearch}
                    autoComplete="off"
                    onChange={(e) => setEmpSearch(e.target.value)}
                  />
                </div>
                {empLoading ? (
                  <div className="space-y-2 px-3 pb-3">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : empRows.length === 0 ? (
                  <p className="px-3 pb-4 text-sm text-muted-foreground">
                    Không có nhân sự khớp. Kiểm tra quyền{' '}
                    <code className="rounded bg-muted px-1 text-[11px]">hr.employees.view</code>.
                  </p>
                ) : (
                  <ul className="max-h-[min(280px,45vh)] space-y-1 overflow-y-auto overscroll-contain px-2 pb-3">
                    {empRows.map((e) => {
                      const inTeam = memberIdSet.has(e.id)
                      return (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/55"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium text-sm">
                              {e.name ?? e.email ?? e.id.slice(0, 8)}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{e.email}</div>
                          </div>
                          <Button
                            type="button"
                            variant={inTeam ? 'secondary' : 'default'}
                            size="sm"
                            className="shrink-0 rounded-full"
                            disabled={inTeam || addPending}
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => onAdd(e.id)}
                          >
                            {inTeam ? 'Đã có' : 'Thêm'}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4 rounded-full"
                onClick={() => setAddPopoverOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Thêm từ danh bạ
              </Button>
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
                  <TableHead className="w-[72px] pr-3 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Không có dòng nào khớp bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((m) => {
                    const role = memberRowRole(m)
                    const status = memberRowStatus(m)
                    const isTeamLeader = teamLeaderUserId != null && m.userId === teamLeaderUserId
                    return (
                      <TableRow key={m.userId} className="group">
                        <TableCell className="pl-3 align-middle">
                          <TeamMemberAvatarCell m={m} />
                        </TableCell>
                        <TableCell className="align-middle font-medium">
                          <div className="max-w-[220px] truncate">{memberRowDisplayName(m)}</div>
                          {m.employeeCodePrimary ? (
                            <div className="truncate text-xs font-normal text-muted-foreground">
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
                            {isTeamLeader ? (
                              <Badge
                                variant="outline"
                                className="border-primary/40 text-xs font-normal text-primary"
                              >
                                Trưởng team
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <Badge variant="outline" className={memberStatusBadgeClassName(status)}>
                            {MEMBER_STATUS_VI[status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-3 text-right align-middle">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={addPending || removePending}
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => onRemove(m.userId)}
                            title="Gỡ khỏi team"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  )
}

/** Chọn trưởng team trong danh sách nhân sự có role hệ thống LEADER (hiển thị: Leader). */
function TeamLeaderPicker({
  idPrefix,
  value,
  onChange,
  /** Khi sửa team: mô tả người đang được gán nếu không có trong danh sách role Leader (LEADER). */
  fallbackLabel,
}: {
  idPrefix: string
  value: string | null
  onChange: (userId: string | null) => void
  fallbackLabel?: string | null
}) {
  const [rawSearch, setRawSearch] = useState('')
  const pickSearch = useEmployeePickSearch(rawSearch, 320)
  const leaderAnchorRef = useRef<HTMLDivElement>(null)
  const [leaderPopoverOpen, setLeaderPopoverOpen] = useState(false)

  const leadersQ = useQuery({
    queryKey: ['employees-leader-pick', pickSearch],
    queryFn: () =>
      employeeApi.getAll({
        page: 1,
        pageSize: 100,
        role: 'LEADER',
        /** Không lọc chỉ ACTIVE: Leader tập sự (PROBATION) vẫn phải chọn được. */
        search: pickSearch || undefined,
      }),
  })

  const rows = leadersQ.data?.data ?? []
  const selectedRow = value ? rows.find((e) => e.id === value) : undefined

  const leaderDetailQ = useQuery({
    queryKey: ['employee-detail-leader-picker', value],
    queryFn: () => employeeApi.getById(value!),
    enabled: Boolean(value && !selectedRow),
  })

  const leaderDisplay: {
    name: string
    email: string
    role: Role
    status: TeamMemberRow['status']
  } | null = selectedRow
    ? {
        name: selectedRow.name,
        email: selectedRow.email,
        role: selectedRow.role as Role,
        status: selectedRow.status as TeamMemberRow['status'],
      }
    : leaderDetailQ.data
      ? {
          name: leaderDetailQ.data.name,
          email: leaderDetailQ.data.email,
          role: leaderDetailQ.data.role as Role,
          status: leaderDetailQ.data.status as TeamMemberRow['status'],
        }
      : null

  /** Chỉ cảnh báo khi không đang lọc chữ và chưa tải được chi tiết / dòng LEADER. */
  const orphanAssigned =
    pickSearch === '' &&
    Boolean(value) &&
    !leadersQ.isLoading &&
    !rows.some((e) => e.id === value) &&
    Boolean(fallbackLabel?.trim()) &&
    !leaderDisplay &&
    !leaderDetailQ.isFetching

  return (
    <div className="space-y-3">
      <Label htmlFor={`${idPrefix}-leader-search`} className="text-muted-foreground">
        Trưởng nhóm{' '}
        <span className="font-normal">(chỉ nhân sự role Leader / LEADER — tùy chọn)</span>
      </Label>

      {value ? (
        leaderDetailQ.isLoading && !selectedRow ? (
          <div className="flex gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-full max-w-md" />
              <Skeleton className="h-6 w-52" />
            </div>
          </div>
        ) : leaderDisplay ? (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-3 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 gap-3">
              <LeaderPickerAvatar displayName={leaderDisplay.name} />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Đã chọn trưởng nhóm</p>
                  <p className="truncate text-base font-semibold text-foreground">
                    {leaderDisplay.name}
                  </p>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="min-w-0">
                    <span className="text-muted-foreground">Email · </span>
                    <span className="break-all text-foreground">{leaderDisplay.email}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div>
                      <span className="text-muted-foreground">Vai trò · </span>
                      <span className="font-medium">{ROLE_LABEL_VI[leaderDisplay.role]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">Trạng thái · </span>
                      <Badge
                        variant="outline"
                        className={memberStatusBadgeClassName(leaderDisplay.status)}
                      >
                        {MEMBER_STATUS_VI[leaderDisplay.status]}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 self-start sm:self-center"
              onClick={() => onChange(null)}
            >
              Bỏ trưởng nhóm
            </Button>
          </div>
        ) : fallbackLabel?.trim() ? (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-muted/30 p-3 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 gap-3">
              <LeaderPickerAvatar displayName={fallbackLabel.split(' · ')[0]?.trim() || '?'} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Đã chọn (chưa đủ dữ liệu chi tiết)
                </p>
                <p className="text-sm text-foreground">{fallbackLabel}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{value}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 self-start sm:self-center"
              onClick={() => onChange(null)}
            >
              Bỏ trưởng nhóm
            </Button>
          </div>
        ) : null
      ) : null}

      {orphanAssigned ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-50/95">
          <p>
            Người đang được gán không có trong danh sách trên (có thể chưa có role Leader / LEADER).
            Bạn vẫn có thể giữ hoặc bỏ trước khi lưu.
          </p>
        </div>
      ) : null}

      <Popover modal={false} open={leaderPopoverOpen} onOpenChange={setLeaderPopoverOpen}>
        <PopoverAnchor asChild>
          <div ref={leaderAnchorRef} className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${idPrefix}-leader-search`}
              className="pl-9"
              placeholder="Gõ tên hoặc email — danh sách trong khung nổi…"
              value={rawSearch}
              onChange={(e) => {
                setRawSearch(e.target.value)
                setLeaderPopoverOpen(true)
              }}
              onFocus={() => setLeaderPopoverOpen(true)}
              autoComplete="off"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={8}
          className="flex w-[var(--radix-popover-anchor-width)] max-w-[min(calc(100vw-2rem),440px)] flex-col overflow-hidden p-0 sm:min-w-[280px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            if (leaderAnchorRef.current?.contains(e.target as Node)) e.preventDefault()
          }}
          onInteractOutside={(e) => {
            if (leaderAnchorRef.current?.contains(e.target as Node)) e.preventDefault()
          }}
        >
          <div className="border-b border-border/70 bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
            Leader (LEADER) · chọn một dòng hoặc bấm lại dòng đang chọn để bỏ
          </div>
          {leadersQ.isLoading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Không có nhân sự role Leader (LEADER). Gán role này trong hồ sơ nhân viên hoặc đổi từ
              khóa tìm kiếm.
            </p>
          ) : (
            <ul className="max-h-[min(280px,45vh)] space-y-1 overflow-y-auto overscroll-contain p-2">
              {rows.map((e) => {
                const picked = value === e.id
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                        picked ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-muted/60'
                      )}
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => onChange(picked ? null : e.id)}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {e.name ?? e.email}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{e.email}</div>
                      </div>
                      {picked ? (
                        <Badge variant="default" className="shrink-0">
                          Đang chọn
                        </Badge>
                      ) : (
                        <span className="shrink-0 text-xs font-medium text-primary">Chọn</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Khung chọn nổi giúp hộp thoại không bị kéo dài.
      </p>
    </div>
  )
}

function DeptCreateModal({
  onClose,
  onSubmit,
  busy,
}: {
  onClose: () => void
  onSubmit: (v: { name: string }) => void
  busy: boolean
}) {
  const [name, setName] = useState('')
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm phòng ban</DialogTitle>
          <DialogDescription>Nhập tên phòng ban.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim().length < 2) return
            onSubmit({ name: name.trim() })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="dept-create-name">Tên phòng ban *</Label>
            <Input
              id="dept-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={busy || name.trim().length < 2}>
              Tạo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeptEditModal({
  dept,
  onClose,
  onSubmit,
  busy,
}: {
  dept: OrgAdminDepartmentRow
  onClose: () => void
  onSubmit: (body: { name?: string; isActive?: boolean }) => void
  busy: boolean
}) {
  const [name, setName] = useState(dept.name)
  const [isActive, setIsActive] = useState(dept.isActive)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa phòng ban</DialogTitle>
          <DialogDescription>{dept.name} — chỉnh tên và trạng thái sử dụng.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim().length < 2) return
            onSubmit({
              name: name.trim(),
              isActive,
            })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="dept-edit-name">Tên *</Label>
            <Input
              id="dept-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 text-sm transition-colors hover:bg-muted/35">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Đang sử dụng
          </label>
          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={busy || name.trim().length < 2}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TeamCreateModal({
  departmentName,
  onClose,
  onSubmit,
  busy,
}: {
  departmentName: string
  onClose: () => void
  onSubmit: (v: { name: string; leaderUserId?: string | null }) => void
  busy: boolean
}) {
  const [name, setName] = useState('')
  const [leaderUserId, setLeaderUserId] = useState<string | null>(null)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm team</DialogTitle>
          <DialogDescription>
            Phòng ban <span className="font-medium text-foreground">{departmentName}</span>. Đặt tên
            team và chọn trưởng nhóm (role Leader / LEADER) nếu cần.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim().length < 2) return
            onSubmit({ name: name.trim(), leaderUserId })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="team-create-name">Tên team *</Label>
            <Input
              id="team-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <TeamLeaderPicker
            idPrefix="team-create"
            value={leaderUserId}
            onChange={setLeaderUserId}
          />
          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={busy || name.trim().length < 2}>
              Tạo team
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TeamEditModal({
  team,
  departmentName,
  onClose,
  onSubmit,
  busy,
}: {
  team: OrgAdminTeamRow
  departmentName: string
  onClose: () => void
  onSubmit: (body: { name?: string; leaderUserId?: string | null }) => void
  busy: boolean
}) {
  const [name, setName] = useState(team.name)
  const [leaderUserId, setLeaderUserId] = useState<string | null>(team.leaderUserId ?? null)

  const fallbackLabel =
    team.leaderUserId == null
      ? null
      : team.leader
        ? [team.leader.displayName, team.leader.email, team.leader.employeeCodePrimary]
            .filter(Boolean)
            .join(' · ')
        : `UUID ${team.leaderUserId.slice(0, 8)}…`

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa team</DialogTitle>
          <DialogDescription>
            Team trong <span className="font-medium text-foreground">{departmentName}</span>. Đổi
            tên hoặc trưởng nhóm.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim().length < 2) return
            onSubmit({
              name: name.trim(),
              leaderUserId,
            })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="team-edit-name">Tên team *</Label>
            <Input
              id="team-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <TeamLeaderPicker
            idPrefix="team-edit"
            value={leaderUserId}
            onChange={setLeaderUserId}
            fallbackLabel={fallbackLabel}
          />
          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={busy || name.trim().length < 2}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
