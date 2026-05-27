import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Download, Loader2, Maximize2, Minimize2, Send, X } from 'lucide-react'
import { AssistantRobotMascot } from './AssistantRobotMascot'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import { downloadAssistantReportDocx, postAssistantChat } from '@/features/assistant/api'
import type {
  AssistantBookingDraft,
  AssistantChatMessage,
  AssistantReportTable,
  AssistantStructuredReport,
} from '@/features/assistant/types'

function formatAssistantContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function splitTableRow(line = '') {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function InlineMarkdown({ text }: { text: string }) {
  return <>{formatAssistantContent(text)}</>
}

function renderAssistantMarkdown(text: string) {
  const lines = text.split('\n')
  const nodes: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const next = lines[i + 1] ?? ''
    const isTable =
      line.trim().startsWith('|') &&
      next.trim().startsWith('|') &&
      /\|?\s*:?-{3,}:?\s*\|/.test(next)

    if (isTable) {
      const tableLines: string[] = []
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        tableLines.push(lines[i] ?? '')
        i += 1
      }
      const [headLine, , ...bodyLines] = tableLines
      const headers = splitTableRow(headLine)
      const rows = bodyLines.map(splitTableRow).filter((row) => row.length > 0)
      nodes.push(
        <div
          key={`table-${i}`}
          className="my-3 overflow-x-auto rounded-lg border border-border bg-background"
        >
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-muted/70 text-foreground">
              <tr>
                {headers.map((h, idx) => (
                  <th
                    key={`${h}-${idx}`}
                    className="whitespace-nowrap border-b border-border px-3 py-2 font-semibold"
                  >
                    <InlineMarkdown text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={`row-${rIdx}`} className="border-b border-border/70 last:border-b-0">
                  {headers.map((_, cIdx) => (
                    <td key={`cell-${rIdx}-${cIdx}`} className="max-w-[320px] align-top px-3 py-2">
                      <InlineMarkdown text={row[cIdx] ?? ''} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    const trimmed = line.trim()
    if (trimmed.startsWith('### ')) {
      nodes.push(
        <h3 key={`h3-${i}`} className="mt-3 text-base font-semibold leading-snug">
          <InlineMarkdown text={trimmed.replace(/^###\s+/, '')} />
        </h3>
      )
    } else if (trimmed.startsWith('#### ')) {
      nodes.push(
        <h4 key={`h4-${i}`} className="mt-3 text-sm font-semibold leading-snug">
          <InlineMarkdown text={trimmed.replace(/^####\s+/, '')} />
        </h4>
      )
    } else if (trimmed === '---') {
      nodes.push(<hr key={`hr-${i}`} className="my-3 border-border" />)
    } else {
      nodes.push(
        <p key={`p-${i}`} className="whitespace-pre-wrap">
          <InlineMarkdown text={line} />
        </p>
      )
    }
    i += 1
  }

  return nodes
}

const REPORT_TABS = [
  { id: 'memberPerformance', label: 'Tổng quan' },
  { id: 'assignmentDetails', label: 'Chi tiết KPI' },
  { id: 'workReportStatus', label: 'Báo cáo tháng' },
  { id: 'trafficHonorTeams', label: 'Vinh danh team' },
  { id: 'trafficHonorIndividuals', label: 'Vinh danh cá nhân' },
  { id: 'nineSectionSummary', label: '9 mục' },
  { id: 'missingData', label: 'Thiếu dữ liệu' },
] as const

function formatFilePart(input: string) {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function ReportTable({ table }: { table: AssistantReportTable }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border px-3 py-2">
        <p className="text-sm font-semibold text-foreground">{table.title}</p>
        {table.description && <p className="text-xs text-muted-foreground">{table.description}</p>}
      </div>
      <div className="max-h-[460px] overflow-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
            <tr>
              {table.columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap border-b border-border px-3 py-2 font-semibold',
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {table.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  Chưa có dữ liệu.
                </td>
              </tr>
            ) : (
              table.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-muted/40">
                  {table.columns.map((col) => {
                    const value = row[col.key] ?? '—'
                    const isStatus = /status|reportStatus|missing|managerEval|selfEval/i.test(
                      col.key
                    )
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'max-w-[340px] align-top px-3 py-2 text-foreground',
                          col.align === 'right'
                            ? 'text-right tabular-nums'
                            : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                        )}
                      >
                        {isStatus ? (
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {String(value)}
                          </span>
                        ) : (
                          <span className="whitespace-pre-wrap">{String(value)}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AssistantStructuredReportView({ report }: { report: AssistantStructuredReport }) {
  const [active, setActive] = useState<(typeof REPORT_TABS)[number]['id']>('memberPerformance')
  const [exporting, setExporting] = useState(false)
  const visibleTabs = REPORT_TABS.filter((tab) => report.tables[tab.id])
  const table = report.tables[active] ?? report.tables[visibleTabs[0]?.id ?? 'memberPerformance']

  const exportDocx = async () => {
    try {
      setExporting(true)
      const blob = await downloadAssistantReportDocx(report)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${formatFilePart(report.title)}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">{report.title}</p>
          <p className="text-xs text-muted-foreground">
            Tháng {report.period.month}/{report.period.year} ·{' '}
            {report.teams.map((t) => t.name).join(', ')}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={exportDocx} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          DOCX
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {report.summaryCards.map((card) => (
          <div key={card.key} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition',
              active === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {table ? (
        <ReportTable table={table} />
      ) : (
        <p className="text-sm text-muted-foreground">Chưa có bảng dữ liệu.</p>
      )}
    </div>
  )
}

function readKpiPageContext() {
  try {
    const raw = window.localStorage.getItem('assistant.kpiContext')
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { teamId?: string; year?: number; month?: number }
    return {
      teamId: parsed.teamId,
      year:
        typeof parsed.year === 'number' && Number.isFinite(parsed.year) ? parsed.year : undefined,
      month:
        typeof parsed.month === 'number' && Number.isFinite(parsed.month)
          ? parsed.month
          : undefined,
    }
  } catch {
    return {}
  }
}

const SUGGESTIONS = [
  'Menu nào tôi được dùng?',
  'Lớp học của tôi là gì?',
  'Điểm thi lớp của tôi?',
  'Hướng dẫn Chia lớp (Manager)',
  'Đặt phòng tầng 5 lúc 9h sáng',
]

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [bookingDraft, setBookingDraft] = useState<AssistantBookingDraft | null>(null)
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Mình là trợ lý Talent Management. Hỏi mình về menu trên app, thi cử, lộ trình học, đặt phòng, quản lý lớp — mình trả lời theo **tên mục trên màn hình** và dữ liệu thật của bạn nhé.',
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const run = () => {
      bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
    }
    requestAnimationFrame(() => {
      run()
      requestAnimationFrame(run)
    })
  }, [])

  useEffect(() => {
    if (!open) return
    scrollToBottom(messages.length <= 2 ? 'auto' : 'smooth')
  }, [open, messages, loading, scrollToBottom])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      const userMsg: AssistantChatMessage = { role: 'user', content: trimmed }
      const history = messages.filter(
        (m) => (m.role === 'user' || m.role === 'assistant') && !m.pending
      )
      const pendingAssistant: AssistantChatMessage = {
        role: 'assistant',
        content: '',
        pending: true,
      }

      setMessages((prev) => [...prev, userMsg, pendingAssistant])
      setInput('')
      setLoading(true)
      scrollToBottom()

      try {
        const res = await postAssistantChat({
          message: trimmed,
          history: history.slice(-10),
          bookingDraft,
          pageContext: {
            path: window.location.pathname + window.location.search,
            ...readKpiPageContext(),
          },
        })
        setBookingDraft(res.bookingDraft ?? null)
        setMessages((prev) => {
          const next = [...prev]
          const pendingIdx = next.findIndex((m) => m.pending)
          const assistantMsg: AssistantChatMessage = {
            role: 'assistant',
            content: res.reply,
            sources: res.sources,
            reportDraft: res.reportDraft,
            structuredReport: res.structuredReport,
          }
          if (pendingIdx >= 0) {
            next[pendingIdx] = assistantMsg
            return next
          }
          return [...next, assistantMsg]
        })
      } catch (err) {
        toast.error(getApiErrorMessage(err))
        setMessages((prev) => {
          const next = [...prev]
          const pendingIdx = next.findIndex((m) => m.pending)
          const errMsg: AssistantChatMessage = {
            role: 'assistant',
            content: 'Đã có lỗi khi gọi trợ lý. Thử lại sau hoặc liên hệ IT.',
          }
          if (pendingIdx >= 0) {
            next[pendingIdx] = errMsg
            return next
          }
          return [...next, errMsg]
        })
      } finally {
        setLoading(false)
        scrollToBottom()
      }
    },
    [loading, messages, scrollToBottom, bookingDraft]
  )

  return (
    <>
      {!open && (
        <button
          type="button"
          className={cn(
            'fixed bottom-4 right-4 z-50 flex flex-col items-center',
            'animate-assistant-fab-float transition-transform hover:scale-[1.03] active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
          aria-label="Mở trợ lý AI HRM"
          onClick={() => setOpen(true)}
        >
          <AssistantRobotMascot />
        </button>
      )}

      {open && (
        <div
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden border border-border bg-background shadow-2xl',
            expanded
              ? 'inset-4 rounded-xl sm:inset-6'
              : 'bottom-6 right-6 h-[min(720px,calc(100vh-3rem))] w-[min(760px,calc(100vw-1.5rem))] rounded-2xl',
            'animate-assistant-panel-in'
          )}
        >
          <header className="flex items-center gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <Bot className="h-5 w-5 shrink-0 motion-safe:animate-pulse" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Trợ lý HRM</p>
              <p className="text-xs opacity-90">Hướng dẫn, đặt phòng họp & dữ liệu theo quyền</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-primary-foreground hover:bg-white/15"
              aria-label={expanded ? 'Thu nhỏ' : 'Phóng to'}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-primary-foreground hover:bg-white/15"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </header>

          <div
            ref={scrollRef}
            className={cn(
              'flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4',
              expanded ? 'sm:px-[max(24px,calc((100vw-980px)/2))]' : ''
            )}
          >
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'ml-auto max-w-[min(78%,720px)] bg-primary text-primary-foreground'
                    : 'mr-auto max-w-[min(100%,980px)] bg-background text-foreground shadow-sm ring-1 ring-border/70'
                )}
              >
                {m.pending ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang trả lời…</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">{renderAssistantMarkdown(m.content)}</div>
                    {m.structuredReport && (
                      <AssistantStructuredReportView report={m.structuredReport} />
                    )}
                    {m.reportDraft && !m.structuredReport && (
                      <div className="mt-2 rounded-lg border border-border bg-background/60 p-2 text-[11px] text-muted-foreground">
                        Draft báo cáo {m.reportDraft.teamName} T{m.reportDraft.month}/
                        {m.reportDraft.year} từ {m.reportDraft.memberReportCount} báo cáo member.
                        {m.reportDraft.warnings.length > 0 && (
                          <div className="mt-1">
                            Có {m.reportDraft.warnings.length} cảnh báo khi đọc file upload.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
          </div>

          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground hover:bg-muted"
                  onClick={() => void send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className={cn(
              'flex gap-2 border-t border-border bg-background p-3',
              expanded ? 'sm:px-[max(24px,calc((100vw-980px)/2))]' : ''
            )}
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi về HRM…"
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loading}
              maxLength={4000}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
