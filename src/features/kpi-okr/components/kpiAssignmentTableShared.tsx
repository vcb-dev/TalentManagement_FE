import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AssignmentGoalReview, PerformanceAssignment } from '@/features/kpi-okr/api'
import {
  EvidenceImagePreviews,
  evidenceImageUrlsFromText,
  evidenceTextWithoutUploadPaths,
} from '@/features/kpi-okr/components/KpiEvidenceInput'

/** Format số với dấu chấm ngàn theo chuẩn vi-VN. Chuỗi không phải số trả về nguyên gốc. */
export function formatViNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const str = String(value).trim()
  if (!str || str === '—') return '—'
  const raw = str.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return str
  return n.toLocaleString('vi-VN')
}

/**
 * Cột Nội dung — luôn clamp 2 dòng, badge inline trong text (không thêm chiều cao).
 * "Xem thêm" / "Thu gọn" hiện khi content > 40 ký tự hoặc có badge.
 */
const CONTENT_PREVIEW_WORDS = 4

export function ContentCell({
  content,
  badge,
  className,
}: {
  content: string
  badge?: React.ReactNode
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const words = content.trim().split(/\s+/)
  const needsToggle = words.length > CONTENT_PREVIEW_WORDS || !!badge
  const preview =
    needsToggle && !expanded ? words.slice(0, CONTENT_PREVIEW_WORDS).join(' ') + '…' : content

  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <div className="break-words text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">
        {preview}
        {badge && !expanded && <span className="ml-1.5 inline-flex align-middle">{badge}</span>}
      </div>
      {expanded && badge && <div className="mt-0.5">{badge}</div>}
      {needsToggle && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto self-start px-0 py-0.5 text-xs font-medium text-primary/60 hover:bg-transparent hover:text-primary"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '↑ Thu gọn' : '↓ Xem thêm'}
        </Button>
      )}
    </div>
  )
}

export function formatKpiSetAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN')
}

export function periodLabel(row: PerformanceAssignment): string {
  return `T${row.month} - ${row.year}`
}

/** Bảng KPI/OKR — viền & nền theo style doanh nghiệp tinh gọn. */
export const XL_BORDER = 'border border-slate-200/60 dark:border-slate-800/50'
export const XL_TH = cn(
  XL_BORDER,
  'sticky top-0 z-10 whitespace-nowrap bg-slate-50/80 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 shadow-sm backdrop-blur-md dark:bg-slate-900/90 dark:text-slate-400'
)

/** Width cột bảng Kết quả — đủ rộng để input không đè lên nhau (không dùng table-fixed). */
const RESULTS_COL: Record<string, string> = {
  Kỳ: 'w-[84px] min-w-[84px]',
  'Ngày xét': 'w-[96px] min-w-[96px]',
  'Hạng mục': 'w-[88px] min-w-[88px]',
  'Ưu tiên': 'w-[96px] min-w-[96px]',
  'Nội dung': 'w-[200px] min-w-[200px]',
  'Chỉ tiêu': 'w-[84px] min-w-[84px]',
  'Số liệu': 'w-[112px] min-w-[112px]',
  'Đơn vị': 'w-[92px] min-w-[92px]',
  'Minh chứng': 'w-[272px] min-w-[272px]',
  'Tự đánh giá': 'w-[172px] min-w-[172px]',
  'Đánh giá Leader': 'w-[172px] min-w-[172px]',
  'Đánh giá Manager': 'w-[132px] min-w-[132px]',
  'Thao tác': 'w-[96px] min-w-[96px]',
}

export const EVAL_LEADER_HEAD = RESULTS_COL['Đánh giá Leader']!
export const EVAL_MANAGER_HEAD = RESULTS_COL['Đánh giá Manager']!
export const EVAL_LEADER_CELL = cn(EVAL_LEADER_HEAD, 'overflow-hidden p-2 align-middle')
export const EVAL_MANAGER_CELL = cn(
  EVAL_MANAGER_HEAD,
  'overflow-hidden whitespace-nowrap p-2 align-middle'
)

export const CELL_NUMERIC = cn(RESULTS_COL['Số liệu'], 'overflow-hidden p-2 align-middle')
export const CELL_UNIT = cn(RESULTS_COL['Đơn vị'], 'overflow-hidden p-2 align-middle')
export const CELL_EVIDENCE = cn(RESULTS_COL['Minh chứng'], 'overflow-hidden p-2 align-top')
export const CELL_SELF_EVAL = cn(RESULTS_COL['Tự đánh giá'], 'overflow-hidden p-2 align-top')

