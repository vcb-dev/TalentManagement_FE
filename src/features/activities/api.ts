import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import type { ActivityInput, ActivityMonth, CompanyActivity } from './types'

const ADMIN = '/admin/activities'

function mockUnsupported(): never {
  throw new Error('Chế độ mock chưa hỗ trợ hoạt động trong tháng')
}

/** Nhân sự đọc `/activities`; admin (`activity.manage`) thêm / sửa / xoá qua `/admin/activities`. */
export const activityApi = {
  listByMonth: async ({ year, month }: ActivityMonth) => {
    if (isMockApiEnabled()) return [] as CompanyActivity[]
    const res = await apiClient.get<CompanyActivity[]>('/activities', { params: { year, month } })
    return res.data
  },

  create: async (input: ActivityInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<CompanyActivity>(ADMIN, input)
    return res.data
  },

  update: async (id: string, input: ActivityInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.patch<CompanyActivity>(`${ADMIN}/${id}`, input)
    return res.data
  },

  remove: async (id: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.delete<{ id: string }>(`${ADMIN}/${id}`)
    return res.data
  },
}
