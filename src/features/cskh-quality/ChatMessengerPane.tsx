import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CskhInboxConversation } from './api'
import { ChatListPanel } from './ChatListPanel'
import { ChatPanel } from './ChatPanel'

type ChatMessengerPaneProps = {
  pageId?: string
}

export function ChatMessengerPane({ pageId }: ChatMessengerPaneProps) {
  const [selectedConversation, setSelectedConversation] = useState<CskhInboxConversation | null>(
    null
  )

  return (
    <div className="flex h-full gap-4 bg-white rounded-lg border border-gray-200">
      {/* Conversations List - Left Sidebar */}
      <div
        className={`${
          selectedConversation && window.innerWidth < 768 ? 'hidden' : 'flex'
        } w-full md:w-80 flex-col border-r`}
      >
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Hội thoại</h2>
          <p className="text-xs text-gray-500 mt-1">Facebook Messenger</p>
        </div>
        <ChatListPanel
          selectedConversationId={selectedConversation?.id}
          onSelect={setSelectedConversation}
          pageId={pageId}
        />
      </div>

      {/* Chat Area - Main */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Mobile back button */}
          <div className="md:hidden p-3 border-b flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedConversation(null)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              conversation={selectedConversation}
              onClose={() => setSelectedConversation(null)}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg font-medium">Chọn một hội thoại để bắt đầu</p>
            <p className="text-sm text-gray-400 mt-1">
              Nhấp vào một cuộc trò chuyện từ danh sách bên trái
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
