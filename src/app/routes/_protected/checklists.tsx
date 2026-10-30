import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ChecklistsScreen } from '@/features/checklist/components/ChecklistsScreen'

const checklistsSearchSchema = z.object({
  tab: z.enum(['mine', 'leader', 'templates']).optional().catch(undefined),
  templateId: z.string().uuid().optional().catch(undefined),
  employeeId: z.string().uuid().optional().catch(undefined),
  edit: z
    .union([z.literal('new'), z.string().uuid()])
    .optional()
    .catch(undefined),
  responses: z.string().uuid().optional().catch(undefined),
  view: z.string().uuid().optional().catch(undefined),
})

/** Ai đăng nhập cũng vào được — tab hiện theo vai trò (tự điền / trưởng nhóm / admin), BE chặn từng API. */
export const Route = createFileRoute('/_protected/checklists')({
  validateSearch: (raw) => checklistsSearchSchema.parse(raw),
  component: ChecklistsPage,
})

function ChecklistsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return <ChecklistsScreen search={search} onNavigate={(next) => void navigate({ search: next })} />
}
