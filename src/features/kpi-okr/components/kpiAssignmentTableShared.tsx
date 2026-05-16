import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { PerformanceAssignment } from '@/features/kpi-okr/api'
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
  const needsToggle = content.length > 40 || !!badge

  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      {/* Text + badge inline → cùng bị clamp khi collapsed */}
      <div
        className={cn(
          'break-words text-sm font-medium leading-snug text-slate-900 dark:text-slate-100',
          !expanded && 'line-clamp-2'
        )}
      >
        {content}
        {badge && !expanded && (
          <span className="ml-1.5 inline-flex align-middle">{badge}</span>
        )}
      </div>
      {/* Badge tách dòng chỉ khi expanded */}
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
  'Đánh giá QL',
  'Thao tác',
] as const

export function EvalStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status || status === '__none') return <span className="text-slate-400">—</span>

  const isOk = status === 'OK'
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 px-1.5 text-xs font-bold shadow-none rounded-md',
        isOk
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
      )}
    >
      {status}
    </Badge>
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
        <EvalStatusBadge status={row.selfEvalStatus ?? null} />
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
      <TableCell className={cn(td, 'max-w-[88px] tabular-nums text-sm')}>{num}</TableCell>
      <TableCell className={cn(td, 'max-w-[72px] text-xs uppercase')}>
        {row.numericUnit ?? '—'}
      </TableCell>
      <TableCell
        className={cn(td, 'max-w-[160px] min-w-[120px] text-xs')}
        title={displayEv || undefined}
      >
        {displayEv ? (
          <span className="line-clamp-3 whitespace-pre-wrap break-all">{displayEv}</span>
        ) : hasImagePreviews ? null : (
          <span className="text-slate-400">—</span>
        )}
        <EvidenceImagePreviews evidence={row.evidence} maxHeightClass="h-12 max-w-[72px]" />
      </TableCell>
      <TableCell className={td}>
        <EvalStatusBadge status={row.selfEvalStatus ?? null} />
      </TableCell>
    </>
  )
}
