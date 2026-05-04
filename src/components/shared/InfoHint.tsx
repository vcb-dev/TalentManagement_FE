import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type InfoHintProps = {
  text: string
  label?: string
  className?: string
  iconClassName?: string
}

/**
 * Nút (i) — mô tả dài ở tooltip, giúp màn hình gọn hơn.
 */
export function InfoHint({
  text,
  label = 'Giải thích thêm',
  className,
  iconClassName,
}: InfoHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 text-muted-foreground/80 transition-colors hover:text-primary',
            'rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
            className
          )}
          aria-label={label}
        >
          <Info className={cn('h-3.5 w-3.5', iconClassName)} strokeWidth={2.25} />
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-xs font-normal leading-relaxed text-popover-foreground">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
