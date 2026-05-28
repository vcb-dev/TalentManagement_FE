import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Bot, Loader2, Send, X } from 'lucide-react'
import { AssistantRobotMascot } from './AssistantRobotMascot'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import { postAssistantChat } from '@/features/assistant/api'
import type { AssistantBookingDraft, AssistantChatMessage } from '@/features/assistant/types'

function formatAssistantContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
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
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [bookingDraft, setBookingDraft] = useState<AssistantBookingDraft | null>(null)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isCskhPage = pathname.startsWith('/cskh-quality')

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
        })
        setBookingDraft(res.bookingDraft ?? null)
        setMessages((prev) => {
          const next = [...prev]
          const pendingIdx = next.findIndex((m) => m.pending)
          const assistantMsg: AssistantChatMessage = {
            role: 'assistant',
            content: res.reply,
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
            'fixed z-50 flex flex-col items-center',
            isCskhPage ? 'bottom-3 right-3' : 'bottom-4 right-4',
            'animate-assistant-fab-float transition-transform hover:scale-[1.03] active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
          aria-label="Mở trợ lý AI HRM"
          onClick={() => setOpen(true)}
        >
          <AssistantRobotMascot compact={isCskhPage} />
        </button>
      )}

      {open && (
        <div
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden',
            isCskhPage
              ? 'bottom-3 right-3 h-[min(460px,calc(100vh-1.25rem))] w-[min(340px,calc(100vw-1rem))]'
              : 'bottom-6 right-6 h-[min(520px,calc(100vh-3rem))] w-[min(400px,calc(100vw-1.5rem))]',
            'rounded-2xl border border-border bg-background shadow-2xl',
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
              aria-label="Đóng"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn(
                  'max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'mr-auto bg-muted text-foreground'
                )}
              >
                {m.pending ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang trả lời…</span>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{formatAssistantContent(m.content)}</p>
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
            className="flex gap-2 border-t border-border p-3"
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
