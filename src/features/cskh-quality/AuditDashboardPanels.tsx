import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { Filter, Loader2, MessageSquare, Sparkles, Star, Tag } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { FiveStarRank } from '@/components/icons/FiveStarRank'
import { cn } from '@/lib/utils'
import type {
  AuditComparisonStats,
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
  scoreColor,
} from './auditHelpers'
import {
  buildTimelineEvents,
  conversationIndexLabel,
  criterionBarColor,
  resolveComparisonAverages,
  resolveCriteriaScores,
  resolveFeedbackBullets,
  resolveKeywords,
  resolveProsCons,
  resolveSentiment,
  resolveTags,
  scoreRankLabel,
  sidebarPreviewTime,
  auditLastActivityMs,
} from './auditDashboardHelpers'
import { parseAuditActionItems, type DisplayTranscriptLine } from './auditHelpers'
import { CskhAdSourceBadge, CskhPageAvatar } from './cskhUi'

const compareChartConfig = {
  score: { label: 'Điểm', color: 'hsl(262 83% 58%)' },
} satisfies ChartConfig

const SIDEBAR_INITIAL = 30
const SIDEBAR_LOAD_MORE = 25

export type AuditSidebarSort = 'newest' | 'oldest'

function CriterionLabel({ label }: { label: string }) {
  const parts = label.includes(' / ')
    ? label.split(' / ')
    : label.includes(',')
      ? label.split(',').map((s) => s.trim())
      : [label]

  if (parts.length <= 1) {
    return (
      <p className="mt-2 w-full break-words text-[10px] font-medium leading-snug text-slate-600 sm:text-[11px]">
        {label}
      </p>
    )
  }

  return (
    <p className="mt-2 w-full text-[10px] font-medium leading-snug text-slate-600 sm:text-[11px]">
      {parts.map((part, i) => (
        <span key={i} className="block break-words">
          {part}
          {i < parts.length - 1 && label.includes(',') ? ',' : ''}
        </span>
      ))}
    </p>
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

/** Tab phân tích AI — lưới 2 cột, thấy hết không scroll. */
function GridTabBar({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>
  active: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-1.5', className)}>
      {tabs.map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'min-h-[2.75rem] rounded-xl border px-2.5 py-2 text-left text-[11px] font-semibold leading-snug transition-all sm:text-xs',
              isActive
                ? 'border-violet-400 bg-violet-50 text-violet-800 shadow-sm ring-1 ring-violet-200/60'
                : 'border-slate-200/90 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/40 hover:text-slate-800'
            )}
          >
            <span className="line-clamp-2">{tab.label}</span>
            {tab.count != null ? (
              <span className="mt-0.5 block text-[10px] font-bold tabular-nums text-slate-400">
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function SummaryCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function AuditSummaryHeader({
  row,
  index,
  total,
  inbox,
  comparison,
  allAudits,
  auditDayLabel,
}: {
  row: CskhAuditRow
  index: number
  total: number
  inbox?: CskhInboxConversation | null
  comparison?: AuditComparisonStats
  allAudits: CskhAuditRow[]
  auditDayLabel?: string | null
}) {
  const adSource = resolveAuditFromAd(row, inbox)
  const rank = scoreRankLabel(row.score)
  const criteria = resolveCriteriaScores(row)
  const averages = resolveComparisonAverages(comparison, row, allAudits)
  const tags = resolveTags(row, adSource.fromAd)

  const compareData = [
    { name: 'Hội thoại', score: row.score, fill: 'hsl(262 83% 58%)' },
    { name: 'TB Page', score: averages.team, fill: 'hsl(217 91% 60%)' },
    { name: 'TB ngày', score: averages.overall, fill: 'hsl(160 84% 39%)' },
  ]
  const teamSample =
    comparison?.teamSampleSize ??
    allAudits.filter((a) => a.metadata?.pageName === row.metadata?.pageName).length
  const daySample = comparison?.daySampleSize ?? allAudits.length

  return (
    <div className="shrink-0 border-b border-slate-200/80 bg-slate-50/50">
      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4 xl:grid-cols-4 xl:items-stretch">
        <SummaryCard className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Hội thoại {conversationIndexLabel(index, total)}
              </p>
              <span
                className={cn(
                  'mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase',
                  rank.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                )}
              >
                {rank.passed ? 'Đã hoàn thành' : 'Cần cải thiện'}
              </span>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Thời gian</dt>
              <dd className="font-medium text-slate-700">
                {auditDayLabel ??
                  (row.metadata?.auditDate ? formatAuditDateLabel(row.metadata.auditDate) : '—')}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Nhân viên</dt>
              <dd className="truncate font-medium text-violet-700">{displayAgentName(row)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Kênh</dt>
              <dd className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-[10px] font-bold text-white">
                  f
                </span>
                Messenger
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Nguồn</dt>
              <dd>
                {adSource.fromAd ? (
                  <CskhAdSourceBadge fromAd adTitle={adSource.adTitle} compact />
                ) : (
                  <span
                    title="Khách nhắn trực tiếp, không qua quảng cáo"
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                  >
                    Tự nhắn
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Khách hàng</dt>
              <dd className="truncate font-medium text-slate-800">
                {displayCustomerName(row.customerName)}
              </dd>
            </div>
          </dl>
          {tags.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </SummaryCard>

        <SummaryCard className="flex min-w-0 flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Điểm chất lượng tổng
          </p>
          <p
            className={cn(
              'mt-1 text-4xl font-black tabular-nums sm:text-5xl',
              row.score >= 70
                ? 'text-emerald-600'
                : row.score >= 50
                  ? 'text-amber-600'
                  : 'text-rose-600'
            )}
          >
            {row.score}
            <span className="text-xl font-bold text-slate-400 sm:text-2xl">/100</span>
          </p>
          <p className="mt-1 text-base font-semibold text-slate-600">
            {row.score >= 70 ? 'Đạt' : 'Chưa đạt'}
          </p>
          <FiveStarRank
            filled={rank.stars}
            className="mt-3"
            starClassName="h-5 w-5 sm:h-6 sm:w-6"
          />
          <p className="mt-2 text-sm text-slate-500">
            Xếp hạng: <span className="font-semibold text-slate-700">{rank.label}</span>
          </p>
        </SummaryCard>

        <SummaryCard className="min-w-0 xl:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Điểm theo tiêu chí
          </p>
          <div className="grid grid-cols-2 gap-2 min-[900px]:grid-cols-3 xl:grid-cols-5 xl:gap-2.5">
            {criteria.map((c) => (
              <div
                key={c.id}
                className="flex min-w-0 flex-col items-center rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-3 text-center"
                title={c.label}
              >
                <span className="text-xl leading-none sm:text-2xl">{c.icon}</span>
                <CriterionLabel label={c.label} />
                <p className="mt-1.5 text-sm font-bold tabular-nums text-slate-800">
                  {c.score}/{c.max}
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn('h-full rounded-full', criterionBarColor(c.score, c.max))}
                    style={{ width: `${(c.score / c.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SummaryCard>

        <SummaryCard className="min-w-0 sm:col-span-2 xl:col-span-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            So sánh trung bình
          </p>
          <ChartContainer config={compareChartConfig} className="h-[130px] w-full sm:h-[150px]">
            <BarChart data={compareData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {compareData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="mt-2 flex justify-between gap-2 text-xs text-slate-500">
            <span title="Điểm hội thoại đang xem">HT: {row.score}</span>
            <span title={`Trung bình Page (${teamSample} hội thoại)`}>Page: {averages.team}</span>
            <span title={`Trung bình cả ngày (${daySample} hội thoại)`}>
              Ngày: {averages.overall}
            </span>
          </div>
        </SummaryCard>
      </div>
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
          'w-full border-b border-slate-100 px-3 py-3 text-left transition-all',
          active ? 'bg-violet-50/90 shadow-[inset_3px_0_0_0_#7c3aed]' : 'hover:bg-white'
        )}
      >
        <div className="flex items-start gap-2.5">
          <CskhPageAvatar
            name={name}
            pictureUrl={row.customerPictureUrl ?? row.metadata?.customerPictureUrl}
            pageId={row.metadata?.pageId}
            psid={row.metadata?.participantPsid}
            className="h-9 w-9 rounded-full text-xs"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <p className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-800">
                {name}
              </p>
              <span
                className={cn(
                  'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                  scoreColor(row.score)
                )}
              >
                {row.score}
              </span>
            </div>
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
  sourceFilter,
  onSourceFilterChange,
  sortOrder,
  onSortOrderChange,
  onSelect,
}: {
  rows: CskhAuditRow[]
  selectedId: string | null
  adMap: Map<string, { fromAd: boolean; adTitle: string | null; adId: string | null }>
  search: string
  onSearchChange: (v: string) => void
  sourceFilter: 'all' | 'ad' | 'organic'
  onSourceFilterChange: (v: 'all' | 'ad' | 'organic') => void
  sortOrder: AuditSidebarSort
  onSortOrderChange: (v: AuditSidebarSort) => void
  onSelect: (id: string) => void
}) {
  const [visibleCount, setVisibleCount] = useState(SIDEBAR_INITIAL)
  const listRef = useRef<HTMLUListElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const adCount = useMemo(() => rows.filter((r) => adMap.get(r.id)?.fromAd).length, [rows, adMap])
  const organicCount = rows.length - adCount

  const filtered = useMemo(() => {
    let list = rows
    if (sourceFilter === 'ad') list = list.filter((r) => adMap.get(r.id)?.fromAd)
    if (sourceFilter === 'organic') list = list.filter((r) => !adMap.get(r.id)?.fromAd)
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((row) => {
      const name = displayCustomerName(row.customerName).toLowerCase()
      const agent = (row.agentName ?? '').toLowerCase()
      const pageName = (row.metadata?.pageName ?? '').toLowerCase()
      return name.includes(q) || agent.includes(q) || pageName.includes(q)
    })
  }, [rows, sourceFilter, adMap, search])

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
  }, [search, sourceFilter, sortOrder, rows.length])

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
      <div className="shrink-0 space-y-2 border-b border-slate-200/80 p-3">
        <div className="relative">
          <MessageSquare className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm khách, nhân viên…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-8 text-xs focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
        <SegmentedFilterBar
          tabs={[
            { id: 'all', label: 'Tất cả', count: rows.length },
            { id: 'ad', label: 'Quảng cáo', count: adCount },
            { id: 'organic', label: 'Tự nhắn', count: organicCount },
          ]}
          active={sourceFilter}
          onChange={(id) => onSourceFilterChange(id as 'all' | 'ad' | 'organic')}
        />
        <SegmentedFilterBar
          tabs={[
            { id: 'newest', label: 'Gần nhất' },
            { id: 'oldest', label: 'Cũ nhất' },
          ]}
          active={sortOrder}
          onChange={(id) => onSortOrderChange(id as AuditSidebarSort)}
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
            Sản phẩm khách quan tâm (Sapo)
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
      ) : intent.sapoConfigured === false ? (
        <p className="text-sm text-slate-400">
          Chưa cấu hình Sapo API — thêm `SAPO_STORE` và `SAPO_ACCESS_TOKEN` trên BE để hiển thị SP
          kèm giá.
        </p>
      ) : intent.productMentions?.length ? (
        <p className="text-sm text-slate-500">
          Khách nhắc: {intent.productMentions.join(', ')} — chưa khớp SP trong catalog Sapo.
        </p>
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

export function AuditAnalysisPanel({
  row,
  inbox,
  transcript,
  auditDayLabel,
  onUseReply,
  customerIntent,
  intentLoading,
}: {
  row: CskhAuditRow
  inbox?: CskhInboxConversation | null
  transcript: DisplayTranscriptLine[]
  auditDayLabel: string | null
  onUseReply?: (text: string) => void
  customerIntent?: CskhCustomerIntent | null
  intentLoading?: boolean
}) {
  const [tab, setTab] = useState('intent')
  const { pros, cons } = resolveProsCons(row)
  const criteria = resolveCriteriaScores(row)
  const resolvedKeywords = resolveKeywords(row, customerIntent)
  const sentiment = resolveSentiment(row)
  const actionItems = parseAuditActionItems(row)
  const feedbackBullets = resolveFeedbackBullets(row)

  const tabs = [
    { id: 'intent', label: 'Khách đang hỏi' },
    { id: 'detail', label: 'Phân tích chi tiết' },
    { id: 'criteria', label: 'Điểm & Tiêu chí' },
    { id: 'keywords', label: 'Sản phẩm & chủ đề' },
    { id: 'sentiment', label: 'Cảm xúc' },
    { id: 'suggest', label: 'Gợi ý cải thiện' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <GridTabBar
        tabs={tabs}
        active={tab}
        onChange={setTab}
        className="shrink-0 border-b border-slate-100 px-3 py-3"
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-6 sm:px-6 sm:py-7">
        {tab === 'intent' && (
          <CustomerIntentTabContent intent={customerIntent} loading={intentLoading} />
        )}

        {tab === 'detail' && (
          <div className="space-y-8">
            <section>
              <h4 className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Sparkles className="h-5 w-5 text-violet-500" />
                Đánh giá tổng quan AI
              </h4>
              {feedbackBullets.length ? (
                <ul className="mt-4 space-y-3.5">
                  {feedbackBullets.map((line, i) => (
                    <li key={i} className="flex gap-3 text-base leading-relaxed text-slate-700">
                      <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-base leading-relaxed text-slate-500">
                  AI chưa có nhận xét chi tiết cho hội thoại này.
                </p>
              )}
            </section>

            {pros.length ? (
              <section>
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">
                  Ưu điểm
                </p>
                <ul className="mt-3 space-y-3">
                  {pros.map((line, i) => (
                    <li key={i} className="flex gap-2.5 text-base leading-relaxed text-slate-700">
                      <span className="text-emerald-500">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {cons.length ? (
              <section>
                <p className="text-sm font-bold uppercase tracking-wide text-amber-600">
                  Điểm cần cải thiện
                </p>
                <ul className="mt-3 space-y-3">
                  {cons.map((line, i) => (
                    <li key={i} className="flex gap-2.5 text-base leading-relaxed text-slate-700">
                      <span className="text-amber-500">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}

        {tab === 'criteria' && (
          <div className="space-y-4">
            {criteria[0]?.source === 'legacy' ? (
              <p className="text-sm text-amber-600">
                Audit cũ — chưa có điểm tiêu chí từ AI. Chạy lại audit để có dữ liệu chính xác.
              </p>
            ) : null}
            {criteria.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-base">
                  <span className="font-medium text-slate-700">{c.label}</span>
                  <span className="text-lg font-bold tabular-nums text-slate-800">
                    {c.score}/{c.max}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      criterionBarColor(c.score, c.max)
                    )}
                    style={{ width: `${(c.score / c.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-6 rounded-xl bg-violet-50 p-5 text-center">
              <p className="text-3xl font-black text-violet-700">{row.score}/100</p>
              <p className="mt-1 text-sm text-slate-500">Tổng điểm chất lượng</p>
            </div>
          </div>
        )}

        {tab === 'keywords' && (
          <div className="space-y-6">
            {resolvedKeywords.products.length ? (
              <section>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Sản phẩm khách quan tâm
                </p>
                <ul className="mt-3 space-y-3">
                  {resolvedKeywords.products.map((p) => (
                    <li
                      key={`${p.productId}-${p.variantId}`}
                      className="flex gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm"
                    >
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                          SP
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug text-slate-800">{p.name}</p>
                        <p className="mt-1 text-base font-bold tabular-nums text-violet-700">
                          {p.priceLabel}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {resolvedKeywords.productMentions.length ? (
              <section>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Khách nhắc tới
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {resolvedKeywords.productMentions.map((mention) => (
                    <span
                      key={mention}
                      className="rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-800"
                    >
                      {mention}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {resolvedKeywords.topics.length ? (
              <section>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Chủ đề quan tâm
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {resolvedKeywords.topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-700"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {resolvedKeywords.keywords.length ? (
              <section>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Từ khóa AI
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {resolvedKeywords.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-800"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {!resolvedKeywords.hasData ? (
              <p className="text-base text-slate-500">
                Chưa xác định được sản phẩm hoặc chủ đề từ hội thoại. Mở tab「Khách đang hỏi」 hoặc
                chạy lại audit sau khi cập nhật AI.
              </p>
            ) : null}
          </div>
        )}

        {tab === 'sentiment' && (
          <div className="space-y-5">
            <div
              className={cn(
                'rounded-xl border p-5 text-center',
                sentiment.tone === 'positive' && 'border-emerald-200 bg-emerald-50',
                sentiment.tone === 'neutral' && 'border-amber-200 bg-amber-50',
                sentiment.tone === 'negative' && 'border-rose-200 bg-rose-50'
              )}
            >
              <p className="text-xl font-bold text-slate-800">{sentiment.label}</p>
              <p className="mt-1 text-sm text-slate-500">Cảm xúc tổng thể hội thoại</p>
            </div>
            <dl className="space-y-4 text-base">
              <div>
                <dt className="font-semibold text-slate-700">Khách hàng</dt>
                <dd className="mt-1 leading-relaxed text-slate-600">{sentiment.customer}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">Nhân viên</dt>
                <dd className="mt-1 leading-relaxed text-slate-600">{sentiment.staff}</dd>
              </div>
            </dl>
          </div>
        )}

        {tab === 'suggest' && (
          <div className="space-y-4">
            {actionItems.length ? (
              actionItems.map((item, i) => (
                <div key={i} className="rounded-xl border border-rose-100 bg-rose-50/30 p-4">
                  <p className="text-base font-medium text-rose-800">{item.issue}</p>
                  {item.suggestedReply ? (
                    <div className="mt-3 rounded-lg bg-white p-3 text-base leading-relaxed text-slate-700">
                      {item.suggestedReply}
                      {onUseReply ? (
                        <button
                          type="button"
                          onClick={() => onUseReply(item.suggestedReply)}
                          className="mt-2 block text-sm font-semibold text-violet-600 hover:text-violet-800"
                        >
                          Dùng gợi ý →
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-base text-slate-500">
                Không có vi phạm — hội thoại đạt chuẩn CSKH.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 px-5 py-5 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Đánh giá auditor</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-5 w-5',
                  i < Math.round(scoreRankLabel(row.score).stars)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200'
                )}
              />
            ))}
          </div>
          <span className="text-sm text-slate-500">AI Audit · {auditDayLabel ?? '—'}</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Điểm {row.score}/100 — {scoreRankLabel(row.score).label}. Xem tab Gợi ý cải thiện để hành
          động tiếp theo.
        </p>
      </div>
    </div>
  )
}
