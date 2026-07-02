import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface ActionMenuItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
  separator?: boolean
}

export interface ActionMenuProps {
  items: ActionMenuItem[]
  triggerLabel?: string
  align?: 'start' | 'end' | 'center'
  className?: string
  disabled?: boolean
}

export function ActionMenu({
  items,
  triggerLabel = 'Thêm hành động',
  align = 'end',
  className,
  disabled,
}: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-9 w-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
            className
          )}
          aria-label={triggerLabel}
          disabled={disabled}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            {item.separator && index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              onClick={item.onClick}
              disabled={item.disabled}
              className={cn(
                item.variant === 'destructive' && 'text-danger focus:bg-danger/10 focus:text-danger'
              )}
            >
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
