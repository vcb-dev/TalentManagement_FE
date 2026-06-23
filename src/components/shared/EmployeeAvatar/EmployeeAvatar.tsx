import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface EmployeeAvatarProps {
  name: string
  className?: string
  photoUrl?: string | null
  fallbackClassName?: string
  showOnlineDot?: boolean
}

export function EmployeeAvatar({
  name,
  className,
  photoUrl,
  fallbackClassName,
  showOnlineDot,
}: EmployeeAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const trimmedPhoto = photoUrl?.trim()
  const showPhoto = Boolean(trimmedPhoto) && !imageFailed

  useEffect(() => {
    setImageFailed(false)
  }, [trimmedPhoto])

  return (
    <div className={cn('relative inline-flex shrink-0', showOnlineDot && 'pb-0.5 pr-0.5')}>
      <Avatar
        className={cn(
          'flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold shadow-sm',
          fallbackClassName ? '' : 'bg-muted text-muted-foreground',
          className
        )}
      >
        {showPhoto ? (
          <AvatarImage
            src={trimmedPhoto}
            alt=""
            className="object-cover"
            referrerPolicy="no-referrer"
            onLoadingStatusChange={(status) => {
              if (status === 'error') setImageFailed(true)
            }}
          />
        ) : null}
        <AvatarFallback
          className={cn(
            'rounded-[inherit] text-xs font-bold',
            fallbackClassName ?? 'bg-transparent text-muted-foreground'
          )}
        >
          {initials || '?'}
        </AvatarFallback>
      </Avatar>
      {showOnlineDot ? (
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-success-500 shadow-sm"
          aria-hidden
        />
      ) : null}
    </div>
  )
}
