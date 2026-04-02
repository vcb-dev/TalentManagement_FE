import { cn } from '@/lib/utils'

export interface EmployeeAvatarProps {
  name: string
  className?: string
  /** Chấm xanh “đang online” như UI quiz */
  showOnlineDot?: boolean
}

export function EmployeeAvatar({ name, className, showOnlineDot }: EmployeeAvatarProps) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={cn('relative inline-flex shrink-0', showOnlineDot && 'pb-0.5 pr-0.5')}>
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-game-soft to-[hsl(248_90%_92%)] text-xs font-bold text-game-soft-foreground shadow-[0_2px_8px_rgb(106_90_224/0.2)] ring-2 ring-white',
          className
        )}
      >
        {initials || '?'}
      </div>
      {showOnlineDot ? (
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22C55E] shadow-sm"
          aria-hidden
        />
      ) : null}
    </div>
  )
}
