/** Robot mascot vẫy tay + bong bóng Hello (launcher trợ lý). */
export function AssistantRobotMascot({ compact = false }: { compact?: boolean }) {
  return (
    <div className="pointer-events-none relative flex flex-col items-center gap-1">
      <div
        className={`relative animate-assistant-hello-bob rounded-2xl border border-primary/20 bg-background font-semibold text-primary shadow-md ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
        aria-hidden
      >
        Hello!
        <span
          className={`absolute rotate-45 border-b border-r border-primary/20 bg-background ${compact ? '-bottom-1 right-4 h-2.5 w-2.5' : '-bottom-1.5 right-6 h-3 w-3'}`}
          aria-hidden
        />
      </div>

      <svg
        viewBox="0 0 120 140"
        className={
          compact ? 'h-[64px] w-[56px] drop-shadow-md' : 'h-[88px] w-[76px] drop-shadow-lg'
        }
        aria-hidden
      >
        <defs>
          <linearGradient id="assistant-robot-body" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        <rect x="34" y="78" width="52" height="44" rx="14" fill="url(#assistant-robot-body)" />
        <rect x="24" y="18" width="72" height="62" rx="20" fill="url(#assistant-robot-body)" />
        <circle cx="48" cy="48" r="6" fill="hsl(var(--primary-foreground))" />
        <circle cx="72" cy="48" r="6" fill="hsl(var(--primary-foreground))" />
        <circle cx="50" cy="46" r="2" fill="hsl(var(--primary))" />
        <circle cx="74" cy="46" r="2" fill="hsl(var(--primary))" />
        <path
          d="M 52 58 Q 60 64 68 58"
          fill="none"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect
          x="14"
          y="82"
          width="14"
          height="36"
          rx="7"
          fill="hsl(var(--primary))"
          opacity="0.85"
        />
        <g className="assistant-wave-arm">
          <rect x="92" y="72" width="14" height="40" rx="7" fill="hsl(var(--primary))" />
          <circle cx="99" cy="68" r="8" fill="hsl(var(--primary))" />
        </g>
        <rect
          x="42"
          y="118"
          width="16"
          height="14"
          rx="6"
          fill="hsl(var(--primary))"
          opacity="0.9"
        />
        <rect
          x="62"
          y="118"
          width="16"
          height="14"
          rx="6"
          fill="hsl(var(--primary))"
          opacity="0.9"
        />
      </svg>
    </div>
  )
}
