import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/axios'
import { isTransientInfraError, toUserFacingError } from '@/lib/userFacingError'
import { Loader2, Pause, Play, MessageCircle, ClipboardCheck, Send, ArrowLeft } from 'lucide-react'
import {
  cancelAuditJob,
  pauseAuditJob,
  fetchAuditDayStats,
  fetchAuditComparisonStats,
  fetchAuditProgress,
  fetchCskhAudits,
  fetchCustomerIntent,
  fetchInboxConversations,
  fetchInboxMessages,
  fetchRunningCskhJob,
  linkAuditInbox,
  resolveInboxMessageMedia,
  runAudit,
  sendInboxMessage,
  syncInboxFromGraph,
  type CskhAuditRow,
  type CskhAuditProgress,
  type CskhInboxConversation,
  type CskhInboxMessage,
} from './api'
import {
  displayCustomerName,
  displayPageShopLabel,
  formatAuditDateLabel,
  resolveAuditFromAd,
  filterDisplayTranscript,
  messagesAfterAuditDate,
  inboxMessagesAfterTranscript,
  groupLiveMediaMessages,
  dedupeMediaUrls,
  isNoiseMessageText,
  scoreColor,
  vietnamTodayIso,
} from './auditHelpers'
import { cskhMediaProxySrc, cskhMediaSrc, resolveMessageMedia } from './messageMedia'
import {
  AuditAnalysisPanel,
  AuditConversationSidebar,
  AuditSummaryHeader,
  AuditTimelinePanel,
} from './AuditDashboardPanels'
import {
  ChatThreadHeader,
  CskhAdSourceBadge,
  CskhOrganicSourceBadge,
  CskhAuditProgressBanner,
  CskhAuditProgressPanel,
  CskhAuditDatePicker,
  CskhConnectionBadge,
  CskhEmptyState,
  CskhLoading,
  CskhNoticeBanner,
  CskhToolbar,
  MessengerWorkspace,
  type MessengerWorkspacePane,
} from './cskhUi'
import { useCskhInboxStream } from './useCskhInboxStream'

const AUDIT_JOB_KEY = 'cskh:audit-job-id'

function cskhQueryRetry(failureCount: number, error: unknown): boolean {
  const msg = getApiErrorMessage(error)
  if (isTransientInfraError(msg)) return failureCount < 4
  return failureCount < 1
}

function cskhQueryRetryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 8000)
}

function storeJobId(jobId: string | null) {
  try {
    if (jobId) sessionStorage.setItem(AUDIT_JOB_KEY, jobId)
    else sessionStorage.removeItem(AUDIT_JOB_KEY)
  } catch {
    /* ignore */
  }
}

