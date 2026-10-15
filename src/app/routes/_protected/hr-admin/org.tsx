import { createFileRoute } from '@tanstack/react-router'
import { FolderKanban, Network } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { HrOrgStructure } from '@/features/hr-admin/components/HrOrgStructure/HrOrgStructure'
import { HrProjects } from '@/features/hr-admin/components/HrProjects/HrProjects'
import { hasEmployeeDirectoryAccess } from '@/features/hr-admin/requireHrAdmin'
import { requireOrgManageAccess } from '@/features/hr-admin/requireOrgManage'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const orgSearchSchema = z.object({
  tab: z.enum(['projects']).optional().catch(undefined),
})

export const Route = createFileRoute('/_protected/hr-admin/org')({
  validateSearch: (raw) => orgSearchSchema.parse(raw),
  beforeLoad: () => requireOrgManageAccess(),
  component: HrOrgPage,
})

const ORG_TABS = [
  { value: undefined, label: 'Phòng ban & nhóm', icon: Network },
  { value: 'projects', label: 'Dự án', icon: FolderKanban },
] as const

/** Tab "Dự án" gọi `/projects` (guard danh bạ nhân sự ở BE) nên chỉ hiện khi xem được danh bạ. */
function HrOrgPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const canViewProjects = useAuthStore((s) => hasEmployeeDirectoryAccess(s.user))

  if (!canViewProjects) return <HrOrgStructure />
  const activeTab = search.tab

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex w-fit flex-wrap items-center gap-1 rounded-xl border border-border/80 bg-card/90 p-1 shadow-sm ring-1 ring-border/60 backdrop-blur-sm"
        role="tablist"
        aria-label="Phòng ban, nhóm và dự án"
      >
        {ORG_TABS.map((tab) => {
          const selected = activeTab === tab.value
          const Icon = tab.icon
          return (
            <Button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={selected}
              variant={selected ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-lg px-2.5 py-2 text-xs font-semibold sm:px-3 sm:text-sm',
                !selected && 'text-muted-foreground'
              )}
              onClick={() => void navigate({ search: { tab: tab.value } })}
            >
              <Icon className="mr-1.5 h-4 w-4" aria-hidden />
              {tab.label}
            </Button>
          )
        })}
      </div>
      {activeTab === 'projects' ? <HrProjects /> : <HrOrgStructure />}
    </div>
  )
}
