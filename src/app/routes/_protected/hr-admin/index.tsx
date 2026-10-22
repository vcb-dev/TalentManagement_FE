import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HrEmployeeList } from '@/features/hr-admin/components/HrEmployeeList'
import { requireEmployeeDirectoryAccess } from '@/features/hr-admin/requireHrAdmin'

const hrAdminSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(15),
  role: z.enum(['MEMBER', 'LEADER', 'MANAGER', 'HR', 'TEACHER', 'BOD']).optional(),
  /** Không có → mặc định "Đang làm việc". */
  status: z.enum(['all', 'active', 'inactive', 'probation', 'reserved', 'transferred']).optional(),
  mode: z.enum(['view', 'edit']).optional(),
  teamId: z.string().uuid().optional().catch(undefined),
  startMonth: z.coerce.number().int().min(1).max(12).optional().catch(undefined),
  startYear: z.coerce.number().int().min(1900).max(2999).optional().catch(undefined),
  birthMonth: z.coerce.number().int().min(1).max(12).optional().catch(undefined),
  /** `none` = chưa cập nhật. */
  cardStatus: z
    .enum(['NOT_ISSUED', 'TEMP_CARD_ISSUED', 'PHOTO_CARD_ISSUED', 'none'])
    .optional()
    .catch(undefined),
  /** UUID màu thẻ hoặc `none` = chưa có màu. */
  cardColorId: z
    .union([z.literal('none'), z.string().uuid()])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_protected/hr-admin/')({
  validateSearch: (raw) => hrAdminSearchSchema.parse(raw),
  beforeLoad: () => {
    requireEmployeeDirectoryAccess()
  },
  component: HrAdminIndexPage,
})

function HrAdminIndexPage() {
  const search = Route.useSearch()
  return (
    <HrEmployeeList
      initialFilters={{
        page: search.page,
        pageSize: search.pageSize,
        role: search.role,
        status: search.status === 'all' ? undefined : (search.status ?? 'active'),
        teamId: search.teamId,
        startMonth: search.startMonth,
        startYear: search.startYear,
        birthMonth: search.birthMonth,
        cardStatus: search.cardStatus,
        cardColorId: search.cardColorId,
      }}
    />
  )
}
