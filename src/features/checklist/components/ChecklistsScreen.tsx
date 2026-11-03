import type { LucideIcon } from 'lucide-react'
import { ClipboardCheck, Settings2, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useLeaderChecklistEmployees, useMyChecklists, useSaveMyChecklist } from '../hooks'
import { ChecklistFillPanel } from './ChecklistFillPanel'
import { ChecklistTemplatesPanel, type ChecklistAdminView } from './ChecklistTemplatesPanel'
import { LeaderChecklistsPanel } from './LeaderChecklistsPanel'

export type ChecklistTab = 'mine' | 'leader' | 'templates'

export type ChecklistsSearch = {
  tab?: ChecklistTab
  /** Checklist đang mở (tab mine / leader). */
  templateId?: string
  /** Nhân sự đang chọn (tab leader). */
  employeeId?: string
  /** Tab templates: `new` | id mẫu đang sửa. */
  edit?: string
  /** Tab templates: id mẫu đang xem câu trả lời. */
  responses?: string
  /** Tab templates: id mẫu đang xem form. */
  view?: string
}

const TAB_META: Record<ChecklistTab, { label: string; icon: LucideIcon; description: string }> = {
  mine: {
    label: 'Checklist của tôi',
    icon: ClipboardCheck,
    description: 'Checklist bạn tự điền — chỉ bạn và admin xem được câu trả lời.',
  },
  leader: {
    label: 'Nhân sự tôi phụ trách',
    icon: Users,
    description:
      'Checklist bạn điền cho nhân sự mình là trưởng nhóm phụ trách — nhân sự không thấy bản này.',
  },
  templates: {
    label: 'Quản lý checklist',
    icon: Settings2,
    description: 'Soạn checklist, gán team áp dụng và xem câu trả lời của mọi nhân sự.',
  },
}

function MyChecklistsTab({
  templateId,
  onOpen,
}: {
  templateId: string | undefined
  onOpen: (templateId: string | undefined) => void
}) {
  const { data, isLoading } = useMyChecklists()
  const save = useSaveMyChecklist()
  return (
    <ChecklistFillPanel
      items={data}
      isLoading={isLoading}
      templateId={templateId}
      onOpen={onOpen}
      onClose={() => onOpen(undefined)}
      saving={save.isPending}
      onSave={(id, answers) =>
        save.mutate({ templateId: id, answers }, { onSuccess: () => onOpen(undefined) })
      }
      emptyTitle="Chưa có checklist nào cho bạn"
      emptyDescription="Checklist sẽ hiện ở đây khi admin gán checklist tự điền cho team của bạn."
    />
  )
}

export function ChecklistsScreen({
  search,
  onNavigate,
}: {
  search: ChecklistsSearch
  onNavigate: (next: ChecklistsSearch) => void
}) {
  const user = useAuthStore((s) => s.user)
  const { canId } = usePermission()
  const isStaff = !user?.isAdminAccount
  const { data: leaderRows } = useLeaderChecklistEmployees(isStaff)

  const tabs: ChecklistTab[] = []
  if (isStaff) tabs.push('mine')
  // Người đã thôi vai trò LEADER nhưng HR chưa đổi "Trưởng nhóm phụ trách" vẫn thấy tab.
  if (isStaff && (user?.role === 'LEADER' || (leaderRows?.length ?? 0) > 0)) tabs.push('leader')
  if (canId('checklist.manage')) tabs.push('templates')

  const tab = search.tab && tabs.includes(search.tab) ? search.tab : tabs[0]
  const meta = tab ? TAB_META[tab] : null

  return (
    <>
      <PageHeader title="Checklist" description={meta?.description} />
      {tabs.length > 1 ? (
        <div
          className="mb-5 flex w-fit flex-wrap items-center gap-1 rounded-xl border border-border/80 bg-card/90 p-1 shadow-sm ring-1 ring-border/60"
          role="tablist"
          aria-label="Loại checklist"
        >
          {tabs.map((t) => {
            const selected = t === tab
            const Icon = TAB_META[t].icon
            return (
              <Button
                key={t}
                type="button"
                role="tab"
                aria-selected={selected}
                variant={selected ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm',
                  !selected && 'text-muted-foreground'
                )}
                onClick={() => onNavigate({ tab: t })}
              >
                <Icon className="size-4" aria-hidden />
                {TAB_META[t].label}
              </Button>
            )
          })}
        </div>
      ) : null}

      <div className="pb-8">
        {tab === 'mine' ? (
          <MyChecklistsTab
            templateId={search.templateId}
            onOpen={(templateId) => onNavigate({ tab: 'mine', templateId })}
          />
        ) : tab === 'leader' ? (
          <LeaderChecklistsPanel
            employeeId={search.employeeId}
            templateId={search.templateId}
            onSelect={(next) => onNavigate({ tab: 'leader', ...next })}
          />
        ) : tab === 'templates' ? (
          <ChecklistTemplatesPanel
            view={{ view: search.view, edit: search.edit, responses: search.responses }}
            onNavigate={(next: ChecklistAdminView) => onNavigate({ tab: 'templates', ...next })}
          />
        ) : null}
      </div>
    </>
  )
}
