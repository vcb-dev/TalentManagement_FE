import { useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { MessageCircle } from 'lucide-react'
import {
  fetchInboxMessages,
  sendInboxMessage,
  notifyInboxTyping,
  markInboxAsRead,
  type CskhInboxConversation,
  type CskhInboxMessage,
} from './api'
import { ChatMessage } from './ChatMessage'
import { ChatMessageInput } from './ChatMessageInput'
import { CskhEmptyState, CskhLoading } from './cskhUi'
import { TypingIndicator } from './TypingIndicator'
import { cskhMediaProxySrc } from './messageMedia'

type ChatPanelProps = {
  conversation: CskhInboxConversation
  isCustomerTyping?: boolean
  onClose?: () => void
}

export function ChatPanel({ conversation, isCustomerTyping, onClose }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string>('')
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const qc = useQueryClient()

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['cskh', 'inbox', 'messages', conversation.id],
    queryFn: () => fetchInboxMessages(conversation.id),
    refetchInterval: 30000, // Refetch every 30s as fallback
  })

  const messages = messagesData?.messages ?? []

  // Send message mutation
  const sendMut = useMutation({
    mutationFn: (text: string) => sendInboxMessage(conversation.id, text),
    onSuccess: () => {
      // Message will be pushed via SSE
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error) || 'Gửi tin thất bại')
    },
  })

  // Typing notification
  const handleTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    void notifyInboxTyping(conversation.id).catch(() => {
      // Ignore errors from typing endpoint
    })

    typingTimeoutRef.current = setTimeout(() => {
      // Clear typing after 3 seconds
    }, 3000)
  }

  // Mark messages as read
  useEffect(() => {
    void markInboxAsRead(conversation.id).catch(() => {
      // Ignore errors
    })
  }, [conversation.id, messages.length])

  // Auto-scroll to bottom when new messages arrive or when typing starts
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
          })
        }, 0)
      }
    }

    scrollToBottom()
    lastMessageIdRef.current = messages[messages.length - 1]?.id ?? ''
  }, [messages, isCustomerTyping])

  const displayMessages = useMemo(() => {
    return messages
      .filter((m) => m.text || m.attachmentUrl || m.messageType)
      .map((m) => ({
        ...m,
        isOwn: m.senderType === 'staff',
      }))
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          {conversation.customerPictureUrl && (
            <img
              src={cskhMediaProxySrc(conversation.customerPictureUrl)}
              alt={conversation.customerName || 'Customer'}
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {conversation.customerName ||
                `Khách hàng ${conversation.participantPsid.slice(0, 8)}`}
            </h3>
            <p className="text-xs text-gray-500">Cuộc trò chuyện Facebook</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Đóng"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white"
      >
        {isLoading ? (
          <CskhLoading label="Đang tải tin nhắn…" />
        ) : displayMessages.length === 0 ? (
          <CskhEmptyState
            icon={<MessageCircle className="h-8 w-8 text-indigo-600" />}
            title="Không có tin nhắn nào"
            description="Cuộc hội thoại này chưa có tin nhắn"
          />
        ) : (
          <>
            {displayMessages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} isOwn={msg.isOwn} />
            ))}
            {isCustomerTyping && <TypingIndicator />}
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatMessageInput
        onSend={(text) => sendMut.mutateAsync(text)}
        onTyping={handleTyping}
        disabled={sendMut.isPending}
      />
    </div>
  )
}
