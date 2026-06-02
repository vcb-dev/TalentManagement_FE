/**
 * Typing indicator with animated dots (jumping animation)
 * Similar to Messenger/Pancake chat apps
 */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded-lg">
        <span className="text-xs text-gray-600 font-medium">đang nhập</span>
        <div className="flex gap-1 ml-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
