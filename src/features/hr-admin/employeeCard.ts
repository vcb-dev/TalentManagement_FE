import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'

/** Khớp enum `EmployeeCardStatus` ở BE. Trống = chưa cập nhật. */
export type EmployeeCardStatus = 'NOT_ISSUED' | 'TEMP_CARD_ISSUED' | 'PHOTO_CARD_ISSUED'

export const EMPLOYEE_CARD_STATUS_LABEL: Record<EmployeeCardStatus, string> = {
  NOT_ISSUED: 'Chưa cấp',
  TEMP_CARD_ISSUED: 'Đã cấp thẻ tạm',
  PHOTO_CARD_ISSUED: 'Đã cấp thẻ ảnh',
}

export const EMPLOYEE_CARD_STATUSES = Object.keys(
  EMPLOYEE_CARD_STATUS_LABEL
) as EmployeeCardStatus[]

export function employeeCardStatusLabel(status: string | null | undefined): string {
  if (!status) return ''
  return EMPLOYEE_CARD_STATUS_LABEL[status as EmployeeCardStatus] ?? status
}

/** Kèm trong `GET /me/user` và `GET /employees/hr/:id` — gồm cả màu đã ẩn. */
export type EmployeeCardColorSummary = {
  id: string
  /** Tên màu, vd. "Xanh dương". */
  name: string
  isActive: boolean
}

export type EmployeeCardColor = EmployeeCardColorSummary & {
  sortOrder: number
  /** >0 thì BE chỉ cho ẩn, không cho xoá. */
  userCount: number
}

export type EmployeeCardColorInput = {
  name: string
}

function mockUnsupported(): never {
  throw new Error('Chế độ mock chưa hỗ trợ quản lý màu thẻ')
}

export const employeeCardColorApi = {
  list: async () => {
    if (isMockApiEnabled()) return [] as EmployeeCardColor[]
    const res = await apiClient.get<EmployeeCardColor[]>('/employee-card-colors')
    return res.data
  },

  create: async (input: EmployeeCardColorInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<EmployeeCardColor>('/employee-card-colors', input)
    return res.data
  },

  update: async (id: string, input: Partial<EmployeeCardColorInput> & { isActive?: boolean }) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.patch<EmployeeCardColor>(`/employee-card-colors/${id}`, input)
    return res.data
  },

  remove: async (id: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.delete<{ id: string }>(`/employee-card-colors/${id}`)
    return res.data
  },
}
