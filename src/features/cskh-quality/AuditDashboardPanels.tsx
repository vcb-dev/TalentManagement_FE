import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChevronDown,
  Filter,
  Frown,
  Loader2,
  MessageSquare,
  MessageSquareCheck,
  ShieldCheck,
  ShoppingBag,
  Smile,
  Sparkles,
  Star,
  Tag,
  UserRoundPlus,
  UserX,
} from 'lucide-react'
import {
  computeWorkspaceKpiSnapshot,
  formatKpiDelta,
  type WorkspaceKpiSnapshot,
} from './auditWorkspaceKpi'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FiveStarRank } from '@/components/icons/FiveStarRank'
import { cn } from '@/lib/utils'
import type {
  AuditScoreHistory,
  CskhAuditRow,
  CskhCustomerIntent,
  CskhInboxConversation,
} from './api'
import {
  displayAgentName,
  displayCustomerName,
  displayPageShopLabel,
  formatAuditDateLabel,
  resolveAuditFromAd,
} from './auditHelpers'
import {
  buildTimelineEvents,
  criterionBarColor,
  resolveCriteriaScores,
  resolveFeedbackBullets,
  resolveKeywords,
  resolveProsCons,
  resolveCustomerSentimentBreakdown,
  resolveSentiment,
  resolveTags,
  scoreRankLabel,
  sidebarPreviewTime,
  auditLastActivityMs,
} from './auditDashboardHelpers'
import { parseAuditActionItems, type DisplayTranscriptLine } from './auditHelpers'
import { CskhAdSourceBadge, CskhPageAvatar } from './cskhUi'

const scoreHistoryChartConfig = {
  score: { label: 'Điểm chất lượng', color: 'hsl(262 83% 58%)' },
} satisfies ChartConfig

const SIDEBAR_INITIAL = 30
const SIDEBAR_LOAD_MORE = 25

export type AuditSidebarSort = 'newest' | 'oldest'
export type AuditListFilter = 'all' | 'low' | 'ad'

function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const tone = score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600'
  const ring = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e'
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Điểm ${score}`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${ring} ${pct * 3.6}deg, #e2e8f0 ${pct * 3.6}deg)`,
        }}
      />
      <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-white text-xs font-black tabular-nums">
        <span className={tone}>{score}</span>
      </div>
    </div>
  )
}

function AuditAccordionSection({
  value,
  title,
  children,
  badge,
}: {
  value: string
  title: string
  children: ReactNode
  badge?: ReactNode
}) {
  return (
    <AccordionItem value={value} className="border-b border-slate-100 last:border-b-0">
      <AccordionTrigger className="px-4 py-3.5 hover:no-underline hover:bg-slate-50/80">
        <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="text-sm font-bold text-slate-800">{title}</span>
          {badge}
        </span>
        <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-slate-400" />
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-0">{children}</AccordionContent>
    </AccordionItem>
  )
}

function KpiSparkline({
  data,
  color,
  className,
}: {
  data: number[]
  color: string
  className?: string
}) {
  const w = 56
  const h = 28
  const min = Math.min(...data, 0)
  const max = Math.max(...data, 100)
  const range = max - min || 1
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 4) - 2
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('shrink-0 opacity-90', className)}
      width={w}
      height={h}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  )
}

function KpiTrendBadge({
  delta,
}: {
  delta: { text: string; tone: 'up-good' | 'up-bad' | 'neutral' } | null
}) {
  if (!delta) return null
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
        delta.tone === 'up-good' && 'bg-emerald-50 text-emerald-700',
        delta.tone === 'up-bad' && 'bg-rose-50 text-rose-700',
        delta.tone === 'neutral' && 'bg-slate-100 text-slate-500'
      )}
    >
      {delta.text}
    </span>
  )
}

