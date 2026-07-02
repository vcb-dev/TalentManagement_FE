import type * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const variants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        outline: 'border-border bg-background text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        success:
          'border-transparent bg-success-100 text-success-600 dark:bg-success-500/15 dark:text-success-100',
        warning:
          'border-transparent bg-warning-100 text-warning-600 dark:bg-warning-500/15 dark:text-warning-100',
        danger:
          'border-transparent bg-danger-100 text-danger-600 dark:bg-danger-500/15 dark:text-danger-100',
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
