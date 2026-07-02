import { useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchInboxConversations, type CskhInboxConversation } from './api'
import { cskhMediaProxySrc } from './messageMedia'
import { CskhEmptyState, CskhLoading } from './cskhUi'

type ChatListPanelProps = {
  selectedConversationId?: string
  onSelect: (conversation: CskhInboxConversation) => void
  pageId?: string
  typingConversationIds?: Set<string>
}

export function ChatListPanel({
  selectedConversationId,
  onSelect,
  pageId,
  typingConversationIds = new Set(),
}: ChatListPanelProps) {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['cskh', 'inbox', 'conversations', pageId],
    queryFn: () => fetchInboxConversations(pageId),
    refetchInterval: () => (document.visibilityState === 'visible' ? 10000 : false),
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
    return <CskhLoading label="Đang tải hội thoại…" />
  }

  if (!conversations || conversations.length === 0) {
    return (
      <CskhEmptyState
        icon={<MessageCircle className="h-8 w-8 text-indigo-600" />}
        title="Không có hội thoại nào"
        description="Hội thoại từ Facebook sẽ xuất hiện ở đây"
      />
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
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatTime(conv.lastMessageAt)}
                </span>
              </div>

              {/* Last message preview & unread badge */}
              <div className="flex items-center justify-between mt-1 gap-2">
                <div
                  className={cn(
                    'text-xs truncate flex-1 min-h-[16px]',
                    typingConversationIds.has(conv.id)
                      ? 'text-blue-600 font-medium italic'
                      : 'text-gray-500'
                  )}
                >
                  {typingConversationIds.has(conv.id) ? (
                    <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                      đang nhập
                      <span className="inline-flex gap-0.5 ml-0.5 items-end h-2 pb-0.5">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                            style={{
                              animationDelay: `${i * 0.15}s`,
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  ) : (
                    conv.lastMessage || '[Không có tin nhắn]'
                  )}
                </div>
                {conv.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-orange-500 rounded-full flex-shrink-0 animate-pulse">
                    {Math.min(conv.unreadCount, 99)}
                  </span>
                )}
              </div>

              {/* Source tags */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {conv.fromAd && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    Ads
                  </span>
                )}
                {conv.pageName && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50/70 text-blue-700 border border-blue-100/50 max-w-[140px] truncate">
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
