import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { kpiQueryKeys } from '../kpiQueryKeys'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, AlertTriangle, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import { performanceApi, type CatalogItem } from '@/features/kpi-okr/api'
import { usePermission } from '@/hooks/usePermission'
import { isManagerLikeRole } from '@/lib/managerLikeRole'
import { useAuthStore } from '@/stores/auth.store'
import { categoryLabel, categoryBadgeClass } from '@/features/kpi-okr/catalogHelpers'

type TemplateItem = CatalogItem['items'][number]

const MANAGED_TEMPLATES = [
  {
    code: 'SALES_NV',
    label: 'NV Kinh doanh',
    description: 'Tự động gán cho Sales thường theo giai đoạn thâm niên M1 → M2 → M3 → Chính thức.',
  },
] as const

type ManagedTemplateCode = (typeof MANAGED_TEMPLATES)[number]['code']

const SALES_STAGES = [
  { value: 'M1', label: 'Tháng 1 (M1)' },
  { value: 'M2', label: 'Tháng 2 (M2)' },
  { value: 'M3', label: 'Tháng 3 (M3)' },
  { value: 'OFFICIAL', label: 'Chính thức' },
] as const

const SALES_CATEGORY_OPTIONS = [
  { value: 'KPI_BONUS', label: 'B. Thưởng KPIs' },
  { value: 'PERFORMANCE_BONUS', label: 'D. Thưởng hiệu suất' },
] as const

type VisibleCategory = 'BASE' | 'KPI_BONUS' | 'PERFORMANCE_BONUS'
type CategoryOption = { value: VisibleCategory; label: string }

const getVietnamYearMonth = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
  }
}

const buildMonthOptions = (year: number, currentPeriod: { year: number; month: number }) =>
  Array.from(
    { length: year === currentPeriod.year ? currentPeriod.month : 12 },
    (_, idx) => idx + 1
  )

// ─── Add / Edit dialog ────────────────────────────────────────────────────────

