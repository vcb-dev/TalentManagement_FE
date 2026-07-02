import * as React from 'react'
import { Label as RadixLabel } from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }: React.ComponentProps<typeof RadixLabel>) {
  return (
    <RadixLabel
      className={cn(
        'text-sm font-semibold leading-snug text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  )
}
