import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import type { Role } from '@/types/auth'

/**
 * Vai trò gắn được vào chức vụ — khớp `POSITION_LINKABLE_ROLES` ở BE. Không có Giảng viên: quyền
 * giảng viên tự có khi được chọn làm giáo viên lớp / người chấm thi.
 */
export const POSITION_LINKABLE_ROLES = ['MEMBER', 'LEADER', 'MANAGER', 'HR', 'BOD'] as const
export type PositionLinkedRole = (typeof POSITION_LINKABLE_ROLES)[number]

/** Danh mục chức vụ (`GET /employee-positions`) — gồm cả chức vụ đã ẩn. */
export type EmployeePosition = {
  id: string
  /** Tên chức vụ, vd. "Trưởng nhóm". */
  name: string
  /** Chọn chức vụ này trên hồ sơ thì role của nhân sự đổi theo. */
  linkedRole: PositionLinkedRole
  sortOrder: number
  isActive: boolean
  /** >0 thì BE chỉ cho ẩn, không cho xoá. */
  userCount: number
}

export type EmployeePositionInput = {
  name: string
  linkedRole: PositionLinkedRole
}

/** Tên chức vụ để hiển thị; người chưa có chức vụ (dữ liệu cũ) dùng nhãn vai trò. */
export function positionDisplayName(
  positionId: string | null | undefined,
  positions: readonly EmployeePosition[] | undefined,
  fallbackRole: Role
): string {
  const found = positionId ? positions?.find((p) => p.id === positionId) : undefined
  return found?.name ?? ROLE_LABEL_VI[fallbackRole]
}

function mockUnsupported(): never {
  throw new Error('Chế độ mock chưa hỗ trợ quản lý chức vụ')
}

export const employeePositionApi = {
  list: async () => {
    if (isMockApiEnabled()) return [] as EmployeePosition[]
    const res = await apiClient.get<EmployeePosition[]>('/employee-positions')
    return res.data
  },

  create: async (input: EmployeePositionInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<EmployeePosition>('/employee-positions', input)
    return res.data
  },

  update: async (id: string, input: Partial<EmployeePositionInput> & { isActive?: boolean }) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.patch<EmployeePosition>(`/employee-positions/${id}`, input)
    return res.data
  },

  remove: async (id: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.delete<{ id: string }>(`/employee-positions/${id}`)
    return res.data
  },
}
