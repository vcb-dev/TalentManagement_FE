import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useForm, useWatch } from 'react-hook-form'
import { ArrowLeft, ShieldUser, Users } from 'lucide-react'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { InputFieldController } from '@/components/ui/form-controllers'
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
import {
  organizationApi,
  type TeamMemberRow,
  DEPTS_WITH_TEAMS_QUERY_KEY,
} from '@/features/organization/api'

function statusLabel(status: TeamMemberRow['status']) {
  if (status === 'ACTIVE') return 'Đang làm việc'
  if (status === 'INACTIVE') return 'Đã nghỉ việc'
  if (status === 'PROBATION') return 'Thử việc'
  return 'Dự bị / bảo lưu'
}

function statusClass(status: TeamMemberRow['status']) {
  return cn(
    'font-normal',
    status === 'ACTIVE' && 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    status === 'INACTIVE' && 'border-destructive/40 text-destructive',
    status === 'PROBATION' && 'border-amber-500/40 text-amber-700 dark:text-amber-200',
    status === 'RESERVED' && 'border-blue-500/40 text-blue-700 dark:text-blue-300'
  )
}

export function HrTeamManagementScreen({ teamId }: { teamId: string }) {
  const searchForm = useForm<{ search: string }>({ defaultValues: { search: '' } })
  const search = useWatch({ control: searchForm.control, name: 'search' }) ?? ''
  const deptQ = useQuery({
    queryKey: DEPTS_WITH_TEAMS_QUERY_KEY,
    queryFn: () => organizationApi.listDepartmentsWithTeams(),
  })
  const membersQ = useQuery({
    queryKey: ['organization', 'team-members', teamId],
    queryFn: () => organizationApi.getTeamMembers(teamId),
    enabled: Boolean(teamId),
  })

  const context = (() => {
    const departments = deptQ.data ?? []
    for (const d of departments) {
      const team = d.teams.find((x) => x.id === teamId)
      if (team) return { dept: d, team }
    }
    return null
  })()

  const filteredMembers = (() => {
    const q = search.trim().toLowerCase()
    const members = membersQ.data?.members ?? []
    if (!q) return members
    return members.filter((m) => {
      const s = [
        m.displayName ?? '',
        m.email ?? '',
        m.employeeCodePrimary ?? '',
        ROLE_LABEL_VI[m.role],
        statusLabel(m.status),
      ]
        .join(' ')
        .toLowerCase()
      return s.includes(q)
    })
  })()

  if (deptQ.isLoading || (membersQ.isLoading && !membersQ.data)) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-8 md:px-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    )
  }

  if (!context) {
    return (
      <div className="mx-auto max-w-[1400px] px-3 py-8 md:px-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="space-y-3 py-6">
            <p className="text-sm text-destructive">
              Không tìm thấy team hoặc bạn không có quyền truy cập.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/hr-admin/org">Quay lại Phòng ban & Team</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const memberCount = membersQ.data?.members.length ?? 0
  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-8 md:px-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to="/hr-admin/org">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </Button>
      </div>

      <div
        className={cn(
          'rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-card p-4 md:p-6',
          PAGE_HEADER_SURFACE
        )}
      >
        <h1 className={PAGE_HEADER_TITLE}>
          <span className={PAGE_HEADER_GRADIENT}>Quản lý team: {context.team.name}</span>
        </h1>
        <p className={PAGE_HEADER_DESCRIPTION}>
          Không gian thao tác riêng cho team, phù hợp khi cần xem/chỉnh dữ liệu nhiều bước.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-primary/30 bg-primary/10">
          <CardContent className="py-3">
            <p className="text-xs text-primary">Phòng ban</p>
            <p className="font-semibold">{context.dept.name}</p>
          </CardContent>
        </Card>
        <Card className="border-accent/30 bg-accent/10">
          <CardContent className="py-3">
            <p className="text-xs text-accent">Mã team</p>
            <p className="line-clamp-1 font-semibold">{context.team.id}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardContent className="py-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">Thành viên</p>
            <p className="font-semibold tabular-nums">{memberCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card">
        <CardContent className="space-y-4 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">Danh sách thành viên team</p>
            <Form {...searchForm}>
              <InputFieldController
                control={searchForm.control}
                name="search"
                placeholder="Tìm tên, email, mã NV, vai trò..."
                className="sm:max-w-xs"
                inputClassName="sm:max-w-xs"
              />
            </Form>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/70">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nhân sự</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      Không có thành viên khớp bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell>
                        <div className="font-medium">{m.displayName || m.userId.slice(0, 8)}</div>
                        {m.employeeCodePrimary ? (
                          <div className="text-xs text-muted-foreground">
                            {m.employeeCodePrimary}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.email || '—'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <ShieldUser className="h-3.5 w-3.5 text-primary" />
                          {ROLE_LABEL_VI[m.role]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClass(m.status)}>
                          {statusLabel(m.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Users className="h-3.5 w-3.5 text-accent" />
              Gợi ý mở rộng:
            </span>{' '}
            ở màn riêng này bạn có thể thêm thao tác bulk (chuyển team hàng loạt, import, audit log)
            mà không làm nặng modal.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
