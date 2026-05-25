import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import {
  cancelAuditJob,
  fetchAuditProgress,
  fetchCskhAudits,
  fetchInboxConversations,
  fetchInboxMessages,
  fetchRunningCskhJob,
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
  parseSuggestedReplies,
  scoreColor,
  vietnamTodayIso,
} from './auditHelpers'
import {
  ChatThreadHeader,
  CskhPageAvatar,
  CskhEmptyState,
  CskhLoading,
  CskhToolbar,
  MessengerSidebarHeader,
  MessengerWorkspace,
} from './cskhUi'
import { useCskhInboxStream } from './useCskhInboxStream'

const AUDIT_JOB_KEY = 'cskh:audit-job-id'

function storeJobId(jobId: string | null) {
  try {
    if (jobId) sessionStorage.setItem(AUDIT_JOB_KEY, jobId)
    else sessionStorage.removeItem(AUDIT_JOB_KEY)
  } catch {
    /* ignore */
  }
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
  if (row.customerName) {
    const name = displayCustomerName(row.customerName)
    return (
      pageConvs.find((c) => c.customerName && displayCustomerName(c.customerName) === name) ?? null
    )
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

function LiveBubble({ msg }: { msg: CskhInboxMessage }) {
  const isStaff = msg.direction === 'outbound' || msg.senderType === 'staff'
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
          isStaff
            ? 'rounded-br-md bg-gradient-to-br from-[#0084FF] to-indigo-600 text-white'
            : 'rounded-bl-md border border-white/70 bg-white/95 text-slate-800'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        <p className={`mt-1 text-[10px] ${isStaff ? 'text-blue-100' : 'text-slate-400'}`}>
          {new Date(msg.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          {msg.status === 'pending' && ' · đang gửi'}
          {msg.status === 'failed' && ' · thất bại'}
        </p>
      </div>
    </motion.div>
  )
}

function ChatBubble({ sender, text, time }: { sender?: string; text?: string; time?: string }) {
  const isStaff = sender === 'Staff'
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
          isStaff
            ? 'rounded-br-md bg-gradient-to-br from-[#0084FF] to-indigo-600 text-white'
            : 'rounded-bl-md border border-white/70 bg-white/95 text-slate-800 backdrop-blur-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{text || '—'}</p>
        {time ? (
          <p className={`mt-1 text-[10px] ${isStaff ? 'text-blue-100' : 'text-slate-400'}`}>
            {time}
          </p>
        ) : null}
      </div>
    </motion.div>
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

function AiAnalysisPanel({
  row,
  onUseReply,
}: {
  row: CskhAuditRow
  onUseReply?: (text: string) => void
}) {
  const meta = row.metadata
  const feedbackLines = parseBulletLines(row.feedback)
  const suggestions = parseSuggestedReplies(row)
  const violations = parseBulletLines(typeof meta?.violations === 'string' ? meta.violations : null)

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

        {violations.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Vi phạm</p>
            <ul className="mt-2 space-y-1 text-sm text-rose-700">
              {violations.map((v, i) => (
                <li key={i}>• {v}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Gợi ý trả lời
          </p>
          {suggestions.length ? (
            <ul className="mt-2 space-y-2">
              {suggestions.map((reply, i) => (
                <li
                  key={i}
                  className="group flex items-start gap-2 rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 p-3 text-sm text-slate-800 shadow-sm"
                >
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="min-w-0 flex-1 whitespace-pre-wrap">{reply}</p>
                  {onUseReply ? (
                    <button
                      type="button"
                      title="Dùng gợi ý"
                      onClick={() => onUseReply(reply)}
                      className="shrink-0 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Dùng
                    </button>
                  ) : null}
                  <CopyReplyButton text={reply} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Chưa có gợi ý — chạy audit mới sau khi cập nhật AI service.
            </p>
          )}
        </section>
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
  const scrollRef = useRef<HTMLDivElement>(null)
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
      storeJobId(res.jobId)
      void qc.invalidateQueries({ queryKey: ['cskh', 'audit-progress', res.jobId] })
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
  } = useQuery({
    queryKey: ['cskh', 'audit-progress', jobId],
    queryFn: () => fetchAuditProgress(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1000 : false),
  })

  useEffect(() => {
    if (progress?.summary?.auditDate) setAuditDate(progress.summary.auditDate)
  }, [progress?.summary?.auditDate])

  const { data: recentAudits, isLoading: recentLoading } = useQuery({
    queryKey: ['cskh', 'audits', 'recent'],
    queryFn: () => fetchCskhAudits({ limit: 200 }),
    enabled: !jobId,
  })

  const isRunning = runMut.isPending || progress?.status === 'running'
  const isFailed = progress?.status === 'failed'
  const isDone = progress?.status === 'done'
  const summary = progress?.summary
  const auditCount = summary?.auditCount ?? progress?.audits?.length ?? 0
  const isFetchPhase = isRunning && summary?.phase === 'fetch'
  const displayAudits = jobId ? (progress?.audits ?? []) : (recentAudits ?? [])
  const sortedAudits = [...displayAudits].sort((a, b) => a.score - b.score)
  const selected = sortedAudits.find((a) => a.id === selectedId) ?? sortedAudits[0] ?? null

  useEffect(() => {
    if (!sortedAudits.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !sortedAudits.some((a) => a.id === selectedId)) {
      const first = sortedAudits[0]
      if (first) setSelectedId(first.id)
    }
  }, [sortedAudits, selectedId])

  const auditDayLabel = summary?.auditDate
    ? formatAuditDateLabel(summary.auditDate)
    : auditDate
      ? formatAuditDateLabel(auditDate)
      : null
  const canRun = !!auditDate && !isRunning
  const transcript = selected && Array.isArray(selected.transcript) ? selected.transcript : []

  const inboxLive = useCskhInboxStream(true)

  const inboxQuery = useQuery({
    queryKey: ['cskh', 'inbox', 'conversations'],
    queryFn: () => fetchInboxConversations(),
    refetchInterval: inboxLive ? 8000 : 2500,
  })

  // Đồng bộ nền lần đầu (link hội thoại cũ) — không cần bấm nút
  useEffect(() => {
    void syncInboxFromGraph().then(() => {
      void qc.invalidateQueries({ queryKey: ['cskh', 'inbox'] })
    })
  }, [qc])

  const inboxConv = useMemo(
    () => (selected ? matchInboxConversation(selected, inboxQuery.data ?? []) : null),
    [selected, inboxQuery.data]
  )

  const liveMsgQuery = useQuery({
    queryKey: ['cskh', 'inbox', 'messages', inboxConv?.id],
    queryFn: () => fetchInboxMessages(inboxConv!.id),
    enabled: !!inboxConv?.id,
    refetchInterval: inboxLive ? 5000 : 1500,
  })

  const sendMut = useMutation({
    mutationFn: (text: string) => sendInboxMessage(inboxConv!.id, text),
    onSuccess: () => {
      setDraft('')
      void qc.invalidateQueries({ queryKey: ['cskh', 'inbox'] })
    },
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [transcript.length, liveMsgQuery.data?.messages.length, selected?.id])

  const liveMessages = liveMsgQuery.data?.messages ?? []

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
              {isFetchPhase
                ? `Quét inbox ${auditDayLabel}…`
                : `Audit ${auditCount}${summary?.total ? `/${summary.total}` : ''}`}
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
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              inboxLive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {inboxLive && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  inboxLive ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
            </span>
            {inboxLive ? 'Realtime' : 'Đang kết nối…'}
          </span>
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
          {(isFailed || progressError) && (
            <button
              type="button"
              onClick={() => {
                const date = auditDate || summary?.auditDate || vietnamTodayIso()
                setJobId(null)
                storeJobId(null)
                runMut.mutate({ auditDate: date, force: true })
              }}
              className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700"
            >
              Chạy lại
            </button>
          )}
        </div>
      </CskhToolbar>

      {(isFailed || progressError) && (
        <p className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-5">
          {progress?.error || (progressErr as Error)?.message || 'Audit thất bại'}
        </p>
      )}

      {isDone && auditCount > 0 && (
        <p className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 sm:mx-5">
          Hoàn tất {auditCount} hội thoại ngày {auditDayLabel}
        </p>
      )}

      {recentLoading && !sortedAudits.length ? (
        <CskhLoading label="Đang tải kết quả audit…" />
      ) : !sortedAudits.length ? (
        <CskhEmptyState
          icon={<ClipboardCheck className="h-12 w-12 text-violet-500" />}
          title={isRunning ? 'Đang audit…' : 'Chưa có dữ liệu audit'}
          description={
            isRunning
              ? `Đang quét & audit ngày ${auditDayLabel ?? '…'} — vui lòng đợi.`
              : 'Chọn ngày ở trên và bấm Chạy audit để AI phân tích hội thoại CSKH.'
          }
        />
      ) : (
        <>
          <MessengerWorkspace
            sidebar={
              <>
                <MessengerSidebarHeader title={`Hội thoại (${sortedAudits.length})`} />
                <ul className="flex-1 overflow-y-auto">
                  {sortedAudits.map((row) => {
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
                    avatarLetter={(
                      displayCustomerName(selected.customerName).charAt(0) || '?'
                    ).toUpperCase()}
                    pictureUrl={resolveCustomerPicture(selected, inboxConv)}
                    badge={
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreColor(selected.score)}`}
                      >
                        {selected.score}
                      </span>
                    }
                  />
                  <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    {inboxConv && (
                      <div className="space-y-3">
                        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                          <span className="relative flex h-2 w-2">
                            {inboxLive && (
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            )}
                            <span
                              className={`relative inline-flex h-2 w-2 rounded-full ${
                                inboxLive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                          </span>
                          {inboxLive ? 'Chat live · Realtime' : 'Chat live · đang kết nối'}
                        </p>
                        {liveMsgQuery.isLoading && liveMessages.length === 0 ? (
                          <p className="text-sm text-slate-500">Đang tải tin nhắn…</p>
                        ) : liveMessages.length > 0 ? (
                          liveMessages.map((msg) => <LiveBubble key={msg.id} msg={msg} />)
                        ) : (
                          <p className="text-sm text-slate-500">
                            Chưa có tin nhắn. Khách nhắn trên Facebook sẽ hiện ở đây ngay.
                          </p>
                        )}
                      </div>
                    )}

                    {transcript.length > 0 && (
                      <details className="space-y-3 border-t border-indigo-100/80 pt-4">
                        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Transcript ngày audit
                          {selected.metadata?.auditDate
                            ? ` · ${formatAuditDateLabel(selected.metadata.auditDate)}`
                            : ''}
                        </summary>
                        <div className="space-y-3 pt-2">
                          {transcript.map((line, idx) => (
                            <ChatBubble
                              key={`audit-${idx}`}
                              sender={line.sender}
                              text={line.text}
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
                        </div>
                      </details>
                    )}

                    {!transcript.length && !inboxConv && (
                      <CskhEmptyState
                        icon={<MessageCircle className="h-10 w-10 text-indigo-400" />}
                        title="Không có tin nhắn"
                        description="Chưa liên kết hội thoại Messenger. Hệ thống đang đồng bộ nền — thử chọn hội thoại khác hoặc chạy audit lại."
                      />
                    )}

                    {selected && !inboxConv && (
                      <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
                        Chưa liên kết inbox — hệ thống tự đồng bộ nền. Chạy audit mới để gắn PSID
                        chính xác hơn.
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
                          inboxConv ? 'Nhắn tin cho khách… (Enter gửi)' : 'Đang liên kết inbox…'
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
                        {(sendMut.error as Error).message}
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