export function resultsColumnHeadClass(header: string): string | undefined {
  return RESULTS_COL[header]
}

/** @deprecated Dùng resultsColumnHeadClass */
export function evalColumnHeadClass(header: string): string | undefined {
  return resultsColumnHeadClass(header)
}

/** min-width tổng bảng Kết quả (cộng padding ~80px). */
export function resultsTableMinWidthClass(hideManagerEvalColumn: boolean): string {
  return hideManagerEvalColumn ? 'min-w-[1560px]' : 'min-w-[1700px]'
}

/** Select gọn trong ô bảng — tránh px-5/py-4 mặc định của CustomSelect. */
export const TABLE_INLINE_SELECT_TRIGGER = cn(
  '!h-9 !min-h-9 !w-full !min-w-0 !max-w-full !rounded-lg !px-2.5 !py-1.5 !text-xs !font-semibold !bg-white dark:!bg-slate-950'
)

export function xlTd(stripe: boolean) {
  return cn(
    XL_BORDER,
    'px-4 py-3 align-middle text-sm leading-relaxed',
    stripe ? 'bg-slate-50/30 dark:bg-slate-900/20' : 'bg-transparent'
  )
}

export const ASSIGN_TABLE_HEAD = [
  'Kỳ',
  'Ngày xét',
  'Hạng mục',
  'Ưu tiên',
  'Nội dung',
  'Chỉ tiêu',
  'Số liệu',
  'Đơn vị',
  'Minh chứng',
  'Tự đánh giá',
  'Đánh giá Leader',
  'Đánh giá Manager',
  'Thao tác',
] as const

export const PLANNING_ASSIGN_TABLE_HEAD = [
  'Kỳ',
  'Ngày xét',
  'Hạng mục',
  'Ưu tiên',
  'Nội dung',
  'Chỉ tiêu',
  'Số liệu',
  'Đơn vị',
  'Quản lý xét duyệt',
  'Thao tác',
] as const

