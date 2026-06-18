import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { PerformanceAssignmentSubItem } from '@/features/kpi-okr/api'
import { performanceApi } from '@/features/kpi-okr/api'
import { computeSubItemProgress } from '@/features/kpi-okr/utils/kpiProgressUtils'
import { KpiProgressBar } from '@/features/kpi-okr/components/KpiProgressBar'
import { formatViNumber } from '@/features/kpi-okr/components/kpiAssignmentTableShared'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ── Helpers ──

/**
 * Whether a sub-item has been fully filled in by the employee
 * (has a numeric value or self-eval status).
 */
export function isSubItemResultComplete(sub: PerformanceAssignmentSubItem): boolean {
  return sub.numericValue != null || (sub.selfEvalStatus != null && sub.selfEvalStatus !== '')
}

// ── Draft types ──

type SubItemSelfDraft = {
  id: string
  label: string
  targetMetric: string | null
  numericUnit: string | null
  weight: number
  numericValue: number | null
  selfEvalStatus: string | null
  selfReviewNote: string | null
}

// ── Hook ──

export function useSubItemsSelfEdit(
  assignmentId: string,
  subItems: PerformanceAssignmentSubItem[],
  onSaved: () => void
) {
  const [drafts, setDrafts] = useState<SubItemSelfDraft[]>(() =>
    subItems.map((s) => ({
      id: s.id,
      label: s.label,
      targetMetric: s.targetMetric,
      numericUnit: s.numericUnit,
      weight: s.weight,
      numericValue: s.numericValue,
      selfEvalStatus: s.selfEvalStatus,
      selfReviewNote: s.selfReviewNote,
    }))
  )

  const [savingId, setSavingId] = useState<string | null>(null)

  const updateDraft = useCallback((id: string, patch: Partial<SubItemSelfDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }, [])

  const saveAll = useCallback(async (): Promise<boolean> => {
    try {
      setSavingId('all')
      for (const d of drafts) {
        await performanceApi.patchSubItemSelf(assignmentId, d.id, {
          numericValue: d.numericValue,
          selfEvalStatus: d.selfEvalStatus,
          selfReviewNote: d.selfReviewNote,
        })
      }
      toast.success('Đã lưu kết quả chỉ tiêu con')
      onSaved()
      return true
    } catch {
      toast.error('Không lưu được kết quả')
      return false
    } finally {
      setSavingId(null)
    }
  }, [drafts, assignmentId, onSaved])

  return { drafts, updateDraft, savingId, saveAll }
}

// ── Validation ──

export function validateSubItemsSelfDrafts(
  subItems: PerformanceAssignmentSubItem[],
  drafts: SubItemSelfDraft[]
): { valid: boolean; message?: string } {
  for (const d of drafts) {
    if (d.numericValue == null && (!d.selfEvalStatus || d.selfEvalStatus === '')) {
      return { valid: false, message: `Chưa nhập kết quả cho "${d.label}"` }
    }
  }
  return { valid: true }
}

// ── SubItemsSelfEditInline ──

interface SubItemsSelfEditInlineProps {
  assignmentId: string
  subItems: PerformanceAssignmentSubItem[]
  disabled: boolean
  onSaved: () => void
  submitValidation?: { numeric: boolean; selfEval: boolean }
}

export function SubItemsSelfEditInline({
  assignmentId,
  subItems,
  disabled,
  onSaved,
  submitValidation,
}: SubItemsSelfEditInlineProps) {
  const { drafts, updateDraft, savingId, saveAll } = useSubItemsSelfEdit(
    assignmentId,
    subItems,
    onSaved
  )

  return (
    <div className="mt-2 space-y-1.5 border-l-2 border-primary/20 pl-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        Chỉ tiêu con ({drafts.length})
      </p>
      {drafts.map((d) => (
        <div key={d.id} className="flex items-center gap-2 text-xs">
          <span className="min-w-[100px] font-medium text-slate-700 dark:text-slate-200">
            {d.label}
          </span>
          {d.targetMetric && (
            <span className="text-slate-400">
              Mục tiêu: {d.targetMetric} {d.numericUnit ?? ''}
            </span>
          )}
          <Input
            type="number"
            value={d.numericValue ?? ''}
            onChange={(e) =>
              updateDraft(d.id, {
                numericValue: e.target.value ? Number(e.target.value) : null,
              })
            }
            disabled={disabled || savingId != null}
            className={cn(
              'w-20 text-xs',
              submitValidation?.numeric && d.numericValue == null && 'border-red-400'
            )}
            placeholder="Kết quả"
          />
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        disabled={disabled || savingId != null}
        onClick={() => void saveAll()}
        className="text-xs"
      >
        {savingId ? 'Đang lưu...' : 'Lưu chỉ tiêu con'}
      </Button>
    </div>
  )
}

// ── SubItemsSelfEditPanel (used in MonthlyReportScreen) ──

interface SubItemsSelfEditPanelProps {
  subItems: PerformanceAssignmentSubItem[]
  disabled: boolean
  editState: ReturnType<typeof useSubItemsSelfEdit>
}

export function SubItemsSelfEditPanel({
  subItems,
  disabled,
  editState,
}: SubItemsSelfEditPanelProps) {
  const { drafts, updateDraft, savingId } = editState

  return (
    <div className="space-y-1.5">
      {drafts.map((d) => (
        <div key={d.id} className="flex items-center gap-2 text-xs">
          <span className="min-w-[120px] font-medium">{d.label}</span>
          {d.targetMetric && (
            <span className="text-slate-400">
              ({d.targetMetric} {d.numericUnit ?? ''})
            </span>
          )}
          <Input
            type="number"
            value={d.numericValue ?? ''}
            onChange={(e) =>
              updateDraft(d.id, {
                numericValue: e.target.value ? Number(e.target.value) : null,
              })
            }
            disabled={disabled || savingId != null}
            className="w-24 text-xs"
            placeholder="Kết quả"
          />
        </div>
      ))}
    </div>
  )
}

// ── SubItemsReadOnlyList ──

interface SubItemsReadOnlyListProps {
  subItems: PerformanceAssignmentSubItem[]
  showProgress?: boolean
}

export function SubItemsReadOnlyList({ subItems, showProgress }: SubItemsReadOnlyListProps) {
  if (!subItems.length) return null

  return (
    <ul className="mt-1 space-y-0.5 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
      {subItems.map((s) => {
        const progress = computeSubItemProgress(s)
        return (
          <li key={s.id} className="text-xs text-slate-600 dark:text-slate-300">
            <span className="font-medium">{s.label}</span>
            {s.targetMetric && (
              <span className="ml-1.5 text-slate-400">
                ({formatViNumber(s.numericValue)} / {s.targetMetric}
                {s.numericUnit ? ` ${s.numericUnit}` : ''})
              </span>
            )}
            {showProgress && progress != null && (
              <KpiProgressBar
                value={progress}
                className="mt-0.5 max-w-[120px]"
                barClassName="h-1"
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
