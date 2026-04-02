import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HrEmployeeProfile } from '@/features/hr-admin/components/HrEmployeeProfile'
import { useEmployee } from '@/features/hr-admin/hooks'
import { MOCK_TEAM_NS01, MOCK_TEAM_NS02 } from '@/features/hr-admin/mock/mockEmployeesData'
import { requireRole } from '@/lib/routeGuards'

const MANAGER_VISIBLE_TEAMS = new Set([MOCK_TEAM_NS01, MOCK_TEAM_NS02])

const searchSchema = z.object({
  teamId: z.string().optional(),
})

export const Route = createFileRoute('/_protected/manager/team/$employeeId')({
  validateSearch: (raw) => searchSchema.parse(raw),
  beforeLoad: () => requireRole('MANAGER'),
  component: ManagerTeamEmployeePage,
})

function ManagerTeamEmployeePage() {
  const { employeeId } = Route.useParams()
  const { teamId } = Route.useSearch()
  const { data, isLoading } = useEmployee(employeeId)
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#6B7F96]">Đang tải…</div>
    )
  }
  if (!data) {
    return (
      <div className="p-4 text-sm text-[#991B1B]">Không tìm thấy nhân viên hoặc lỗi tải dữ liệu.</div>
    )
  }
  const inScope = data.teamIds.some((t) => MANAGER_VISIBLE_TEAMS.has(t))
  if (!inScope) {
    return (
      <div className="p-4 text-sm text-[#991B1B]">Nhân viên không thuộc phạm vi team được quản lý.</div>
    )
  }
  if (teamId && !data.teamIds.includes(teamId)) {
    return (
      <div className="p-4 text-sm text-[#991B1B]">Nhân viên không thuộc team đã chọn.</div>
    )
  }
  return <HrEmployeeProfile employee={data} initialTab={0} viewer="manager" />
}
