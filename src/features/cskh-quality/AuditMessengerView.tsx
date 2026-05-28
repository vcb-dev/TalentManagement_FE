import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { isTransientInfraError, toUserFacingError } from '@/lib/userFacingError'
import {
  Loader2,
  Pause,
  Play,
  MessageCircle,
  ClipboardCheck,
  Send,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react'
import {
  cancelAuditJob,
  fetchCskhPages,
  pauseAuditJob,
  fetchAuditDayStats,
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
  type CskhAuditRow,
  type CskhAuditProgress,
  type CskhCustomerIntent,
  type CskhInboxConversation,
  type CskhInboxMessage,
} from './api'
import {
  displayCustomerName,
  displayPageShopLabel,
  formatAuditRangeLabel,
  auditRowMatchesScoreRange,
  resolveAuditScopeFromRow,
  messagesAfterAuditRange,
  resolveAuditFromAd,
  filterDisplayTranscript,
  inboxMessagesAfterTranscript,
  groupLiveMediaMessages,
  dedupeMediaUrls,
  isNoiseMessageText,
  scoreColor,
  vietnamTodayIso,
} from './auditHelpers'
import { cskhMediaProxySrc, cskhMediaSrc, resolveMessageMedia } from './messageMedia'
import { sortAuditsByCreatedDesc } from './auditDashboardHelpers'
import {
  AuditAnalysisPanel,
  AuditConversationSidebar,
  AuditTimelinePanel,
  AuditWorkspaceKpiBar,
  type AuditSidebarSort,
} from './AuditDashboardPanels'
import {
  ChatThreadHeader,
  CskhAdSourceBadge,
  CskhOrganicSourceBadge,
  CskhAuditDateRangePickers,
  CskhAuditFieldLabel,
  cskhAuditToolbarControlClass,
  CskhEmptyState,
  CskhLoading,
  CskhNoticeBanner,
  CskhToolbar,
  MessengerWorkspace,
  auditProgressPercent,
  type MessengerWorkspacePane,
} from './cskhUi'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCskhInboxStream } from './useCskhInboxStream'

const AUDIT_JOB_KEY = 'cskh:audit-job-id'
const AUDIT_INTENT_CACHE_KEY = 'cskh:audit-intent-cache:v1'
/** ID toast tiến độ chấm điểm — dùng lại cho mọi cập nhật để không spam toast. */
const AUDIT_TOAST_ID = 'cskh-audit-progress'

