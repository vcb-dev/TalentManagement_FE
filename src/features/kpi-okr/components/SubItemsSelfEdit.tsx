import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import { performanceApi, type PerformanceAssignmentSubItem } from '@/features/kpi-okr/api'
import { KpiProgressBar } from '@/features/kpi-okr/components/KpiProgressBar'
import { computeSubItemProgress } from '@/features/kpi-okr/utils/kpiProgressUtils'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/shared/CustomSelect'

export type SubItemSelfDraft = {
  numericRaw: string
  selfEvalStatus: string
}

function draftsFromSubItems(
  subItems: PerformanceAssignmentSubItem[]
): Record<string, SubItemSelfDraft> {
  const m: Record<string, SubItemSelfDraft> = {}
  for (const s of subItems) {
    m[s.id] = {
      numericRaw: s.numericValue != null ? String(s.numericValue) : '',
      selfEvalStatus: s.selfEvalStatus ?? '',
    }
  }
  return m
}

export function useSubItemsSelfEdit(
  assignmentId: string,
  subItems: PerformanceAssignmentSubItem[],
  onSaved?: () => void
) {
  const [drafts, setDrafts] = useState<Record<string, SubItemSelfDraft>>(() =>
    draftsFromSubItems(subItems)
  )
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    setDrafts(draftsFromSubItems(subItems))
  }, [assignmentId, subItems])

  const updateDraft = useCallback((subItemId: string, patch: Partial<SubItemSelfDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [subItemId]: { ...prev[subItemId], ...patch },
    }))
  }, [])

  const saveSubItem = useCallback(
    async (
      sub: PerformanceAssignmentSubItem,
      override?: Partial<SubItemSelfDraft>
    ): Promise<boolean> => {
      const base = drafts[sub.id] ?? {
        numericRaw: sub.numericValue != null ? String(sub.numericValue) : '',
        selfEvalStatus: sub.selfEvalStatus ?? '',
      }
      const draft = { ...base, ...override }
      const nTrim = draft.numericRaw.trim()
      let numericValue: number | null = null
      if (nTrim.length > 0) {
        const n = Number(nTrim.replace(/\./g, '').replace(',', '.'))
        if (!Number.isFinite(n)) {
          toast.error(`Số liệu mục con "${sub.label}" không hợp lệ.`)
          return false
        }
        numericValue = n
      }
      setSavingId(sub.id)
      try {
        await performanceApi.patchSubItemSelf(assignmentId, sub.id, {
          numericValue,
          selfEvalStatus: draft.selfEvalStatus.trim() ? draft.selfEvalStatus.trim() : null,
        })
        onSaved?.()
        return true
      } catch (e) {
        toast.error(getApiErrorMessage(e))
        return false
      } finally {
        setSavingId(null)
      }
    },
    [assignmentId, drafts, onSaved]
  )

  const saveAll = useCallback(async (): Promise<boolean> => {
    for (const sub of subItems) {
      const ok = await saveSubItem(sub)
      if (!ok) return false
    }
    return true
  }, [subItems, saveSubItem])

  return { drafts, updateDraft, saveSubItem, saveAll, savingId }
}

function isSelfEvalComplete(status: string): boolean {
  const s = status.trim().toUpperCase()
  return s === 'OK' || s === 'NOT'
}

export const SUB_ITEM_INVALID_RING =
  '!border-2 !border-red-500 !ring-2 !ring-red-500/25 focus:!border-red-500 focus:!ring-red-500/35 focus-visible:!border-red-500 focus-visible:!ring-red-500/35'

export function isSubItemResultComplete(
  sub: PerformanceAssignmentSubItem,
  draft?: SubItemSelfDraft
): boolean {
  const selfStatus = (draft?.selfEvalStatus ?? sub.selfEvalStatus ?? '').trim()
  if (isSelfEvalComplete(selfStatus)) return true
  const nTrim = (
    draft?.numericRaw ?? (sub.numericValue != null ? String(sub.numericValue) : '')
  ).trim()
  if (!nTrim) return false
  const n = Number(nTrim.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n)
}

export type SubItemsSelfEditState = ReturnType<typeof useSubItemsSelfEdit>

