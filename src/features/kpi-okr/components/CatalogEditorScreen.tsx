import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { performanceApi } from '@/features/kpi-okr/api'
import { categoryLabel, categoryBadgeClass } from '@/features/kpi-okr/catalogHelpers'
import { usePermission } from '@/hooks/usePermission'
import { BookOpen, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATALOG_CODES = ['SALES_NV', 'LIVESTREAM_NV', 'VAN_DON_NV']

const CATEGORY_OPTIONS = ['BASE', 'KPI_BONUS', 'PERFORMANCE_BONUS', 'BENEFIT']
const TENURE_STAGE_OPTIONS = ['M1', 'M2', 'M3', 'OFFICIAL']

export function CatalogEditorScreen() {
  const [selectedCode, setSelectedCode] = useState('SALES_NV')
  const queryClient = useQueryClient()
  const { canId } = usePermission()

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['performance', 'catalog', selectedCode],
    queryFn: () => performanceApi.getCatalog(selectedCode),
    staleTime: 60 * 1000,
  })

  const stages = catalog?.items ? [...new Set(catalog.items.map((i) => i.tenureStage))] : []

  const isMultiStage = stages.length > 1
  const [activeStage, setActiveStage] = useState<string>('')

  type ItemRow = NonNullable<typeof catalog>['items'] extends (infer T)[] ? T : never
  const itemsByStage: Record<string, ItemRow[]> = catalog?.items
    ? catalog.items.reduce(
        (acc, item) => {
          const stage = item.tenureStage || 'OFFICIAL'
          if (!acc[stage]) acc[stage] = []
          acc[stage].push(item)
          return acc
        },
        {} as Record<string, ItemRow[]>
      )
    : {}

  const firstStage = stages[0] || 'OFFICIAL'
  const currentStage = activeStage && stages.includes(activeStage) ? activeStage : firstStage

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Danh mục KPI/OKR
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý mẫu KPI/OKR theo vị trí và giai đoạn thâm niên.
          </p>
        </div>
      </div>

      {/* Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        <div className="text-xs text-indigo-700 dark:text-indigo-300">
          Danh mục này áp dụng cho các phòng ban nằm trong danh sách cho phép (cấu hình môi trường
          kết hợp danh sách HR lưu trong hệ thống).{' '}
          {canId('kpi.catalog_edit') ? (
            <Link
              to="/hr-admin/settings/kpi-catalog-allowlist"
              className="font-semibold underline underline-offset-2 hover:text-indigo-900 dark:hover:text-indigo-100"
            >
              Cấu hình phòng ban áp dụng
            </Link>
          ) : (
            <>Muốn thêm phòng ban — liên hệ HR có quyền chỉnh danh sách này.</>
          )}
        </div>
      </div>

      {/* Sidebar + Content layout */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <div className="space-y-1">
          <Label className="px-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Danh sách danh mục
          </Label>
          {CATALOG_CODES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setSelectedCode(code)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all',
                selectedCode === code
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              {code}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !catalog ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center text-sm text-slate-400">
              Không tìm thấy catalog.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Metadata */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {catalog.name}
                      </span>
                      <Badge variant="outline" className="h-5 font-mono text-[10px]">
                        {catalog.code}
                      </Badge>
                    </div>
                    {catalog.description && (
                      <p className="mt-1 text-sm text-slate-500">{catalog.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {catalog.items?.length ?? 0} items
                    {' · '}
                    {(catalog.revenueTiers?.length ?? 0) > 0
                      ? `${catalog.revenueTiers?.length} revenue tiers`
                      : 'không có tier'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stage tabs (multi-stage only) */}
            {isMultiStage && stages.length > 0 && (
              <div className="flex gap-1">
                {stages.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActiveStage(s)}
                    className={cn(
                      'rounded-lg px-4 py-2 text-xs font-bold transition-all',
                      currentStage === s
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Items table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-bold">
                  <span>
                    {isMultiStage ? `Stage ${currentStage}` : 'Danh sách chỉ tiêu'} (
                    {itemsByStage[currentStage]?.length ?? 0})
                  </span>
                  <AddItemButton
                    catalogCode={selectedCode}
                    defaultStage={currentStage}
                    onAdded={() =>
                      queryClient.invalidateQueries({
                        queryKey: ['performance', 'catalog', selectedCode],
                      })
                    }
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-slate-400">
                        <th className="pb-2 pr-2 font-medium w-8">#</th>
                        <th className="pb-2 pr-2 font-medium">Nhóm</th>
                        <th className="pb-2 pr-2 font-medium">Loại</th>
                        <th className="pb-2 pr-2 font-medium">Nội dung</th>
                        <th className="pb-2 pr-2 font-medium">Chỉ tiêu/Tháng</th>
                        <th className="pb-2 pr-2 font-medium">Đơn vị</th>
                        <th className="pb-2 font-medium w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {(itemsByStage[currentStage] ?? []).map((item, idx) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-50 transition-colors hover:bg-slate-50/50 dark:border-slate-900 dark:hover:bg-slate-900/50"
                        >
                          <td className="py-2 pr-2 text-slate-400 tabular-nums">{idx + 1}</td>
                          <td className="py-2 pr-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                'h-4 text-[9px] font-bold px-1',
                                categoryBadgeClass(item.category)
                              )}
                            >
                              {categoryLabel(item.category).replace(/^[A-E]\.\s/, '')}
                            </Badge>
                          </td>
                          <td className="py-2 pr-2">
                            <Badge variant="outline" className="h-4 text-[9px] font-bold px-1">
                              {item.kind}
                            </Badge>
                          </td>
                          <td className="py-2 pr-2 max-w-xs truncate font-medium text-slate-700 dark:text-slate-300">
                            {item.content}
                          </td>
                          <td className="py-2 pr-2 tabular-nums text-slate-600">
                            {item.monthlyTarget ||
                              (item.numericTarget != null ? String(item.numericTarget) : '—')}
                          </td>
                          <td className="py-2 pr-2 text-slate-400">{item.numericUnit || '—'}</td>
                          <td className="py-2">
                            <div className="flex gap-0.5">
                              <EditItemButton
                                item={item}
                                onSaved={() =>
                                  queryClient.invalidateQueries({
                                    queryKey: ['performance', 'catalog', selectedCode],
                                  })
                                }
                              />
                              <DeleteItemButton
                                itemId={item.id}
                                onDeleted={() =>
                                  queryClient.invalidateQueries({
                                    queryKey: ['performance', 'catalog', selectedCode],
                                  })
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Tiers (Sales NV only) */}
            {(catalog.revenueTiers?.length ?? 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">
                    Tier doanh thu ({catalog.revenueTiers?.length ?? 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-slate-400">
                          <th className="pb-2 pr-2 font-medium">Tier</th>
                          <th className="pb-2 pr-2 font-medium">Từ</th>
                          <th className="pb-2 pr-2 font-medium">Đến</th>
                          <th className="pb-2 pr-2 font-medium">% Thưởng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.revenueTiers?.map((tier: any) => (
                          <tr
                            key={tier.id}
                            className="border-b border-slate-50 dark:border-slate-900"
                          >
                            <td className="py-2 pr-2 font-medium">{tier.tierLabel}</td>
                            <td className="py-2 pr-2 tabular-nums">
                              {Number(tier.minAmount).toLocaleString('vi-VN')} VND
                            </td>
                            <td className="py-2 pr-2 tabular-nums">
                              {tier.maxAmount != null
                                ? `${Number(tier.maxAmount).toLocaleString('vi-VN')} VND`
                                : 'Không giới hạn'}
                            </td>
                            <td className="py-2 pr-2 tabular-nums">
                              {tier.bonusPercent != null ? `${tier.bonusPercent}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AddItemButton({
  catalogCode,
  defaultStage,
  onAdded,
}: {
  catalogCode: string
  defaultStage: string
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const form = useForm({
    defaultValues: {
      tenureStage: defaultStage,
      category: 'KPI_BONUS',
      kind: 'KPI',
      priority: 2,
      sortOrder: 0,
      content: '',
      dailyTarget: '',
      monthlyTarget: '',
      numericTarget: '',
      numericUnit: '',
    },
  })

  const { register, handleSubmit, reset } = form

  const onSubmit = handleSubmit(async (values) => {
    try {
      await performanceApi.createCatalogItem(catalogCode, {
        tenureStage: values.tenureStage,
        category: values.category,
        kind: values.kind,
        priority: values.priority,
        sortOrder: values.sortOrder,
        content: values.content,
        dailyTarget: values.dailyTarget || undefined,
        monthlyTarget: values.monthlyTarget || undefined,
        numericTarget: values.numericTarget ? Number(values.numericTarget) : undefined,
        numericUnit: values.numericUnit || undefined,
      })
      toast.success('Đã thêm item')
      setOpen(false)
      reset()
      onAdded()
    } catch {
      toast.error('Thêm thất bại')
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
          <Plus className="h-3 w-3" />
          Thêm item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm item vào catalog {catalogCode}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Stage</Label>
              <select
                {...register('tenureStage')}
                className="w-full h-8 rounded border px-2 text-xs"
              >
                {TENURE_STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Nhóm</Label>
              <select {...register('category')} className="w-full h-8 rounded border px-2 text-xs">
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Nội dung</Label>
            <Textarea
              {...register('content')}
              className="h-20 text-xs"
              placeholder="Nội dung KPI/OKR..."
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Loại</Label>
              <select {...register('kind')} className="w-full h-8 rounded border px-2 text-xs">
                <option value="KPI">KPI</option>
                <option value="OKR">OKR</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Ưu tiên</Label>
              <input
                type="number"
                {...register('priority', { valueAsNumber: true })}
                className="w-full h-8 rounded border px-2 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Thứ tự</Label>
              <input
                type="number"
                {...register('sortOrder', { valueAsNumber: true })}
                className="w-full h-8 rounded border px-2 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Chỉ tiêu/Tháng</Label>
              <Input {...register('monthlyTarget')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Số mục tiêu</Label>
              <Input {...register('numericTarget')} className="h-8 text-xs" type="number" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Đơn vị</Label>
              <Input {...register('numericUnit')} className="h-8 text-xs" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" size="sm">
              Thêm
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditItemButton({ item, onSaved }: { item: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const form = useForm({
    defaultValues: {
      content: item.content,
      dailyTarget: item.dailyTarget ?? '',
      monthlyTarget: item.monthlyTarget ?? '',
      numericTarget: item.numericTarget != null ? String(item.numericTarget) : '',
      numericUnit: item.numericUnit ?? '',
      priority: item.priority,
      sortOrder: item.sortOrder ?? 0,
    },
  })

  const { register, handleSubmit } = form

  const onSubmit = handleSubmit(async (values) => {
    try {
      await performanceApi.patchCatalogItem(item.id, {
        content: values.content,
        dailyTarget: values.dailyTarget || null,
        monthlyTarget: values.monthlyTarget || null,
        numericTarget: values.numericTarget ? Number(values.numericTarget) : null,
        numericUnit: values.numericUnit || null,
        priority: values.priority,
        sortOrder: values.sortOrder,
      })
      toast.success('Đã cập nhật')
      setOpen(false)
      onSaved()
    } catch {
      toast.error('Cập nhật thất bại')
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded">
          <Pencil className="h-3 w-3 text-slate-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa item</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Nội dung</Label>
            <Textarea {...register('content')} className="h-20 text-xs" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Chỉ tiêu/Tháng</Label>
              <Input {...register('monthlyTarget')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Số mục tiêu</Label>
              <Input {...register('numericTarget')} className="h-8 text-xs" type="number" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Đơn vị</Label>
              <Input {...register('numericUnit')} className="h-8 text-xs" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" size="sm">
              Lưu
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteItemButton({ itemId, onDeleted }: { itemId: string; onDeleted: () => void }) {
  const handleDelete = async () => {
    if (!confirm('Xoá item này?')) return
    try {
      await performanceApi.deleteCatalogItem(itemId)
      toast.success('Đã xoá')
      onDeleted()
    } catch {
      toast.error('Xoá thất bại')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 rounded hover:bg-rose-50 hover:text-rose-600"
      onClick={handleDelete}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  )
}
