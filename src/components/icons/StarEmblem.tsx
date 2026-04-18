import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const STAR_EMBLEM_SRC = '/star-emblem.png'

const starEmblemVariants = cva('inline-block shrink-0 object-contain select-none', {
  variants: {
    variant: {
      filled: 'opacity-100',
      current: 'opacity-95 drop-shadow-[0_0_6px_rgba(212,160,23,0.45)]',
      empty: 'opacity-[0.38] grayscale-[0.35]',
      muted: 'opacity-40 grayscale',
    },
  },
  defaultVariants: {
    variant: 'filled',
  },
})

export type StarEmblemVariant = NonNullable<VariantProps<typeof starEmblemVariants>['variant']>

export interface StarEmblemProps
  extends
    Omit<React.ComponentPropsWithoutRef<'img'>, 'src'>,
    VariantProps<typeof starEmblemVariants> {
  src?: string
}

/** Huy hiệu sao VCB — thay thế icon ngôi sao vector/Lucide. */
export const StarEmblem = React.forwardRef<HTMLImageElement, StarEmblemProps>(
  ({ className, variant, alt = '', src = STAR_EMBLEM_SRC, ...props }, ref) => (
    <img
      ref={ref}
      src={src}
      alt={alt}
      draggable={false}
      className={cn(starEmblemVariants({ variant }), className)}
      {...props}
    />
  )
)

StarEmblem.displayName = 'StarEmblem'
