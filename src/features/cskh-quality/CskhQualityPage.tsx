import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  RefreshCw,
  Play,
  Link2,
  MessageSquareWarning,
  ClipboardCheck,
  ChevronDown,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  fetchCskhPages,
  fetchLatestMonitor,
  fetchCskhAudits,
  fetchAuditProgress,
  fetchCskhJob,
  fetchRunningCskhJob,
  getCskhOAuthStartUrl,
  refreshCskhOAuth,
  runAudit,
  cancelAuditJob,
  runMonitor,
  setCskhPageEnabled,
  setCskhPagesEnabledBulk,
  type CskhAuditRow,
  type CskhJobRun,
  type CskhPagesResponse,
} from './api'

type Tab = 'config' | 'monitor' | 'audit'

const MONITOR_JOB_KEY = 'cskh:monitor-job-id'
const AUDIT_JOB_KEY = 'cskh:audit-job-id'

function readStoredJobId(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function storeJobId(key: string, jobId: string | null) {
  try {
    if (jobId) sessionStorage.setItem(key, jobId)
    else sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** Poll job trên server — không phụ thuộc tab/component còn mount hay không. */
function useBackgroundJob(
  type: 'monitor' | 'audit',
  storageKey: string,
  jobId: string | null,
  setJobId: (id: string | null) => void,
  onDone: () => void
) {
  const qc = useQueryClient()

  useEffect(() => {
    void (async () => {
      try {
        const running = await fetchRunningCskhJob(type)
        if (running?.status === 'running') {
          setJobId(running.id)
          storeJobId(storageKey, running.id)
          return
        }
        const stored = readStoredJobId(storageKey)
        if (stored) {
          const job = await fetchCskhJob(stored)
          if (job.status === 'running') {
            setJobId(stored)
          } else {
            storeJobId(storageKey, null)
          }
        }
      } catch {
        storeJobId(storageKey, null)
      }
    })()
  }, [type, storageKey, setJobId])

  useEffect(() => {
    storeJobId(storageKey, jobId)
  }, [storageKey, jobId])

  const { data: job } = useQuery({
    queryKey: ['cskh', 'job', type, jobId],
    queryFn: () => fetchCskhJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1000 : false),
  })

  const handledDoneRef = useRef<string | null>(null)

  useEffect(() => {
    if (!job || job.status === 'running') return
    if (handledDoneRef.current === job.id) return
    handledDoneRef.current = job.id
    storeJobId(storageKey, null)
    if (job.status === 'done') {
      void qc.invalidateQueries({
        queryKey: type === 'monitor' ? ['cskh', 'monitor'] : ['cskh', 'audits'],
      })
    }
    onDone()
  }, [job, storageKey, type, onDone, qc])

  return job ?? null
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-rose-600 bg-rose-50 border-rose-200'
}

/** Page "Kim Nhạn - Vân Phong Các" → NV "Kim Nhạn" (Facebook thường trả tên Page làm người gửi). */
function extractAgentFromPageLabel(pageName?: string | null): string | null {
  if (!pageName?.trim()) return null
  const m = pageName.trim().match(/^([^-–—|/]+?)\s[-–—|/]\s+/)
  const candidate = m?.[1]?.trim()
  if (!candidate || candidate.length > 40) return null
  if (/shop|store|page|official|cửa hàng|cua hang|fanpage/i.test(candidate)) return null
  return candidate
}

function displayAgentName(row: CskhAuditRow): string {
  const name = row.agentName?.trim()
  if (name && name !== 'Nhân viên') return name
  return extractAgentFromPageLabel(row.metadata?.pageName) || '—'
}

function displayCustomerName(name?: string | null): string {
  const n = name?.trim()
  if (n && n !== 'Khách hàng') return n
  return '—'
}

function displayPageShopLabel(pageName?: string | null): string | null {
  if (!pageName?.trim()) return null
  const parts = pageName.trim().split(/\s[-–—|/]\s+/)
  if (parts.length >= 2) return parts.slice(1).join(' - ').trim() || null
  return pageName.trim()
}

function ConfigTab() {
  const qc = useQueryClient()
  const pagesQueryKey = ['cskh', 'pages'] as const
  const { data, isLoading, refetch } = useQuery({
    queryKey: pagesQueryKey,
    queryFn: fetchCskhPages,
  })

  const [syncingIds, setSyncingIds] = useState<Set<string>>(() => new Set())

  const patchPagesCache = useCallback(
    (updater: (pages: CskhPagesResponse['pages']) => CskhPagesResponse['pages']) => {
      qc.setQueryData<CskhPagesResponse>(pagesQueryKey, (prev) => {
        if (!prev) return prev
        return { ...prev, pages: updater(prev.pages) }
      })
    },
    [qc, pagesQueryKey]
  )

  const refreshMut = useMutation({
    mutationFn: refreshCskhOAuth,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cskh'] }),
  })

  const toggleMut = useMutation({
    mutationFn: ({ pageId, enabled }: { pageId: string; enabled: boolean }) =>
      setCskhPageEnabled(pageId, enabled),
    onMutate: async ({ pageId, enabled }) => {
      setSyncingIds((prev) => new Set(prev).add(pageId))
      await qc.cancelQueries({ queryKey: pagesQueryKey })
      const prev = qc.getQueryData<CskhPagesResponse>(pagesQueryKey)
      patchPagesCache((pages) => pages.map((p) => (p.pageId === pageId ? { ...p, enabled } : p)))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(pagesQueryKey, ctx.prev)
    },
    onSettled: (_data, _err, { pageId }) => {
      setSyncingIds((prev) => {
        const next = new Set(prev)
        next.delete(pageId)
        return next
      })
    },
  })

  const bulkMut = useMutation({
    mutationFn: (enabled: boolean) => setCskhPagesEnabledBulk(enabled),
    onMutate: async (enabled) => {
      await qc.cancelQueries({ queryKey: pagesQueryKey })
      const prev = qc.getQueryData<CskhPagesResponse>(pagesQueryKey)
      patchPagesCache((pages) => pages.map((p) => ({ ...p, enabled })))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(pagesQueryKey, ctx.prev)
    },
  })

  const pages = data?.pages ?? []
  const enabledCount = pages.filter((p) => p.enabled).length
  const allEnabled = pages.length > 0 && enabledCount === pages.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Kết nối Facebook</h3>
        <p className="mt-1 text-sm text-slate-500">
          OAuth Meta — lấy token tất cả Page bạn quản trị.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={getCskhOAuthStartUrl()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#166FE5]"
          >
            <Link2 className="h-4 w-4" /> Kết nối Facebook
          </a>
          <button
            type="button"
            disabled={!data?.oauthConnected || refreshMut.isPending}
            onClick={() => refreshMut.mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Làm mới token Page
          </button>
        </div>
        {data?.oauthConnected && (
          <p className="mt-3 text-sm text-emerald-700">
            Đã kết nối: <strong>{data.oauthUser}</strong>
            {data.oauthUpdatedAt && (
              <span className="text-slate-500">
                {' '}
                · cập nhật {new Date(data.oauthUpdatedAt).toLocaleString('vi-VN')}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Facebook Pages</h3>
            {pages.length ? (
              <p className="mt-1 text-xs text-slate-500">
                {enabledCount} / {pages.length} Page đang bật
              </p>
            ) : null}
          </div>
          {pages.length ? (
            <button
              type="button"
              onClick={() => bulkMut.mutate(!allEnabled)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {allEnabled ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          ) : null}
        </div>
        {pages.length > 0 && enabledCount > 5 && (
          <p className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Đang bật {enabledCount} Page — monitor sẽ chậm. Chỉ bật 1–5 Page CSKH thực sự cần theo
            dõi.
          </p>
        )}
        {!pages.length ? (
          <p className="p-5 text-sm text-slate-500">Chưa có Page — bấm Kết nối Facebook ở trên.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pages.map((p) => (
              <li
                key={p.pageId}
                className={`flex items-center justify-between gap-4 px-5 py-3 transition-opacity duration-150 ${
                  syncingIds.has(p.pageId) ? 'opacity-70' : 'opacity-100'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{p.pageName || p.pageId}</p>
                  <p className="text-xs text-slate-400">ID: {p.pageId}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Checkbox
                    id={`cskh-page-${p.pageId}`}
                    checked={p.enabled}
                    onCheckedChange={(checked) =>
                      toggleMut.mutate({ pageId: p.pageId, enabled: checked === true })
                    }
                  />
                  <label
                    htmlFor={`cskh-page-${p.pageId}`}
                    className="cursor-pointer select-none text-sm text-slate-700"
                  >
                    Bật audit
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={() => void refetch()}
        className="text-sm text-slate-500 underline hover:text-slate-700"
      >
        Tải lại danh sách
      </button>
    </div>
  )
}

function MonitorTab({
  setJobId,
  runningJob,
}: {
  setJobId: (id: string | null) => void
  runningJob: CskhJobRun | null
}) {
  const { data: pagesData } = useQuery({
    queryKey: ['cskh', 'pages'],
    queryFn: fetchCskhPages,
  })
  const enabledCount = pagesData?.pages?.filter((p) => p.enabled).length ?? 0

  const { data: latest, isLoading } = useQuery({
    queryKey: ['cskh', 'monitor'],
    queryFn: fetchLatestMonitor,
  })

  const runMut = useMutation({
    mutationFn: () => runMonitor(),
    onSuccess: (res) => setJobId(res.jobId),
  })

  const isRunning = runMut.isPending || runningJob?.status === 'running'
  const runningItems = runningJob?.monitorItems ?? []
  const latestItems = latest?.monitorItems ?? []
  const items = isRunning ? (runningItems.length > 0 ? runningItems : latestItems) : latestItems
  const summary = isRunning ? (runningJob?.summary ?? latest?.summary) : latest?.summary
  const progressPct =
    summary?.pagesTotal && summary.pagesProcessed != null
      ? Math.round((summary.pagesProcessed / summary.pagesTotal) * 100)
      : null
  const showStaleHint = isRunning && runningItems.length === 0 && latestItems.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Monitor — chưa phản hồi</h3>
          {summary && (
            <p className="text-sm text-slate-500">
              {summary.totalConversations ?? 0} hội thoại ·{' '}
              <span className="font-medium text-rose-600">
                {summary.totalNoReply ?? items.length} chưa rep
              </span>
              {isRunning && <span className="ml-1 text-indigo-600">· đang cập nhật…</span>}
            </p>
          )}
          {isRunning && !summary?.totalConversations && (
            <p className="text-sm text-indigo-600">
              {summary?.pagesProcessed != null && summary.pagesTotal
                ? `Đang quét Page ${summary.pagesProcessed}/${summary.pagesTotal}`
                : 'Đang quét inbox…'}
              {summary?.currentPage ? ` · ${summary.currentPage}` : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => runMut.mutate()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Chạy monitor
        </button>
      </div>

      {enabledCount > 10 && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Đang bật {enabledCount} Page — hệ thống chỉ quét tối đa 10 Page/lần. Vào tab Cấu hình, tắt
          Page không cần monitor.
        </p>
      )}

      {isRunning && progressPct != null && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {progressPct}% · tối đa {summary?.maxConversationsPerPage ?? 10} hội thoại/Page
          </p>
        </div>
      )}

      {runMut.isError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {(runMut.error as Error)?.message || 'Không chạy được monitor'}
        </p>
      )}

      {(runningJob?.status === 'failed' || (!isRunning && latest?.status === 'failed')) && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {(runningJob?.status === 'failed' ? runningJob : latest)?.error || 'Monitor thất bại'}
        </p>
      )}

      {showStaleHint && (
        <p className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-2 text-xs text-indigo-700">
          Đang làm mới — hiển thị kết quả lần trước trong lúc chờ.
        </p>
      )}

      {isLoading && !latest && !runningJob ? (
        <div className="flex justify-center py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !items.length ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
          {isRunning ? 'Đang quét inbox…' : 'Không có hội thoại chưa rep — hoặc chưa chạy monitor.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Khách</th>
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Tin cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {row.customerName || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.pageName || row.pageId}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                    {row.lastMessage || '—'}
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

function vietnamTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

function formatAuditDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function AuditTab({
  jobId,
  setJobId,
}: {
  jobId: string | null
  setJobId: (id: string | null) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [auditDate, setAuditDate] = useState('')

  const qc = useQueryClient()

  useEffect(() => {
    void (async () => {
      if (jobId) return
      try {
        const running = await fetchRunningCskhJob('audit')
        if (running?.status === 'running') setJobId(running.id)
      } catch {
        /* ignore */
      }
    })()
  }, [jobId, setJobId])

  const runMut = useMutation({
    mutationFn: (opts: { auditDate: string; force?: boolean }) =>
      runAudit({ auditDate: opts.auditDate, force: opts.force }),
    onSuccess: (res) => {
      setJobId(res.jobId)
      storeJobId(AUDIT_JOB_KEY, res.jobId)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-progress', res.jobId] })
    },
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelAuditJob(),
    onSuccess: () => {
      setJobId(null)
      storeJobId(AUDIT_JOB_KEY, null)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-progress'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
    },
  })

  const {
    data: progress,
    isError: progressError,
    error: progressErr,
  } = useQuery({
    queryKey: ['cskh', 'audit-progress', jobId],
    queryFn: () => fetchAuditProgress(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1000 : false),
  })

  useEffect(() => {
    if (progress?.summary?.auditDate) {
      setAuditDate(progress.summary.auditDate)
    }
  }, [progress?.summary?.auditDate])

  useEffect(() => {
    if (
      progress?.status === 'failed' &&
      (progress.summary?.auditCount ?? progress.audits?.length ?? 0) === 0
    ) {
      storeJobId(AUDIT_JOB_KEY, null)
    }
  }, [progress?.status, progress?.summary?.auditCount, progress?.audits?.length])

  const { data: recentAudits, isLoading: recentLoading } = useQuery({
    queryKey: ['cskh', 'audits', 'recent'],
    queryFn: () => fetchCskhAudits({ limit: 100 }),
    enabled: !jobId,
  })

  const isRunning = runMut.isPending || progress?.status === 'running'
  const isFailed = progress?.status === 'failed'
  const isDone = progress?.status === 'done'
  const summary = progress?.summary
  const auditCount = summary?.auditCount ?? progress?.audits?.length ?? 0
  const isFetchPhase = isRunning && summary?.phase === 'fetch'
  const isAuditPhase = isRunning && summary?.phase === 'audit'

  const displayAudits = jobId ? (progress?.audits ?? []) : (recentAudits ?? [])
  const sortedAudits = [...displayAudits].sort((a, b) => a.score - b.score)
  const isLoadingList = !jobId ? recentLoading : isRunning && auditCount === 0 && !progress
  const progressPct =
    summary?.total && summary.processed != null
      ? Math.round((summary.processed / summary.total) * 100)
      : summary?.total && auditCount > 0
        ? Math.round((auditCount / summary.total) * 100)
        : null

  const auditDayLabel = summary?.auditDate
    ? formatAuditDateLabel(summary.auditDate)
    : auditDate
      ? formatAuditDateLabel(auditDate)
      : null
  const canRun = !!auditDate && !isRunning

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">Audit chất lượng CSKH</h3>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600" htmlFor="audit-date">
              Ngày audit <span className="text-rose-500">*</span>
            </label>
            <input
              id="audit-date"
              type="date"
              value={auditDate}
              max={vietnamTodayIso()}
              disabled={isRunning}
              onChange={(e) => setAuditDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 disabled:opacity-50"
            />
            {!auditDate && !isRunning && (
              <span className="text-xs text-amber-600">Chọn ngày trước khi chạy</span>
            )}
          </div>
          {isRunning && (
            <p className="text-sm text-indigo-600">
              {isFetchPhase ? (
                <>
                  Bước 1: quét inbox ngày {auditDayLabel}
                  {summary?.currentPage ? ` · ${summary.currentPage}` : ''}
                  {summary?.fetched != null
                    ? ` · ${summary.fetched} hội thoại có tin trong ngày`
                    : '…'}
                  {summary?.scanned != null && summary.scanned > 0
                    ? ` (đang lọc ${summary.scanned} hội thoại gần đây…)`
                    : null}
                </>
              ) : auditCount > 0 ? (
                <>
                  Bước 2 ngày {auditDayLabel}: đã có <strong>{auditCount}</strong>
                  {summary?.total ? `/${summary.total}` : ''} kết quả
                  {summary?.avgScore != null && summary.processed ? (
                    <> · TB {summary.avgScore} điểm</>
                  ) : null}
                </>
              ) : summary?.total ? (
                <>
                  Bước 2: đang gọi AI — {summary.total} hội thoại ngày {auditDayLabel}
                </>
              ) : (
                <>Đang khởi động audit ngày {auditDayLabel}…</>
              )}
            </p>
          )}
          {!isRunning && summary && (summary.audited != null || auditCount > 0) && (
            <p className="text-sm text-slate-500">
              Ngày {auditDayLabel ?? '—'} · đã audit {summary.audited ?? auditCount} hội thoại
              {summary.avgScore != null ? <> · TB {summary.avgScore} điểm</> : null}
              {(summary.errors ?? 0) > 0 && (
                <span className="text-amber-600"> · {summary.errors} lỗi</span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canRun || runMut.isPending}
            onClick={() => runMut.mutate({ auditDate })}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {auditDate
              ? `Chạy audit ngày ${formatAuditDateLabel(auditDate)}`
              : 'Chọn ngày để audit'}
          </button>
          {isRunning && (
            <button
              type="button"
              disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate()}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              {cancelMut.isPending ? 'Đang hủy…' : 'Hủy job'}
            </button>
          )}
          {(isFailed || progressError) && (
            <button
              type="button"
              disabled={runMut.isPending}
              onClick={() => {
                const date = auditDate || summary?.auditDate || vietnamTodayIso()
                setJobId(null)
                storeJobId(AUDIT_JOB_KEY, null)
                runMut.mutate({ auditDate: date, force: true })
              }}
              className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              Chạy lại
            </button>
          )}
        </div>
      </div>

      {isFetchPhase && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-violet-400" />
          </div>
          <p className="text-xs text-slate-500">
            Bước 1/2: lọc hội thoại có hoạt động trong ngày {auditDayLabel ?? '…'} · Bước 2: gọi AI
          </p>
        </div>
      )}

      {(isAuditPhase || auditCount > 0) && progressPct != null && isRunning && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {progressPct}% ·{' '}
            {summary?.currentCustomer ? `Đang: ${summary.currentCustomer}` : 'Đang gọi AI…'}
          </p>
        </div>
      )}

      {(isFailed || progressError) && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {progress?.error ||
            (progressErr as Error)?.message ||
            'Audit thất bại hoặc job bị treo — bấm Chạy lại'}
        </p>
      )}

      {isDone && auditCount > 0 && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Hoàn tất — {auditCount} hội thoại đã audit
        </p>
      )}

      {isLoadingList && !sortedAudits.length ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : !sortedAudits.length ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
          {isFetchPhase
            ? `Đang lọc hội thoại ngày ${auditDayLabel ?? '…'} — kết quả hiện sau khi gọi AI.`
            : isRunning
              ? `Đang gọi AI audit ngày ${auditDayLabel ?? '…'}…`
              : auditDate
                ? 'Chưa có kết quả — chọn ngày và bấm Chạy audit.'
                : 'Chọn ngày audit để bắt đầu.'}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            {sortedAudits.length} hội thoại · sắp xếp điểm thấp → cao
          </p>
          {sortedAudits.map((row: CskhAuditRow) => {
            const meta = row.metadata
            const expanded = expandedId === row.id
            const transcript = Array.isArray(row.transcript) ? row.transcript : []
            return (
              <article
                key={row.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full flex-wrap items-start justify-between gap-2 p-4 text-left"
                  onClick={() => setExpandedId(expanded ? null : row.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">
                      {displayCustomerName(row.customerName)}
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="text-slate-500">{displayAgentName(row)}</span>
                      {meta?.staffAbsent && (
                        <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-700">
                          chưa rep
                        </span>
                      )}
                      {meta?.needsFollowUp && !meta?.staffAbsent && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                          chưa rep hết
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {displayPageShopLabel(meta?.pageName) || meta?.pageName || row.channel}
                      {meta?.auditDate ? ` · ${formatAuditDateLabel(meta.auditDate)}` : ''}
                      {meta?.conversationId ? ` · #${meta.conversationId.slice(-8)}` : ''} ·{' '}
                      {new Date(row.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-sm font-bold ${scoreColor(row.score)}`}
                    >
                      {row.score}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                {row.feedback && (
                  <div className="border-t border-slate-100 px-4 pb-3 pt-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Nhận xét AI
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {row.feedback}
                    </p>
                  </div>
                )}
                {expanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Transcript ({transcript.length} dòng)
                    </p>
                    {transcript.length ? (
                      <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
                        {transcript.map((line, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span
                              className={`shrink-0 font-medium ${line.sender === 'Staff' ? 'text-indigo-600' : 'text-slate-600'}`}
                            >
                              {line.sender === 'Staff' ? 'NV' : 'KH'}:
                            </span>
                            <span className="text-slate-700">{line.text || '—'}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Không có transcript.</p>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

const TABS: { id: Tab; label: string; icon: typeof Link2 }[] = [
  { id: 'config', label: 'Cấu hình', icon: Link2 },
  { id: 'monitor', label: 'Monitor', icon: MessageSquareWarning },
  { id: 'audit', label: 'Audit', icon: ClipboardCheck },
]

export function CskhQualityPage() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'config'
    const p = new URLSearchParams(window.location.search)
    const t = p.get('tab')
    if (t === 'monitor' || t === 'audit' || t === 'config') return t
    if (p.get('fb_connected')) return 'config'
    return 'config'
  })
  const [monitorJobId, setMonitorJobId] = useState<string | null>(() =>
    readStoredJobId(MONITOR_JOB_KEY)
  )
  const [auditJobId, setAuditJobId] = useState<string | null>(() => readStoredJobId(AUDIT_JOB_KEY))

  const { data: auditProgress } = useQuery({
    queryKey: ['cskh', 'audit-progress', auditJobId],
    queryFn: () => fetchAuditProgress(auditJobId!),
    enabled: !!auditJobId,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 2000 : false),
  })

  const onMonitorDone = useCallback(() => setMonitorJobId(null), [])

  const monitorRunning = useBackgroundJob(
    'monitor',
    MONITOR_JOB_KEY,
    monitorJobId,
    setMonitorJobId,
    onMonitorDone
  )

  useEffect(() => {
    void (async () => {
      try {
        const running = await fetchRunningCskhJob('audit')
        if (running?.status === 'running') {
          setAuditJobId(running.id)
          storeJobId(AUDIT_JOB_KEY, running.id)
        }
      } catch {
        /* ignore */
      }
    })()
    const p = new URLSearchParams(window.location.search)
    if (p.get('fb_connected') || p.get('oauth_error')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('fb_connected')
      url.searchParams.delete('oauth_error')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  return (
    <section className="mx-auto max-w-5xl space-y-6 p-1" aria-label="CSKH Quality">
      <header>
        <h1 className="text-xl font-bold text-slate-900">CSKH Quality</h1>
        <p className="text-sm text-slate-500">Facebook Messenger — Monitor &amp; Audit AI</p>
      </header>

      <nav className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const busy =
            (id === 'monitor' && monitorRunning?.status === 'running') ||
            (id === 'audit' && auditProgress?.status === 'running')
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {busy && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
            </button>
          )
        })}
      </nav>

      <div className={tab === 'config' ? '' : 'hidden'}>
        <ConfigTab />
      </div>
      <div className={tab === 'monitor' ? '' : 'hidden'}>
        <MonitorTab setJobId={setMonitorJobId} runningJob={monitorRunning} />
      </div>
      <div className={tab === 'audit' ? '' : 'hidden'}>
        <AuditTab jobId={auditJobId} setJobId={setAuditJobId} />
      </div>
    </section>
  )
}
