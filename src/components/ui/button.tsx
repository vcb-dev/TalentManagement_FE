import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-semibold tracking-tight transition-[color,box-shadow,background,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button/35 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-button text-button-foreground shadow-[0_2px_8px_rgb(106_90_224/0.35)] hover:bg-button-hover active:bg-button-active',
        outline:
          'border border-game-accent/25 bg-card text-game-soft-foreground shadow-sm hover:bg-game-soft hover:border-game-accent/40',
        ghost: 'rounded-xl text-game-muted hover:bg-game-soft hover:text-game-soft-foreground',
        secondary:
          'bg-game-soft text-game-soft-foreground shadow-sm hover:bg-[hsl(248_90%_94%)] active:bg-[hsl(248_80%_91%)]',
        destructive:
          'border border-danger/40 bg-danger-muted text-danger shadow-sm hover:bg-danger-muted/80 focus-visible:ring-danger/30',
      },
      size: {
        default: 'h-11 min-h-11 px-6 py-2.5',
        sm: 'h-9 min-h-9 rounded-full px-4 text-sm',
        lg: 'h-12 min-h-12 rounded-full px-9 text-lg',
        icon: 'h-11 w-11 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'
