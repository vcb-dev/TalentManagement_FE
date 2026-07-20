import type * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const variants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-button text-button-foreground',
        outline: 'border-border text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        success: 'border-transparent bg-success-muted text-success',
        warning: 'border-transparent bg-warning-muted text-warning',
        danger: 'border-transparent bg-danger-muted text-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof variants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(variants({ variant }), className)} {...props} />
}