function ItemDialog({
  open,
  onClose,
  catalogCode,
  year,
  month,
  stage,
  stageOptions,
  categoryOptions,
  defaultCategory,
  showCategoryPicker,
  editing,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  catalogCode: ManagedTemplateCode
  year: number
  month: number
  stage: string
  stageOptions: readonly { value: string; label: string }[]
  categoryOptions: readonly CategoryOption[]
  defaultCategory: VisibleCategory
  showCategoryPicker: boolean
  editing: TemplateItem | null
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState(editing?.content ?? '')
  const [category, setCategory] = useState<VisibleCategory>(
    (editing?.category as VisibleCategory | undefined) ?? defaultCategory
  )
  const [dailyTarget, setDailyTarget] = useState(editing?.dailyTarget ?? '')
  const [monthlyTarget, setMonthlyTarget] = useState(editing?.monthlyTarget ?? '')
  const [numericTarget, setNumericTarget] = useState(
    editing?.numericTarget != null ? String(editing.numericTarget) : ''
  )
  const [numericUnit, setNumericUnit] = useState(editing?.numericUnit ?? '')
  const [sortOrder, setSortOrder] = useState(String(editing?.sortOrder ?? 99))

  useEffect(() => {
    setCategory((editing?.category as VisibleCategory | undefined) ?? defaultCategory)
  }, [defaultCategory, editing])

  const stageLabel = stageOptions.find((s) => s.value === stage)?.label ?? stage

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    try {
      const payload = {
        content: content.trim(),
        dailyTarget: dailyTarget.trim() || null,
        monthlyTarget: monthlyTarget.trim() || null,
        numericTarget: numericTarget ? parseFloat(numericTarget) : null,
        numericUnit: numericUnit.trim() || null,
        sortOrder: parseInt(sortOrder) || 99,
      }
      if (editing) {
        await performanceApi.patchCatalogItem(editing.id, payload)
        toast.success('Đã cập nhật chỉ số.')
      } else {
        await performanceApi.createCatalogItem(catalogCode, {
          year,
          month,
          content: payload.content,
          dailyTarget: dailyTarget.trim() || undefined,
          monthlyTarget: monthlyTarget.trim() || undefined,
          numericTarget: numericTarget ? parseFloat(numericTarget) : undefined,
          numericUnit: numericUnit.trim() || undefined,
          sortOrder: payload.sortOrder,
          tenureStage: stage,
          category,
          kind: 'KPI',
          priority: category === 'BASE' ? 1 : 2,
        })
        toast.success('Đã thêm chỉ số.')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Sửa chỉ số' : `Thêm chỉ số — ${stageLabel}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="content">Nội dung *</Label>
            <Textarea
              id="content"
              className="mt-1"
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {!editing && showCategoryPicker && (
            <div>
              <Label htmlFor="category">Loại KPI *</Label>
              <select
                id="category"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={category}
                onChange={(e) => setCategory(e.target.value as VisibleCategory)}
              >
                {categoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="daily">KPI ngày</Label>
              <Input
                id="daily"
                className="mt-1 h-9"
                placeholder="VD: 30 kích/ngày"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="monthly">KPI tháng</Label>
              <Input
                id="monthly"
                className="mt-1 h-9"
                placeholder="VD: 780 khách"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="numericTarget">Chỉ tiêu số</Label>
              <Input
                id="numericTarget"
                type="number"
                className="mt-1 h-9"
                placeholder="VD: 780"
                value={numericTarget}
                onChange={(e) => setNumericTarget(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="numericUnit">Đơn vị</Label>
              <Input
                id="numericUnit"
                className="mt-1 h-9"
                placeholder="VD: khách"
                value={numericUnit}
                onChange={(e) => setNumericUnit(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sortOrder">Thứ tự hiển thị</Label>
            <Input
              id="sortOrder"
              type="number"
              min={1}
              className="mt-1 h-9 w-28"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving || !content.trim()}>
              {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm chỉ số'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Items table ──────────────────────────────────────────────────────────────

function ItemsTable({
  items,
  canEdit,
  onEdit,
  onDelete,
}: {
  items: TemplateItem[]
  canEdit: boolean
  onEdit: (item: TemplateItem) => void
  onDelete: (item: TemplateItem) => void
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed py-6 text-center text-sm text-slate-400">
        Chưa có chỉ số nào. {canEdit && 'Nhấn "Thêm chỉ số" để bắt đầu.'}
      </p>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="w-8 px-4 py-2.5 text-left text-xs font-semibold text-slate-500">#</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Nội dung</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">KPI ngày</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">
              KPI tháng
            </th>
            {canEdit && (
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">
                Thao tác
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {items.map((item, idx) => (
            <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                {item.content}
              </td>
              <td className="px-4 py-2.5 text-slate-500">{item.dailyTarget ?? '—'}</td>
              <td className="px-4 py-2.5 text-slate-500">
                {item.monthlyTarget ??
                  (item.numericTarget != null
                    ? `${item.numericTarget.toLocaleString('vi')} ${item.numericUnit ?? ''}`
                    : '—')}
              </td>
              {canEdit && (
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(item)}
                      title="Sửa"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => onDelete(item)}
                      title="Xóa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export type SalesKpiCatalogScreenProps = {
  embedded?: boolean
}

export function SalesKpiCatalogScreen({ embedded = false }: SalesKpiCatalogScreenProps) {
  const { canId } = usePermission()
  const role = useAuthStore((s) => s.user?.role)
  const canEdit = isManagerLikeRole(role) || canId('kpi.catalog_edit')
  const currentPeriod = useMemo(() => getVietnamYearMonth(), [])

  const [activeTemplateCode, setActiveTemplateCode] = useState<ManagedTemplateCode>('SALES_NV')
  const [selectedYear, setSelectedYear] = useState(currentPeriod.year)
  const [selectedMonth, setSelectedMonth] = useState(currentPeriod.month)
  const [activeStage, setActiveStage] = useState<string>('M1')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TemplateItem | null>(null)
  const qc = useQueryClient()

  const activeTemplate = MANAGED_TEMPLATES.find((tpl) => tpl.code === activeTemplateCode)
  const yearOptions = useMemo(
    () => Array.from({ length: 4 }, (_, idx) => currentPeriod.year - 3 + idx),
    [currentPeriod.year]
  )
  const monthOptions = useMemo(
    () => buildMonthOptions(selectedYear, currentPeriod),
    [currentPeriod, selectedYear]
  )
  const stageOptions = SALES_STAGES
  const categoryOptions = SALES_CATEGORY_OPTIONS
  const visibleCategories = useMemo<VisibleCategory[]>(
    () => categoryOptions.map((option) => option.value),
    [categoryOptions]
  )

  useEffect(() => {
    setActiveStage(stageOptions[0].value)
    setDialogOpen(false)
    setEditing(null)
  }, [activeTemplateCode, stageOptions])

  useEffect(() => {
    const maxMonth = selectedYear === currentPeriod.year ? currentPeriod.month : 12
    if (selectedMonth > maxMonth) {
      setSelectedMonth(maxMonth)
    }
  }, [currentPeriod.month, currentPeriod.year, selectedMonth, selectedYear])

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['performance', 'catalog', activeTemplateCode, selectedYear, selectedMonth],
    queryFn: () => performanceApi.getCatalog(activeTemplateCode, selectedYear, selectedMonth),
    staleTime: 60_000,
  })
  const selectedIsCurrent =
    selectedYear === currentPeriod.year && selectedMonth === currentPeriod.month
  const canEditPeriod = canEdit && selectedIsCurrent && !catalog?.readOnly

  const itemsByCategory = useMemo<Partial<Record<VisibleCategory, TemplateItem[]>>>(() => {
    const all = catalog?.items ?? []
    const stageItems = all.filter(
      (i) =>
        i.tenureStage === activeStage && visibleCategories.includes(i.category as VisibleCategory)
    )
    return Object.fromEntries(
      visibleCategories.map((cat) => [
        cat,
        stageItems.filter((i) => i.category === cat).sort((a, b) => a.sortOrder - b.sortOrder),
      ])
    ) as Partial<Record<VisibleCategory, TemplateItem[]>>
  }, [catalog, activeStage, visibleCategories])

  const invalidate = () => {
    void qc.invalidateQueries({
      queryKey: ['performance', 'catalog', activeTemplateCode, selectedYear, selectedMonth],
    })
    void qc.invalidateQueries({ queryKey: kpiQueryKeys.allAssignments() })
    void qc.invalidateQueries({ queryKey: kpiQueryKeys.allSummaries() })
  }

  const openAdd = () => {
    if (!canEditPeriod) return
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (item: TemplateItem) => {
    if (!canEditPeriod) return
    setEditing(item)
    setDialogOpen(true)
  }

  const handleDelete = async (item: TemplateItem) => {
    if (!canEditPeriod) return
    if (!confirm(`Xóa chỉ số "${item.content}"?\nThao tác này không ảnh hưởng đến các kỳ đã giao.`))
      return
    try {
      await performanceApi.deleteCatalogItem(item.id)
      toast.success('Đã xóa chỉ số khỏi danh mục.')
      invalidate()
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <div
      className={cn(
        embedded ? 'mx-auto max-w-[1400px] px-3 pb-8 md:px-4' : 'mx-auto max-w-5xl px-4 py-8'
      )}
    >
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className={cn(
              'font-bold tracking-tight text-slate-900 dark:text-slate-100',
              embedded ? 'text-xl' : 'text-2xl'
            )}
          >
            Cấu hình KPI Kinh doanh
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quản lý chỉ tiêu KPI theo giai đoạn thâm niên cho nhân viên Kinh doanh. Thay đổi sẽ được
            áp dụng khi auto-seed kỳ tiếp theo.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            <Select
              value={String(selectedMonth)}
              onValueChange={(value) => setSelectedMonth(Number(value))}
            >
              <SelectTrigger className="h-8 w-[112px] border-0 bg-transparent px-2 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={String(month)}>
                    Thang {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => setSelectedYear(Number(value))}
            >
              <SelectTrigger className="h-8 w-[92px] border-0 bg-transparent px-2 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canEditPeriod && (
            <Button onClick={openAdd} className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              Thêm chỉ số
            </Button>
          )}
        </div>
      </div>

      {MANAGED_TEMPLATES.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
          {MANAGED_TEMPLATES.map((tpl) => (
            <button
              key={tpl.code}
              type="button"
              onClick={() => setActiveTemplateCode(tpl.code)}
              className={cn(
                'min-w-44 rounded-md px-3 py-2 text-left text-sm transition-colors',
                activeTemplateCode === tpl.code
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              <span className="block font-semibold">{tpl.label}</span>
              <span
                className={cn(
                  'mt-0.5 block text-xs',
                  activeTemplateCode === tpl.code ? 'text-indigo-100' : 'text-slate-400'
                )}
              >
                {tpl.code}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          Danh mục template <strong>{activeTemplateCode}</strong> — {activeTemplate?.description}{' '}
          Chỉ hiển thị{' '}
          <strong>{visibleCategories.map((cat) => categoryLabel(cat)).join(' và ')}</strong>.
        </p>
      </div>

      {!selectedIsCurrent && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          Ky da qua chi duoc xem lich su snapshot, khong cho sua cau hinh.
        </div>
      )}

      {/* Stage tabs */}
      <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {stageOptions.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setActiveStage(s.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activeStage === s.value
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-8">
          {visibleCategories.map((cat) => (
            <section key={cat}>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={cn(
                    'rounded border px-2 py-0.5 text-xs font-semibold',
                    categoryBadgeClass(cat)
                  )}
                >
                  {categoryLabel(cat)}
                </span>
                <span className="text-xs text-slate-400">
                  {(itemsByCategory[cat] ?? []).length} chỉ số
                </span>
              </div>
              <ItemsTable
                items={itemsByCategory[cat] ?? []}
                canEdit={canEditPeriod}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </section>
          ))}
        </div>
      )}

      {/* Dialog */}
      {canEditPeriod && (
        <ItemDialog
          key={`${activeTemplateCode}-${selectedYear}-${selectedMonth}-${editing?.id ?? 'new'}`}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          catalogCode={activeTemplateCode}
          year={selectedYear}
          month={selectedMonth}
          stage={activeStage}
          stageOptions={stageOptions}
          categoryOptions={categoryOptions}
          defaultCategory={visibleCategories[0] ?? 'KPI_BONUS'}
          showCategoryPicker
          editing={editing}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}
