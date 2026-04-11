import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, ChevronDown, FolderOpen, Hash, Search, Users } from 'lucide-react'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  type OrgAdminTeamRow,
  type TeamMemberRow,
} from '@/features/organization/api'
import { isMockApiEnabled } from '@/lib/mockEnv'

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
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<string>>(new Set())
  const [membersTeamId, setMembersTeamId] = useState<string | null>(null)

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
            Một phòng ban có nhiều team. Mở rộng từng phòng ban để xem team, leader và danh sách
            thành viên (chỉ xem).
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
          {departments.length === 0 && !structureQ.isLoading && (
            <Card className="border-dashed border-2 border-border/80 bg-muted/15 shadow-none">
              <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <FolderOpen className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">Chưa có phòng ban</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Dữ liệu sẽ hiển thị khi đã có phòng ban trên hệ thống.
                  </p>
                </div>
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
                <div className="border-b border-border/60 bg-gradient-to-r from-muted/35 via-card to-card px-4 py-3 sm:py-4">
                  <AccordionTrigger className="-mx-1 flex w-full justify-start gap-0 py-1 sm:-mx-0">
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
                            </TableCell>
                          </TableRow>
                        ) : (
                          dept.teams.map((team) => (
                            <FragmentTeamRow
                              key={team.id}
                              team={team}
                              membersOpen={membersTeamId === team.id}
                              onOpenMembers={() => toggleTeamMembers(dept.id, team.id)}
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
                teamName={activeMemberContext.team.name}
                deptLabel={activeMemberContext.deptName}
                teamLeaderUserId={activeMemberContext.team.leaderUserId}
                members={membersQ.data?.members ?? []}
                loading={membersQ.isLoading}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  )
}

function FragmentTeamRow({
  team,
  membersOpen,
  onOpenMembers,
}: {
  team: OrgAdminTeamRow
  membersOpen: boolean
  onOpenMembers: () => void
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
  teamName,
  deptLabel,
  teamLeaderUserId,
  members,
  loading,
}: {
  teamName: string
  deptLabel: string
  teamLeaderUserId: string | null
  members: TeamMemberRow[]
  loading: boolean
}) {
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
          Thành viên team
        </p>
        <DialogTitle className="text-left text-xl font-semibold">
          <span className="text-primary">{teamName}</span>
          <span className="font-normal text-muted-foreground"> · {deptLabel}</span>
        </DialogTitle>
        <DialogDescription asChild>
          <div className="text-left">
            <span className="mt-2 block text-xs text-muted-foreground">
              Chỉ xem danh sách. Thêm hoặc sửa phòng ban/team qua kênh quản trị nguồn khác.
            </span>
          </div>
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/50 bg-muted/15 px-4 py-3 sm:px-6">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={5}
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