function loadIntentCache(): Record<string, CskhCustomerIntent> {
  try {
    if (typeof sessionStorage === 'undefined') return {}
    const raw = sessionStorage.getItem(AUDIT_INTENT_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CskhCustomerIntent>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveIntentCache(cache: Record<string, CskhCustomerIntent>) {
  try {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem(AUDIT_INTENT_CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* ignore */
  }
}

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
        ▼ Hết phạm vi chấm điểm · {auditDayLabel}
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
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
          isStaff
            ? 'rounded-br-md bg-gradient-to-br from-[#0084FF] to-indigo-600 text-white shadow-blue-200/40'
            : 'rounded-bl-md border border-slate-200/90 bg-white text-slate-800 shadow-slate-200/50'
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
  onAuditJobActiveChange,
}: {
  onAuditJobActiveChange?: (active: boolean) => void
}) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [auditDateFrom, setAuditDateFrom] = useState('')
  const [auditDateTo, setAuditDateTo] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [listFilter, setListFilter] = useState<'all' | 'low' | 'ad'>('all')
  const [sidebarSort, setSidebarSort] = useState<AuditSidebarSort>('newest')
  const [selectedPageId, setSelectedPageId] = useState('')
  /** Số cuộc chấm mới mỗi lần chạy (để trống = không giới hạn). */
  const [batchLimitInput, setBatchLimitInput] = useState('')
  const [chatTab, setChatTab] = useState<'chat' | 'timeline' | 'analysis'>('chat')
  const [workspacePane, setWorkspacePane] = useState<MessengerWorkspacePane>('list')
  const [intentByAuditId, setIntentByAuditId] = useState<Record<string, CskhCustomerIntent>>(() =>
    loadIntentCache()
  )
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string | null>(null)
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chatScrollSigRef = useRef('')
  const refreshedConvRef = useRef<string | null>(null)
  const stableAuditsRef = useRef<CskhAuditRow[]>([])
  const filtersRef = useRef({ auditDateFrom: '', auditDateTo: '', selectedPageId: '' })
  const prevFiltersRef = useRef({ from: '', to: '', page: '' })
  const qc = useQueryClient()
  const selectedPageFilter = selectedPageId || undefined
  const filtersReady = Boolean(auditDateFrom && auditDateTo && selectedPageId)
  const scoreRangeLabel = formatAuditRangeLabel(auditDateFrom, auditDateTo)
  const parsedBatchLimit = useMemo(() => {
    const n = Number.parseInt(batchLimitInput.trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }, [batchLimitInput])

  useEffect(() => {
    filtersRef.current = { auditDateFrom, auditDateTo, selectedPageId }
  }, [auditDateFrom, auditDateTo, selectedPageId])

  useEffect(() => {
    void (async () => {
      try {
        const running = await fetchRunningCskhJob('audit')
        if (running?.status === 'running' && running.id !== jobId) {
          setBackgroundJobId(running.id)
        } else {
          setBackgroundJobId(null)
        }
      } catch {
        setBackgroundJobId(null)
      }
    })()
  }, [jobId])

  const runMut = useMutation({
    mutationFn: (opts: {
      auditDateFrom: string
      auditDateTo: string
      pageId: string
      maxConversations?: number
      force?: boolean
    }) =>
      runAudit({
        auditDateFrom: opts.auditDateFrom,
        auditDateTo: opts.auditDateTo,
        pageId: opts.pageId,
        maxConversations: opts.maxConversations,
        force: opts.force,
      }),
    onMutate: async (vars) => {
      setDismissedErrorKey(null)
      await qc.cancelQueries({
        queryKey: ['cskh', 'audits', 'by-range', vars.auditDateFrom, vars.auditDateTo],
      })
    },
    onSuccess: (res, vars) => {
      const cur = filtersRef.current
      if (
        vars.auditDateFrom !== cur.auditDateFrom ||
        vars.auditDateTo !== cur.auditDateTo ||
        vars.pageId !== cur.selectedPageId
      ) {
        void fetchRunningCskhJob('audit').then((running) => {
          if (running?.status === 'running' && running.id === res.jobId) {
            setBackgroundJobId(res.jobId)
          }
        })
        return
      }
      const cached =
        qc.getQueryData<CskhAuditRow[]>([
          'cskh',
          'audits',
          'by-range',
          vars.auditDateFrom,
          vars.auditDateTo,
          selectedPageId,
        ]) ?? stableAuditsRef.current
      setJobId(res.jobId)
      storeJobId(res.jobId)
      qc.setQueryData<CskhAuditProgress>(['cskh', 'audit-progress', res.jobId], {
        id: res.jobId,
        status: 'running',
        startedAt: new Date().toISOString(),
        summary: {
          phase: 'fetch',
          auditDate: vars.auditDateFrom,
          auditDateFrom: vars.auditDateFrom,
          auditDateTo: vars.auditDateTo,
          fetched: cached.length,
          scanned: 0,
          pagesProcessed: 0,
          pagesTotal: 0,
        },
        audits: cached,
      })
    },
    onError: () => {
      toast.dismiss(AUDIT_TOAST_ID)
    },
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelAuditJob(),
    onMutate: () => {
      const detachedJobId = jobId
      setJobId(null)
      storeJobId(null)
      toast.dismiss(AUDIT_TOAST_ID)
      runMut.reset()
      if (detachedJobId) {
        qc.removeQueries({ queryKey: ['cskh', 'audit-progress', detachedJobId] })
      }
      return { detachedJobId }
    },
    onSuccess: (res) => {
      setBackgroundJobId(null)
      if (res.cancelled > 0) {
        toast.info('Đã hủy tiến trình chấm điểm', { duration: 4000 })
      } else {
        toast.info('Không còn tiến trình đang chạy', { duration: 3000 })
      }
      void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-day-stats'] })
    },
    onError: (err, _vars, ctx) => {
      toast.error(getApiErrorMessage(err) || 'Không hủy được tiến trình')
      if (ctx?.detachedJobId) {
        void fetchRunningCskhJob('audit').then((running) => {
          if (running?.status === 'running' && running.id === ctx.detachedJobId) {
            setBackgroundJobId(running.id)
          }
        })
      }
    },
  })

  const pauseMut = useMutation({
    mutationFn: () => pauseAuditJob(),
    onSuccess: (res) => {
      if (!res.paused) return
      if (jobId) {
        void qc.invalidateQueries({ queryKey: ['cskh', 'audit-progress', jobId] })
      }
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

  const prevProgressStatusRef = useRef<string | null>(null)

  useEffect(() => {
    if (!progress || progress.status === 'running') return

    const persistAuditsForRange = (from?: string, to?: string) => {
      const rangeFrom = from || progress.summary?.auditDateFrom || progress.summary?.auditDate
      const rangeTo =
        to || progress.summary?.auditDateTo || progress.summary?.auditDateFrom || rangeFrom
      if (!rangeFrom || !rangeTo || !progress.audits?.length) return
      const incoming = progress.audits.filter(
        (a) =>
          auditRowMatchesScoreRange(a, rangeFrom, rangeTo) &&
          (!selectedPageFilter || a.metadata?.pageId === selectedPageFilter)
      )
      if (!incoming.length) return
      const cacheKey = ['cskh', 'audits', 'by-range', rangeFrom, rangeTo, selectedPageId] as const
      const prev = qc.getQueryData<CskhAuditRow[]>(cacheKey) ?? []
      const merged = new Map<string, CskhAuditRow>()
      for (const row of prev) merged.set(row.id, row)
      for (const row of incoming) merged.set(row.id, row)
      qc.setQueryData(cacheKey, sortAuditsByCreatedDesc([...merged.values()]))
    }

    if (progress.status === 'done') {
      const count = progress.summary?.auditCount ?? progress.audits?.length ?? 0
      const rangeFrom = progress.summary?.auditDateFrom || progress.summary?.auditDate
      const rangeTo = progress.summary?.auditDateTo || rangeFrom
      const rangeLabel = rangeFrom ? ` (${formatAuditRangeLabel(rangeFrom, rangeTo)})` : ''
      if (progress.summary?.allAlreadyAudited) {
        toast.info(
          `Đã chấm hết ${progress.summary.skippedAlready ?? count} hội thoại${rangeLabel} — không còn hội thoại mới.`,
          { id: AUDIT_TOAST_ID, duration: 7000 }
        )
      } else if (progress.summary?.paused || progress.summary?.partial) {
        const remaining = progress.summary.remaining
        toast.info(
          `Tạm dừng — đã chấm ${count} hội thoại${rangeLabel}${
            remaining ? ` · còn ~${remaining} trong batch này` : ''
          }. Bấm «Tiếp tục quét và chấm điểm» cùng khoảng ngày để quét nốt.`,
          { id: AUDIT_TOAST_ID, duration: 9000 }
        )
      } else if (count > 0) {
        toast.success(`Hoàn tất ${count} hội thoại${rangeLabel}`, {
          id: AUDIT_TOAST_ID,
          duration: 6000,
        })
      } else {
        toast.dismiss(AUDIT_TOAST_ID)
      }
      persistAuditsForRange(rangeFrom, rangeTo)
      setJobId(null)
      storeJobId(null)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-day-stats'] })
      return
    }

    if (progress.status === 'failed') {
      toast.dismiss(AUDIT_TOAST_ID)
    }

    const savedCount = progress.summary?.auditCount ?? progress.audits?.length ?? 0
    if (savedCount > 0) {
      persistAuditsForRange(
        progress.summary?.auditDateFrom || progress.summary?.auditDate,
        progress.summary?.auditDateTo
      )
      setJobId(null)
      storeJobId(null)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-day-stats'] })
    }
  }, [progress, qc, selectedPageFilter, selectedPageId, setJobId])

  useEffect(() => {
    if (!progressError || !jobId || progressFetching) return
    if (progressFailureCount < 4 && isTransientInfraError(getApiErrorMessage(progressErr))) return
    setJobId(null)
    storeJobId(null)
    toast.dismiss(AUDIT_TOAST_ID)
    void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
    void qc.invalidateQueries({ queryKey: ['cskh', 'audit-day-stats'] })
  }, [progressError, progressErr, progressFetching, progressFailureCount, jobId, qc, setJobId])

  useEffect(() => {
    if (!jobId || progress?.status !== 'running') return
    const from = progress.summary?.auditDateFrom || progress.summary?.auditDate
    const to = progress.summary?.auditDateTo || from
    if (from) setAuditDateFrom(from)
    if (to) setAuditDateTo(to)
  }, [
    jobId,
    progress?.status,
    progress?.summary?.auditDateFrom,
    progress?.summary?.auditDateTo,
    progress?.summary?.auditDate,
  ])

  const { data: pagesData } = useQuery({
    queryKey: ['cskh', 'pages'],
    queryFn: fetchCskhPages,
    staleTime: 60_000,
  })

  useEffect(() => {
    const prev = prevFiltersRef.current
    const filtersChanged =
      prev.from !== auditDateFrom || prev.to !== auditDateTo || prev.page !== selectedPageId
    prevFiltersRef.current = {
      from: auditDateFrom,
      to: auditDateTo,
      page: selectedPageId,
    }

    stableAuditsRef.current = []
    setSelectedId(null)
    setSidebarSearch('')
    setListFilter('all')
    setChatTab('chat')

    if (filtersChanged) {
      setJobId((current) => {
        if (current) {
          storeJobId(null)
          toast.dismiss(AUDIT_TOAST_ID)
          qc.removeQueries({ queryKey: ['cskh', 'audit-progress', current] })
        }
        return null
      })
      runMut.reset()
      void fetchRunningCskhJob('audit').then((running) => {
        setBackgroundJobId(running?.status === 'running' ? running.id : null)
      })
    }
  }, [auditDateFrom, auditDateTo, selectedPageId, qc])

  const summary = progress?.summary
  const isAuditActive =
    runMut.isPending ||
    (!!jobId &&
      progress?.status !== 'failed' &&
      progress?.status !== 'done' &&
      (progress?.status === 'running' || progress === undefined))
  const isRunning = isAuditActive

  const {
    data: dayStats,
    isLoading: dayStatsLoading,
    isFetching: dayStatsFetching,
  } = useQuery({
    queryKey: ['cskh', 'audit-day-stats', auditDateFrom, auditDateTo, selectedPageId],
    queryFn: () => fetchAuditDayStats(auditDateFrom, auditDateTo, selectedPageFilter!),
    enabled: filtersReady,
    staleTime: 15_000,
  })

  const auditExistsForSelection = (dayStats?.total ?? 0) > 0
  const checkingAudit =
    filtersReady && !isRunning && (dayStatsLoading || dayStatsFetching) && dayStats === undefined

  const {
    data: recentAudits,
    isLoading: recentLoading,
    isFetching: recentFetching,
  } = useQuery({
    queryKey: ['cskh', 'audits', 'by-range', auditDateFrom, auditDateTo, selectedPageId],
    queryFn: () =>
      fetchCskhAudits({
        auditDateFrom,
        auditDateTo,
        pageId: selectedPageFilter,
        limit: 2000,
      }),
    enabled: filtersReady && (auditExistsForSelection || isRunning),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: cskhQueryRetry,
    retryDelay: cskhQueryRetryDelay,
  })

  useEffect(() => {
    onAuditJobActiveChange?.(isRunning)
  }, [isRunning, onAuditJobActiveChange])
  const isPausing = Boolean(summary?.pauseRequested) || pauseMut.isPending
  const isFailed = progress?.status === 'failed'
  const auditErrorMessage =
    toUserFacingError(
      progress?.error ||
        (progressErr ? getApiErrorMessage(progressErr) : '') ||
        (runMut.error ? getApiErrorMessage(runMut.error) : '')
    ) || 'Không thể quét và chấm điểm. Vui lòng thử lại sau.'
  const isFetchPhase = isAuditActive && summary?.phase !== 'audit'
  const isAuditPhase = isAuditActive && summary?.phase === 'audit'

  const dayAuditsReady =
    filtersReady &&
    !recentLoading &&
    !recentFetching &&
    recentAudits !== undefined &&
    recentAudits.every((a) => auditRowMatchesScoreRange(a, auditDateFrom, auditDateTo))

  const showDayLoading =
    filtersReady && auditExistsForSelection && !isAuditActive && !dayAuditsReady

  const displayAudits = useMemo(() => {
    if (showDayLoading) return []
    const filterDay = (rows: CskhAuditRow[]) =>
      rows.filter(
        (a) =>
          (!auditDateFrom ||
            !auditDateTo ||
            auditRowMatchesScoreRange(a, auditDateFrom, auditDateTo)) &&
          (!selectedPageFilter || a.metadata?.pageId === selectedPageFilter)
      )
    const fromProgress = jobId && progress?.audits?.length ? filterDay(progress.audits) : []
    const fromRecent = recentAudits?.length ? filterDay(recentAudits) : []

    if (isAuditActive && jobId) {
      const merged = new Map<string, CskhAuditRow>()
      for (const row of fromRecent) merged.set(row.id, row)
      for (const row of fromProgress) merged.set(row.id, row)
      return sortAuditsByCreatedDesc(filterDay([...merged.values()]))
    }

    if (fromRecent.length) return sortAuditsByCreatedDesc(fromRecent)
    if (fromProgress.length) return sortAuditsByCreatedDesc(fromProgress)
    return []
  }, [
    auditDateFrom,
    auditDateTo,
    isAuditActive,
    jobId,
    progress?.audits,
    recentAudits,
    selectedPageFilter,
    showDayLoading,
  ])

  useEffect(() => {
    if (displayAudits.length) stableAuditsRef.current = displayAudits
  }, [displayAudits])

  const sortedAudits = useMemo(() => sortAuditsByCreatedDesc(displayAudits), [displayAudits])
  const pageOptions = useMemo(() => {
    const pages = pagesData?.pages ?? []
    return pages
      .filter((p) => p.enabled)
      .sort((a, b) => (a.pageName || a.pageId).localeCompare(b.pageName || b.pageId, 'vi'))
  }, [pagesData?.pages])
  const selectedPageLabel =
    pageOptions.find((p) => p.pageId === selectedPageId)?.pageName || selectedPageId || 'Page'
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
      (recentLoading && !sortedAudits.length && !isAuditActive && !filtersReady))

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

  useEffect(() => {
    const prev = prevProgressStatusRef.current
    const status = progress?.status ?? null
    prevProgressStatusRef.current = status
    const justPaused =
      prev === 'running' &&
      status === 'done' &&
      Boolean(progress?.summary?.paused || progress?.summary?.partial)
    if (!justPaused || !sortedAudits.length) return
    setSelectedId(sortedAudits[0]!.id)
    setWorkspacePane('list')
  }, [progress?.status, progress?.summary?.paused, progress?.summary?.partial, sortedAudits])

  const auditDayLabel =
    summary?.auditDateFrom || summary?.auditDate
      ? formatAuditRangeLabel(
          summary.auditDateFrom || summary.auditDate || '',
          summary.auditDateTo || summary.auditDateFrom || summary.auditDate
        )
      : auditDateFrom && auditDateTo
        ? scoreRangeLabel
        : null
  const auditPercent = useMemo(() => auditProgressPercent(summary), [summary])

  useEffect(() => {
    if (!isRunning) return
    const pagesTotal = summary?.pagesTotal ?? 0
    const pagesDone = summary?.pagesProcessed ?? 0
    const auditTotal = summary?.total ?? 0
    const auditProcessed = summary?.processed ?? 0
    const phaseLabel = summary?.pauseRequested
      ? 'Đang tạm dừng'
      : isFetchPhase
        ? 'Đang quét inbox'
        : isAuditPhase
          ? 'AI đang chấm điểm'
          : 'Đang khởi động'
    const detail = summary?.pauseRequested
      ? 'Chờ chấm xong hội thoại đang xử lý…'
      : isFetchPhase
        ? pagesTotal > 0
          ? `Page ${Math.min(pagesDone + 1, pagesTotal)}/${pagesTotal}${
              summary?.currentPage ? ` · ${summary.currentPage}` : ''
            }${summary?.fetched != null ? ` · ${summary.fetched.toLocaleString('vi-VN')} hội thoại` : ''}`
          : 'Đang kết nối Facebook…'
        : isAuditPhase
          ? auditTotal > 0
            ? `${auditProcessed}/${auditTotal} hội thoại${
                summary?.currentCustomer ? ` · ${summary.currentCustomer}` : ''
              }`
            : 'Đang chuẩn bị chấm điểm…'
          : runMut.isPending
            ? 'Hệ thống đang khởi động batch chấm điểm…'
            : ''
    const titleSuffix = auditDayLabel ? ` · ${auditDayLabel}` : ''

    toast.loading(
      <div className="flex w-full min-w-[260px] flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-800">
            {phaseLabel}
            {titleSuffix}
          </span>
          <span className="text-xs font-bold tabular-nums text-violet-700">{auditPercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${Math.max(auditPercent, 4)}%` }}
          />
        </div>
        {detail ? <p className="text-xs leading-snug text-slate-600">{detail}</p> : null}
      </div>,
      { id: AUDIT_TOAST_ID, duration: Infinity }
    )
  }, [
    isRunning,
    isFetchPhase,
    isAuditPhase,
    summary,
    auditDayLabel,
    auditPercent,
    runMut.isPending,
  ])

  useEffect(() => {
    return () => {
      toast.dismiss(AUDIT_TOAST_ID)
    }
  }, [])

  const alreadyScoredCount = dayStats?.total ?? sortedAudits.length
  const canRun =
    filtersReady &&
    !isRunning &&
    (!batchLimitInput.trim() || (parsedBatchLimit != null && parsedBatchLimit > 0))
  const canResumeAudit = filtersReady && !isRunning && alreadyScoredCount > 0
  const runButtonLabel =
    auditDateFrom && auditDateTo
      ? batchLimitInput.trim() && !parsedBatchLimit
        ? 'Nhập số cuộc hợp lệ'
        : canResumeAudit
          ? parsedBatchLimit
            ? `Chấm thêm ${parsedBatchLimit} cuộc (${alreadyScoredCount} đã chấm)`
            : `Tiếp tục chấm điểm ${scoreRangeLabel}`
          : parsedBatchLimit
            ? `Quét và chấm ${parsedBatchLimit} cuộc · ${scoreRangeLabel}`
            : `Quét và chấm điểm ${scoreRangeLabel}`
      : 'Chọn khoảng ngày'
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
    queryKey: ['cskh', 'inbox', 'conversations', selectedPageId],
    queryFn: () => fetchInboxConversations(selectedPageFilter!),
    enabled: filtersReady && (auditExistsForSelection || isRunning),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })

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

  const selectedAuditScope = useMemo(
    () => resolveAuditScopeFromRow(selected, auditDateFrom, auditDateTo),
    [selected, auditDateFrom, auditDateTo]
  )
  const selectedAuditScopeLabel = selectedAuditScope?.label ?? null
  const selectedIntentCache = selected?.id ? (intentByAuditId[selected.id] ?? null) : null

  const inboxLive = useCskhInboxStream({
    enabled: true,
    activeConversationId: inboxConv?.id ?? null,
    activeAuditDate: selectedAuditScope?.from ?? null,
    onIntent: (conversationId, intent) => {
      qc.setQueryData(['cskh', 'inbox', 'intent', conversationId], intent)
    },
  })

  const intentQuery = useQuery({
    queryKey: ['cskh', 'inbox', 'intent', inboxConv?.id, selected?.id],
    queryFn: () => fetchCustomerIntent(inboxConv!.id, selected?.id),
    enabled: Boolean(inboxConv?.id && selected?.id && !selectedIntentCache),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const resolvedIntent = selectedIntentCache ?? intentQuery.data ?? null

  useEffect(() => {
    const aid = selected?.id
    const intent = intentQuery.data
    if (!aid || !intent) return
    setIntentByAuditId((prev) => {
      if (prev[aid]) return prev
      const next = { ...prev, [aid]: intent }
      saveIntentCache(next)
      return next
    })
  }, [selected?.id, intentQuery.data])

  const liveMsgQuery = useQuery({
    queryKey: [
      'cskh',
      'inbox',
      'messages',
      inboxConv?.id,
      selectedAuditScope?.from,
      selectedAuditScope?.to,
    ],
    queryFn: () => {
      const convId = inboxConv!.id
      const needRefresh = refreshedConvRef.current !== convId
      if (needRefresh) refreshedConvRef.current = convId
      return fetchInboxMessages(convId, {
        refresh: needRefresh,
        limit: selectedAuditScope ? 200 : undefined,
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
      : selectedAuditScope
        ? messagesAfterAuditRange(liveMessages, selectedAuditScope.from, selectedAuditScope.to)
        : liveMessages
    return groupLiveMediaMessages(fresh)
  }, [inboxConv, transcript, liveMessages, selectedAuditScope])

  const hasRealtimeTail = inboxConv && realtimeMessages.length > 0

  // Không invalidate intent liên tục theo polling tin nhắn,
  // tránh trạng thái "Đang phân tích..." lặp dù đã có kết quả audit.

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

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <CskhToolbar>
        <div className="flex w-full min-w-0 flex-col gap-2.5">
          <div className="grid w-full min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:gap-x-4">
            <div className="flex min-w-0 flex-col">
              <CskhAuditFieldLabel required>Khoảng ngày</CskhAuditFieldLabel>
              <CskhAuditDateRangePickers
                compact
                balanced
                from={auditDateFrom}
                to={auditDateTo}
                onFromChange={setAuditDateFrom}
                onToChange={setAuditDateTo}
                max={vietnamTodayIso()}
                disabled={isRunning}
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <div className="mb-1 flex h-4 items-center justify-between gap-2">
                <CskhAuditFieldLabel required htmlFor="audit-page-filter" className="!mb-0">
                  Kênh
                </CskhAuditFieldLabel>
                {selectedPageId && alreadyScoredCount > 0 && !isRunning && (
                  <span
                    className="shrink-0 text-[10px] font-semibold text-slate-500"
                    title={`Trong ${scoreRangeLabel}`}
                  >
                    Đã chấm {alreadyScoredCount.toLocaleString('vi-VN')}
                  </span>
                )}
              </div>
              <Select
                value={selectedPageId || undefined}
                onValueChange={(v) => setSelectedPageId(v)}
              >
                <SelectTrigger
                  id="audit-page-filter"
                  className={cn(
                    cskhAuditToolbarControlClass,
                    '!h-9 !min-h-9 border-slate-200 !bg-white py-0 pl-2.5 pr-8',
                    '!border hover:!bg-white focus:ring-1 focus:ring-indigo-200',
                    '[&>span]:line-clamp-1 [&>span]:truncate'
                  )}
                  aria-label="Chọn kênh"
                >
                  <SelectValue placeholder="Chọn kênh" />
                </SelectTrigger>
                <SelectContent>
                  {pageOptions.map((p) => (
                    <SelectItem key={p.pageId} value={p.pageId}>
                      {p.pageName || p.pageId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col">
              <CskhAuditFieldLabel
                htmlFor="audit-batch-limit"
                hint="Chỉ chấm cuộc chưa có điểm trong khoảng ngày. Đã 200, nhập 100 → chấm thêm 100."
              >
                <span className="inline-flex items-center gap-0.5">
                  Giới hạn
                  <HelpCircle className="h-3 w-3 text-slate-400" aria-hidden />
                </span>
              </CskhAuditFieldLabel>
              <input
                id="audit-batch-limit"
                type="number"
                min={1}
                step={1}
                placeholder="Tất cả"
                value={batchLimitInput}
                onChange={(e) => setBatchLimitInput(e.target.value)}
                disabled={isRunning}
                title="Để trống = chấm hết cuộc chưa chấm. Nhập số = chỉ chấm thêm N cuộc (bỏ qua đã chấm)."
                className={cn(cskhAuditToolbarControlClass, 'px-2.5 placeholder:text-slate-400')}
              />
            </div>

            <div className="flex h-9 shrink-0 flex-wrap items-center justify-end gap-2 sm:col-span-3 md:col-span-1 md:col-auto">
              {(showDayLoading || checkingAudit) && (
                <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 text-xs font-medium text-indigo-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {checkingAudit ? 'Kiểm tra…' : 'Tải…'}
                </span>
              )}
              <button
                type="button"
                disabled={!canRun || runMut.isPending}
                onClick={() =>
                  runMut.mutate({
                    auditDateFrom,
                    auditDateTo,
                    pageId: selectedPageId,
                    maxConversations: parsedBatchLimit,
                  })
                }
                className="inline-flex h-9 min-h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-violet-200/40 hover:shadow-lg disabled:opacity-50"
              >
                {isRunning || runMut.isPending ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 shrink-0" />
                )}
                <span className="max-w-[14rem] truncate sm:max-w-[18rem]">
                  {runMut.isPending && !jobId
                    ? 'Khởi động…'
                    : !auditDateFrom || !auditDateTo
                      ? 'Chọn ngày'
                      : !selectedPageId
                        ? 'Chọn kênh'
                        : runButtonLabel}
                </span>
              </button>
              {isRunning && (
                <>
                  {isFetchPhase && (
                    <button
                      type="button"
                      disabled={pauseMut.isPending || isPausing || cancelMut.isPending}
                      onClick={() => pauseMut.mutate()}
                      className="inline-flex h-9 min-h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                    >
                      {isPausing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                      {isPausing ? 'Dừng…' : 'Tạm dừng'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={cancelMut.isPending}
                    onClick={() => cancelMut.mutate()}
                    className="inline-flex h-9 min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                  >
                    {cancelMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {cancelMut.isPending ? 'Đang hủy…' : 'Hủy'}
                  </button>
                </>
              )}
              {(isFailed || progressError) && sortedAudits.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const from =
                      auditDateFrom ||
                      summary?.auditDateFrom ||
                      summary?.auditDate ||
                      vietnamTodayIso()
                    const to = auditDateTo || summary?.auditDateTo || from
                    setJobId(null)
                    storeJobId(null)
                    setDismissedErrorKey(null)
                    if (selectedPageId) {
                      runMut.mutate({
                        auditDateFrom: from,
                        auditDateTo: to,
                        pageId: selectedPageId,
                        maxConversations: parsedBatchLimit,
                        force: true,
                      })
                    }
                  }}
                  className="inline-flex h-9 min-h-9 items-center rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                >
                  Chạy lại
                </button>
              )}
            </div>
          </div>
        </div>
      </CskhToolbar>

      {showTransientLoading && (
        <CskhNoticeBanner
          tone="info"
          title="Đang kết nối hệ thống"
          message="Máy chủ vừa khởi động — đang tải lại dữ liệu chấm điểm, vui lòng đợi vài giây."
        />
      )}

      {showAuditError && (
        <CskhNoticeBanner
          tone="error"
          title="Không chạy được chấm điểm"
          message={auditErrorMessage}
          onDismiss={() => setDismissedErrorKey(errorKey)}
          action={
            <button
              type="button"
              onClick={() => {
                const from =
                  auditDateFrom || summary?.auditDateFrom || summary?.auditDate || vietnamTodayIso()
                const to = auditDateTo || summary?.auditDateTo || from
                setDismissedErrorKey(null)
                setJobId(null)
                storeJobId(null)
                if (selectedPageId) {
                  runMut.mutate({
                    auditDateFrom: from,
                    auditDateTo: to,
                    pageId: selectedPageId,
                    maxConversations: parsedBatchLimit,
                    force: true,
                  })
                }
              }}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Thử chạy lại
            </button>
          }
        />
      )}

      {backgroundJobId && !jobId && !isRunning && (
        <CskhNoticeBanner
          tone="info"
          title="Có tiến trình chấm điểm đang chạy"
          message="Hệ thống đang chấm điểm từ lần trước. Bấm theo dõi để xem tiến độ — không tự chạy batch mới."
          action={
            <button
              type="button"
              onClick={() => {
                setJobId(backgroundJobId)
                storeJobId(backgroundJobId)
                setBackgroundJobId(null)
              }}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Theo dõi tiến độ
            </button>
          }
          onDismiss={() => setBackgroundJobId(null)}
        />
      )}

      {showDayLoading ? (
        <CskhLoading
          label={
            auditDayLabel ? `Đang tải hội thoại ${auditDayLabel}…` : 'Đang tải kết quả chấm điểm…'
          }
        />
      ) : !auditDateFrom || !auditDateTo ? (
        <CskhEmptyState
          icon={<ClipboardCheck className="h-12 w-12 text-violet-500" />}
          title="Chọn khoảng ngày"
          description="Chọn từ ngày → đến ngày và Page Facebook — hệ thống chỉ hiển thị kết quả khi Page đó đã được quét và chấm điểm trong khoảng đó."
        />
      ) : !selectedPageId ? (
        <CskhEmptyState
          icon={<ClipboardCheck className="h-12 w-12 text-violet-500" />}
          title="Chọn Page"
          description={`Chọn Page cần xem chất lượng CSKH (${scoreRangeLabel}).`}
        />
      ) : checkingAudit ? (
        <CskhLoading label="Đang kiểm tra dữ liệu chấm điểm…" />
      ) : isRunning && !sortedAudits.length ? (
        <CskhEmptyState
          icon={<Loader2 className="h-12 w-12 animate-spin text-violet-500" />}
          title={
            isFetchPhase
              ? auditDayLabel
                ? `Đang quét inbox · ${auditDayLabel}`
                : 'Đang quét inbox…'
              : 'Đang chấm điểm…'
          }
          description={
            isFetchPhase
              ? 'Đang lấy hội thoại từ Facebook — tiến độ chi tiết ở thông báo góc trên. Danh sách và kết quả chấm điểm sẽ hiện ở đây sau khi quét xong.'
              : 'Tiến độ chi tiết hiển thị ở thông báo góc trên. Kết quả sẽ xuất hiện ở đây khi có hội thoại đầu tiên.'
          }
        />
      ) : !auditExistsForSelection && !isRunning && !sortedAudits.length ? (
        <CskhEmptyState
          icon={<ClipboardCheck className="h-12 w-12 text-violet-500" />}
          title="Chưa có chấm điểm"
          description={`Page «${selectedPageLabel}» chưa được quét và chấm điểm trong khoảng ${scoreRangeLabel}. Bấm «${runButtonLabel}» — chỉ quét Page này.`}
        />
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AuditWorkspaceKpiBar
            selectedRow={selected}
            dayRows={sortedAudits}
            loading={showDayLoading}
          />
          <MessengerWorkspace
            layout="audit"
            pane={workspacePane}
            sidebar={
              <AuditConversationSidebar
                rows={sortedAudits}
                selectedId={selected?.id ?? null}
                adMap={sidebarAdSources}
                search={sidebarSearch}
                onSearchChange={setSidebarSearch}
                listFilter={listFilter}
                onListFilterChange={setListFilter}
                sortOrder={sidebarSort}
                onSortOrderChange={setSidebarSort}
                onSelect={handleSelectAudit}
              />
            }
            main={
              selected ? (
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-slate-50/40 to-white">
                  <ChatThreadHeader
                    name={displayCustomerName(selected.customerName)}
                    subtitle={`${displayPageShopLabel(selected.metadata?.pageName) || selected.metadata?.pageName || selected.channel || ''}${
                      selectedAuditScopeLabel ? ` · ${selectedAuditScopeLabel}` : ''
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
                  <div className="grid shrink-0 grid-cols-3 gap-1.5 border-b border-slate-200/60 bg-white/90 px-3 py-2 backdrop-blur-sm xl:hidden">
                    {(
                      [
                        { id: 'chat' as const, label: 'Hội thoại' },
                        { id: 'timeline' as const, label: 'Timeline' },
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
                        className={cn(
                          'rounded-xl px-2 py-2.5 text-center text-[11px] font-semibold leading-tight transition-all sm:text-xs',
                          'mobileOnly' in t && t.mobileOnly ? 'xl:hidden' : '',
                          chatTab === t.id
                            ? 'bg-violet-600 text-white shadow-md shadow-violet-200/50'
                            : 'text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {chatTab === 'analysis' ? (
                    <div className="min-h-0 flex-1 overflow-hidden xl:hidden">
                      <AuditAnalysisPanel
                        row={selected}
                        inbox={inboxConv}
                        transcript={transcript}
                        auditDayLabel={selectedAuditScopeLabel}
                        onUseReply={setDraft}
                        customerIntent={resolvedIntent}
                        intentLoading={
                          Boolean(inboxConv?.id) && intentQuery.isLoading && !resolvedIntent
                        }
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
                      className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain bg-[#e8ecf1] px-4 py-4"
                    >
                      {chatTab === 'timeline' ? (
                        <AuditTimelinePanel
                          transcript={transcript}
                          auditDayLabel={selectedAuditScopeLabel}
                        />
                      ) : null}
                      {chatTab === 'chat' && transcript.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                            Hội thoại audit
                            {selectedAuditScopeLabel ? ` · ${selectedAuditScopeLabel}` : ''}
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
                          {selectedAuditScopeLabel ? (
                            <AuditScopeDivider auditDayLabel={selectedAuditScopeLabel} />
                          ) : null}
                          {hasRealtimeTail ? (
                            <div className="space-y-3 pt-1">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                                Tin mới
                              </p>
                              {realtimeMessages.map((msg) => (
                                <LiveBubble key={msg.id} msg={msg} />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : chatTab === 'chat' && inboxConv && realtimeMessages.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                            Tin mới
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
                    auditDayLabel={selectedAuditScopeLabel}
                    onUseReply={setDraft}
                    customerIntent={resolvedIntent}
                    intentLoading={
                      Boolean(inboxConv?.id) && intentQuery.isLoading && !resolvedIntent
                    }
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
