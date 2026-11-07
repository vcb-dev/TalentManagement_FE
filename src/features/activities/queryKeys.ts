import type { ActivityMonth } from './types'

export const activityKeys = {
  all: ['activities'] as const,
  month: ({ year, month }: ActivityMonth) => [...activityKeys.all, 'month', year, month] as const,
}
