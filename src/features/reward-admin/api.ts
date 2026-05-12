import { apiClient } from '@/lib/axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RewardThreshold = {
  id: string
  templateCode: string
  metricKey: string
  year: number
  month: number
  minValue: number
  minUnit: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export type IndividualWinner = {
  userId: string
  displayName: string
  teamId: string | null
  teamName: string | null
  metricKey: string
  content: string
  numericValue: number
  amount: number
  kind: 'INDIVIDUAL_BONUS'
  category: string
  sourceAssignmentId: string | null
}

export type TeamWinner = {
  teamId: string
  teamName: string
  metricKey: string
  totalValue: number
  memberCount: number
  amount: number
  ratioPercent: number
  kind: 'TEAM_BONUS'
  category: string
  memberUserIds: string[]
}

export type RewardCalcResult = {
  year: number
  month: number
  kinhDoanhTeamWinners: TeamWinner[]
  kinhDoanhIndividualFt: IndividualWinner[]
  kinhDoanhIndividualPt: IndividualWinner[]
  trafficTeamWinners: TeamWinner[]
  trafficIndividualWinners: IndividualWinner[]
  warnings: string[]
}

export type RewardRecord = {
  id: string
  userId: string
  kind: string
  title: string
  amount: number | null
  note: string | null
  sourceType: string
  year: number | null
  month: number | null
  category: string | null
  createdAt: string
  user: {
    id: string
    fullNameLegal: string | null
    appProfile: { avatarUrl: string | null } | null
  }
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const rewardAdminApi = {
  listThresholds: async (year: number, month: number, templateCode?: string) => {
    const res = await apiClient.get<RewardThreshold[]>('/performance/rewards/thresholds', {
      params: { year, month, ...(templateCode ? { templateCode } : {}) },
    })
    return res.data
  },

  upsertThreshold: async (body: {
    templateCode: string
    metricKey: string
    year: number
    month: number
    minValue: number
    minUnit: string
    note?: string
  }) => {
    const res = await apiClient.post<RewardThreshold>('/performance/rewards/thresholds', body)
    return res.data
  },

  deleteThreshold: async (id: string) => {
    await apiClient.delete(`/performance/rewards/thresholds/${id}`)
  },

  calculate: async (year: number, month: number, mode: 'preview' | 'commit') => {
    const res = await apiClient.post<RewardCalcResult>('/performance/rewards/calculate', {
      year,
      month,
      mode,
    })
    return res.data
  },

  listRecords: async (year: number, month: number, category?: string, userId?: string) => {
    const res = await apiClient.get<RewardRecord[]>('/performance/rewards/records', {
      params: {
        year,
        month,
        ...(category ? { category } : {}),
        ...(userId ? { userId } : {}),
      },
    })
    return res.data
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const TEMPLATE_METRIC_LABELS: Record<string, Record<string, string>> = {
  SALES_NV: {
    DOANH_THU_LEN_DON: 'Doanh thu lên đơn',
    SO_DON_CHOT: 'Số đơn chốt',
    MAX_ORDER_VALUE: 'Giá trị đơn lớn nhất',
    UPSALE: 'Cross sale / Upsale',
    REPEAT_CUSTOMER_ORDERS: 'Đơn KH mua lại',
    CUSTOMER_INTERACTION: 'Tương tác KH (Part-time)',
  },
  TRAFFIC_TEAM_NV: {
    TRAFFIC_VIEWS: 'Tổng view traffic team',
    TRAFFIC_REVENUE: 'Doanh thu team traffic',
    CONTENT_WIN_COUNT: 'Số content win (>50k)',
    NEW_PRODUCT_WIN_COUNT: 'Số SP mới win',
    PERSONAL_TRAFFIC: 'Traffic cá nhân',
    PERSONAL_REVENUE: 'Doanh thu cá nhân',
  },
}

export const TEMPLATE_METRIC_UNITS: Record<string, Record<string, string>> = {
  SALES_NV: {
    DOANH_THU_LEN_DON: 'VND',
    SO_DON_CHOT: 'đơn',
    MAX_ORDER_VALUE: 'VND',
    UPSALE: 'đơn',
    REPEAT_CUSTOMER_ORDERS: 'đơn',
    CUSTOMER_INTERACTION: 'lượt',
  },
  TRAFFIC_TEAM_NV: {
    TRAFFIC_VIEWS: 'views',
    TRAFFIC_REVENUE: 'VND',
    CONTENT_WIN_COUNT: 'content',
    NEW_PRODUCT_WIN_COUNT: 'sản phẩm',
    PERSONAL_TRAFFIC: 'views',
    PERSONAL_REVENUE: 'VND',
  },
}

export function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`
  return amount.toString()
}