function normalizeName(value?: string | null): string {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function matchInboxConversation(
  row: CskhAuditRow,
  convs: CskhInboxConversation[]
): CskhInboxConversation | null {
  const pageId = row.metadata?.pageId
  if (!pageId) return null
  const pageConvs = convs.filter((c) => c.pageId === pageId)
  const psid = row.metadata?.participantPsid
  if (psid) {
    const byPsid = pageConvs.find((c) => c.participantPsid === psid)
    if (byPsid) return byPsid
  }
  const fbId = row.metadata?.conversationId
  if (fbId) {
    const byFb = pageConvs.find((c) => c.fbConversationId === fbId)
    if (byFb) return byFb
  }
  const auditName = normalizeName(displayCustomerName(row.customerName))
  if (auditName && auditName !== '—') {
    const byName = pageConvs.find(
      (c) => c.customerName && normalizeName(displayCustomerName(c.customerName)) === auditName
    )
    if (byName) return byName
    const partial = pageConvs.find((c) => {
      const inboxName = normalizeName(c.customerName)
      return (
        inboxName &&
        (inboxName.includes(auditName) ||
          auditName.includes(inboxName) ||
          inboxName.split(' ')[0] === auditName.split(' ')[0])
      )
    })
    if (partial) return partial
  }
  return null
}

function resolveCustomerPicture(
  row: CskhAuditRow,
  inbox: CskhInboxConversation | null
): string | null {
  return (
    row.customerPictureUrl ?? row.metadata?.customerPictureUrl ?? inbox?.customerPictureUrl ?? null
  )
}

function MediaImage({ url, compact }: { url: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [useProxy, setUseProxy] = useState(false)
  const src = useProxy ? cskhMediaProxySrc(url) : cskhMediaSrc(url)
  if (failed || !src) return null
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={
          compact
            ? 'aspect-square w-full object-cover'
            : 'max-h-64 max-w-full rounded-xl object-cover'
        }
        onError={() => {
          if (!useProxy) setUseProxy(true)
          else setFailed(true)
        }}
      />
    </a>
  )
}

function MessageBubbleContent({
  messageId,
  text,
  attachmentUrl,
  attachmentUrls,
  messageType,
  isStaff,
}: {
  messageId?: string
  text?: string | null
  attachmentUrl?: string | null
  attachmentUrls?: string[]
  messageType?: string | null
  isStaff?: boolean
}) {
  const initialUrls = dedupeMediaUrls(
    attachmentUrls?.length ? attachmentUrls : attachmentUrl ? [attachmentUrl] : []
  )
  const [resolvedUrls, setResolvedUrls] = useState<string[]>(initialUrls)
  const [resolvedType, setResolvedType] = useState<string | null>(messageType ?? null)
  const [resolvedText, setResolvedText] = useState<string | null | undefined>(text)
  const [videoFailed, setVideoFailed] = useState(false)
  const [useMediaProxy, setUseMediaProxy] = useState(false)
  const [resolving, setResolving] = useState(false)
  const resolveAttempted = useRef(false)

  useEffect(() => {
    const urls = dedupeMediaUrls(
      attachmentUrls?.length ? attachmentUrls : attachmentUrl ? [attachmentUrl] : []
    )
    setResolvedUrls(urls)
    setResolvedType(messageType ?? null)
    setResolvedText(text)
    setVideoFailed(false)
    setUseMediaProxy(false)
    resolveAttempted.current = false
  }, [messageId, attachmentUrl, attachmentUrls, messageType, text])

  const media = resolveMessageMedia({
    text: resolvedText,
    attachmentUrl: resolvedUrls[0] ?? null,
    messageType: resolvedType,
  })
  const needsResolve =
    Boolean(messageId) &&
    resolvedUrls.length === 0 &&
    (media.messageType === 'image' ||
      media.messageType === 'video' ||
      resolvedText === '[Ảnh]' ||
      resolvedText === '[Video]' ||
      resolvedText === '[attachment]')

  useEffect(() => {
    if (!needsResolve || resolveAttempted.current) return
    resolveAttempted.current = true
    let cancelled = false
    setResolving(true)
    resolveInboxMessageMedia(messageId!)
      .then((row) => {
        if (cancelled) return
        if (row.attachmentUrls?.length) setResolvedUrls(dedupeMediaUrls(row.attachmentUrls))
        else if (row.attachmentUrl) setResolvedUrls(dedupeMediaUrls([row.attachmentUrl]))
        if (row.messageType) setResolvedType(row.messageType)
        setResolvedText(row.text)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setResolving(false)
      })
    return () => {
      cancelled = true
    }
  }, [messageId, needsResolve])

  const imageUrls =
    media.messageType === 'image' ? resolvedUrls.filter((u) => u.startsWith('http')) : []
  const videoUrl = media.messageType === 'video' ? (resolvedUrls[0] ?? media.attachmentUrl) : null
  const videoSrc = videoUrl
    ? useMediaProxy
      ? cskhMediaProxySrc(videoUrl)
      : cskhMediaSrc(videoUrl)
    : undefined
  const showVideo = media.messageType === 'video' && videoSrc && !videoFailed

  const onVideoError = () => {
    if (!useMediaProxy && videoUrl) {
      setUseMediaProxy(true)
      return
    }
    setVideoFailed(true)
  }

  return (
    <div className="space-y-2">
      {imageUrls.length > 0 ? (
        <div
          className={
            imageUrls.length > 1 ? 'grid max-w-sm grid-cols-2 gap-1.5' : 'grid grid-cols-1 gap-1.5'
          }
        >
          {imageUrls.map((url, idx) => (
            <MediaImage key={`${url}-${idx}`} url={url} compact={imageUrls.length > 1} />
          ))}
        </div>
      ) : null}
      {showVideo ? (
        <video
          src={videoSrc}
          controls
          playsInline
          preload="metadata"
          className="max-h-64 max-w-full rounded-xl"
          onError={onVideoError}
        />
      ) : null}
      {media.displayText ? (
        <p className="whitespace-pre-wrap break-words">{media.displayText}</p>
      ) : null}
      {!imageUrls.length && !showVideo && !media.displayText ? (
        <p className={`text-sm italic ${isStaff ? 'text-blue-100' : 'text-slate-400'}`}>
          {resolving
            ? 'Đang tải ảnh…'
            : media.messageType === 'video'
              ? '[Video]'
              : media.messageType === 'image'
                ? '[Ảnh]'
                : media.messageType === 'sticker'
                  ? '[Sticker]'
                  : '[Tệp đính kèm]'}
        </p>
      ) : null}
    </div>
  )
}

function AuditScopeDivider({ auditDayLabel }: { auditDayLabel: string }) {
  return (
    <div className="relative py-3">
      <div className="absolute inset-x-0 top-1/2 border-t border-violet-200/80" />
      <p className="relative mx-auto w-fit rounded-full border border-violet-200 bg-violet-50/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 shadow-sm">
        ▼ Hết ngày audit · {auditDayLabel}
      </p>
    </div>
  )
}

function LiveBubble({ msg }: { msg: CskhInboxMessage & { attachmentUrls?: string[] } }) {
  if (isNoiseMessageText(msg.text)) return null
  const isStaff = msg.direction === 'outbound' || msg.senderType === 'staff'
  return (
    <div className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
          isStaff
            ? 'rounded-br-md bg-gradient-to-br from-[#0084FF] to-indigo-600 text-white'
            : 'rounded-bl-md border border-white/70 bg-white/95 text-slate-800'
        }`}
      >
        <MessageBubbleContent
          messageId={msg.id}
          text={msg.text}
          attachmentUrl={msg.attachmentUrl}
          attachmentUrls={msg.attachmentUrls}
          messageType={msg.messageType}
          isStaff={isStaff}
        />
        <p className={`mt-1 text-[10px] ${isStaff ? 'text-blue-100' : 'text-slate-400'}`}>
          {new Date(msg.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          {msg.status === 'pending' && ' · đang gửi'}
          {msg.status === 'failed' && ' · thất bại'}
        </p>
      </div>
    </div>
  )
}

function ChatBubble({
  sender,
  text,
  time,
  attachmentUrl,
  attachmentUrls,
  messageType,
  imageUrl,
  videoUrl,
}: {
  sender?: string
  text?: string
  time?: string
  attachmentUrl?: string | null
  attachmentUrls?: string[]
  messageType?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
}) {
  if (isNoiseMessageText(text)) return null
  const isStaff = sender === 'Staff'
  const urls = dedupeMediaUrls(
    attachmentUrls?.length ? attachmentUrls : [attachmentUrl, imageUrl, videoUrl]
  )
  const resolvedUrl = urls[0] ?? null
  const resolvedType =
    messageType ?? (videoUrl ? 'video' : imageUrl || attachmentUrl ? 'image' : 'text')
  return (
    <div className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
          isStaff
            ? 'rounded-br-md bg-gradient-to-br from-[#0084FF] to-indigo-600 text-white'
            : 'rounded-bl-md border border-white/70 bg-white/95 text-slate-800 backdrop-blur-sm'
        }`}
      >
        <MessageBubbleContent
          text={text}
          attachmentUrl={resolvedUrl}
          attachmentUrls={urls.length > 1 ? urls : undefined}
          messageType={resolvedType}
          isStaff={isStaff}
        />
        {time ? (
          <p className={`mt-1 text-[10px] ${isStaff ? 'text-blue-100' : 'text-slate-400'}`}>
            {time}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function AuditMessengerView({
  jobId,
  setJobId,
}: {
  jobId: string | null
  setJobId: (id: string | null) => void
}) {
  const [auditDate, setAuditDate] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ad' | 'organic'>('all')
  const [chatTab, setChatTab] = useState<'chat' | 'timeline' | 'analysis'>('chat')
  const [workspacePane, setWorkspacePane] = useState<MessengerWorkspacePane>('list')
  const [completionNotice, setCompletionNotice] = useState<string | null>(null)
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chatScrollSigRef = useRef('')
  const refreshedConvRef = useRef<string | null>(null)
  const stableAuditsRef = useRef<CskhAuditRow[]>([])
  const inboxSyncStartedRef = useRef(false)
  const qc = useQueryClient()

  useEffect(() => {
    void (async () => {
      if (jobId) return
      try {
        const running = await fetchRunningCskhJob('audit')
        if (running?.status === 'running') {
          setJobId(running.id)
          storeJobId(running.id)
        } else {
          storeJobId(null)
        }
      } catch {
        storeJobId(null)
      }
    })()
  }, [jobId, setJobId])

  const runMut = useMutation({
    mutationFn: (opts: { auditDate: string; force?: boolean }) =>
      runAudit({ auditDate: opts.auditDate, force: opts.force }),
    onMutate: async (vars) => {
      setCompletionNotice(null)
      setDismissedErrorKey(null)
      await qc.cancelQueries({ queryKey: ['cskh', 'audits', 'by-day', vars.auditDate] })
    },
    onSuccess: (res, vars) => {
      const cached =
        qc.getQueryData<CskhAuditRow[]>(['cskh', 'audits', 'by-day', vars.auditDate]) ??
        stableAuditsRef.current
      setJobId(res.jobId)
      storeJobId(res.jobId)
      qc.setQueryData<CskhAuditProgress>(['cskh', 'audit-progress', res.jobId], {
        id: res.jobId,
        status: 'running',
        startedAt: new Date().toISOString(),
        summary: {
          phase: 'fetch',
          auditDate: vars.auditDate,
          fetched: cached.length,
          scanned: 0,
          pagesProcessed: 0,
          pagesTotal: 0,
        },
        audits: cached,
      })
    },
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelAuditJob(),
    onSuccess: () => {
      setJobId(null)
      storeJobId(null)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-progress'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-day-stats'] })
    },
  })

  const pauseMut = useMutation({
    mutationFn: () => pauseAuditJob(),
    onSuccess: (res) => {
      if (!res.paused) return
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-progress', jobId] })
    },
  })

  const {
    data: progress,
    isError: progressError,
    error: progressErr,
    isFetching: progressFetching,
    failureCount: progressFailureCount,
  } = useQuery({
    queryKey: ['cskh', 'audit-progress', jobId],
    queryFn: () => fetchAuditProgress(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1500 : false),
    placeholderData: keepPreviousData,
    retry: cskhQueryRetry,
    retryDelay: cskhQueryRetryDelay,
  })

  const progressFinished = progress?.status === 'done' || progress?.status === 'failed'

  useEffect(() => {
    if (!progress || progress.status === 'running') return

    const persistAuditsForDay = (day: string | undefined) => {
      if (!day || !progress.audits?.length) return
      const rows = progress.audits.filter((a) => a.metadata?.auditDate === day)
      if (rows.length) {
        qc.setQueryData(['cskh', 'audits', 'by-day', day], rows)
      }
    }

    if (progress.status === 'done') {
      const count = progress.summary?.auditCount ?? progress.audits?.length ?? 0
      const day = progress.summary?.auditDate
      if (progress.summary?.allAlreadyAudited) {
        setCompletionNotice(
          `Đã chấm hết ${progress.summary.skippedAlready ?? count} hội thoại${
            day ? ` ngày ${formatAuditDateLabel(day)}` : ''
          } — không còn hội thoại mới.`
        )
      } else if (progress.summary?.paused || progress.summary?.partial) {
        const remaining = progress.summary.remaining
        setCompletionNotice(
          `Tạm dừng — đã chấm ${count} hội thoại${
            day ? ` ngày ${formatAuditDateLabel(day)}` : ''
          }${remaining ? ` · còn ~${remaining} trong batch này` : ''}. Bấm «Tiếp tục chạy» cùng ngày để quét nốt.`
        )
      } else if (count > 0) {
        setCompletionNotice(
          `Hoàn tất ${count} hội thoại${day ? ` ngày ${formatAuditDateLabel(day)}` : ''}`
        )
      }
      persistAuditsForDay(day)
      setJobId(null)
      storeJobId(null)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-day-stats'] })
      return
    }

    const savedCount = progress.summary?.auditCount ?? progress.audits?.length ?? 0
    if (savedCount > 0) {
      persistAuditsForDay(progress.summary?.auditDate)
      setJobId(null)
      storeJobId(null)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-day-stats'] })
    }
  }, [progress, qc, setJobId])

  useEffect(() => {
    if (!progressError || !jobId || progressFetching) return
    if (progressFailureCount < 4 && isTransientInfraError(getApiErrorMessage(progressErr))) return
    setJobId(null)
    storeJobId(null)
    void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
    void qc.invalidateQueries({ queryKey: ['cskh', 'audit-day-stats'] })
  }, [progressError, progressErr, progressFetching, progressFailureCount, jobId, qc, setJobId])

  useEffect(() => {
    if (progress?.summary?.auditDate) setAuditDate(progress.summary.auditDate)
  }, [progress?.summary?.auditDate])

  const { data: dayStats } = useQuery({
    queryKey: ['cskh', 'audit-day-stats', auditDate],
    queryFn: () => fetchAuditDayStats(auditDate),
    enabled: Boolean(auditDate),
    staleTime: 15_000,
  })

  const {
    data: recentAudits,
    isLoading: recentLoading,
    isFetching: recentFetching,
  } = useQuery({
    queryKey: ['cskh', 'audits', 'by-day', auditDate],
    queryFn: () => fetchCskhAudits({ auditDate, limit: 2000 }),
    enabled: Boolean(auditDate),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: cskhQueryRetry,
    retryDelay: cskhQueryRetryDelay,
  })

  useEffect(() => {
    stableAuditsRef.current = []
    setSelectedId(null)
    setSidebarSearch('')
    setSourceFilter('all')
    setChatTab('chat')
  }, [auditDate])

  useEffect(() => {
    if (auditDate || recentLoading) return
    const latest = recentAudits?.find((a) => a.metadata?.auditDate)?.metadata?.auditDate
    setAuditDate(latest ?? vietnamTodayIso())
  }, [auditDate, recentAudits, recentLoading])

  const summary = progress?.summary
  const isAuditActive =
    runMut.isPending || progress?.status === 'running' || (!!jobId && !progressFinished)
  const isRunning = isAuditActive
  const isPausing = Boolean(summary?.pauseRequested) || pauseMut.isPending
  const isFailed = progress?.status === 'failed'
  const auditErrorMessage =
    toUserFacingError(
      progress?.error ||
        (progressErr ? getApiErrorMessage(progressErr) : '') ||
        (runMut.error ? getApiErrorMessage(runMut.error) : '')
    ) || 'Không thể chạy audit. Vui lòng thử lại sau.'
  const auditCount = summary?.auditCount ?? progress?.audits?.length ?? 0
  const isFetchPhase = isAuditActive && summary?.phase !== 'audit'
  const isAuditPhase = isAuditActive && summary?.phase === 'audit'
  /** Quét inbox → màn tiến độ; chấm điểm → danh sách (giữ màn tiến độ nếu chưa có total). */
  const showProgressScreen =
    isFetchPhase ||
    (isAuditPhase &&
      (summary?.total ?? 0) === 0 &&
      (summary?.processed ?? 0) === 0 &&
      (progress?.audits?.length ?? 0) === 0)

  const dayAuditsReady =
    Boolean(auditDate) &&
    !recentLoading &&
    !recentFetching &&
    recentAudits !== undefined &&
    recentAudits.every((a) => !a.metadata?.auditDate || a.metadata.auditDate === auditDate)

  const showDayLoading = Boolean(auditDate) && !isAuditActive && !dayAuditsReady

  const displayAudits = useMemo(() => {
    if (showDayLoading) return []
    const filterDay = (rows: CskhAuditRow[]) =>
      rows.filter((a) => !auditDate || a.metadata?.auditDate === auditDate)
    const fromProgress = jobId && progress?.audits?.length ? filterDay(progress.audits) : []
    const fromRecent = recentAudits?.length ? filterDay(recentAudits) : []

    if (isAuditActive && jobId) {
      const merged = new Map<string, CskhAuditRow>()
      for (const row of fromRecent) merged.set(row.id, row)
      for (const row of fromProgress) merged.set(row.id, row)
      return filterDay([...merged.values()])
    }

    if (fromRecent.length) return fromRecent
    if (fromProgress.length) return fromProgress
    return []
  }, [auditDate, isAuditActive, jobId, progress?.audits, recentAudits, showDayLoading])

  useEffect(() => {
    if (displayAudits.length) stableAuditsRef.current = displayAudits
  }, [displayAudits])

  const sortedAudits = useMemo(
    () => [...displayAudits].sort((a, b) => a.score - b.score),
    [displayAudits]
  )
  const filteredAudits = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase()
    if (!q) return sortedAudits
    return sortedAudits.filter((row) => {
      const name = displayCustomerName(row.customerName).toLowerCase()
      const page = (row.metadata?.pageName ?? '').toLowerCase()
      const agent = (row.agentName ?? '').toLowerCase()
      return name.includes(q) || page.includes(q) || agent.includes(q)
    })
  }, [sortedAudits, sidebarSearch])
  const selected =
    filteredAudits.find((a) => a.id === selectedId) ??
    sortedAudits.find((a) => a.id === selectedId) ??
    filteredAudits[0] ??
    sortedAudits[0] ??
    null

  const showTransientLoading =
    !showDayLoading &&
    ((!isAuditActive &&
      progressError &&
      progressFetching &&
      isTransientInfraError(auditErrorMessage)) ||
      (recentLoading && !sortedAudits.length && !isAuditActive && !auditDate))

  const errorKey = `${progress?.id ?? 'run'}-${auditErrorMessage}`
  const showAuditError =
    dismissedErrorKey !== errorKey &&
    !showTransientLoading &&
    (runMut.isError ||
      (isFailed && sortedAudits.length === 0) ||
      (progressError && sortedAudits.length === 0 && !recentLoading && !progressFetching))

  useEffect(() => {
    if (!sortedAudits.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !sortedAudits.some((a) => a.id === selectedId)) {
      const first = filteredAudits[0] ?? sortedAudits[0]
      if (first) setSelectedId(first.id)
    }
  }, [sortedAudits, filteredAudits, selectedId])

  const auditDayLabel = summary?.auditDate
    ? formatAuditDateLabel(summary.auditDate)
    : auditDate
      ? formatAuditDateLabel(auditDate)
      : null
  const progressBadgeText = isFetchPhase
    ? summary?.pagesTotal
      ? `Page ${Math.min((summary.pagesProcessed ?? 0) + 1, summary.pagesTotal)}/${summary.pagesTotal}${
          summary.currentPage ? ` · ${summary.currentPage}` : ''
        }`
      : `Quét inbox ${auditDayLabel}…`
    : isAuditPhase
      ? summary?.total
        ? `${summary.processed ?? 0}/${summary.total} hội thoại`
        : `Audit ${auditCount}${summary?.total ? `/${summary.total}` : ''}`
      : isRunning
        ? runMut.isPending && !summary
          ? 'Đang khởi động…'
          : `Audit ${auditDayLabel}…`
        : ''
  const canRun = !!auditDate && !isRunning
  const canResumeAudit =
    Boolean(auditDate) && !isRunning && ((dayStats?.total ?? 0) > 0 || sortedAudits.length > 0)
  const runButtonLabel = auditDate
    ? canResumeAudit
      ? `Tiếp tục chạy ${formatAuditDateLabel(auditDate)}`
      : `Chạy ${formatAuditDateLabel(auditDate)}`
    : 'Chọn ngày'
  const transcript = useMemo(() => {
    if (!selected || !Array.isArray(selected.transcript)) return []
    return filterDisplayTranscript(
      selected.transcript as Array<{
        sender?: string
        text?: string
        timestamp?: string
        imageUrl?: string | null
        videoUrl?: string | null
        attachmentUrl?: string | null
        attachmentUrls?: string[]
        type?: string
      }>
    )
  }, [selected])

  const inboxQuery = useQuery({
    queryKey: ['cskh', 'inbox', 'conversations'],
    queryFn: () => fetchInboxConversations(),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })

  // Đồng bộ inbox nền — trì hoãn, bỏ qua khi đang audit để tránh lag UI
  useEffect(() => {
    if (isAuditActive || inboxSyncStartedRef.current) return
    inboxSyncStartedRef.current = true
    const timer = window.setTimeout(() => {
      void syncInboxFromGraph()
        .then(() => qc.invalidateQueries({ queryKey: ['cskh', 'inbox'] }))
        .catch(() => {})
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [qc, isAuditActive])

  const inboxConv = useMemo(
    () => (selected ? matchInboxConversation(selected, inboxQuery.data ?? []) : null),
    [selected, inboxQuery.data]
  )

  const selectedAdSource = useMemo(
    () => (selected ? resolveAuditFromAd(selected, inboxConv) : null),
    [selected, inboxConv]
  )

  const linkInboxMut = useMutation({
    mutationFn: (auditId: string) => linkAuditInbox(auditId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cskh', 'inbox'] })
    },
  })

  const linkAttemptRef = useRef<string | null>(null)

  useEffect(() => {
    linkAttemptRef.current = null
  }, [selected?.id])

  useEffect(() => {
    if (!selected || inboxConv) return
    const meta = selected.metadata
    if (!meta?.pageId || !(meta.participantPsid || meta.conversationId)) return
    if (linkAttemptRef.current === selected.id || linkInboxMut.isPending) return
    linkAttemptRef.current = selected.id
    linkInboxMut.mutate(selected.id)
  }, [selected, inboxConv, linkInboxMut.isPending, linkInboxMut])

  const inboxLinkPending = linkInboxMut.isPending
  const inboxLinkFailed = linkInboxMut.isError && !inboxConv

  const sidebarAdSources = useMemo(() => {
    const convs = inboxQuery.data ?? []
    return new Map(
      filteredAudits.map((row) => [
        row.id,
        resolveAuditFromAd(row, matchInboxConversation(row, convs)),
      ])
    )
  }, [filteredAudits, inboxQuery.data])

  const handleSelectAudit = useCallback((id: string) => {
    setSelectedId(id)
    setWorkspacePane('chat')
    setChatTab('chat')
  }, [])

  const selectedAuditDate = selected?.metadata?.auditDate ?? null

  const inboxLive = useCskhInboxStream({
    enabled: true,
    activeConversationId: inboxConv?.id ?? null,
    activeAuditDate: selectedAuditDate,
    onIntent: (conversationId, intent) => {
      qc.setQueryData(['cskh', 'inbox', 'intent', conversationId], intent)
    },
  })

  const intentQuery = useQuery({
    queryKey: ['cskh', 'inbox', 'intent', inboxConv?.id, selected?.id],
    queryFn: () => fetchCustomerIntent(inboxConv!.id, selected?.id),
    enabled: Boolean(inboxConv?.id),
    staleTime: 30_000,
  })

  const liveMsgQuery = useQuery({
    queryKey: ['cskh', 'inbox', 'messages', inboxConv?.id, selectedAuditDate],
    queryFn: () => {
      const convId = inboxConv!.id
      const needRefresh = refreshedConvRef.current !== convId
      if (needRefresh) refreshedConvRef.current = convId
      return fetchInboxMessages(convId, {
        refresh: needRefresh,
        limit: selectedAuditDate ? 200 : undefined,
      })
    },
    enabled: !!inboxConv?.id,
    refetchInterval: inboxLive ? false : 15_000,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })

  const sendMut = useMutation({
    mutationFn: (text: string) => sendInboxMessage(inboxConv!.id, text),
    onSuccess: () => {
      setDraft('')
      void qc.invalidateQueries({ queryKey: ['cskh', 'inbox'] })
    },
  })

  useEffect(() => {
    chatScrollSigRef.current = ''
  }, [inboxConv?.id, selected?.id])

  const liveMessages = (liveMsgQuery.data?.messages ?? []).filter(
    (msg) => !isNoiseMessageText(msg.text)
  )

  const realtimeMessages = useMemo(() => {
    const fresh = inboxConv
      ? inboxMessagesAfterTranscript(transcript, liveMessages)
      : selectedAuditDate
        ? messagesAfterAuditDate(liveMessages, selectedAuditDate)
        : liveMessages
    return groupLiveMediaMessages(fresh)
  }, [inboxConv, transcript, liveMessages, selectedAuditDate])

  const hasRealtimeTail = inboxConv && realtimeMessages.length > 0

  const selectedAuditDayLabel = selectedAuditDate ? formatAuditDateLabel(selectedAuditDate) : null

  const comparisonAuditDate = auditDate || selected?.metadata?.auditDate || summary?.auditDate || ''

  const comparisonQuery = useQuery({
    queryKey: ['cskh', 'audit-comparison', comparisonAuditDate, selected?.id],
    queryFn: () => fetchAuditComparisonStats(comparisonAuditDate, selected!.id),
    enabled: Boolean(comparisonAuditDate && selected?.id),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!inboxConv?.id || !liveMessages.length) return
    const lastCustomer = [...liveMessages].reverse().find((m) => m.senderType === 'customer')
    if (!lastCustomer) return
    void qc.invalidateQueries({ queryKey: ['cskh', 'inbox', 'intent', inboxConv.id] })
  }, [liveMessages, inboxConv?.id, qc])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const liveMsgs = liveMsgQuery.data?.messages ?? []
    const lastLive = liveMsgs[liveMsgs.length - 1]
    const sig = `${selected?.id ?? ''}|live:${lastLive?.id ?? ''}:${liveMsgs.length}|rt:${realtimeMessages.length}|audit:${transcript.length}`
    if (sig === chatScrollSigRef.current) return
    chatScrollSigRef.current = sig

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    if (!nearBottom && liveMsgs.length > 1) return

    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
    })
  }, [selected?.id, liveMsgQuery.data?.messages, realtimeMessages.length, transcript.length])

  const selectedIndex = selected
    ? Math.max(1, sortedAudits.findIndex((a) => a.id === selected.id) + 1)
    : 0

  return (
    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
      <CskhToolbar>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="audit-date">
              Ngày audit <span className="text-rose-500">*</span>
            </label>
            <div id="audit-date">
              <CskhAuditDatePicker
                value={auditDate}
                onChange={setAuditDate}
                max={vietnamTodayIso()}
                disabled={isRunning}
              />
            </div>
            {showDayLoading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang tải…
              </span>
            )}
          </div>
          {selected && sortedAudits.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
              Hội thoại #{selectedIndex}/{sortedAudits.length}
            </span>
          )}
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progressBadgeText}
            </span>
          )}
          {summary?.tokenUsage &&
            summary.tokenUsage.totalTokens != null &&
            summary.tokenUsage.totalTokens > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800">
                Token: {summary.tokenUsage.totalTokens.toLocaleString('vi-VN')}
                {summary.tokenUsage.perAuditAvg
                  ? ` (~${summary.tokenUsage.perAuditAvg.toLocaleString('vi-VN')}/hội thoại)`
                  : ''}
              </span>
            )}
          {!isRunning && sortedAudits.length > 0 && (
            <span className="text-xs font-medium text-slate-500">
              {sortedAudits.length} hội thoại ngày {auditDayLabel ?? '…'} · điểm thấp → cao
            </span>
          )}
          <CskhConnectionBadge connected={inboxLive} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canRun || runMut.isPending}
            onClick={() => runMut.mutate({ auditDate })}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200/50 hover:shadow-lg disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {runMut.isPending && !jobId
              ? 'Đang khởi động…'
              : auditDate
                ? runButtonLabel
                : 'Chọn ngày'}
          </button>
          {isRunning && (
            <>
              <button
                type="button"
                disabled={pauseMut.isPending || isPausing}
                onClick={() => pauseMut.mutate()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
              >
                {isPausing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
                {isPausing ? 'Đang dừng…' : 'Tạm dừng'}
              </button>
              <button
                type="button"
                disabled={cancelMut.isPending}
                onClick={() => cancelMut.mutate()}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Hủy
              </button>
            </>
          )}
          {(isFailed || progressError) && sortedAudits.length === 0 && (
            <button
              type="button"
              onClick={() => {
                const date = auditDate || summary?.auditDate || vietnamTodayIso()
                setJobId(null)
                storeJobId(null)
                setDismissedErrorKey(null)
                runMut.mutate({ auditDate: date, force: true })
              }}
              className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700"
            >
              Chạy lại
            </button>
          )}
        </div>
      </CskhToolbar>

      {showTransientLoading && (
        <CskhNoticeBanner
          tone="info"
          title="Đang kết nối hệ thống"
          message="Máy chủ vừa khởi động — đang tải lại dữ liệu audit, vui lòng đợi vài giây."
        />
      )}

      {showAuditError && (
        <CskhNoticeBanner
          tone="error"
          title="Không chạy được audit"
          message={auditErrorMessage}
          onDismiss={() => setDismissedErrorKey(errorKey)}
          action={
            <button
              type="button"
              onClick={() => {
                const date = auditDate || summary?.auditDate || vietnamTodayIso()
                setDismissedErrorKey(null)
                setJobId(null)
                storeJobId(null)
                runMut.mutate({ auditDate: date, force: true })
              }}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Thử chạy lại
            </button>
          }
        />
      )}

      {completionNotice && (
        <CskhNoticeBanner
          tone="success"
          message={completionNotice}
          onDismiss={() => setCompletionNotice(null)}
        />
      )}

      {showDayLoading ? (
        <CskhLoading
          label={
            auditDayLabel ? `Đang tải hội thoại ngày ${auditDayLabel}…` : 'Đang tải kết quả audit…'
          }
        />
      ) : showProgressScreen ? (
        <CskhAuditProgressPanel auditDayLabel={auditDayLabel} summary={summary} />
      ) : !sortedAudits.length ? (
        <CskhEmptyState
          icon={<ClipboardCheck className="h-12 w-12 text-violet-500" />}
          title="Chưa có dữ liệu audit"
          description="Chọn ngày ở trên và bấm Chạy audit để AI phân tích hội thoại CSKH."
        />
      ) : (
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {isAuditPhase && (
            <CskhAuditProgressBanner auditDayLabel={auditDayLabel} summary={summary} />
          )}
          {selected ? (
            <AuditSummaryHeader
              row={selected}
              index={selectedIndex}
              total={sortedAudits.length}
              inbox={inboxConv}
              comparison={comparisonQuery.data}
              allAudits={sortedAudits}
              auditDayLabel={selectedAuditDayLabel}
            />
          ) : null}
          <MessengerWorkspace
            pane={workspacePane}
            sidebar={
              <AuditConversationSidebar
                rows={sortedAudits}
                selectedId={selected?.id ?? null}
                adMap={sidebarAdSources}
                search={sidebarSearch}
                onSearchChange={setSidebarSearch}
                sourceFilter={sourceFilter}
                onSourceFilterChange={setSourceFilter}
                onSelect={handleSelectAudit}
              />
            }
            main={
              selected ? (
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  <ChatThreadHeader
                    name={displayCustomerName(selected.customerName)}
                    subtitle={`${displayPageShopLabel(selected.metadata?.pageName) || selected.metadata?.pageName || selected.channel || ''}${
                      selected.metadata?.auditDate
                        ? ` · ${formatAuditDateLabel(selected.metadata.auditDate)}`
                        : ''
                    }`}
                    pictureUrl={resolveCustomerPicture(selected, inboxConv)}
                    pageId={selected.metadata?.pageId ?? inboxConv?.pageId}
                    psid={selected.metadata?.participantPsid ?? inboxConv?.participantPsid}
                    leading={
                      <button
                        type="button"
                        onClick={() => setWorkspacePane('list')}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 xl:hidden"
                        aria-label="Danh sách hội thoại"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    }
                    badge={
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        <CskhAdSourceBadge
                          fromAd={selectedAdSource?.fromAd}
                          adTitle={selectedAdSource?.adTitle}
                        />
                        {!selectedAdSource?.fromAd ? <CskhOrganicSourceBadge show /> : null}
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreColor(selected.score)}`}
                        >
                          {selected.score}
                        </span>
                      </div>
                    }
                  />
                  <div className="flex shrink-0 gap-1 border-b border-slate-200/80 bg-white px-4">
                    {(
                      [
                        { id: 'chat' as const, label: 'Hội thoại' },
                        { id: 'timeline' as const, label: 'Timeline sự kiện' },
                        { id: 'analysis' as const, label: 'Phân tích', mobileOnly: true },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setChatTab(t.id)
                          if (t.id === 'analysis') setWorkspacePane('analysis')
                        }}
                        className={`relative px-3 py-2.5 text-xs font-semibold ${
                          'mobileOnly' in t && t.mobileOnly ? 'xl:hidden' : ''
                        } ${
                          chatTab === t.id
                            ? 'text-violet-700'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {t.label}
                        {chatTab === t.id ? (
                          <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-violet-600" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                  {chatTab === 'analysis' ? (
                    <div className="min-h-0 flex-1 overflow-hidden xl:hidden">
                      <AuditAnalysisPanel
                        row={selected}
                        inbox={inboxConv}
                        transcript={transcript}
                        auditDayLabel={selectedAuditDayLabel}
                        onUseReply={setDraft}
                        customerIntent={intentQuery.data ?? null}
                        intentLoading={intentQuery.isFetching && !intentQuery.data}
                      />
                    </div>
                  ) : null}
                  <div
                    className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
                      chatTab === 'analysis' ? 'hidden xl:flex' : ''
                    }`}
                  >
                    <div
                      ref={scrollRef}
                      className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-4 py-4"
                    >
                      {chatTab === 'timeline' ? (
                        <AuditTimelinePanel
                          transcript={transcript}
                          auditDayLabel={selectedAuditDayLabel}
                        />
                      ) : null}
                      {chatTab === 'chat' && transcript.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                            Hội thoại audit
                            {selectedAuditDayLabel ? ` · ${selectedAuditDayLabel}` : ''}
                            <span className="ml-2 font-medium normal-case text-slate-400">
                              · {transcript.length} tin
                            </span>
                          </p>
                          {transcript.map((line, idx) => (
                            <ChatBubble
                              key={`audit-${idx}`}
                              sender={line.sender}
                              text={line.text}
                              attachmentUrl={line.attachmentUrl}
                              attachmentUrls={line.attachmentUrls}
                              messageType={line.type}
                              imageUrl={line.imageUrl}
                              videoUrl={line.videoUrl}
                              time={
                                line.timestamp
                                  ? new Date(line.timestamp).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : undefined
                              }
                            />
                          ))}
                          {selectedAuditDayLabel ? (
                            <AuditScopeDivider auditDayLabel={selectedAuditDayLabel} />
                          ) : null}
                          {hasRealtimeTail ? (
                            <div className="space-y-3 pt-1">
                              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                                <CskhConnectionBadge connected={inboxLive} />
                                Tin mới · realtime
                              </p>
                              {realtimeMessages.map((msg) => (
                                <LiveBubble key={msg.id} msg={msg} />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : chatTab === 'chat' && inboxConv && realtimeMessages.length > 0 ? (
                        <div className="space-y-3">
                          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                            <CskhConnectionBadge connected={inboxLive} />
                            Hội thoại live
                          </p>
                          {realtimeMessages.map((msg) => (
                            <LiveBubble key={msg.id} msg={msg} />
                          ))}
                        </div>
                      ) : chatTab === 'chat' && !inboxConv ? (
                        <CskhEmptyState
                          icon={<MessageCircle className="h-10 w-10 text-indigo-400" />}
                          title="Không có transcript"
                          description="Chưa liên kết inbox. Chạy audit lại để lấy đầy đủ hội thoại."
                        />
                      ) : chatTab === 'chat' ? (
                        <p className="text-sm text-slate-500">
                          Không có transcript — chạy audit lại để lấy đầy đủ hội thoại.
                        </p>
                      ) : null}

                      {chatTab === 'chat' && selected && !inboxConv && transcript.length > 0 && (
                        <p
                          className={`rounded-xl border px-3 py-2 text-xs ${
                            inboxLinkPending
                              ? 'border-indigo-200 bg-indigo-50/80 text-indigo-800'
                              : inboxLinkFailed
                                ? 'border-amber-200 bg-amber-50/80 text-amber-800'
                                : 'border-amber-200 bg-amber-50/80 text-amber-800'
                          }`}
                        >
                          {inboxLinkPending
                            ? 'Đang liên kết inbox để nhắn tin trực tiếp…'
                            : inboxLinkFailed
                              ? 'Chưa liên kết inbox — audit cũ có thể thiếu PSID. Chạy audit lại để nhắn tin trực tiếp.'
                              : 'Xem transcript ở trên. Liên kết inbox để nhắn tin trực tiếp cho khách.'}
                        </p>
                      )}
                    </div>

                    {chatTab === 'chat' ? (
                      <footer className="shrink-0 border-t border-slate-200/80 bg-white p-3">
                        <form
                          className="flex items-end gap-2"
                          onSubmit={(e) => {
                            e.preventDefault()
                            const t = draft.trim()
                            if (!t || sendMut.isPending || !inboxConv) return
                            sendMut.mutate(t)
                          }}
                        >
                          <textarea
                            rows={1}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                const t = draft.trim()
                                if (t && !sendMut.isPending && inboxConv) sendMut.mutate(t)
                              }
                            }}
                            disabled={!inboxConv}
                            placeholder={
                              inboxConv
                                ? 'Nhắn tin cho khách… (Enter gửi)'
                                : inboxLinkPending
                                  ? 'Đang liên kết inbox…'
                                  : 'Liên kết inbox để gửi tin — vẫn có thể dùng gợi ý bên phải'
                            }
                            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                          <button
                            type="submit"
                            disabled={!draft.trim() || sendMut.isPending || !inboxConv}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md hover:bg-violet-700 disabled:opacity-50"
                          >
                            {sendMut.isPending ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Send className="h-5 w-5" />
                            )}
                          </button>
                        </form>
                        {sendMut.isError && (
                          <p className="mt-2 text-xs text-rose-600">
                            {getApiErrorMessage(sendMut.error)}
                          </p>
                        )}
                      </footer>
                    ) : null}
                  </div>
                </div>
              ) : (
                <CskhEmptyState
                  icon={<MessageCircle className="h-12 w-12 text-violet-500" />}
                  title="Chọn hội thoại"
                  description="Chọn khách bên trái để xem transcript và phân tích AI."
                />
              )
            }
            aside={
              selected ? (
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  <div className="flex shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white px-3 py-2 xl:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspacePane('chat')
                        setChatTab('chat')
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Hội thoại
                    </button>
                  </div>
                  <AuditAnalysisPanel
                    row={selected}
                    inbox={inboxConv}
                    transcript={transcript}
                    auditDayLabel={selectedAuditDayLabel}
                    onUseReply={setDraft}
                    customerIntent={intentQuery.data ?? null}
                    intentLoading={intentQuery.isFetching && !intentQuery.data}
                  />
                </div>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  )
}
