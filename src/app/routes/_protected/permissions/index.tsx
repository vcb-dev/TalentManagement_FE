import { createFileRoute, Link } from '@tanstack/react-router'
import { KeyRound } from 'lucide-react'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  avatarClassForRole,
  initialsFromName,
  shortId,
  statusDotClass,
  statusLabelVi,
} from '@/features/hr-admin/components/HrEmployeeList/employeeListUtils'
import { useEmployees } from '@/features/hr-admin/hooks'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { requireBodOrManager } from '@/features/hr-admin/requireBodOrManager'
import { ManagerScreenLayout } from '@/features/manager/components/ManagerHub/ManagerScreenLayout'
import { requirePermissionPrefix } from '@/lib/permissionGuards'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/auth'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_protected/permissions/')({
  beforeLoad: () => {
    requireBodOrManager()
    requirePermissionPrefix('admin.')
  },
  component: PermissionsIndexPage,
})

function PermissionsTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[72px]">Ảnh</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="hidden lg:table-cell">Phòng ban</TableHead>
            <TableHead className="hidden xl:table-cell">Nhóm</TableHead>
            <TableHead className="w-[120px]">Trạng thái</TableHead>
            <TableHead className="w-[120px] text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              <TableCell>
                <Skeleton className="h-11 w-11 rounded-xl" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-36" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-9 w-24 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function EmployeeTableRow({ row }: { row: EmployeeEntity }) {
  const teamId = row.teamIds[0] ?? row.departmentId
  const deptLabel = `PB · ${shortId(row.departmentId)}`
  const teamLabel = `Team · ${shortId(teamId)}`
  const initials = initialsFromName(row.name)

  return (
    <TableRow>
      <TableCell className="w-[72px]">
        <div className="relative inline-flex shrink-0">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl text-xs font-extrabold shadow-sm ring-2 ring-background',
              avatarClassForRole(row.role),
              row.status === 'INACTIVE' && 'opacity-[0.65] grayscale-[0.25]'
            )}
            aria-hidden
          >
            {initials}
          </div>
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card shadow-sm',
              statusDotClass(row.status)
            )}
            title={statusLabelVi(row.status)}
          />
        </div>
      </TableCell>
      <TableCell className="font-semibold text-foreground">
        <Link
          to="/permissions/$employeeId"
          params={{ employeeId: row.id }}
          className="text-primary hover:underline"
        >
          {row.name}
        </Link>
      </TableCell>
      <TableCell className="hidden max-w-[220px] truncate text-muted-foreground md:table-cell">
        {row.email}
      </TableCell>
      <TableCell className="text-muted-foreground">{ROLE_LABEL_VI[row.role as Role]}</TableCell>
      <TableCell className="hidden font-mono text-sm tabular-nums text-foreground/90 lg:table-cell">
        {deptLabel}
      </TableCell>
      <TableCell className="hidden font-mono text-sm tabular-nums text-foreground/90 xl:table-cell">
        {teamLabel}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClass(row.status))}
            aria-hidden
          />
          {statusLabelVi(row.status)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link to="/permissions/$employeeId" params={{ employeeId: row.id }}>
            Phân quyền
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}

function PermissionsIndexPage() {
  const { data, isLoading } = useEmployees({ page: 1, pageSize: 100 })
  const rows = data?.data ?? []

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className={cn('min-w-0', PAGE_HEADER_SURFACE)}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary">
            <KeyRound className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            Phân quyền
          </div>
          <h1 className={PAGE_HEADER_TITLE}>
            <span className={PAGE_HEADER_GRADIENT}>Phân quyền nhân viên</span>
          </h1>
          <p className={PAGE_HEADER_DESCRIPTION}>
            Chọn nhân viên để gán vai trò mẫu và quyền chi tiết. Chỉ BOD và Quản lý có quyền truy
            cập màn hình này.
          </p>
        </div>

        {isLoading ? (
          <PermissionsTableSkeleton />
        ) : (
          <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[72px] pl-4">Ảnh</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="hidden lg:table-cell">Phòng ban</TableHead>
                  <TableHead className="hidden xl:table-cell">Nhóm</TableHead>
                  <TableHead className="w-[130px]">Trạng thái</TableHead>
                  <TableHead className="w-[130px] pr-4 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Không có nhân viên.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => <EmployeeTableRow key={row.id} row={row} />)
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </ManagerScreenLayout>
  )
}
