import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useWatch, type Control, type FieldValues } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiProgressBar } from '@/features/kpi-okr/components/KpiProgressBar'
import type { PerformanceAssignmentSubItem } from '@/features/kpi-okr/api'
import {
  computeSubItemProgress,
  emptySubItemLine,
  MAX_SUB_ITEMS,
  type SubItemDraft,
} from '@/features/kpi-okr/utils/kpiProgressUtils'

export function subItemsTotalWeight(subItems: SubItemDraft[] | undefined): number {
  return (subItems ?? []).reduce((sum, s) => sum + (Number(s.weight) || 0), 0)
}

const SUB_ITEMS_EDITOR_GRID = 'grid grid-cols-[minmax(0,1fr)_96px_72px_80px_36px] items-start gap-2'

function SubItemsFieldGuide() {
  return (
    <div className="mb-3 rounded-md border border-indigo-100 bg-indigo-50/60 px-2.5 py-2 text-[11px] leading-relaxed text-slate-600 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-slate-300">
      <p className="font-semibold text-indigo-800 dark:text-indigo-200">
        Mỗi mục con cần điền 4 thông tin:
      </p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-slate-600 dark:text-slate-300">
        <li>
          <strong>Tên mục con</strong> (bắt buộc): mô tả công việc hoặc chỉ số nhỏ thuộc KPI/OKR
          cha.
        </li>
        <li>
          <strong>Chỉ tiêu</strong>: số hoặc mức cần đạt — VD: <em>1</em>, <em>100</em>,{' '}
          <em>100%</em>.
        </li>
        <li>
          <strong>ĐVT</strong> (đơn vị tính): cách đo kết quả — VD: <em>KPI</em>, <em>%</em>,{' '}
          <em>lần</em>, <em>dashboard</em>.
        </li>
        <li>
          <strong>Trọng số %</strong>: phần đóng góp của mục con vào tiến độ KPI/OKR cha. Tổng trọng
          số tất cả mục con <strong>nên = 100%</strong>.
        </li>
      </ul>
    </div>
  )
}

function SubItemsEditorColumnHeaders() {
  return (
    <div
      className={`${SUB_ITEMS_EDITOR_GRID} mb-1 border-b border-slate-200 pb-2 dark:border-slate-700`}
    >
      <div>
        <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">
          Tên mục con <span className="text-rose-500">*</span>
        </div>
        <div className="text-[10px] text-slate-400">Mô tả công việc / chỉ số nhỏ</div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">Chỉ tiêu</div>
        <div className="text-[10px] text-slate-400">Số cần đạt</div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">ĐVT</div>
        <div className="text-[10px] text-slate-400">Đơn vị tính</div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">
          Trọng số %
        </div>
        <div className="text-[10px] text-slate-400">Tỷ trọng tiến độ</div>
      </div>
      <div className="pt-1 text-[10px] font-semibold text-slate-400">Xóa</div>
    </div>
  )
}

function SubItemsWeightSummary({ totalWeight }: { totalWeight: number }) {
  return (
    <p
      className={cn(
        'mt-3 rounded-md px-2 py-1.5 text-xs',
        totalWeight !== 100
          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
          : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
      )}
    >
      Tổng trọng số: <strong>{totalWeight}%</strong>
      {totalWeight !== 100
        ? ' — cần chỉnh sao cho tổng các cột Trọng số % = 100%'
        : ' — đã đủ 100%'}
    </p>
  )
}

type SubItemsEditorProps<T extends FieldValues> = {
  control: Control<T>
  /** react-hook-form path prefix, vd: `lines.0.subItems` hoặc `subItems` */
  namePrefix: string
  expanded: boolean
  onToggle: () => void
}

