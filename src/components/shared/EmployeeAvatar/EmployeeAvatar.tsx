import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface EmployeeAvatarProps {
  name: string
  className?: string
  /** Ảnh đại diện (URL) — nếu có thì ưu tiên hiển thị thay chữ cái. */
  photoUrl?: string | null
  /** Chấm xanh “đang online” như UI quiz */
  showOnlineDot?: boolean
}

export function EmployeeAvatar({ name, className, photoUrl, showOnlineDot }: EmployeeAvatarProps) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const trimmedPhoto = photoUrl?.trim()
  const showPhoto = Boolean(trimmedPhoto)

  return (
    <div className={cn('relative inline-flex shrink-0', showOnlineDot && 'pb-0.5 pr-0.5')}>
      <Avatar
        className={cn(
          'flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-game-soft to-[hsl(248_90%_92%)] text-xs font-bold text-game-soft-foreground shadow-[0_2px_8px_rgb(106_90_224/0.2)] ring-2 ring-white',
          className
        )}
      >
        {showPhoto ? (
          <AvatarImage
            src={trimmedPhoto}
            alt=""
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <AvatarFallback className="bg-transparent text-xs font-bold text-game-soft-foreground">
          {initials || '?'}
        </AvatarFallback>
      </Avatar>
      {showOnlineDot ? (
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22C55E] shadow-sm"
          aria-hidden
        />
      ) : null}
    </div>
  )
}
