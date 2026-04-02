import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProgressStarProps {
  filled: boolean
  className?: string
}

export function ProgressStar({ filled, className }: ProgressStarProps) {
  return (
    <Star
      className={cn('h-4 w-4', filled ? 'fill-primary text-primary' : 'text-muted-foreground', className)}
    />
  )
}
