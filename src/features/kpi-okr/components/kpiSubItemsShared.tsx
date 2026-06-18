import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PerformanceAssignmentSubItem, SubItemInputPayload } from '@/features/kpi-okr/api'
import type { SubItemDraft } from '@/features/kpi-okr/utils/kpiProgressUtils'
import { emptySubItemLine, computeSubItemProgress } from '@/features/kpi-okr/utils/kpiProgressUtils'
import { KpiProgressBar } from '@/features/kpi-okr/components/KpiProgressBar'
import { formatViNumber } from '@/features/kpi-okr/components/kpiAssignmentTableShared'
import type { Control } from 'react-hook-form'
import { useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ── Helpers ──

/**
 * Convert API sub-items to local drafts for editing.
 */
export function subItemsFromAssignment(subItems?: PerformanceAssignmentSubItem[]): SubItemDraft[] {
  if (!subItems?.length) return []
  return subItems.map((s) => ({
    id: s.id,
    label: s.label,
    targetMetric: s.targetMetric ?? '',
    numericUnit: s.numericUnit ?? '',
    weight: s.weight ?? 1,
    numericValue: s.numericValue,
    selfEvalStatus: s.selfEvalStatus,
    selfReviewNote: s.selfReviewNote,
  }))
}

/**
 * Convert local drafts to API payload format.
 */
export function mapSubItemsToPayload(drafts: SubItemDraft[]): SubItemInputPayload[] {
  return drafts
    .filter((d) => d.label.trim())
    .map((d) => ({
      id: d.id,
      label: d.label.trim(),
      targetMetric: d.targetMetric?.trim() || null,
      numericUnit: d.numericUnit?.trim() || null,
      weight: d.weight,
      numericValue: d.numericValue,
      selfEvalStatus: d.selfEvalStatus,
      selfReviewNote: d.selfReviewNote,
    }))
}

// ── AssignmentSubItemsInline ──

interface AssignmentSubItemsInlineProps {
  subItems: PerformanceAssignmentSubItem[]
  expanded: boolean
  showProgress?: boolean
  onToggle: () => void
}

export function AssignmentSubItemsInline({
  subItems,
  expanded,
  showProgress = true,
  onToggle,
}: AssignmentSubItemsInlineProps) {
  return (
    <div className="mt-1.5">
      <button
        type="button"
        className="flex items-center gap-1 text-xs font-medium text-primary/80 hover:text-primary"
        onClick={onToggle}
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {subItems.length} chỉ tiêu con
      </button>
      {expanded && (
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
      )}
    </div>
  )
}

// ── SubItemsDraftEditor (standalone draft list editor) ──

interface SubItemsDraftEditorProps {
  value: SubItemDraft[]
  onChange: (items: SubItemDraft[]) => void
  disabled?: boolean
}

export function SubItemsDraftEditor({ value, onChange, disabled }: SubItemsDraftEditorProps) {
  const update = (index: number, patch: Partial<SubItemDraft>) => {
    const next = [...value]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        Chỉ tiêu con ({value.length})
      </p>
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Tên chỉ tiêu con"
            disabled={disabled}
            className="flex-1 text-xs"
          />
          <Input
            value={item.targetMetric}
            onChange={(e) => update(i, { targetMetric: e.target.value })}
            placeholder="Mục tiêu"
            disabled={disabled}
            className="w-20 text-xs"
          />
          <Input
            value={item.numericUnit}
            onChange={(e) => update(i, { numericUnit: e.target.value })}
            placeholder="Đơn vị"
            disabled={disabled}
            className="w-20 text-xs"
          />
          <button
            type="button"
            className="text-red-400 hover:text-red-600 disabled:opacity-40"
            disabled={disabled}
            onClick={() => remove(i)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-40"
        disabled={disabled}
        onClick={() => onChange([...value, { ...emptySubItemLine }])}
      >
        <Plus className="h-3 w-3" /> Thêm chỉ tiêu con
      </button>
    </div>
  )
}

// ── SubItemsEditSection (for react-hook-form within single-assignment dialogs) ──

interface SubItemsEditSectionProps {
  control: Control<any>
}

export function SubItemsEditSection({ control }: SubItemsEditSectionProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'subItems' })

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        Chỉ tiêu con ({fields.length})
      </p>
      {fields.map((field, i) => (
        <div key={field.id} className="flex items-center gap-2">
          <Input
            {...control.register(`subItems.${i}.label`)}
            placeholder="Tên chỉ tiêu con"
            className="flex-1 text-xs"
          />
          <Input
            {...control.register(`subItems.${i}.targetMetric`)}
            placeholder="Mục tiêu"
            className="w-20 text-xs"
          />
          <Input
            {...control.register(`subItems.${i}.numericUnit`)}
            placeholder="Đơn vị"
            className="w-20 text-xs"
          />
          <button
            type="button"
            className="text-red-400 hover:text-red-600"
            onClick={() => remove(i)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        onClick={() => append({ ...emptySubItemLine })}
      >
        <Plus className="h-3 w-3" /> Thêm chỉ tiêu con
      </button>
    </div>
  )
}

// ── SubItemsEditorPanel (collapsible, for bulk-assign form) ──

interface SubItemsEditorPanelProps {
  control: Control<any>
  namePrefix: string
  expanded: boolean
  onToggle: () => void
}

export function SubItemsEditorPanel({
  control,
  namePrefix,
  expanded,
  onToggle,
}: SubItemsEditorPanelProps) {
  const { fields, append, remove } = useFieldArray({ control, name: namePrefix })

  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1 text-xs font-medium text-primary/80 hover:text-primary"
        onClick={onToggle}
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Chỉ tiêu con ({fields.length})
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1.5 pl-2">
          {fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input
                {...control.register(`${namePrefix}.${i}.label`)}
                placeholder="Tên chỉ tiêu con"
                className="flex-1 text-xs"
              />
              <Input
                {...control.register(`${namePrefix}.${i}.targetMetric`)}
                placeholder="Mục tiêu"
                className="w-20 text-xs"
              />
              <Input
                {...control.register(`${namePrefix}.${i}.numericUnit`)}
                placeholder="Đơn vị"
                className="w-20 text-xs"
              />
              <button
                type="button"
                className="text-red-400 hover:text-red-600"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            onClick={() => append({ ...emptySubItemLine })}
          >
            <Plus className="h-3 w-3" /> Thêm
          </button>
        </div>
      )}
    </div>
  )
}
