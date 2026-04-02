import type { z } from 'zod'
import type { bodDashboardPageApiSchema } from '@/features/bod/schemas'

export type BodDashboardPage = z.infer<typeof bodDashboardPageApiSchema>