function WorkspaceKpiCard({
  icon,
  iconBg,
  title,
  value,
  valueClass,
  delta,
  vsText,
  sparkData,
  sparkColor,
  loading,
}: {
  icon: ReactNode
  iconBg: string
  title: string
  value: string
  valueClass?: string
  delta: { text: string; tone: 'up-good' | 'up-bad' | 'neutral' } | null
  vsText?: string | null
  sparkData: number[]
  sparkColor: string
  loading?: boolean
}) {
  return (
    <div className="relative flex min-w-[10.5rem] flex-1 flex-col rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm',
            iconBg
          )}
        >
          {icon}
        </span>
        <span className="text-[11px] font-semibold leading-tight text-slate-700">{title}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span
              className={cn(
                'text-xl font-bold tabular-nums leading-none sm:text-2xl',
                valueClass ?? 'text-slate-800',
                loading && 'animate-pulse text-slate-300'
              )}
            >
              {loading ? '…' : value}
            </span>
            {!loading ? <KpiTrendBadge delta={delta} /> : null}
          </div>
          {vsText ? <p className="mt-1 text-[10px] font-medium text-slate-400">{vsText}</p> : null}
        </div>
        {!loading ? <KpiSparkline data={sparkData} color={sparkColor} /> : null}
      </div>
    </div>
  )
}

/** Hàng 7 KPI đầu workspace — giống mockup dashboard CSKH. */
export function AuditWorkspaceKpiBar({
  rows,
  prevRows,
  loading,
}: {
  rows: CskhAuditRow[]
  prevRows?: CskhAuditRow[] | null
  loading?: boolean
}) {
  const cur = useMemo(() => computeWorkspaceKpiSnapshot(rows), [rows])
  const prev = useMemo(
    () => (prevRows?.length ? computeWorkspaceKpiSnapshot(prevRows) : null),
    [prevRows]
  )

  const cards = useMemo(() => {
    const spark = cur.scoreSpark
    const vs = (key: keyof WorkspaceKpiSnapshot, v: number | null, suffix = '%') =>
      prev && prev[key] != null && v != null ? `vs ${prev[key]}${suffix}` : null

    return [
      {
        title: 'QA Score trung bình',
        icon: <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />,
        iconBg: 'bg-blue-500',
        value: cur.avgScore != null ? `${cur.avgScore}` : '—',
        valueSuffix: '/100',
        valueClass:
          cur.avgScore != null && cur.avgScore >= 70
            ? 'text-emerald-600'
            : cur.avgScore != null && cur.avgScore >= 50
              ? 'text-amber-600'
              : 'text-slate-800',
        delta: formatKpiDelta(cur.avgScore, prev?.avgScore ?? null, true, 'điểm'),
        vsText:
          prev?.avgScore != null
            ? `vs ${prev.avgScore}/100 ngày trước`
            : cur.avgScore != null
              ? `${cur.total} hội thoại`
              : null,
        spark,
        sparkColor: '#3b82f6',
        higherIsBetter: true,
      },
      {
        title: 'CSAT (Hài lòng)',
        icon: <Smile className="h-3.5 w-3.5" strokeWidth={2.5} />,
        iconBg: 'bg-amber-400',
        value: cur.csatPct != null ? `${cur.csatPct}%` : '—',
        delta: formatKpiDelta(cur.csatPct, prev?.csatPct ?? null, true),
        vsText: vs('csatPct', cur.csatPct),
        spark,
        sparkColor: '#22c55e',
      },
      {
        title: 'Tỷ lệ phản hồi đúng chuẩn',
        icon: <MessageSquareCheck className="h-3.5 w-3.5" strokeWidth={2.5} />,
        iconBg: 'bg-violet-500',
        value: cur.standardPct != null ? `${cur.standardPct}%` : '—',
        delta: formatKpiDelta(cur.standardPct, prev?.standardPct ?? null, true),
        vsText: vs('standardPct', cur.standardPct),
        spark,
        sparkColor: '#8b5cf6',
      },
      {
        title: 'Tỷ lệ bỏ sót khách',
        icon: <UserX className="h-3.5 w-3.5" strokeWidth={2.5} />,
        iconBg: 'bg-rose-500',
        value: cur.missedPct != null ? `${cur.missedPct}%` : '—',
        delta: formatKpiDelta(cur.missedPct, prev?.missedPct ?? null, false),
        vsText: vs('missedPct', cur.missedPct),
        spark: spark.map((v) => 100 - v),
        sparkColor: '#f43f5e',
      },
      {
        title: 'Tỷ lệ follow-up',
        icon: <UserRoundPlus className="h-3.5 w-3.5" strokeWidth={2.5} />,
        iconBg: 'bg-teal-500',
        value: cur.followUpPct != null ? `${cur.followUpPct}%` : '—',
        delta: formatKpiDelta(cur.followUpPct, prev?.followUpPct ?? null, true),
        vsText: vs('followUpPct', cur.followUpPct),
        spark,
        sparkColor: '#14b8a6',
      },
      {
        title: 'Tỷ lệ khách tiêu cực',
        icon: <Frown className="h-3.5 w-3.5" strokeWidth={2.5} />,
        iconBg: 'bg-red-500',
        value: cur.negativePct != null ? `${cur.negativePct}%` : '—',
        delta: formatKpiDelta(cur.negativePct, prev?.negativePct ?? null, false),
        vsText: vs('negativePct', cur.negativePct),
        spark: spark.map((v) => Math.max(0, 100 - v)),
        sparkColor: '#ef4444',
      },
      {
        title: 'Tỷ lệ chốt',
        icon: <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.5} />,
        iconBg: 'bg-blue-600',
        value: cur.closingPct != null ? `${cur.closingPct}%` : '—',
        delta: formatKpiDelta(cur.closingPct, prev?.closingPct ?? null, true),
        vsText: vs('closingPct', cur.closingPct),
        spark,
        sparkColor: '#2563eb',
      },
    ] as const
  }, [cur, prev])

  return (
    <div className="shrink-0 border-b border-slate-200/80 bg-slate-50/50 px-2 py-2.5 sm:px-3">
      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
        {cards.map((c) => (
          <WorkspaceKpiCard
            key={c.title}
            icon={c.icon}
            iconBg={c.iconBg}
            title={c.title}
            value={
              'valueSuffix' in c && c.valueSuffix && c.value !== '—'
                ? `${c.value}${c.valueSuffix}`
                : c.value
            }
            valueClass={'valueClass' in c ? c.valueClass : undefined}
            delta={loading ? null : c.delta}
            vsText={loading ? null : c.vsText}
            sparkData={c.spark}
            sparkColor={c.sparkColor}
            loading={loading}
          />
        ))}
      </div>
    </div>
  )
}

