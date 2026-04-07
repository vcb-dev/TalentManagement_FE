import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export const STAR_EMBLEM_SRC = '/star-emblem.png'

export type StarEmblemVariant = 'filled' | 'current' | 'empty' | 'muted'

export interface StarEmblemProps extends ComponentPropsWithoutRef<'img'> {
  /** Trạng thái hiển thị — mặc định `filled`. */
  variant?: StarEmblemVariant
}

const variantClass: Record<StarEmblemVariant, string> = {
  filled: 'opacity-100',
  current: 'opacity-95 drop-shadow-[0_0_6px_rgba(212,160,23,0.45)]',
  empty: 'opacity-[0.38] grayscale-[0.35]',
  muted: 'opacity-40 grayscale',
}

/** Huy hiệu sao VCB — thay thế icon ngôi sao vector/Lucide. */
export function StarEmblem({
  className,
  variant = 'filled',
  alt = '',
  src = STAR_EMBLEM_SRC,
  ...props
}: StarEmblemProps) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn(
        'inline-block shrink-0 object-contain select-none',
        variantClass[variant],
        className
      )}
      {...props}
    />
  )
}
