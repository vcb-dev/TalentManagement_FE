import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/axios'
import { isTransientInfraError, toUserFacingError } from '@/lib/userFacingError'
import {
  Loader2,
  Play,
  Sparkles,
  MessageCircle,
  Copy,
  Check,
  ClipboardCheck,
  Calendar,
  Send,
  Search,
} from 'lucide-react'
import {
  cancelAuditJob,
  fetchAuditProgress,
  fetchCskhAudits,
  fetchInboxConversations,
  fetchInboxMessages,
  fetchRunningCskhJob,
  linkAuditInbox,
  resolveInboxMessageMedia,
  runAudit,
  sendInboxMessage,
  syncInboxFromGraph,
  type CskhAuditRow,
  type CskhInboxConversation,
  type CskhInboxMessage,
} from './api'
import {
  displayChannelName,
  displayCustomerName,
  displayPageShopLabel,
  formatAuditDateLabel,
  lastMessagePreview,
  parseBulletLines,
  parseAuditActionItems,
  filterDisplayTranscript,
  messagesAfterAuditDate,
  isNoiseMessageText,
  scoreColor,
  vietnamTodayIso,
} from './auditHelpers'
import { cskhMediaProxySrc, cskhMediaSrc, resolveMessageMedia } from './messageMedia'
import {
  ChatThreadHeader,
  CskhPageAvatar,
  CskhAuditProgressBanner,
  CskhAuditProgressPanel,
  CskhConnectionBadge,
  CskhEmptyState,
  CskhLoading,
  CskhNoticeBanner,
  CskhToolbar,
  MessengerSidebarHeader,
  MessengerWorkspace,
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

function MessageBubbleContent({
  messageId,
  text,
  attachmentUrl,
  messageType,
  isStaff,
}: {
  messageId?: string
  text?: string | null
  attachmentUrl?: string | null
  messageType?: string | null
  isStaff?: boolean
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [useMediaProxy, setUseMediaProxy] = useState(false)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(attachmentUrl ?? null)
  const [resolvedType, setResolvedType] = useState<string | null>(messageType ?? null)
  const [resolvedText, setResolvedText] = useState<string | null | undefined>(text)
  const [resolving, setResolving] = useState(false)
  const resolveAttempted = useRef(false)

  useEffect(() => {
    setResolvedUrl(attachmentUrl ?? null)
    setResolvedType(messageType ?? null)
    setResolvedText(text)
    setImageFailed(false)
    setVideoFailed(false)
    setUseMediaProxy(false)
    resolveAttempted.current = false
  }, [messageId, attachmentUrl, messageType, text])

  const media = resolveMessageMedia({
    text: resolvedText,
    attachmentUrl: resolvedUrl,
    messageType: resolvedType,
  })
  const needsResolve =
    Boolean(messageId) &&
    !resolvedUrl &&
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
        if (row.attachmentUrl) setResolvedUrl(row.attachmentUrl)
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

  const mediaSrc = media.attachmentUrl
    ? useMediaProxy
      ? cskhMediaProxySrc(media.attachmentUrl)
      : cskhMediaSrc(media.attachmentUrl)
    : undefined
  const showImage = media.messageType === 'image' && mediaSrc && !imageFailed
  const showVideo = media.messageType === 'video' && mediaSrc && !videoFailed

  const onImageError = () => {
    if (!useMediaProxy && media.attachmentUrl) {
      setUseMediaProxy(true)
      return
    }
    setImageFailed(true)
  }

  const onVideoError = () => {
    if (!useMediaProxy && media.attachmentUrl) {
      setUseMediaProxy(true)
      return
    }
    setVideoFailed(true)
  }

  return (
    <div className="space-y-2">
      {showImage ? (
        <a href={media.attachmentUrl!} target="_blank" rel="noreferrer" className="block">
          <img
            src={mediaSrc}
            alt=""
            referrerPolicy="no-referrer"
            className="max-h-64 max-w-full rounded-xl object-cover"
            onError={onImageError}
          />
        </a>
      ) : null}
      {showVideo ? (
        <video
          src={mediaSrc}
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
      {!showImage && !showVideo && !media.displayText ? (
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

function LiveBubble({ msg }: { msg: CskhInboxMessage }) {
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
  messageType,
  imageUrl,
  videoUrl,
}: {
  sender?: string
  text?: string
  time?: string
  attachmentUrl?: string | null
  messageType?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
}) {
  if (isNoiseMessageText(text)) return null
  const isStaff = sender === 'Staff'
  const resolvedUrl = attachmentUrl ?? imageUrl ?? videoUrl ?? null
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

function CopyReplyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      title="Sao chép"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

function SuggestedReplyBox({
  text,
  onUseReply,
}: {
  text: string
  onUseReply?: (text: string) => void
}) {
  if (!text.trim()) return null
  return (
    <div className="group mt-2 rounded-lg border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/80 p-2.5">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        Gợi ý trả lời
      </p>
      <div className="flex items-start gap-2">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-slate-800">{text}</p>
        {onUseReply ? (
          <button
            type="button"
            title="Dùng gợi ý"
            onClick={() => onUseReply(text)}
            className="shrink-0 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white"
          >
            Dùng
          </button>
        ) : null}
        <CopyReplyButton text={text} />
      </div>
    </div>
  )
}

function AiAnalysisPanel({
  row,
  onUseReply,
}: {
  row: CskhAuditRow
  onUseReply?: (text: string) => void
}) {
  const meta = row.metadata
  const feedbackLines = parseBulletLines(row.feedback)
  const actionItems = parseAuditActionItems(row)
  const itemsWithReply = actionItems.filter((item) => item.suggestedReply.trim())
  const itemsWithoutReply = actionItems.filter((item) => !item.suggestedReply.trim())

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-indigo-100/60 bg-gradient-to-r from-violet-50/80 to-fuchsia-50/50 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-bold text-violet-800">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Phân tích AI
          </h4>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-sm font-bold ${scoreColor(row.score)}`}
          >
            {row.score}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Kênh: {displayChannelName(row)}
          {meta?.staffAbsent && (
            <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
              chưa rep
            </span>
          )}
          {meta?.needsFollowUp && !meta?.staffAbsent && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
              chưa rep hết
            </span>
          )}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nhận xét</p>
          {feedbackLines.length ? (
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {feedbackLines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400">+</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{row.feedback || 'Chưa có nhận xét.'}</p>
          )}
        </section>

        {itemsWithReply.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
              Vi phạm &amp; cách sửa
            </p>
            <ul className="mt-2 space-y-3">
              {itemsWithReply.map((item, i) => (
                <li key={i} className="rounded-xl border border-rose-100/80 bg-white p-3 shadow-sm">
                  <div className="flex gap-2 text-sm text-rose-800">
                    <span className="shrink-0 font-bold text-rose-400">{i + 1}.</span>
                    <span className="font-medium leading-relaxed">{item.issue}</span>
                  </div>
                  <SuggestedReplyBox text={item.suggestedReply} onUseReply={onUseReply} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {itemsWithoutReply.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Vi phạm</p>
            <ul className="mt-2 space-y-2 text-sm text-rose-700">
              {itemsWithoutReply.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-bold text-rose-400">+</span>
                  <span>{item.issue}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Chưa có gợi ý gắn từng mục — chạy lại audit sau khi deploy AI mới.
            </p>
          </section>
        )}

        {!itemsWithReply.length && !itemsWithoutReply.length && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Gợi ý trả lời
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Chưa có mục vi phạm kèm gợi ý — chạy lại audit sau khi deploy AI service mới.
            </p>
          </section>
        )}
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
  const [completionNotice, setCompletionNotice] = useState<string | null>(null)
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chatScrollSigRef = useRef('')
  const refreshedConvRef = useRef<string | null>(null)
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
    onSuccess: (res) => {
      setJobId(res.jobId)
      storeJobId(res.jobId)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-progress', res.jobId] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-token-stats'] })
    },
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelAuditJob(),
    onSuccess: () => {
      setJobId(null)
      storeJobId(null)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-progress'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
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
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1000 : false),
    retry: cskhQueryRetry,
    retryDelay: cskhQueryRetryDelay,
  })

  const progressFinished = progress?.status === 'done' || progress?.status === 'failed'

  useEffect(() => {
    if (!progress || progress.status === 'running') return

    if (progress.status === 'done') {
      const count = progress.summary?.auditCount ?? progress.audits?.length ?? 0
      const day = progress.summary?.auditDate
      if (count > 0) {
        setCompletionNotice(
          `Hoàn tất ${count} hội thoại${day ? ` ngày ${formatAuditDateLabel(day)}` : ''}`
        )
      }
      setJobId(null)
      storeJobId(null)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-token-stats'] })
      void qc.invalidateQueries({ queryKey: ['cskh', 'deepseek-balance'] })
      return
    }

    const savedCount = progress.summary?.auditCount ?? progress.audits?.length ?? 0
    if (savedCount > 0) {
      setJobId(null)
      storeJobId(null)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
    }
  }, [progress, qc, setJobId])

  useEffect(() => {
    if (!progressError || !jobId || progressFetching) return
    if (progressFailureCount < 4 && isTransientInfraError(getApiErrorMessage(progressErr))) return
    setJobId(null)
    storeJobId(null)
    void qc.invalidateQueries({ queryKey: ['cskh', 'audits'] })
  }, [progressError, progressErr, progressFetching, progressFailureCount, jobId, qc, setJobId])

  useEffect(() => {
    if (progress?.summary?.auditDate) setAuditDate(progress.summary.auditDate)
  }, [progress?.summary?.auditDate])

  const { data: recentAudits, isLoading: recentLoading } = useQuery({
    queryKey: ['cskh', 'audits', 'recent'],
    queryFn: () => fetchCskhAudits({ limit: 200 }),
    enabled: !jobId || progressFinished,
    retry: cskhQueryRetry,
    retryDelay: cskhQueryRetryDelay,
  })

  useEffect(() => {
    if (auditDate || recentLoading) return
    const latest = recentAudits?.find((a) => a.metadata?.auditDate)?.metadata?.auditDate
    setAuditDate(latest ?? vietnamTodayIso())
  }, [auditDate, recentAudits, recentLoading])

  const isRunning = runMut.isPending || progress?.status === 'running'
  const isFailed = progress?.status === 'failed'
  const auditErrorMessage =
    toUserFacingError(
      progress?.error ||
        (progressErr ? getApiErrorMessage(progressErr) : '') ||
        (runMut.error ? getApiErrorMessage(runMut.error) : '')
    ) || 'Không thể chạy audit. Vui lòng thử lại sau.'
  const summary = progress?.summary
  const auditCount = summary?.auditCount ?? progress?.audits?.length ?? 0
  const isFetchPhase = isRunning && summary?.phase === 'fetch'
  const isAuditPhase = isRunning && summary?.phase === 'audit'
  const displayAudits =
    jobId && !progressFinished ? (progress?.audits ?? []) : (recentAudits ?? progress?.audits ?? [])
  const sortedAudits = [...displayAudits].sort((a, b) => a.score - b.score)
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
    (progressError && progressFetching && isTransientInfraError(auditErrorMessage)) ||
    (recentLoading && !sortedAudits.length && !isRunning)

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
        ? `Audit ${auditDayLabel}…`
        : ''
  const canRun = !!auditDate && !isRunning
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
        type?: string
      }>
    )
  }, [selected])

  const inboxLive = useCskhInboxStream(true)

  const inboxQuery = useQuery({
    queryKey: ['cskh', 'inbox', 'conversations'],
    queryFn: () => fetchInboxConversations(),
    refetchInterval: inboxLive ? false : 20_000,
    refetchOnWindowFocus: false,
  })

  // Đồng bộ inbox nền — trì hoãn để không chen lấn lúc trang vừa load
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void syncInboxFromGraph()
        .then(() => qc.invalidateQueries({ queryKey: ['cskh', 'inbox'] }))
        .catch(() => {})
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [qc])

  const inboxConv = useMemo(
    () => (selected ? matchInboxConversation(selected, inboxQuery.data ?? []) : null),
    [selected, inboxQuery.data]
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

  const selectedAuditDate = selected?.metadata?.auditDate ?? null

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
    refetchInterval: inboxLive ? false : 12_000,
    staleTime: 8_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
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

  const postAuditLiveMessages = useMemo(() => {
    if (!selectedAuditDate) return liveMessages
    return messagesAfterAuditDate(liveMessages, selectedAuditDate)
  }, [liveMessages, selectedAuditDate])

  const selectedAuditDayLabel = selectedAuditDate ? formatAuditDateLabel(selectedAuditDate) : null

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const liveMsgs = liveMsgQuery.data?.messages ?? []
    const lastLive = liveMsgs[liveMsgs.length - 1]
    const sig = `${selected?.id ?? ''}|live:${lastLive?.id ?? ''}:${liveMsgs.length}|audit:${transcript.length}`
    if (sig === chatScrollSigRef.current) return
    chatScrollSigRef.current = sig

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    if (!nearBottom && liveMsgs.length > 1) return

    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
    })
  }, [selected?.id, liveMsgQuery.data?.messages, transcript.length])

  return (
    <div className="space-y-0">
      <CskhToolbar>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-500" />
            <label className="text-sm font-medium text-slate-700" htmlFor="audit-date">
              Ngày audit <span className="text-rose-500">*</span>
            </label>
            <input
              id="audit-date"
              type="date"
              value={auditDate}
              max={vietnamTodayIso()}
              disabled={isRunning}
              onChange={(e) => setAuditDate(e.target.value)}
              className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
            />
          </div>
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
              {sortedAudits.length} hội thoại · điểm thấp → cao
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
            {auditDate ? `Chạy ${formatAuditDateLabel(auditDate)}` : 'Chọn ngày'}
          </button>
          {isRunning && (
            <button
              type="button"
              disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate()}
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
              Hủy
            </button>
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

      {recentLoading && !sortedAudits.length && !isRunning && !showTransientLoading ? (
        <CskhLoading label="Đang tải kết quả audit…" />
      ) : isRunning && !sortedAudits.length ? (
        <CskhAuditProgressPanel auditDayLabel={auditDayLabel} summary={summary} />
      ) : !sortedAudits.length ? (
        <CskhEmptyState
          icon={<ClipboardCheck className="h-12 w-12 text-violet-500" />}
          title="Chưa có dữ liệu audit"
          description="Chọn ngày ở trên và bấm Chạy audit để AI phân tích hội thoại CSKH."
        />
      ) : (
        <>
          {isRunning && <CskhAuditProgressBanner auditDayLabel={auditDayLabel} summary={summary} />}
          <MessengerWorkspace
            sidebar={
              <>
                <MessengerSidebarHeader
                  title={`Hội thoại (${sortedAudits.length})`}
                  search={
                    sortedAudits.length > 8 ? (
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={sidebarSearch}
                          onChange={(e) => setSidebarSearch(e.target.value)}
                          placeholder="Tìm khách, page, nhân viên…"
                          className="w-full rounded-xl border border-indigo-100 bg-white py-2 pl-9 pr-3 text-xs shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    ) : undefined
                  }
                />
                <ul className="flex-1 overflow-y-auto">
                  {filteredAudits.length === 0 && sidebarSearch.trim() ? (
                    <li className="px-4 py-8 text-center text-sm text-slate-500">
                      Không tìm thấy &quot;{sidebarSearch.trim()}&quot;
                    </li>
                  ) : null}
                  {filteredAudits.map((row) => {
                    const active = row.id === selected?.id
                    const meta = row.metadata
                    const name = displayCustomerName(row.customerName)
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(row.id)}
                          className={`w-full px-4 py-3.5 text-left transition-all ${
                            active
                              ? 'bg-white shadow-[inset_3px_0_0_0_#7c3aed] ring-1 ring-violet-100'
                              : 'border-b border-slate-100/60 hover:bg-white/80'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <CskhPageAvatar
                              name={name}
                              pictureUrl={
                                row.customerPictureUrl ?? row.metadata?.customerPictureUrl
                              }
                              pageId={meta?.pageId}
                              psid={meta?.participantPsid}
                              className="h-9 w-9 rounded-xl text-xs"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {name}
                                </p>
                                <span
                                  className={`shrink-0 rounded-full border px-1.5 py-0.5 text-xs font-bold ${scoreColor(row.score)}`}
                                >
                                  {row.score}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-indigo-500/80">
                                {displayPageShopLabel(meta?.pageName) || meta?.pageName || '—'}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {lastMessagePreview(row)}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            }
            main={
              selected ? (
                <>
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
                    badge={
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreColor(selected.score)}`}
                      >
                        {selected.score}
                      </span>
                    }
                  />
                  <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    {transcript.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                          Hội thoại audit
                          {selectedAuditDayLabel ? ` · ${selectedAuditDayLabel}` : ''}
                          <span className="ml-2 font-medium normal-case text-slate-400">
                            · {transcript.length} tin (đầu hội thoại → hết ngày audit)
                          </span>
                        </p>
                        {transcript.map((line, idx) => (
                          <ChatBubble
                            key={`audit-${idx}`}
                            sender={line.sender}
                            text={line.text}
                            attachmentUrl={line.attachmentUrl}
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
                      </div>
                    ) : !inboxConv ? (
                      <CskhEmptyState
                        icon={<MessageCircle className="h-10 w-10 text-indigo-400" />}
                        title="Không có transcript"
                        description="Chưa liên kết inbox. Chạy audit lại để lấy đầy đủ hội thoại."
                      />
                    ) : (
                      <p className="text-sm text-slate-500">
                        Không có transcript — chạy audit lại để lấy đầy đủ hội thoại.
                      </p>
                    )}

                    {inboxConv && postAuditLiveMessages.length > 0 ? (
                      <div className="space-y-3 border-t border-slate-200/80 pt-4">
                        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                          <CskhConnectionBadge connected={inboxLive} />
                          Tin sau ngày audit (chat live)
                        </p>
                        {postAuditLiveMessages.map((msg) => (
                          <LiveBubble key={msg.id} msg={msg} />
                        ))}
                      </div>
                    ) : null}

                    {selected && !inboxConv && transcript.length > 0 && (
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

                  <footer className="border-t border-white/60 bg-white/90 p-3 backdrop-blur-md">
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
                        className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                      <button
                        type="submit"
                        disabled={!draft.trim() || sendMut.isPending || !inboxConv}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg disabled:opacity-50"
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
                </>
              ) : (
                <CskhEmptyState
                  icon={<MessageCircle className="h-12 w-12 text-violet-500" />}
                  title="Chọn hội thoại"
                  description="Chọn khách bên trái để xem transcript và phân tích AI."
                />
              )
            }
            aside={selected ? <AiAnalysisPanel row={selected} onUseReply={setDraft} /> : undefined}
          />

          {selected && sortedAudits.length > 0 && (
            <div className="border-t border-indigo-100/60 lg:hidden">
              <AiAnalysisPanel row={selected} onUseReply={setDraft} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