export function EvalStatusBadge({
  status,
  type = 'leader',
}: {
  status: string | null | undefined
  type?: 'self' | 'leader' | 'manager'
}) {
  if (!status || status === '__none') return <span className="text-slate-400">—</span>

  const isOk = status.trim().toUpperCase() === 'OK'

  const typeLabel = {
    self: 'Tự đánh giá',
    leader: 'Leader đánh giá',
    manager: 'Manager đánh giá',
  }[type]

  const statusLabel = isOk ? 'Đạt' : 'Chưa đạt'
  const tooltipText = `${typeLabel}: ${statusLabel}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'h-6 pl-1.5 pr-2 py-0.5 text-xs font-bold shadow-none rounded-full inline-flex items-center gap-1 cursor-help transition-all select-none',
            isOk
              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300'
          )}
        >
          {isOk ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          )}
          <span>{status}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}

export function GoalReviewStatusBadge({
  review,
}: {
  review: AssignmentGoalReview | null | undefined
}) {
  if (!review) return <span className="text-slate-400">—</span>
  const status = review.status
  const config =
    status === 'approved'
      ? {
          label: 'Manager đã duyệt',
          className:
            'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
        }
      : status === 'edit_pending_member'
        ? {
            label: 'Manager đã sửa',
            className:
              'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
          }
        : status === 'edit_confirmed'
          ? {
              label: 'Member đã xác nhận sửa',
              className:
                'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300',
            }
          : status === 'rejected'
            ? {
                label: 'Manager từ chối',
                className:
                  'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
              }
            : {
                label: 'Chờ duyệt',
                className:
                  'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
              }

  return (
    <Badge
      variant="outline"
      className={cn('h-6 rounded-full px-2 text-xs font-bold shadow-none', config.className)}
    >
      {config.label}
    </Badge>
  )
}

export function GoalReviewSummary({
  review,
  className,
}: {
  review: AssignmentGoalReview | null | undefined
  className?: string
}) {
  if (!review) return null

  if (review.status === 'rejected' && review.reason?.trim()) {
    return (
      <p className={cn('mt-1 max-w-sm whitespace-pre-wrap text-xs text-rose-600', className)}>
        Lý do: {review.reason.trim()}
      </p>
    )
  }

  if (review.status === 'edit_confirmed') return null

  if (review.status !== 'edit_pending_member') return null

  return (
    <div
      className={cn(
        'mt-2 grid max-w-xl gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-xs dark:border-amber-900/50 dark:bg-amber-950/20',
        className
      )}
    >
      <div>
        <div className="font-semibold text-amber-800 dark:text-amber-300">Trước khi sửa</div>
        <div className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">
          {review.originalContent}
        </div>
        <div className="mt-0.5 text-slate-500">
          Chỉ tiêu: {review.originalTargetMetric?.trim() || '—'} · Ưu tiên:{' '}
          {review.originalPriority}
        </div>
      </div>
      <div>
        <div className="font-semibold text-amber-800 dark:text-amber-300">Manager đề xuất</div>
        <div className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">
          {review.proposedContent?.trim() || '—'}
        </div>
        <div className="mt-0.5 text-slate-600 dark:text-slate-300">
          Chỉ tiêu: {review.proposedTargetMetric?.trim() || '—'} · Ưu tiên:{' '}
          {review.proposedPriority ?? '—'}
        </div>
      </div>
    </div>
  )
}

export function KindBadge({ kind }: { kind: PerformanceAssignment['kind'] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 px-1.5 text-xs font-black uppercase tracking-widest shadow-none rounded-md',
        kind === 'KPI'
          ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300'
          : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
      )}
    >
      {kind}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: number }) {
  const configs: Record<number, { label: string; className: string }> = {
    1: {
      label: 'P1 - Cao',
      className:
        'border-rose-400/30 bg-rose-500/10 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
    },
    2: {
      label: 'P2 - Trung bình',
      className:
        'border-amber-400/30 bg-amber-500/10 text-amber-600 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    },
    3: {
      label: 'P3 - Thấp',
      className:
        'border-slate-400/30 bg-slate-500/10 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
    },
  }

  const config = configs[priority] || {
    label: priority === 0 ? 'Chưa xếp' : `P${priority}`,
    className:
      'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 px-1.5 text-xs font-black shadow-none whitespace-nowrap rounded-md uppercase tracking-wider',
        config.className
      )}
    >
      {config.label}
    </Badge>
  )
}

/** Evidence / số liệu / tự đánh giá — read-only (leader / viewer / quản lý xem trưởng nhóm). */
/** Stack layout (mobile) — cùng nội dung với AssignmentEpic4ReadCells */
export function AssignmentEpic4ReadStack({ row }: { row: PerformanceAssignment }) {
  const num = formatViNumber(row.numericValue)
  const displayEv = evidenceTextWithoutUploadPaths(row.evidence)
  const imageUrls = evidenceImageUrlsFromText(row.evidence)
  const hasImagePreviews = imageUrls.length > 0
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          <span className="font-semibold text-muted-foreground">Số liệu: </span>
          {num}
        </span>
        <span className="text-xs uppercase text-muted-foreground">
          Đơn vị: {row.numericUnit ?? '—'}
        </span>
      </div>
      {displayEv ? (
        <p className="break-words text-xs text-foreground">{displayEv}</p>
      ) : !hasImagePreviews ? (
        <span className="text-slate-400">—</span>
      ) : null}
      <EvidenceImagePreviews
        evidence={row.evidence}
        maxHeightClass="h-16 max-w-[min(100%,280px)]"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase text-muted-foreground">Tự đánh giá:</span>
        <EvalStatusBadge status={row.selfEvalStatus ?? null} type="self" />
      </div>
    </div>
  )
}

export function AssignmentEpic4ReadCells({ row, td }: { row: PerformanceAssignment; td: string }) {
  const num = formatViNumber(row.numericValue)
  const displayEv = evidenceTextWithoutUploadPaths(row.evidence)
  const imageUrls = evidenceImageUrlsFromText(row.evidence)
  const hasImagePreviews = imageUrls.length > 0
  return (
    <>
      <TableCell className={cn(td, CELL_NUMERIC, 'whitespace-nowrap tabular-nums text-sm')}>
        {num}
      </TableCell>
      <TableCell className={cn(td, CELL_UNIT, 'text-xs uppercase')}>
        <div className="truncate">{row.numericUnit ?? '—'}</div>
      </TableCell>
      <TableCell className={cn(td, CELL_EVIDENCE, 'text-xs')} title={displayEv || undefined}>
        {displayEv ? (
          <span className="line-clamp-3 whitespace-pre-wrap break-all">{displayEv}</span>
        ) : hasImagePreviews ? null : (
          <span className="text-slate-400">—</span>
        )}
        <EvidenceImagePreviews evidence={row.evidence} maxHeightClass="h-12 max-w-[72px]" />
      </TableCell>
      <TableCell className={cn(td, CELL_SELF_EVAL)}>
        <EvalStatusBadge status={row.selfEvalStatus ?? null} type="self" />
      </TableCell>
    </>
  )
}
