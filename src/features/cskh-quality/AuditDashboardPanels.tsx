import { memo, useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Filter, MessageSquare, Sparkles, Star, Tag } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { NumberedPaginationBar } from '@/components/ui/pagination'
import { FiveStarRank } from '@/components/icons/FiveStarRank'
import { cn } from '@/lib/utils'
import type { AuditComparisonStats, CskhAuditRow, CskhInboxConversation } from './api'
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
} from './auditDashboardHelpers'
import { parseAuditActionItems, type DisplayTranscriptLine } from './auditHelpers'
import { CskhAdSourceBadge, CskhPageAvatar } from './cskhUi'

const compareChartConfig = {
  score: { label: 'Điểm', color: 'hsl(262 83% 58%)' },
} satisfies ChartConfig

const SIDEBAR_PAGE_SIZE = 20

function TabBar({
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
    <div className={cn('flex gap-1 border-b border-slate-200/80', className)}>
      {tabs.map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-3 py-2.5 text-xs font-semibold transition-colors',
              isActive ? 'text-violet-700' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
            {tab.count != null ? (
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  isActive ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                )}
              >
                {tab.count}
              </span>
            ) : null}
            {isActive ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-violet-600" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function SummaryCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm', className)}>
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
    { name: 'NV này', score: averages.staff, fill: 'hsl(262 83% 58%)' },
    { name: 'TB team', score: averages.team, fill: 'hsl(217 91% 60%)' },
    { name: 'TB ngày', score: averages.overall, fill: 'hsl(160 84% 39%)' },
  ]

  return (
    <div className="shrink-0 overflow-x-auto border-b border-slate-200/80 bg-slate-50/50">
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4 lg:grid lg:min-w-0 lg:grid-cols-4 lg:overflow-visible">
        <SummaryCard className="min-w-[220px] shrink-0 lg:min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Hội thoại {conversationIndexLabel(index, total)}
              </p>
              <span
                className={cn(
                  'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                  rank.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                )}
              >
                {rank.passed ? 'Đã hoàn thành' : 'Cần cải thiện'}
              </span>
            </div>
          </div>
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400">Thời gian</dt>
              <dd className="font-medium text-slate-700">
                {auditDayLabel ??
                  (row.metadata?.auditDate ? formatAuditDateLabel(row.metadata.auditDate) : '—')}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400">Nhân viên</dt>
              <dd className="font-medium text-violet-700">{displayAgentName(row)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400">Kênh</dt>
              <dd className="flex items-center gap-1 font-medium text-slate-700">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2] text-[9px] font-bold text-white">
                  f
                </span>
                Messenger
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400">Nguồn</dt>
              <dd>
                {adSource.fromAd ? (
                  <CskhAdSourceBadge fromAd adTitle={adSource.adTitle} compact />
                ) : (
                  <span
                    title="Khách nhắn trực tiếp, không qua quảng cáo"
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                  >
                    Tự nhắn
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400">Khách hàng</dt>
              <dd className="truncate font-medium text-slate-800">
                {displayCustomerName(row.customerName)}
              </dd>
            </div>
          </dl>
          {tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </SummaryCard>

        <SummaryCard className="flex min-w-[180px] shrink-0 flex-col items-center justify-center text-center lg:min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Điểm chất lượng tổng
          </p>
          <p
            className={cn(
              'mt-1 text-4xl font-black tabular-nums',
              row.score >= 70
                ? 'text-emerald-600'
                : row.score >= 50
                  ? 'text-amber-600'
                  : 'text-rose-600'
            )}
          >
            {row.score}
            <span className="text-lg font-bold text-slate-400">/100</span>
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-600">
            {row.score >= 70 ? 'Đạt' : 'Chưa đạt'}
          </p>
          <FiveStarRank filled={rank.stars} className="mt-2" starClassName="h-4 w-4" />
          <p className="mt-1 text-xs text-slate-500">
            Xếp hạng: <span className="font-semibold text-slate-700">{rank.label}</span>
          </p>
        </SummaryCard>

        <SummaryCard className="min-w-[280px] shrink-0 lg:min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Điểm theo tiêu chí
          </p>
          <div className="grid grid-cols-5 gap-2">
            {criteria.map((c) => (
              <div
                key={c.id}
                className="flex flex-col items-center rounded-lg border border-slate-100 bg-slate-50/80 px-1.5 py-2.5 text-center"
                title={c.label}
              >
                <span className="text-lg leading-none">{c.icon}</span>
                <p className="mt-1.5 line-clamp-2 min-h-[2.25rem] text-[10px] font-medium leading-tight text-slate-600">
                  {c.label.split(',')[0]}
                </p>
                <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-800">
                  {c.score}/{c.max}
                </p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn('h-full rounded-full', criterionBarColor(c.score, c.max))}
                    style={{ width: `${(c.score / c.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SummaryCard>

        <SummaryCard className="min-w-[240px] shrink-0 lg:min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            So sánh trung bình
          </p>
          <ChartContainer config={compareChartConfig} className="h-[132px] w-full">
            <BarChart data={compareData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ChartContainer>
          <div className="mt-2 flex justify-between text-[10px] text-slate-500">
            <span>NV: {averages.staff}</span>
            <span>Team: {averages.team}</span>
            <span>Ngày: {averages.overall}</span>
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
              <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
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
  onSelect,
}: {
  rows: CskhAuditRow[]
  selectedId: string | null
  adMap: Map<string, { fromAd: boolean; adTitle: string | null; adId: string | null }>
  search: string
  onSearchChange: (v: string) => void
  sourceFilter: 'all' | 'ad' | 'organic'
  onSourceFilterChange: (v: 'all' | 'ad' | 'organic') => void
  onSelect: (id: string) => void
}) {
  const [page, setPage] = useState(1)

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / SIDEBAR_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * SIDEBAR_PAGE_SIZE, safePage * SIDEBAR_PAGE_SIZE)

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="space-y-2 border-b border-slate-200/80 p-3">
        <div className="relative">
          <MessageSquare className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm khách, nhân viên…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-8 text-xs focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
        <TabBar
          tabs={[
            { id: 'all', label: 'Tất cả', count: rows.length },
            { id: 'ad', label: 'Quảng cáo', count: adCount },
            { id: 'organic', label: 'Không QC', count: organicCount },
          ]}
          active={sourceFilter}
          onChange={(id) => {
            onSourceFilterChange(id as 'all' | 'ad' | 'organic')
            setPage(1)
          }}
        />
      </div>
      <ul className="flex-1 overflow-y-auto">
        {pageRows.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-slate-500">Không có hội thoại</li>
        ) : (
          pageRows.map((row) => (
            <AuditSidebarRow
              key={row.id}
              row={row}
              active={row.id === selectedId}
              adSource={adMap.get(row.id) ?? { fromAd: false, adTitle: null, adId: null }}
              onSelect={onSelect}
            />
          ))
        )}
      </ul>
      {totalPages > 1 ? (
        <div className="border-t border-slate-100 p-2">
          <NumberedPaginationBar
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
            className="justify-center"
            contentClassName="gap-0.5"
          />
        </div>
      ) : null}
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

export function AuditAnalysisPanel({
  row,
  inbox,
  transcript,
  auditDayLabel,
  onUseReply,
}: {
  row: CskhAuditRow
  inbox?: CskhInboxConversation | null
  transcript: DisplayTranscriptLine[]
  auditDayLabel: string | null
  onUseReply?: (text: string) => void
}) {
  const [tab, setTab] = useState('detail')
  const adSource = resolveAuditFromAd(row, inbox)
  const { pros, cons } = resolveProsCons(row)
  const criteria = resolveCriteriaScores(row)
  const { keywords } = resolveKeywords(row, transcript)
  const sentiment = resolveSentiment(row)
  const actionItems = parseAuditActionItems(row)
  const feedbackBullets = resolveFeedbackBullets(row)

  const tabs = [
    { id: 'detail', label: 'Phân tích chi tiết' },
    { id: 'criteria', label: 'Điểm & Tiêu chí' },
    { id: 'keywords', label: 'Từ khóa' },
    { id: 'sentiment', label: 'Cảm xúc' },
    { id: 'suggest', label: 'Gợi ý cải thiện' },
  ]

  return (
    <div className="flex h-full flex-col bg-white">
      <TabBar tabs={tabs} active={tab} onChange={setTab} className="px-2" />

      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'detail' && (
          <div className="space-y-5">
            <section>
              <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Đánh giá tổng quan AI
              </h4>
              {feedbackBullets.length ? (
                <ul className="mt-3 space-y-2">
                  {feedbackBullets.map((line, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  AI chưa có nhận xét chi tiết cho hội thoại này.
                </p>
              )}
            </section>

            {pros.length ? (
              <section>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                  Ưu điểm
                </p>
                <ul className="mt-2 space-y-1.5">
                  {pros.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="text-emerald-500">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {cons.length ? (
              <section>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                  Điểm cần cải thiện
                </p>
                <ul className="mt-2 space-y-1.5">
                  {cons.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="text-amber-500">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {adSource.fromAd ? (
              <section className="rounded-lg border border-sky-100 bg-sky-50/50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                  Nguồn tin nhắn
                </p>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Campaign</dt>
                    <dd className="font-medium text-slate-700">{adSource.adTitle ?? '—'}</dd>
                  </div>
                  {adSource.adId ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Ad ID</dt>
                      <dd className="font-mono text-[10px] text-slate-600">{adSource.adId}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}
          </div>
        )}

        {tab === 'criteria' && (
          <div className="space-y-3">
            {criteria[0]?.source === 'legacy' ? (
              <p className="text-xs text-amber-600">
                Audit cũ — chưa có điểm tiêu chí từ AI. Chạy lại audit để có dữ liệu chính xác.
              </p>
            ) : null}
            {criteria.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{c.label}</span>
                  <span className="font-bold tabular-nums text-slate-800">
                    {c.score}/{c.max}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
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
            <div className="mt-4 rounded-lg bg-violet-50 p-3 text-center">
              <p className="text-2xl font-black text-violet-700">{row.score}/100</p>
              <p className="text-xs text-slate-500">Tổng điểm chất lượng</p>
            </div>
          </div>
        )}

        {tab === 'keywords' && (
          <div>
            {keywords.length ? (
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chưa trích xuất được từ khóa từ transcript.</p>
            )}
          </div>
        )}

        {tab === 'sentiment' && (
          <div className="space-y-4">
            <div
              className={cn(
                'rounded-xl border p-4 text-center',
                sentiment.tone === 'positive' && 'border-emerald-200 bg-emerald-50',
                sentiment.tone === 'neutral' && 'border-amber-200 bg-amber-50',
                sentiment.tone === 'negative' && 'border-rose-200 bg-rose-50'
              )}
            >
              <p className="text-lg font-bold text-slate-800">{sentiment.label}</p>
              <p className="mt-1 text-xs text-slate-500">Cảm xúc tổng thể hội thoại</p>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-700">Khách hàng</dt>
                <dd className="text-slate-600">{sentiment.customer}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">Nhân viên</dt>
                <dd className="text-slate-600">{sentiment.staff}</dd>
              </div>
            </dl>
          </div>
        )}

        {tab === 'suggest' && (
          <div className="space-y-3">
            {actionItems.length ? (
              actionItems.map((item, i) => (
                <div key={i} className="rounded-lg border border-rose-100 bg-rose-50/30 p-3">
                  <p className="text-sm font-medium text-rose-800">{item.issue}</p>
                  {item.suggestedReply ? (
                    <div className="mt-2 rounded-md bg-white p-2 text-sm text-slate-700">
                      {item.suggestedReply}
                      {onUseReply ? (
                        <button
                          type="button"
                          onClick={() => onUseReply(item.suggestedReply)}
                          className="mt-2 block text-xs font-semibold text-violet-600 hover:text-violet-800"
                        >
                          Dùng gợi ý →
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Không có vi phạm — hội thoại đạt chuẩn CSKH.</p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Đánh giá auditor</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-4 w-4',
                  i < Math.round(scoreRankLabel(row.score).stars)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200'
                )}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">AI Audit · {auditDayLabel ?? '—'}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Điểm {row.score}/100 — {scoreRankLabel(row.score).label}. Xem tab Gợi ý cải thiện để hành
          động tiếp theo.
        </p>
      </div>
    </div>
  )
}
