import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import { MOCK_BOD_DASHBOARD_PAGE } from '@/features/bod/mock/mockBodDashboard'
import {
  bodDashboardPageApiSchema,
  headcountSummaryApiSchema,
  radarCapabilityApiSchema,
} from './schemas'

export const bodApi = {
  dashboard: async () => {
    if (isMockApiEnabled()) {
      return safeParse(bodDashboardPageApiSchema, MOCK_BOD_DASHBOARD_PAGE, 'GET /bod/dashboard (mock)')
    }
    const res = await apiClient.get<unknown>('/bod/dashboard')
    return safeParse(bodDashboardPageApiSchema, res.data, 'GET /bod/dashboard')
  },

  radar: async (departmentId?: string) => {
    const res = await apiClient.get<unknown>('/bod/radar', { params: { departmentId } })
    return safeParse(z.array(radarCapabilityApiSchema), res.data, 'GET /bod/radar')
  },

  headcount: async () => {
    const res = await apiClient.get<unknown>('/bod/headcount')
    return safeParse(headcountSummaryApiSchema, res.data, 'GET /bod/headcount')
  },
}
