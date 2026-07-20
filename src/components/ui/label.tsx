import * as React from 'react'
import { Label as RadixLabel } from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }: React.ComponentProps<typeof RadixLabel>) {
  return (
    <RadixLabel
      className={cn(
        'text-base font-medium leading-snug peer-disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}