export function validateSubItemsSelfDrafts(
  subItems: PerformanceAssignmentSubItem[],
  drafts: Record<string, SubItemSelfDraft>
): { valid: boolean; message?: string } {
  for (const sub of subItems) {
    const draft = drafts[sub.id]
    if (isSubItemResultComplete(sub, draft)) continue
    const selfStatus = (draft?.selfEvalStatus ?? sub.selfEvalStatus ?? '').trim()
    if (!isSelfEvalComplete(selfStatus)) {
      return {
        valid: false,
        message: `Vui lòng chọn tự đánh giá OK hoặc NOT cho "${sub.label}".`,
      }
    }
    const nTrim = (
      draft?.numericRaw ?? (sub.numericValue != null ? String(sub.numericValue) : '')
    ).trim()
    if (nTrim) {
      const n = Number(nTrim.replace(/\./g, '').replace(',', '.'))
      if (!Number.isFinite(n)) {
        return { valid: false, message: `Số liệu mục con "${sub.label}" không hợp lệ.` }
      }
    }
  }
  return { valid: true }
}

/** Panel nhập kết quả từng mục con — dùng trong dialog báo cáo tháng. */
export function SubItemsSelfEditPanel({
  subItems,
  disabled,
  editState,
}: {
  subItems: PerformanceAssignmentSubItem[]
  disabled?: boolean
  editState: SubItemsSelfEditState
}) {
  const { drafts, updateDraft, saveSubItem, savingId } = editState

  if (!subItems.length) return null

  return (
    <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <div>
        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
          Chỉ số con ({subItems.length})
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Nhập số liệu và tự đánh giá cho từng mục con. Tiến độ KPI cha được tính theo trọng số.
        </p>
      </div>
      <div className="space-y-3">
        {subItems.map((sub) => {
          const draft = drafts[sub.id]
          const pct = computeSubItemProgress({ ...sub, ...draftToProgressInput(draft, sub) })
          const busy = savingId === sub.id
          return (
            <div
              key={sub.id}
              className="rounded-lg border border-white/80 bg-white/90 p-3 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {sub.label}
                </span>
                {sub.weight > 0 && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-slate-800">
                    {sub.weight}%
                  </span>
                )}
                <span className="text-slate-400">
                  Chỉ tiêu: {sub.targetMetric ?? '—'}
                  {sub.numericUnit ? ` · ${sub.numericUnit}` : ''}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-12">
                <div className="sm:col-span-5">
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Số liệu
                  </label>
                  <Input
                    value={draft?.numericRaw ?? ''}
                    onChange={(e) => updateDraft(sub.id, { numericRaw: e.target.value })}
                    onBlur={(e) => void saveSubItem(sub, { numericRaw: e.target.value })}
                    disabled={disabled || busy}
                    placeholder="VD: 1"
                    className="h-9 text-sm"
                    inputMode="decimal"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Tự đánh giá
                  </label>
                  <CustomSelect
                    value={draft?.selfEvalStatus || '__none'}
                    onValueChange={(v) => {
                      const next = v === '__none' ? '' : v
                      updateDraft(sub.id, { selfEvalStatus: next })
                      void saveSubItem(sub, { selfEvalStatus: next })
                    }}
                    disabled={disabled || busy}
                    triggerClassName="h-9 text-sm"
                    options={[
                      { label: '—', value: '__none' },
                      { label: 'OK', value: 'OK' },
                      { label: 'NOT', value: 'NOT' },
                    ]}
                  />
                </div>
                <div className="flex flex-col justify-end sm:col-span-3">
                  <span className="mb-1 text-[11px] font-medium text-slate-600">Tiến độ</span>
                  <KpiProgressBar value={pct} barClassName="h-2" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function draftToProgressInput(
  draft: SubItemSelfDraft | undefined,
  sub: PerformanceAssignmentSubItem
) {
  if (!draft) return sub
  const nTrim = draft.numericRaw.trim()
  let numericValue: number | null = sub.numericValue ?? null
  if (nTrim.length > 0) {
    const n = Number(nTrim.replace(/\./g, '').replace(',', '.'))
    if (Number.isFinite(n)) numericValue = n
  }
  return {
    numericValue,
    selfEvalStatus: draft.selfEvalStatus || sub.selfEvalStatus,
  }
}

/** Badge + danh sách mục con có thể nhập — gắn dưới cột Nội dung trong bảng KPI. */
export function SubItemsSelfEditInline({
  assignmentId,
  subItems,
  disabled,
  onSaved,
  defaultExpanded = true,
  submitValidation,
}: {
  assignmentId: string
  subItems: PerformanceAssignmentSubItem[]
  disabled?: boolean
  onSaved?: () => void
  defaultExpanded?: boolean
  submitValidation?: { numeric?: boolean; selfEval?: boolean }
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const { drafts, updateDraft, saveSubItem, savingId } = useSubItemsSelfEdit(
    assignmentId,
    subItems,
    onSaved
  )

  useEffect(() => {
    if (submitValidation?.numeric || submitValidation?.selfEval) {
      setExpanded(true)
    }
  }, [submitValidation?.numeric, submitValidation?.selfEval])

  if (!subItems.length) return null

  const hasSubmitError = Boolean(submitValidation?.numeric || submitValidation?.selfEval)

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
          hasSubmitError
            ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
            : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
        )}
      >
        {expanded ? '▲' : '▼'} {subItems.length} mục con — nhập kết quả
      </button>
      {expanded && (
        <div
          className={cn(
            'mt-2 space-y-2 border-l-2 pl-3',
            hasSubmitError
              ? 'border-red-400 dark:border-red-700'
              : 'border-indigo-200 dark:border-indigo-800'
          )}
        >
          {subItems.map((sub) => {
            const draft = drafts[sub.id]
            const pct = computeSubItemProgress({ ...sub, ...draftToProgressInput(draft, sub) })
            const busy = savingId === sub.id
            const selfStatus = draft?.selfEvalStatus ?? sub.selfEvalStatus ?? ''
            const selfInvalid = Boolean(
              submitValidation?.selfEval && !isSelfEvalComplete(selfStatus)
            )
            const numericInvalid = Boolean(
              submitValidation?.numeric &&
              !isSubItemResultComplete(sub, draft) &&
              !isSelfEvalComplete(selfStatus)
            )
            return (
              <div
                key={sub.id}
                className={cn(
                  'rounded-md border bg-white/70 p-2 dark:bg-slate-900/40',
                  selfInvalid || numericInvalid
                    ? 'border-red-300 ring-1 ring-red-200 dark:border-red-800 dark:ring-red-900/40'
                    : 'border-slate-200/80 dark:border-slate-700'
                )}
              >
                <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  {sub.label}
                  {sub.weight > 0 && (
                    <span className="ml-1 font-normal text-slate-400">({sub.weight}%)</span>
                  )}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  CT: {sub.targetMetric ?? '—'}
                  {sub.numericUnit ? ` · ${sub.numericUnit}` : ''}
                </div>
                <div className="mt-1.5 grid grid-cols-[1fr_88px] gap-1.5">
                  <Input
                    value={draft?.numericRaw ?? ''}
                    onChange={(e) => updateDraft(sub.id, { numericRaw: e.target.value })}
                    onBlur={(e) => void saveSubItem(sub, { numericRaw: e.target.value })}
                    disabled={disabled || busy}
                    placeholder="Số liệu"
                    className={cn('h-7 text-xs', numericInvalid && SUB_ITEM_INVALID_RING)}
                    inputMode="decimal"
                  />
                  <CustomSelect
                    value={draft?.selfEvalStatus || '__none'}
                    onValueChange={(v) => {
                      const next = v === '__none' ? '' : v
                      updateDraft(sub.id, { selfEvalStatus: next })
                      void saveSubItem(sub, { selfEvalStatus: next })
                    }}
                    disabled={disabled || busy}
                    triggerClassName={cn('h-7 text-xs', selfInvalid && SUB_ITEM_INVALID_RING)}
                    options={[
                      { label: '—', value: '__none' },
                      { label: 'OK', value: 'OK' },
                      { label: 'NOT', value: 'NOT' },
                    ]}
                  />
                </div>
                <KpiProgressBar value={pct} className="mt-1.5" barClassName="h-1" />
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/** Chỉ hiển thị mục con (read-only) — planning / xem nhanh. */
export function SubItemsReadOnlyList({
  subItems,
  showProgress = true,
}: {
  subItems: PerformanceAssignmentSubItem[]
  showProgress?: boolean
}) {
  if (!subItems.length) return null
  return (
    <ul className="mt-1.5 space-y-1 border-l-2 border-indigo-200 pl-2 dark:border-indigo-800">
      {subItems.map((sub) => (
        <li key={sub.id} className="text-[11px] text-slate-600 dark:text-slate-300">
          <span className="font-medium">{sub.label}</span>
          {sub.weight > 0 && <span className="text-slate-400"> · {sub.weight}%</span>}
          <span className="text-slate-400">
            {' '}
            · CT {sub.targetMetric ?? '—'}
            {sub.numericUnit ? ` ${sub.numericUnit}` : ''}
          </span>
          {showProgress && (
            <KpiProgressBar
              value={computeSubItemProgress(sub)}
              className="mt-0.5"
              barClassName="h-1"
            />
          )}
        </li>
      ))}
    </ul>
  )
}
