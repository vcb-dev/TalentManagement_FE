/**
 * Epic 10 — Trang HR: cấu hình ngưỡng Min, kích hoạt tính thưởng, xem kết quả.
 * 3 tab: Ngưỡng Min | Tính thưởng | Lịch sử
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePermission } from '@/hooks/usePermission'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Award,
  Calculator,
  CheckCircle2,
  History,
  Pencil,
  Settings2,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  rewardAdminApi,
  type RewardCalcResult,
  type RewardThreshold,
  TEMPLATE_METRIC_LABELS,
  TEMPLATE_METRIC_UNITS,
  formatAmount,
} from './api'

// ─── Month/Year picker ────────────────────────────────────────────────────────

function nowYM() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function MonthYearPicker({
  year,
  month,
  onChange,
}: {
  year: number
  month: number
  onChange: (y: number, m: number) => void
}) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = [2025, 2026, 2027]
  return (
    <div className="flex items-center gap-2">
      <Select value={String(month)} onValueChange={(v) => onChange(year, Number(v))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={String(m)}>
              Tháng {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => onChange(Number(v), month)}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ─── Tab: Ngưỡng Min ─────────────────────────────────────────────────────────

const TEMPLATE_OPTIONS = [
  { value: 'SALES_NV', label: 'Phòng Kinh Doanh (SALES_NV)' },
  { value: 'TRAFFIC_TEAM_NV', label: 'Traffic Team (TRAFFIC_TEAM_NV)' },
]

interface ThresholdForm {
  templateCode: string
  metricKey: string
  minValue: string
  note: string
}

function emptyForm(templateCode = 'SALES_NV'): ThresholdForm {
  const metrics = Object.keys(TEMPLATE_METRIC_LABELS[templateCode] ?? {})
  return { templateCode, metricKey: metrics[0] ?? '', minValue: '', note: '' }
}

function ThresholdsTab({
  year,
  month,
  canEdit,
}: {
  year: number
  month: number
  canEdit: boolean
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<ThresholdForm>(emptyForm())
  const [editId, setEditId] = useState<string | null>(null)

  const thresholdsQ = useQuery({
    queryKey: ['reward-thresholds', year, month],
    queryFn: () => rewardAdminApi.listThresholds(year, month),
  })

  const upsertMut = useMutation({
    mutationFn: (data: typeof form) => {
      const minValue = parseFloat(data.minValue)
      if (isNaN(minValue)) throw new Error('Ngưỡng Min phải là số hợp lệ')
      const unit = TEMPLATE_METRIC_UNITS[data.templateCode]?.[data.metricKey] ?? ''
      return rewardAdminApi.upsertThreshold({
        templateCode: data.templateCode,
        metricKey: data.metricKey,
        year,
        month,
        minValue,
        minUnit: unit,
        note: data.note || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Đã lưu ngưỡng Min')
      void qc.invalidateQueries({ queryKey: ['reward-thresholds', year, month] })
      setForm(emptyForm(form.templateCode))
      setEditId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => rewardAdminApi.deleteThreshold(id),
    onSuccess: () => {
      toast.success('Đã xóa ngưỡng')
      void qc.invalidateQueries({ queryKey: ['reward-thresholds', year, month] })
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  function startEdit(row: RewardThreshold) {
    setEditId(row.id)
    setForm({
      templateCode: row.templateCode,
      metricKey: row.metricKey,
      minValue: String(row.minValue),
      note: row.note ?? '',
    })
  }

  const metricOptions = Object.entries(TEMPLATE_METRIC_LABELS[form.templateCode] ?? {})

  return (
    <div className="space-y-6">
      {/* Form — chỉ hiển thị khi có quyền edit */}
      {canEdit && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {editId ? 'Sửa ngưỡng Min' : 'Thêm / cập nhật ngưỡng Min'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Template
              </label>
              <Select
                value={form.templateCode}
                onValueChange={(v) => setForm({ ...emptyForm(v), note: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Chỉ số
              </label>
              <Select
                value={form.metricKey}
                onValueChange={(v) => setForm((f) => ({ ...f, metricKey: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metricOptions.map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Ngưỡng Min ({TEMPLATE_METRIC_UNITS[form.templateCode]?.[form.metricKey] ?? '—'})
              </label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={form.minValue}
                onChange={(e) => setForm((f) => ({ ...f, minValue: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Ghi chú (tuỳ chọn)
              </label>
              <Input
                placeholder="Ghi chú…"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => upsertMut.mutate(form)}
              disabled={upsertMut.isPending || !form.metricKey || !form.minValue}
            >
              {upsertMut.isPending ? 'Đang lưu…' : editId ? 'Cập nhật' : 'Lưu ngưỡng'}
            </Button>
            {editId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditId(null)
                  setForm(emptyForm())
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Huỷ
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {thresholdsQ.isLoading ? (
        <p className="text-sm text-slate-400">Đang tải…</p>
      ) : (thresholdsQ.data?.length ?? 0) === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          Chưa có ngưỡng Min nào cho tháng này.{canEdit ? ' Thêm ở form trên.' : ''}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Template</th>
                <th className="px-4 py-3 text-left font-semibold">Chỉ số</th>
                <th className="px-4 py-3 text-right font-semibold">Ngưỡng Min</th>
                <th className="px-4 py-3 text-left font-semibold">Đơn vị</th>
                <th className="px-4 py-3 text-left font-semibold">Ghi chú</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {thresholdsQ.data?.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'bg-white dark:bg-slate-900',
                    editId === row.id && 'bg-sky-50 dark:bg-sky-950/30'
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                    {row.templateCode}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                    {TEMPLATE_METRIC_LABELS[row.templateCode]?.[row.metricKey] ?? row.metricKey}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-100">
                    {Number(row.minValue).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{row.minUnit}</td>
                  <td className="px-4 py-2.5 text-slate-400">{row.note ?? '—'}</td>
                  {canEdit && (
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => startEdit(row)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400 hover:text-red-600"
                          onClick={() => deleteMut.mutate(row.id)}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Tính thưởng ────────────────────────────────────────────────────────

function WinnerCard({
  label,
  icon,
  items,
  isTeam,
}: {
  label: string
  icon: React.ReactNode
  items: Array<{ name: string; sub: string; amount: number; badge?: string }>
  isTeam: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        {icon}
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800">
          {items.length}
        </span>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                isTeam ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'
              )}
            >
              {isTeam ? <Users className="h-3.5 w-3.5" /> : <Award className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                {item.name}
              </p>
              <p className="truncate text-xs text-slate-400">{item.sub}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-600">+{formatAmount(item.amount)}đ</p>
              {item.badge && <span className="text-[10px] text-slate-400">{item.badge}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CalculateTab({ year, month }: { year: number; month: number }) {
  const [preview, setPreview] = useState<RewardCalcResult | null>(null)
  const [loading, setLoading] = useState<'preview' | 'commit' | null>(null)
  const qc = useQueryClient()

  async function run(mode: 'preview' | 'commit') {
    setLoading(mode)
    try {
      const result = await rewardAdminApi.calculate(year, month, mode)
      setPreview(result)
      if (mode === 'commit') {
        toast.success('Đã tạo kết quả thưởng vào DB!')
        void qc.invalidateQueries({ queryKey: ['reward-records'] })
      }
    } catch {
      toast.error('Lỗi khi tính thưởng — kiểm tra console.')
    } finally {
      setLoading(null)
    }
  }

  const kinhDoanhTeamItems =
    preview?.kinhDoanhTeamWinners.map((w) => ({
      name: w.teamName,
      sub: `${TEMPLATE_METRIC_LABELS.SALES_NV?.[w.metricKey] ?? w.metricKey} — ${w.memberCount} thành viên`,
      amount: w.amount,
    })) ?? []

  const kinhDoanhFtItems =
    preview?.kinhDoanhIndividualFt.map((w) => ({
      name: w.displayName,
      sub: `${TEMPLATE_METRIC_LABELS.SALES_NV?.[w.metricKey] ?? w.metricKey} — ${Number(w.numericValue).toLocaleString('vi-VN')}`,
      amount: w.amount,
    })) ?? []

  const kinhDoanhPtItems =
    preview?.kinhDoanhIndividualPt.map((w) => ({
      name: w.displayName,
      sub: `${TEMPLATE_METRIC_LABELS.SALES_NV?.[w.metricKey] ?? w.metricKey} — Part-time`,
      amount: w.amount,
    })) ?? []

  const trafficTeamItems =
    preview?.trafficTeamWinners.map((w) => ({
      name: w.teamName,
      sub: `${TEMPLATE_METRIC_LABELS.TRAFFIC_TEAM_NV?.[w.metricKey] ?? w.metricKey} — ${w.memberCount} thành viên`,
      amount: w.amount,
      badge: `${w.ratioPercent}%`,
    })) ?? []

  const trafficIndividualItems =
    preview?.trafficIndividualWinners.map((w) => ({
      name: w.displayName,
      sub: `${TEMPLATE_METRIC_LABELS.TRAFFIC_TEAM_NV?.[w.metricKey] ?? w.metricKey}`,
      amount: w.amount,
    })) ?? []

  const totalAmount = [
    ...kinhDoanhTeamItems,
    ...kinhDoanhFtItems,
    ...kinhDoanhPtItems,
    ...trafficTeamItems,
    ...trafficIndividualItems,
  ].reduce((acc, i) => acc + i.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => run('preview')} disabled={loading !== null} variant="outline">
          <Calculator className="mr-2 h-4 w-4" />
          {loading === 'preview' ? 'Đang tính…' : 'Preview (không lưu)'}
        </Button>
        {preview && (
          <Button onClick={() => run('commit')} disabled={loading !== null}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {loading === 'commit' ? 'Đang lưu…' : 'Commit — Tạo RewardRecord'}
          </Button>
        )}
        {preview && (
          <span className="text-sm text-slate-500">
            Tổng ngân sách:{' '}
            <strong className="text-emerald-600">{formatAmount(totalAmount)}đ</strong>
          </span>
        )}
      </div>

      {preview?.warnings && preview.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Cảnh báo ({preview.warnings.length})
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-600 dark:text-amber-400">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="grid gap-4 sm:grid-cols-2">
          <WinnerCard
            label="Phòng Kinh Doanh — Giải Team"
            icon={<Users className="h-4 w-4 text-violet-500" />}
            items={kinhDoanhTeamItems}
            isTeam
          />
          <WinnerCard
            label="Phòng Kinh Doanh — Cá nhân Full-time"
            icon={<Award className="h-4 w-4 text-amber-500" />}
            items={kinhDoanhFtItems}
            isTeam={false}
          />
          <WinnerCard
            label="Phòng Kinh Doanh — Cá nhân Part-time"
            icon={<Award className="h-4 w-4 text-orange-400" />}
            items={kinhDoanhPtItems}
            isTeam={false}
          />
          <WinnerCard
            label="Traffic Team — Giải Team"
            icon={<Users className="h-4 w-4 text-sky-500" />}
            items={trafficTeamItems}
            isTeam
          />
          <WinnerCard
            label="Traffic Team — Cá nhân"
            icon={<Award className="h-4 w-4 text-sky-400" />}
            items={trafficIndividualItems}
            isTeam={false}
          />
        </div>
      )}

      {preview &&
        kinhDoanhTeamItems.length === 0 &&
        kinhDoanhFtItems.length === 0 &&
        trafficTeamItems.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            Chưa có winner nào cho tháng {month}/{year}. Kiểm tra assignments và ngưỡng Min.
          </p>
        )}
    </div>
  )
}

// ─── Tab: Lịch sử ────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  KINH_DOANH_THI_DUA_TEAM: 'KD Team',
  KINH_DOANH_THI_DUA_FT: 'KD Cá nhân FT',
  KINH_DOANH_THI_DUA_PT: 'KD Cá nhân PT',
  TRAFFIC_TEAM: 'Traffic Team',
  TRAFFIC_INDIVIDUAL: 'Traffic Cá nhân',
}

function HistoryTab({ year, month }: { year: number; month: number }) {
  const [categoryFilter, setCategoryFilter] = useState<string>('')

  const recordsQ = useQuery({
    queryKey: ['reward-records', year, month, categoryFilter],
    queryFn: () => rewardAdminApi.listRecords(year, month, categoryFilter || undefined),
  })

  const total = recordsQ.data?.reduce((acc, r) => acc + (r.amount ?? 0), 0) ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={categoryFilter || '__all'}
          onValueChange={(v) => setCategoryFilter(v === '__all' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tất cả danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Tất cả danh mục</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {recordsQ.data && (
          <span className="text-sm text-slate-500">
            {recordsQ.data.length} bản ghi —&nbsp;
            <strong className="text-emerald-600">{formatAmount(total)}đ</strong>
          </span>
        )}
      </div>

      {recordsQ.isLoading ? (
        <p className="text-sm text-slate-400">Đang tải…</p>
      ) : (recordsQ.data?.length ?? 0) === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          Chưa có kết quả thưởng nào được commit cho tháng {month}/{year}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Nhân viên</th>
                <th className="px-4 py-3 text-left font-semibold">Tiêu đề</th>
                <th className="px-4 py-3 text-left font-semibold">Danh mục</th>
                <th className="px-4 py-3 text-right font-semibold">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recordsQ.data?.map((row) => (
                <tr key={row.id} className="bg-white dark:bg-slate-900">
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                    {row.user.fullNameLegal ?? row.userId}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{row.title}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {CATEGORY_LABELS[row.category ?? ''] ?? row.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                    {row.amount ? `+${Number(row.amount).toLocaleString('vi-VN')}đ` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

type TabId = 'thresholds' | 'calculate' | 'history'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'thresholds', label: 'Ngưỡng Min', icon: <Settings2 className="h-4 w-4" /> },
  { id: 'calculate', label: 'Tính thưởng', icon: <Calculator className="h-4 w-4" /> },
  { id: 'history', label: 'Lịch sử', icon: <History className="h-4 w-4" /> },
]

export function RewardAdminScreen() {
  const { canId } = usePermission()
  const canEdit = canId('reward.threshold_edit')
  const canCalculate = canId('reward.calculate')

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'calculate') return canCalculate
    return true
  })

  const [tab, setTab] = useState<TabId>(() => (canCalculate ? 'thresholds' : 'thresholds'))
  const { year: y0, month: m0 } = nowYM()
  const [year, setYear] = useState(y0)
  const [month, setMonth] = useState(m0)

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white shadow-xl">
        <h1 className="text-2xl font-black tracking-tight">Quản lý thưởng KPI tháng</h1>
        <p className="mt-1 text-sm text-white/70">
          Cấu hình ngưỡng Min, xem preview, commit kết quả và tra cứu lịch sử.
        </p>
      </div>

      {/* Month selector + tabs */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500">Kỳ:</span>
          <MonthYearPicker
            year={year}
            month={month}
            onChange={(y, m) => {
              setYear(y)
              setMonth(m)
            }}
          />
        </div>

        <nav className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/60 p-1 dark:border-slate-700 dark:bg-slate-800">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'thresholds' && <ThresholdsTab year={year} month={month} canEdit={canEdit} />}
      {tab === 'calculate' && <CalculateTab year={year} month={month} />}
      {tab === 'history' && <HistoryTab year={year} month={month} />}
    </div>
  )
}