/** Bộ lọc sidebar — 3 ô full width, không scroll ngang. */
function SegmentedFilterBar({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div
      className="grid gap-1 rounded-xl bg-slate-100/90 p-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center rounded-lg px-1 py-2 text-center transition-all',
              isActive
                ? 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-200/80'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'
            )}
          >
            <span className="w-full truncate text-[10px] font-bold leading-tight sm:text-[11px]">
              {tab.label}
            </span>
            {tab.count != null ? (
              <span
                className={cn(
                  'mt-0.5 text-[10px] font-bold tabular-nums',
                  isActive ? 'text-violet-600' : 'text-slate-400'
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

const AuditSidebarRow = memo(function AuditSidebarRow({
  row,
  active,
  adSource,
  onSelect,
}: {
  row: CskhAuditRow
  active: boolean
  adSource: { fromAd: boolean; adTitle: string | null }
  onSelect: (id: string) => void
}) {
  const name = displayCustomerName(row.customerName)
  const pageLabel = displayPageShopLabel(row.metadata?.pageName)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(row.id)}
        className={cn(
          'w-full border-b border-slate-100 px-2.5 py-2.5 text-left transition-all',
          active ? 'bg-violet-50/90 shadow-[inset_3px_0_0_0_#7c3aed]' : 'hover:bg-white'
        )}
      >
        <div className="flex items-start gap-2.5">
          <CskhPageAvatar
            name={name}
            pictureUrl={row.customerPictureUrl ?? row.metadata?.customerPictureUrl}
            pageId={row.metadata?.pageId}
            psid={row.metadata?.participantPsid}
            className="h-8 w-8 rounded-full text-[10px]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1.5">
              <p className="line-clamp-2 min-w-0 flex-1 text-xs font-semibold leading-snug text-slate-800">
                {name}
              </p>
              <ScoreRing score={row.score} size={34} />
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-violet-700">
              {displayAgentName(row)}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className={cn(
                  'rounded px-1 py-0.5 text-[9px] font-bold uppercase',
                  adSource.fromAd ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'
                )}
              >
                {adSource.fromAd ? 'QC' : 'Tự nhắn'}
              </span>
              {pageLabel ? (
                <span className="truncate text-[10px] text-slate-400">{pageLabel}</span>
              ) : null}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="truncate text-[11px] text-slate-500">
                {(row.transcript?.slice(-1)[0] as { text?: string } | undefined)?.text?.slice(
                  0,
                  40
                ) || '—'}
              </p>
              <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                {sidebarPreviewTime(row)}
              </span>
            </div>
          </div>
        </div>
      </button>
    </li>
  )
})

export function AuditConversationSidebar({
  rows,
  selectedId,
  adMap,
  search,
  onSearchChange,
  listFilter,
  onListFilterChange,
  sortOrder,
  onSortOrderChange,
  onSelect,
}: {
  rows: CskhAuditRow[]
  selectedId: string | null
  adMap: Map<string, { fromAd: boolean; adTitle: string | null; adId: string | null }>
  search: string
  onSearchChange: (v: string) => void
  listFilter: AuditListFilter
  onListFilterChange: (v: AuditListFilter) => void
  sortOrder: AuditSidebarSort
  onSortOrderChange: (v: AuditSidebarSort) => void
  onSelect: (id: string) => void
}) {
  const [visibleCount, setVisibleCount] = useState(SIDEBAR_INITIAL)
  const listRef = useRef<HTMLUListElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const adCount = useMemo(() => rows.filter((r) => adMap.get(r.id)?.fromAd).length, [rows, adMap])
  const lowCount = useMemo(() => rows.filter((r) => r.score < 70).length, [rows])

  const filtered = useMemo(() => {
    let list = rows
    if (listFilter === 'ad') list = list.filter((r) => adMap.get(r.id)?.fromAd)
    if (listFilter === 'low') list = list.filter((r) => r.score < 70)
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((row) => {
      const name = displayCustomerName(row.customerName).toLowerCase()
      const agent = (row.agentName ?? '').toLowerCase()
      const pageName = (row.metadata?.pageName ?? '').toLowerCase()
      return name.includes(q) || agent.includes(q) || pageName.includes(q)
    })
  }, [rows, listFilter, adMap, search])

  const sortedFiltered = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const ta = auditLastActivityMs(a)
      const tb = auditLastActivityMs(b)
      return sortOrder === 'newest' ? tb - ta : ta - tb
    })
    return list
  }, [filtered, sortOrder])

  const visibleRows = sortedFiltered.slice(0, visibleCount)
  const hasMore = visibleCount < sortedFiltered.length

  useEffect(() => {
    setVisibleCount(SIDEBAR_INITIAL)
  }, [search, listFilter, sortOrder, rows.length])

  useEffect(() => {
    const root = listRef.current
    const target = loadMoreRef.current
    if (!root || !target || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((n) => Math.min(n + SIDEBAR_LOAD_MORE, sortedFiltered.length))
        }
      },
      { root, rootMargin: '120px', threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, sortedFiltered.length, visibleRows.length])

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 space-y-2.5 border-b border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800">
            Danh sách hội thoại
            <span className="ml-1.5 font-semibold text-slate-400">({rows.length})</span>
          </h3>
          <select
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value as AuditSidebarSort)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600"
            aria-label="Sắp xếp"
          >
            <option value="newest">Gần nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
        <div className="relative">
          <MessageSquare className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm khách, nhân viên…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-xs shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
        <SegmentedFilterBar
          tabs={[
            { id: 'all', label: 'Tất cả', count: rows.length },
            { id: 'low', label: 'Điểm thấp', count: lowCount },
            { id: 'ad', label: 'Quảng cáo', count: adCount },
          ]}
          active={listFilter}
          onChange={(id) => onListFilterChange(id as AuditListFilter)}
        />
      </div>
      <ul
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:thin]"
      >
        {visibleRows.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-slate-500">Không có hội thoại</li>
        ) : (
          visibleRows.map((row) => (
            <AuditSidebarRow
              key={row.id}
              row={row}
              active={row.id === selectedId}
              adSource={adMap.get(row.id) ?? { fromAd: false, adTitle: null, adId: null }}
              onSelect={onSelect}
            />
          ))
        )}
        {hasMore ? (
          <li aria-hidden className="list-none">
            <div
              ref={loadMoreRef}
              className="flex items-center justify-center py-3 text-[11px] text-slate-400"
            >
              Cuộn để xem thêm…
            </div>
          </li>
        ) : sortedFiltered.length > SIDEBAR_INITIAL ? (
          <li className="border-t border-slate-100 py-2 text-center text-[10px] text-slate-400">
            {sortedFiltered.length} hội thoại
          </li>
        ) : null}
      </ul>
    </div>
  )
}