/** Panel nhập mục con — nested hoặc root useFieldArray. */
export function SubItemsEditorPanel<T extends FieldValues>({
  control,
  namePrefix,
  expanded,
  onToggle,
}: SubItemsEditorProps<T>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: namePrefix as never,
  })
  const subItemsWatched = useWatch({
    control,
    name: namePrefix as never,
  }) as SubItemDraft[] | undefined
  const totalWeight = subItemsTotalWeight(subItemsWatched)

  return (
    <div className="mt-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700"
        onClick={onToggle}
      >
        {expanded ? '▲' : '▼'} Mục con ({fields.length})
      </Button>
      {expanded && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Mục con (tùy chọn)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 text-xs"
              disabled={fields.length >= MAX_SUB_ITEMS}
              onClick={() => append(emptySubItemLine() as never)}
            >
              <Plus className="h-3 w-3" />
              Thêm mục con
            </Button>
          </div>
          <SubItemsFieldGuide />
          {fields.length === 0 ? (
            <p className="text-xs text-slate-400">
              Chưa có mục con. Nhấn &quot;Thêm mục con&quot; để bổ sung từng dòng theo 4 cột ở trên.
            </p>
          ) : (
            <div className="space-y-2">
              <SubItemsEditorColumnHeaders />
              {fields.map((field, subIdx) => (
                <div key={field.id} className={SUB_ITEMS_EDITOR_GRID}>
                  <Input
                    {...control.register(`${namePrefix}.${subIdx}.label` as never)}
                    placeholder="VD: Hoàn thiện module đăng ký học"
                    aria-label="Tên mục con"
                    className="h-8 text-xs"
                  />
                  <Input
                    {...control.register(`${namePrefix}.${subIdx}.targetMetric` as never)}
                    placeholder="VD: 1"
                    aria-label="Chỉ tiêu mục con"
                    className="h-8 text-xs"
                  />
                  <Input
                    {...control.register(`${namePrefix}.${subIdx}.numericUnit` as never)}
                    placeholder="VD: KPI"
                    aria-label="Đơn vị tính mục con"
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    {...control.register(`${namePrefix}.${subIdx}.weight` as never, {
                      valueAsNumber: true,
                    })}
                    placeholder="VD: 40"
                    aria-label="Trọng số phần trăm mục con"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => remove(subIdx)}
                    aria-label="Xóa mục con"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {fields.length > 0 && <SubItemsWeightSummary totalWeight={totalWeight} />}
        </div>
      )}
    </div>
  )
}

/** Editor mục con dùng state (dialog không dùng react-hook-form). */
export function SubItemsDraftEditor({
  value,
  onChange,
  disabled,
}: {
  value: SubItemDraft[]
  onChange: (next: SubItemDraft[]) => void
  disabled?: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const totalWeight = subItemsTotalWeight(value)

  const updateItem = (index: number, patch: Partial<SubItemDraft>) => {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const appendItem = () => {
    if (value.length >= MAX_SUB_ITEMS) return
    onChange([...value, emptySubItemLine()])
  }

  return (
    <div className="md:col-span-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700"
        onClick={() => setExpanded((v) => !v)}
        disabled={disabled}
      >
        {expanded ? '▲' : '▼'} Mục con ({value.length})
      </Button>
      {expanded && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Chỉ số con (tùy chọn)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 text-xs"
              disabled={disabled || value.length >= MAX_SUB_ITEMS}
              onClick={appendItem}
            >
              <Plus className="h-3 w-3" />
              Thêm mục con
            </Button>
          </div>
          <SubItemsFieldGuide />
          {value.length === 0 ? (
            <p className="text-xs text-slate-400">
              Chưa có mục con. Nhấn &quot;Thêm mục con&quot; để bổ sung từng dòng theo 4 cột ở trên.
            </p>
          ) : (
            <div className="space-y-2">
              <SubItemsEditorColumnHeaders />
              {value.map((item, subIdx) => (
                <div key={subIdx} className={SUB_ITEMS_EDITOR_GRID}>
                  <Input
                    value={item.label}
                    onChange={(e) => updateItem(subIdx, { label: e.target.value })}
                    placeholder="VD: Hoàn thiện module đăng ký học"
                    aria-label="Tên mục con"
                    className="h-8 text-xs"
                    disabled={disabled}
                  />
                  <Input
                    value={item.targetMetric}
                    onChange={(e) => updateItem(subIdx, { targetMetric: e.target.value })}
                    placeholder="VD: 1"
                    aria-label="Chỉ tiêu mục con"
                    className="h-8 text-xs"
                    disabled={disabled}
                  />
                  <Input
                    value={item.numericUnit}
                    onChange={(e) => updateItem(subIdx, { numericUnit: e.target.value })}
                    placeholder="VD: KPI"
                    aria-label="Đơn vị tính mục con"
                    className="h-8 text-xs"
                    disabled={disabled}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={Number.isFinite(item.weight) ? item.weight : ''}
                    onChange={(e) =>
                      updateItem(subIdx, {
                        weight: e.target.value === '' ? 0 : Number(e.target.value),
                      })
                    }
                    placeholder="VD: 40"
                    aria-label="Trọng số phần trăm mục con"
                    className="h-8 text-xs"
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removeItem(subIdx)}
                    disabled={disabled}
                    aria-label="Xóa mục con"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {value.length > 0 && <SubItemsWeightSummary totalWeight={totalWeight} />}
        </div>
      )}
    </div>
  )
}

/** Editor mục con ở root form (edit dialog). */
export function SubItemsEditSection<T extends FieldValues>({ control }: { control: Control<T> }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <SubItemsEditorPanel
      control={control}
      namePrefix="subItems"
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
    />
  )
}

/** Badge + expand inline sub-rows trong bảng Leader. */
export function AssignmentSubItemsInline({
  subItems,
  expanded,
  onToggle,
  showProgress = true,
}: {
  subItems: PerformanceAssignmentSubItem[]
  expanded: boolean
  onToggle: () => void
  showProgress?: boolean
}) {
  if (!subItems.length) return null
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="mt-1 inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
      >
        {expanded ? '▲' : '▼'} {subItems.length} mục con
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 border-l-2 border-indigo-200 pl-3 dark:border-indigo-800">
          {subItems.map((sub) => {
            const pct = computeSubItemProgress(sub)
            return (
              <div key={sub.id} className="text-xs text-slate-600 dark:text-slate-300">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{sub.label}</span>
                  {sub.weight > 0 && (
                    <span className="rounded bg-slate-100 px-1 text-[10px] dark:bg-slate-800">
                      {sub.weight}%
                    </span>
                  )}
                  <span className="text-slate-400">
                    {sub.targetMetric ?? '—'}
                    {showProgress ? ` → ${sub.numericValue ?? '—'} ${sub.numericUnit ?? ''}` : ''}
                    {!showProgress && sub.numericUnit ? ` ${sub.numericUnit}` : ''}
                  </span>
                </div>
                {showProgress && (
                  <KpiProgressBar value={pct} className="mt-1" barClassName="h-1.5" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export function mapSubItemsToPayload(subItems: SubItemDraft[] | undefined): Array<{
  label: string
  targetMetric: string | null
  numericUnit: string | null
  weight: number
}> {
  return (subItems ?? [])
    .filter((s) => s.label.trim())
    .map((s) => ({
      label: s.label.trim(),
      targetMetric: s.targetMetric.trim() || null,
      numericUnit: s.numericUnit.trim() || null,
      weight: Number.isFinite(s.weight) ? Math.round(s.weight) : 0,
    }))
}

export function subItemsFromAssignment(
  subItems: PerformanceAssignmentSubItem[] | undefined
): SubItemDraft[] {
  return (subItems ?? []).map((s) => ({
    label: s.label,
    targetMetric: s.targetMetric ?? '',
    numericUnit: s.numericUnit ?? '',
    weight: s.weight ?? 0,
  }))
}
