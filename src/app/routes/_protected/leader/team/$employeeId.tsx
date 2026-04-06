import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HrEmployeeProfile } from '@/features/hr-admin/components/HrEmployeeProfile'
import { useEmployee } from '@/features/hr-admin/hooks'
import { requireRole } from '@/lib/routeGuards'
import { useAuthStore } from '@/stores/auth.store'

const searchSchema = z.object({
  teamId: z.string().optional(),
})

export const Route = createFileRoute('/_protected/leader/team/$employeeId')({
  validateSearch: (raw) => searchSchema.parse(raw),
  beforeLoad: () => requireRole('LEADER'),
  component: LeaderTeamEmployeePage,
})

function LeaderTeamEmployeePage() {
  const { employeeId } = Route.useParams()
  const { teamId } = Route.useSearch()
  const myTeamIds = useAuthStore((s) => s.user?.teamIds ?? [])
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

  const inScope = data.teamIds.some((t) => myTeamIds.includes(t))
  if (!inScope) {
    return (
      <div className="p-4 text-sm text-[#991B1B]">
        Nhân viên không thuộc team mà bạn phụ trách.
      </div>
    )
  }
  if (teamId && !data.teamIds.includes(teamId)) {
    return (
      <div className="p-4 text-sm text-[#991B1B]">Nhân viên không thuộc team đã chọn.</div>
    )
  }

  return <HrEmployeeProfile employee={data} initialTab={0} viewer="manager" />
}
