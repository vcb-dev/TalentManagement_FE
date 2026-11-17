import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { useAnyActionPending } from '@/features/hr-admin/hooks'
import { ProjectMembershipDialog } from '@/features/hr-admin/components/EmployeeProjects'
import { FieldLabel } from '@/features/hr-admin/components/HrEmployeeProfile/profileFormLayout'
import type { EmployeeProjectMembership } from '@/features/hr-admin/projectApi'
import {
  useProjectMemberships,
  useRemoveProjectMembership,
  type ProjectMembershipOwner,
} from '@/features/hr-admin/projectHooks'
import { formatUserDateForReadonlyDisplay } from '@/features/profile/profileDateUtils'
import { cn } from '@/lib/utils'

const SELF: ProjectMembershipOwner = { kind: 'self' }

const LABEL = 'Dự án tham gia'

/**
 * Ô "Dự án tham gia" trong lưới "Công việc & tổ chức" của Hồ sơ cá nhân: mỗi dự án đang tham gia
 * là một chip (bấm để sửa ngày tham gia / ngày rời, × để gỡ). Lưu ngay qua `/me/projects`,
 * không đi theo nút "Lưu thay đổi" của form hồ sơ.
 */
export function MyProjectsField() {
  const { data: memberships = [], isLoading, isError } = useProjectMemberships(SELF)
  const remove = useRemoveProjectMembership(SELF)
  const busy = useAnyActionPending()
  const [dialog, setDialog] = useState<{ membership: EmployeeProjectMembership | null } | null>(
    null
  )
  const [pendingRemove, setPendingRemove] = useState<EmployeeProjectMembership | null>(null)

  const active = memberships.filter((m) => m.isActive)

  return (
    <div className="space-y-1.5">
      <FieldLabel>{LABEL}</FieldLabel>
      <div
        role="group"
        aria-label={LABEL}
        className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      >
        {isLoading ? (
          <span className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Đang tải…
          </span>
        ) : isError ? (
          <span className="px-1 text-sm text-destructive">Không tải được danh sách dự án.</span>
        ) : (
          <>
            {active.length === 0 ? (
              <span className="px-1 text-sm text-muted-foreground">Chưa chọn dự án</span>
            ) : (
              active.map((m) => {
                const from = formatUserDateForReadonlyDisplay(m.joinedAt)
                return (
                  <span
                    key={m.id}
                    className="inline-flex max-w-full items-center rounded-full border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
                  >
                    <button
                      type="button"
                      disabled={busy}
                      title={from ? `Từ ${from} — bấm để sửa` : 'Bấm để sửa'}
                      aria-label={`Sửa dự án ${m.projectName}`}
                      className="min-w-0 truncate rounded-l-full py-1 pl-2.5 pr-1 hover:underline disabled:opacity-60"
                      onClick={() => setDialog({ membership: m })}
                    >
                      {m.projectName}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Gỡ dự án ${m.projectName}`}
                      className="mr-1 rounded-full p-0.5 text-sky-700 hover:bg-sky-100 disabled:opacity-60 dark:text-sky-200 dark:hover:bg-sky-900"
                      onClick={() => setPendingRemove(m)}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                )
              })
            )}
            <button
              type="button"
              disabled={busy}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60',
                active.length > 0 ? '' : 'ml-auto'
              )}
              onClick={() => setDialog({ membership: null })}
            >
              <Plus className="size-3.5" aria-hidden />
              Thêm dự án
            </button>
          </>
        )}
      </div>

      <ProjectMembershipDialog
        owner={SELF}
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
        title="Gỡ dự án này?"
        description={`Xoá hẳn "${pendingRemove?.projectName ?? ''}" khỏi hồ sơ — chỉ nên dùng khi chọn nhầm. Nếu bạn đã thôi tham gia, hãy bấm vào tên dự án và điền ngày rời để giữ lịch sử.`}
        confirmLabel="Gỡ dự án"
        destructive
        onConfirm={() => {
          if (pendingRemove) remove.mutate(pendingRemove.id)
          setPendingRemove(null)
        }}
      />
    </div>
  )
}
