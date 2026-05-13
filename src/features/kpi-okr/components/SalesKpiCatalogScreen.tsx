import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useAuthStore } from '@/stores/auth.store'
import { categoryLabel, categoryBadgeClass } from '@/features/kpi-okr/catalogHelpers'

type TemplateItem = CatalogItem['items'][number]

const STAGES = [
  { value: 'M1', label: 'Tháng 1 (M1)' },
  { value: 'M2', label: 'Tháng 2 (M2)' },
  { value: 'M3', label: 'Tháng 3 (M3)' },
  { value: 'OFFICIAL', label: 'Chính thức' },
] as const

const CATEGORY_OPTIONS = [
  { value: 'KPI_BONUS', label: 'B. Thưởng KPIs' },
  { value: 'PERFORMANCE_BONUS', label: 'D. Thưởng hiệu suất' },
] as const

type VisibleCategory = 'KPI_BONUS' | 'PERFORMANCE_BONUS'

// ─── Add / Edit dialog ────────────────────────────────────────────────────────

function ItemDialog({
  open,
  onClose,
  stage,
  editing,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  stage: string
  editing: TemplateItem | null
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState(editing?.content ?? '')
  const [category, setCategory] = useState<VisibleCategory>(
    (editing?.category as VisibleCategory | undefined) ?? 'KPI_BONUS'
  )
  const [dailyTarget, setDailyTarget] = useState(editing?.dailyTarget ?? '')
  const [monthlyTarget, setMonthlyTarget] = useState(editing?.monthlyTarget ?? '')
  const [numericTarget, setNumericTarget] = useState(
    editing?.numericTarget != null ? String(editing.numericTarget) : ''
  )
  const [numericUnit, setNumericUnit] = useState(editing?.numericUnit ?? '')
  const [sortOrder, setSortOrder] = useState(String(editing?.sortOrder ?? 99))

  const stageLabel = STAGES.find((s) => s.value === stage)?.label ?? stage

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
        await performanceApi.createCatalogItem('SALES_NV', {
          ...payload,
          tenureStage: stage,
          category,
          kind: 'KPI',
          priority: 2,
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

          {!editing && (
            <div>
              <Label htmlFor="category">Loại KPI *</Label>
              <select
                id="category"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={category}
                onChange={(e) => setCategory(e.target.value as VisibleCategory)}
              >
                {CATEGORY_OPTIONS.map((o) => (
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
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => onDelete(item)}
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

export function SalesKpiCatalogScreen() {
  const { canId } = usePermission()
  const role = useAuthStore((s) => s.user?.role)
  const canEdit = role === 'MANAGER' || canId('kpi.catalog_edit')

  const [activeStage, setActiveStage] = useState<string>('M1')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TemplateItem | null>(null)
  const qc = useQueryClient()

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['performance', 'catalog', 'SALES_NV'],
    queryFn: () => performanceApi.getCatalog('SALES_NV'),
    staleTime: 60_000,
  })

  const itemsByCategory = useMemo<Record<VisibleCategory, TemplateItem[]>>(() => {
    const all = catalog?.items ?? []
    const stageItems = all.filter(
      (i) =>
        i.tenureStage === activeStage &&
        (i.category === 'KPI_BONUS' || i.category === 'PERFORMANCE_BONUS')
    )
    return {
      KPI_BONUS: stageItems
        .filter((i) => i.category === 'KPI_BONUS')
        .sort((a, b) => a.sortOrder - b.sortOrder),
      PERFORMANCE_BONUS: stageItems
        .filter((i) => i.category === 'PERFORMANCE_BONUS')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }
  }, [catalog, activeStage])

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['performance', 'catalog', 'SALES_NV'] })

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (item: TemplateItem) => {
    setEditing(item)
    setDialogOpen(true)
  }

  const handleDelete = async (item: TemplateItem) => {
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Cấu hình KPI Kinh doanh
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quản lý chỉ tiêu KPI theo giai đoạn thâm niên cho nhân viên Kinh doanh. Thay đổi sẽ được
            áp dụng khi auto-seed kỳ tiếp theo.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openAdd} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Thêm chỉ số
          </Button>
        )}
      </div>

      {/* Info banner */}
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          Danh mục template <strong>SALES_NV</strong> — tự động gán cho thành viên Phòng Kinh doanh
          theo giai đoạn thâm niên (M1 → M2 → M3 → Chính thức). Chỉ hiển thị{' '}
          <strong>B. Thưởng KPIs</strong> và <strong>D. Thưởng hiệu suất</strong>.
        </p>
      </div>

      {/* Stage tabs */}
      <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {STAGES.map((s) => (
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
          {(['KPI_BONUS', 'PERFORMANCE_BONUS'] as const).map((cat) => (
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
                <span className="text-xs text-slate-400">{itemsByCategory[cat].length} chỉ số</span>
              </div>
              <ItemsTable
                items={itemsByCategory[cat]}
                canEdit={canEdit}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </section>
          ))}
        </div>
      )}

      {/* Dialog */}
      {canEdit && (
        <ItemDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          stage={activeStage}
          editing={editing}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}
