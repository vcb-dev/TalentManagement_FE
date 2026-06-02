import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'

type ChatMessageInputProps = {
  onSend: (text: string) => Promise<void>
  onTyping?: () => void
  disabled?: boolean
  placeholder?: string
}

export function ChatMessageInput({
  onSend,
  onTyping,
  disabled,
  placeholder = 'Gõ tin nhắn... (Shift+Enter để xuống dòng)',
}: ChatMessageInputProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      await onSend(trimmed)
      setText('')
      // Auto-focus after sending
      textareaRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)

    // Notify typing
    if (onTyping) {
      onTyping()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const height = Math.min(textareaRef.current.scrollHeight, 120)
      textareaRef.current.style.height = `${height}px`
    }
  }, [text])

  return (
    <div className="flex gap-2 p-4 border-t bg-white rounded-b-lg">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled || sending}
        rows={1}
        className="resize-none py-3 px-4 text-sm rounded-lg focus-visible:ring-blue-400"
      />
      <Button
        onClick={handleSend}
        disabled={!text.trim() || sending || disabled}
        size="sm"
        className="self-end bg-blue-500 hover:bg-blue-600 text-white"
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
            <span className="hidden sm:inline">Gửi</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Gửi</span>
          </>
        )}
      </Button>
    </div>
  )
}
