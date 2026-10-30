import { useMemo, useState } from 'react'
import { ArrowLeft, ChevronRight, Search, Users } from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { foldSearch, formatChecklistTime, personName } from '../checklistAnswers'
import {
  useLeaderChecklistEmployees,
  useLeaderEmployeeChecklists,
  useSaveLeaderChecklist,
} from '../hooks'
import type { LeaderChecklistEmployee } from '../types'
import { ChecklistFillPanel, ChecklistListSkeleton } from './ChecklistFillPanel'

function ProgressPill({ row }: { row: LeaderChecklistEmployee }) {
  if (row.templateCount === 0) {
    return <span className="text-xs text-muted-foreground">Chưa có checklist</span>
  }
  const done = row.answeredCount >= row.templateCount
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        done ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning'
      )}
    >
      {row.answeredCount}/{row.templateCount} đã điền
    </span>
  )
}

function EmployeeChecklists({
  employeeId,
  templateId,
  onOpenTemplate,
  onBack,
}: {
  employeeId: string
  templateId: string | undefined
  onOpenTemplate: (templateId: string | undefined) => void
  onBack: () => void
}) {
  const { data, isLoading, isError } = useLeaderEmployeeChecklists(employeeId)
  const save = useSaveLeaderChecklist()

  if (isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">
          Không xem được checklist — bạn không còn là trưởng nhóm phụ trách nhân sự này.
        </p>
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden />
          Danh sách nhân sự
        </Button>
      </div>
    )
  }

  const name = personName(data?.employee)
  return (
    <div className="space-y-4">
      {!templateId ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden />
            Danh sách nhân sự
          </Button>
          {data ? (
            <div className="flex min-w-0 items-center gap-3">
              <EmployeeAvatar name={name} className="size-9" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[data.employee.employeeIdentifier, data.employee.teamName]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <ChecklistFillPanel
        items={data?.items}
        isLoading={isLoading}
        templateId={templateId}
        onOpen={(id) => onOpenTemplate(id)}
        onClose={() => onOpenTemplate(undefined)}
        saving={save.isPending}
        onSave={(id, answers) =>
          save.mutate(
            { employeeId, templateId: id, answers },
            { onSuccess: () => onOpenTemplate(undefined) }
          )
        }
        formMeta={
          <>
            Đánh giá cho: <span className="font-semibold text-foreground">{name}</span>
          </>
        }
        emptyTitle="Chưa có checklist cho nhân sự này"
        emptyDescription="Admin chưa gán checklist trưởng nhóm nào cho team của nhân sự."
      />
    </div>
  )
}

/** Trưởng nhóm: nhân sự có "Trưởng nhóm phụ trách" = mình → điền checklist LEADER cho từng người. */
export function LeaderChecklistsPanel({
  employeeId,
  templateId,
  onSelect,
}: {
  employeeId: string | undefined
  templateId: string | undefined
  onSelect: (next: { employeeId?: string; templateId?: string }) => void
}) {
  const { data: rows = [], isLoading } = useLeaderChecklistEmployees()
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = foldSearch(q.trim())
    if (!needle) return rows
    return rows.filter((r) =>
      foldSearch(
        [r.fullNameLegal, r.email, r.employeeIdentifier, r.teamName].filter(Boolean).join(' ')
      ).includes(needle)
    )
  }, [rows, q])

  if (employeeId) {
    return (
      <EmployeeChecklists
        employeeId={employeeId}
        templateId={templateId}
        onOpenTemplate={(id) => onSelect({ employeeId, templateId: id })}
        onBack={() => onSelect({})}
      />
    )
  }

  if (isLoading) return <ChecklistListSkeleton />

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card">
        <EmptyState
          icon={<Users className="size-6" aria-hidden />}
          title="Bạn chưa phụ trách nhân sự nào"
          description='Nhân sự sẽ hiện ở đây khi HR chọn bạn là "Trưởng nhóm phụ trách" trong hồ sơ của họ.'
        />
      </div>
    )
  }

  const pending = rows.filter((r) => r.answeredCount < r.templateCount).length
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Phụ trách <span className="font-semibold text-foreground">{rows.length}</span> nhân sự
          {pending > 0 ? (
            <>
              {' '}
              · <span className="font-semibold text-warning">{pending}</span> người còn checklist
              chưa điền
            </>
          ) : null}
        </p>
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên, mã, team…"
            className="pl-9"
          />
        </div>
      </div>
      <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        {filtered.map((r) => {
          const name = personName(r)
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect({ employeeId: r.id })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <EmployeeAvatar name={name} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[r.employeeIdentifier, r.teamName].filter(Boolean).join(' · ') || r.email}
                  </p>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  {r.lastUpdatedAt ? `Cập nhật ${formatChecklistTime(r.lastUpdatedAt)}` : null}
                </div>
                <ProgressPill row={r} />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          )
        })}
        {filtered.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            Không có nhân sự khớp “{q.trim()}”.
          </li>
        ) : null}
      </ul>
    </div>
  )
}