export function AuditTimelinePanel({
  transcript,
  auditDayLabel,
}: {
  transcript: DisplayTranscriptLine[]
  auditDayLabel: string | null
}) {
  const events = buildTimelineEvents(transcript, auditDayLabel)
  if (!events.length) {
    return <p className="py-8 text-center text-sm text-slate-500">Chưa có sự kiện timeline.</p>
  }
  return (
    <div className="space-y-0 py-2">
      {events.map((ev, i) => (
        <div key={`${ev.time}-${i}`} className="relative flex gap-3 pb-4 pl-4">
          <div className="absolute bottom-0 left-[7px] top-2 w-px bg-violet-200" />
          <div className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-violet-400 bg-white" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
              <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{ev.time}</span>
            </div>
            {ev.detail ? <p className="mt-0.5 text-xs text-slate-500">{ev.detail}</p> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

const urgencyTone: Record<CskhCustomerIntent['urgency'], string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-sky-100 text-sky-700',
  high: 'bg-rose-100 text-rose-700',
}

function CustomerIntentTabContent({
  intent,
  loading,
}: {
  intent?: CskhCustomerIntent | null
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2.5 py-8 text-base text-violet-700">
        <Loader2 className="h-5 w-5 animate-spin" />
        Đang phân tích toàn bộ hội thoại…
      </div>
    )
  }
  if (!intent) {
    return (
      <p className="py-8 text-base leading-relaxed text-slate-500">
        Liên kết inbox để AI phân tích khách đang hỏi gì dựa trên cuộc hội thoại.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-600 px-3 py-1 text-sm font-bold text-white">
          {intent.intentLabel}
        </span>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-sm font-semibold uppercase',
            urgencyTone[intent.urgency] ?? urgencyTone.normal
          )}
        >
          {intent.urgency === 'high' ? 'Gấp' : intent.urgency === 'low' ? 'Thấp' : 'Bình thường'}
        </span>
      </div>
      <p className="text-base leading-relaxed text-slate-700">{intent.summary}</p>
      {intent.topics.length ? (
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Chủ đề quan tâm
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {intent.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {intent.products?.length ? (
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Sản phẩm khách quan tâm
          </p>
          <ul className="mt-3 space-y-3">
            {intent.products.map((p) => (
              <li
                key={`${p.productId}-${p.variantId}`}
                className="flex gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg border border-slate-100 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                    SP
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug text-slate-800">{p.name}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-violet-700">
                    {p.priceLabel}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {p.sku ? <span>SKU: {p.sku}</span> : null}
                    <span>{p.inStock ? 'Còn hàng' : 'Hết hàng'}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : intent.productMentions?.length ? (
        <p className="text-sm text-slate-500">Khách nhắc: {intent.productMentions.join(', ')}</p>
      ) : null}
      {intent.suggestedFocus ? (
        <section className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <p className="text-sm font-bold uppercase tracking-wide text-violet-700">
            Gợi ý tập trung
          </p>
          <p className="mt-2 text-base leading-relaxed text-slate-700">{intent.suggestedFocus}</p>
        </section>
      ) : null}
    </div>
  )
}

const SENTIMENT_ROWS = [
  {
    key: 'positive' as const,
    label: 'Tích cực',
    emoji: '😊',
    iconBg: 'bg-emerald-100 ring-1 ring-emerald-200/80',
  },
  {
    key: 'neutral' as const,
    label: 'Trung tính',
    emoji: '😐',
    iconBg: 'bg-amber-100 ring-1 ring-amber-200/80',
  },
  {
    key: 'negative' as const,
    label: 'Tiêu cực',
    emoji: '😠',
    iconBg: 'bg-rose-100 ring-1 ring-rose-200/80',
  },
]

function CustomerSentimentPanel({
  row,
  sentiment,
}: {
  row: CskhAuditRow
  sentiment: ReturnType<typeof resolveSentiment>
}) {
  const [showDetail, setShowDetail] = useState(false)
  const breakdown = useMemo(() => resolveCustomerSentimentBreakdown(row), [row])

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <div className="space-y-0.5 px-3 py-2">
        {SENTIMENT_ROWS.map((r) => (
          <div key={r.key} className="flex items-center gap-3 py-2.5">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none',
                r.iconBg
              )}
              aria-hidden
            >
              {r.emoji}
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{r.label}</span>
            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800">
              {breakdown[r.key]}%
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-3 py-2.5 text-center">
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          {showDetail ? 'Thu gọn phân tích cảm xúc' : 'Xem phân tích cảm xúc →'}
        </button>
      </div>
      {showDetail ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-800">
            Tổng quan: <span className="font-bold text-violet-700">{sentiment.label}</span>
          </p>
          <div>
            <p className="font-semibold text-slate-700">Khách hàng</p>
            <p className="mt-0.5 leading-relaxed text-slate-600">{sentiment.customer}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Nhân viên</p>
            <p className="mt-0.5 leading-relaxed text-slate-600">{sentiment.staff}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AuditAnalysisPanel({
  row,
  inbox,
  transcript,
  auditDayLabel,
  onUseReply,
  customerIntent,
  intentLoading,
  scoreHistory,
}: {
  row: CskhAuditRow
  inbox?: CskhInboxConversation | null
  transcript: DisplayTranscriptLine[]
  auditDayLabel: string | null
  onUseReply?: (text: string) => void
  customerIntent?: CskhCustomerIntent | null
  intentLoading?: boolean
  scoreHistory?: AuditScoreHistory
}) {
  const { pros, cons } = resolveProsCons(row)
  const criteria = resolveCriteriaScores(row)
  const resolvedKeywords = resolveKeywords(row, customerIntent)
  const sentiment = resolveSentiment(row)
  const actionItems = parseAuditActionItems(row)
  const feedbackBullets = resolveFeedbackBullets(row)
  const adSource = resolveAuditFromAd(row, inbox)
  const tags = resolveTags(row, adSource.fromAd)
  const rank = scoreRankLabel(row.score)

  const historyChartData = useMemo(() => {
    const points = scoreHistory?.points ?? []
    if (points.length) {
      return points.map((p) => ({
        score: p.score,
        name: p.auditDate ? formatAuditDateLabel(p.auditDate) : p.label,
      }))
    }
    const day = row.metadata?.auditDate
    return [
      {
        score: row.score,
        name: day ? formatAuditDateLabel(day) : (auditDayLabel ?? 'Hiện tại'),
      },
    ]
  }, [scoreHistory, row.score, row.metadata?.auditDate, auditDayLabel])

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200/80 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3">
        <p className="text-sm font-bold text-white">Phân tích AI</p>
        <p className="text-xs text-violet-100">Bấm từng mục để mở / đóng</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <Accordion type="multiple" defaultValue={['score', 'intent']} className="w-full">
          <AuditAccordionSection
            value="score"
            title="AI chấm điểm hội thoại"
            badge={
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                {row.score}/100
              </span>
            }
          >
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <ScoreRing score={row.score} size={72} />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-lg font-bold text-slate-800">{rank.label}</p>
                <FiveStarRank
                  filled={rank.stars}
                  className="mt-2 justify-center sm:justify-start"
                />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {criteria[0]?.source === 'legacy' ? (
                <p className="text-xs text-amber-600">Audit cũ — chạy lại để có điểm tiêu chí.</p>
              ) : null}
              {criteria.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{c.label}</span>
                    <span className="font-bold tabular-nums text-slate-800">
                      {c.score}/{c.max}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full', criterionBarColor(c.score, c.max))}
                      style={{ width: `${(c.score / c.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AuditAccordionSection>

          <AuditAccordionSection value="intent" title="Khách đang hỏi">
            <CustomerIntentTabContent intent={customerIntent} loading={intentLoading} />
          </AuditAccordionSection>

          <AuditAccordionSection value="detail" title="Phân tích chi tiết">
            <div className="space-y-5">
              <section>
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Đánh giá tổng quan AI
                </h4>
                {feedbackBullets.length ? (
                  <ul className="mt-3 space-y-2.5">
                    {feedbackBullets.map((line, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">AI chưa có nhận xét chi tiết.</p>
                )}
              </section>

              {pros.length ? (
                <section>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                    Ưu điểm
                  </p>
                  <ul className="mt-2 space-y-2">
                    {pros.map((line, i) => (
                      <li key={i} className="text-sm text-slate-700">
                        <span className="text-emerald-500">✓ </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {cons.length ? (
                <section>
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
                    Chưa đạt / cần cải thiện
                  </p>
                  <ul className="mt-2 space-y-2">
                    {cons.map((line, i) => (
                      <li key={i} className="text-sm text-rose-900/90">
                        <span className="font-bold text-rose-500">! </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </AuditAccordionSection>

          <AuditAccordionSection value="keywords" title="Sản phẩm & chủ đề">
            <div className="space-y-4">
              {resolvedKeywords.products.length ? (
                <ul className="space-y-2">
                  {resolvedKeywords.products.map((p) => (
                    <li
                      key={`${p.productId}-${p.variantId}`}
                      className="flex gap-2 rounded-lg border border-slate-100 p-2"
                    >
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-12 w-12 rounded object-cover" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                        <p className="text-sm font-bold text-violet-700">{p.priceLabel}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {resolvedKeywords.productMentions.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {resolvedKeywords.productMentions.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : null}
              {resolvedKeywords.topics.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {resolvedKeywords.topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              {!resolvedKeywords.hasData ? (
                <p className="text-sm text-slate-500">
                  Chưa có sản phẩm/chủ đề — xem mục Khách đang hỏi.
                </p>
              ) : null}
            </div>
          </AuditAccordionSection>

          <AuditAccordionSection value="sentiment" title="Cảm xúc của khách">
            <CustomerSentimentPanel row={row} sentiment={sentiment} />
          </AuditAccordionSection>

          <AuditAccordionSection value="suggest" title="Gợi ý cải thiện">
            {actionItems.length ? (
              <div className="space-y-3">
                {actionItems.map((item, i) => (
                  <div key={i} className="rounded-lg border border-rose-100 bg-rose-50/40 p-3">
                    <p className="text-sm font-medium text-rose-800">{item.issue}</p>
                    {item.suggestedReply ? (
                      <div className="mt-2 rounded bg-white p-2 text-sm text-slate-700">
                        {item.suggestedReply}
                        {onUseReply ? (
                          <button
                            type="button"
                            onClick={() => onUseReply(item.suggestedReply)}
                            className="mt-1 text-xs font-semibold text-violet-600"
                          >
                            Dùng gợi ý →
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Không có vi phạm — đạt chuẩn.</p>
            )}
          </AuditAccordionSection>

          <AuditAccordionSection value="history" title="Lịch sử điểm chất lượng">
            <ChartContainer config={scoreHistoryChartConfig} className="h-[140px] w-full">
              <LineChart
                data={historyChartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(262 83% 58%)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(262 83% 58%)' }}
                />
              </LineChart>
            </ChartContainer>
          </AuditAccordionSection>

          <AuditAccordionSection value="info" title="Thông tin hội thoại">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Ngày audit</dt>
                <dd className="font-medium text-slate-800">
                  {auditDayLabel ??
                    (row.metadata?.auditDate ? formatAuditDateLabel(row.metadata.auditDate) : '—')}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Nhân viên</dt>
                <dd className="font-medium text-violet-700">{displayAgentName(row)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Khách hàng</dt>
                <dd className="font-medium text-slate-800">
                  {displayCustomerName(row.customerName)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Nguồn</dt>
                <dd>
                  {adSource.fromAd ? (
                    <CskhAdSourceBadge fromAd adTitle={adSource.adTitle} compact />
                  ) : (
                    <span className="text-xs text-slate-600">Tự nhắn</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Số tin (audit)</dt>
                <dd className="font-medium tabular-nums">{transcript.length}</dd>
              </div>
            </dl>
            {tags.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </AuditAccordionSection>
        </Accordion>
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <FiveStarRank filled={rank.stars} starClassName="h-4 w-4" />
          <span className="text-xs text-slate-500">
            AI Audit · {auditDayLabel ?? '—'} · {row.score}/100
          </span>
        </div>
      </div>
    </div>
  )
}
