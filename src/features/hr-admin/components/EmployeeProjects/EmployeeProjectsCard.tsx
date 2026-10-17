import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAnyActionPending } from '@/features/hr-admin/hooks'
import {
  PROJECT_STATUS_LABEL,
  SHOW_PROJECT_ROLE,
  type EmployeeProjectMembership,
} from '@/features/hr-admin/projectApi'
import { useEmployeeProjects, useRemoveEmployeeProject } from '@/features/hr-admin/projectHooks'
import { formatUserDateForReadonlyDisplay } from '@/features/profile/profileDateUtils'
import { cn } from '@/lib/utils'
import { FolderKanban, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ProjectMembershipDialog } from './ProjectMembershipDialog'

function periodText(m: EmployeeProjectMembership): string {
  const from = formatUserDateForReadonlyDisplay(m.joinedAt)
  const to = formatUserDateForReadonlyDisplay(m.leftAt)
  if (from && to) return `${from} – ${to}`
  if (from) return `Từ ${from}`
  if (to) return `Đến ${to}`
  return 'Chưa có ngày tham gia'
}

function MembershipRow({
  membership,
  canEdit,
  disabled,
  onEdit,
  onRemove,
}: {
  membership: EmployeeProjectMembership
  canEdit: boolean
  disabled: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const m = membership
  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-start sm:justify-between',
        m.isActive
          ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40'
          : 'border-dashed border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/20'
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'font-semibold',
              m.isActive ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'
            )}
          >
            {m.projectName}
          </span>
          {m.projectStatus !== 'ACTIVE' ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-medium">
              {PROJECT_STATUS_LABEL[m.projectStatus]}
            </Badge>
          ) : null}
          {SHOW_PROJECT_ROLE && m.roleInProject ? (
            <span className="text-sm text-slate-500">· {m.roleInProject}</span>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">{periodText(m)}</p>
        {m.note ? <p className="text-sm text-slate-600 dark:text-slate-300">{m.note}</p> : null}
      </div>
      {canEdit ? (
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            disabled={disabled}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Sửa
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-destructive hover:text-destructive"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Gỡ
          </Button>
        </div>
      ) : null}
    </li>
  )
}

export function EmployeeProjectsCard({
  employeeId,
  canEdit,
}: {
  employeeId: string
  canEdit: boolean
}) {
  const { data: memberships = [], isLoading, isError } = useEmployeeProjects(employeeId)
  const remove = useRemoveEmployeeProject(employeeId)
  const anyActionPending = useAnyActionPending()
  const [dialog, setDialog] = useState<{ membership: EmployeeProjectMembership | null } | null>(
    null
  )
  const [pendingRemove, setPendingRemove] = useState<EmployeeProjectMembership | null>(null)

  const active = memberships.filter((m) => m.isActive)
  const past = memberships.filter((m) => !m.isActive)

  const renderRows = (rows: EmployeeProjectMembership[]) => (
    <ul className="space-y-2">
      {rows.map((m) => (
        <MembershipRow
          key={m.id}
          membership={m}
          canEdit={canEdit}
          disabled={anyActionPending}
          onEdit={() => setDialog({ membership: m })}
          onRemove={() => setPendingRemove(m)}
        />
      ))}
    </ul>
  )

  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderKanban className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Dự án tham gia</h2>
            <p className="text-xs text-muted-foreground">
              {active.length > 0
                ? `Đang tham gia ${active.length} dự án`
                : 'Dự án nhân sự đang và đã tham gia.'}
            </p>
          </div>
        </div>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            className="gap-1"
            disabled={anyActionPending}
            onClick={() => setDialog({ membership: null })}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Gán dự án
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Đang tải…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Không tải được danh sách dự án.</p>
      ) : memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa tham gia dự án nào.</p>
      ) : (
        <div className="space-y-6">
          {active.length > 0 ? renderRows(active) : null}
          {past.length > 0 ? (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Đã rời dự án
              </p>
              {renderRows(past)}
            </div>
          ) : null}
        </div>
      )}

      {canEdit ? (
        <>
          <ProjectMembershipDialog
            employeeId={employeeId}
            open={dialog !== null}
            onOpenChange={(open) => {
              if (!open) setDialog(null)
            }}
            membership={dialog?.membership ?? null}
            assignedProjectIds={memberships.map((m) => m.projectId)}
          />
          <ConfirmDialog
            open={pendingRemove !== null}
            onOpenChange={(open) => {
              if (!open) setPendingRemove(null)
            }}
            title="Gỡ nhân sự khỏi dự án?"
            description={`Xoá hẳn dòng tham gia "${pendingRemove?.projectName ?? ''}". Nếu nhân sự chỉ thôi tham gia, hãy bấm Sửa và điền ngày rời dự án để giữ lịch sử.`}
            confirmLabel="Gỡ khỏi dự án"
            destructive
            onConfirm={() => {
              if (pendingRemove) remove.mutate(pendingRemove.id)
              setPendingRemove(null)
            }}
          />
        </>
      ) : null}
    </section>
  )
}
