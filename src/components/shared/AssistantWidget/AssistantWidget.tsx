import { useCallback, useEffect, useRef, useState } from 'react'
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
  'Đăng nhập hệ thống như thế nào?',
  'Phân tích bài Được việc của tôi',
  'Đặt phòng tầng 5 lúc 9h sáng',
  'Điểm thi lớp của tôi?',
]

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [bookingDraft, setBookingDraft] = useState<AssistantBookingDraft | null>(null)
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Mình là trợ lý Talent Management. Hỏi mình về đăng nhập, thi, lộ trình học, menu theo quyền — mình chỉ hỗ trợ trong phạm vi HRM nhé.',
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
      const history = messages.filter((m) => m.role === 'user' || m.role === 'assistant')
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setLoading(true)
      scrollToBottom()

      try {
        const res = await postAssistantChat({
          message: trimmed,
          history: history.slice(-16),
          bookingDraft,
        })
        setBookingDraft(res.bookingDraft ?? null)
        setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
      } catch (err) {
        toast.error(getApiErrorMessage(err))
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Đã có lỗi khi gọi trợ lý. Thử lại sau hoặc liên hệ IT.',
          },
        ])
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
            'fixed bottom-6 right-6 z-50 flex h-[min(520px,calc(100vh-3rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden',
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
                <p className="whitespace-pre-wrap">{formatAssistantContent(m.content)}</p>
              </div>
            ))}
            {loading && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang trả lời…
              </div>
            )}
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
