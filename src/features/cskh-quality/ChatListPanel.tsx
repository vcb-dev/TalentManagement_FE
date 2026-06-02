import { useQuery } from '@tanstack/react-query'
import { Loader2, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchInboxConversations, type CskhInboxConversation } from './api'
import { cskhMediaProxySrc } from './messageMedia'

type ChatListPanelProps = {
  selectedConversationId?: string
  onSelect: (conversation: CskhInboxConversation) => void
  pageId?: string
}

export function ChatListPanel({ selectedConversationId, onSelect, pageId }: ChatListPanelProps) {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['cskh', 'inbox', 'conversations', pageId],
    queryFn: () => fetchInboxConversations(pageId),
    refetchInterval: 10000, // Refetch every 10s
  })

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins}p trước`
    if (diffHours < 24) return `${diffHours}h trước`
    if (diffDays < 7) return `${diffDays}d trước`
    return date.toLocaleDateString('vi-VN')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
        <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm text-center">Không có hội thoại nào</p>
        <p className="text-xs text-gray-400 mt-1">Hội thoại từ Facebook sẽ xuất hiện ở đây</p>
      </div>
    )
  }

  return (
    <div className="divide-y overflow-y-auto h-full">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv)}
          className={cn(
            'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-l-2',
            selectedConversationId === conv.id
              ? 'bg-blue-50 border-l-blue-500'
              : 'border-l-transparent'
          )}
        >
          <div className="flex gap-3">
            {/* Avatar */}
            {conv.customerPictureUrl ? (
              <img
                src={cskhMediaProxySrc(conv.customerPictureUrl)}
                alt={conv.customerName || 'Customer'}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {(conv.customerName || 'K').charAt(0).toUpperCase()}
              </div>
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {conv.customerName || `Khách hàng ${conv.participantPsid.slice(0, 8)}`}
                </h3>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatTime(conv.lastMessageAt)}
                </span>
              </div>

              {/* Last message preview */}
              <p className="text-xs text-gray-600 truncate mt-1">
                {conv.lastMessage || '[Không có tin nhắn]'}
              </p>

              {/* Unread badge + source */}
              <div className="flex items-center gap-2 mt-2">
                {conv.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full flex-shrink-0">
                    {Math.min(conv.unreadCount, 99)}
                  </span>
                )}
                {conv.fromAd && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Quảng cáo
                  </span>
                )}
                {conv.pageName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {conv.pageName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
