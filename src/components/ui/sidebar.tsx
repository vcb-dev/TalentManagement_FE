import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const sidebarVariants = cva(
  'relative flex h-full min-h-0 shrink-0 flex-col border-r border-indigo-200/70 bg-gradient-to-b from-slate-50 via-indigo-50/40 to-cyan-50/35 transition-[width] duration-200 dark:border-indigo-900/60 dark:from-slate-950 dark:via-indigo-950/35 dark:to-cyan-950/25',
  {
    variants: {
      collapsed: {
        true: 'w-[4.25rem]',
        false: 'w-64 min-w-[256px]',
      },
    },
    defaultVariants: {
      collapsed: false,
    },
  }
)

function Sidebar({
  className,
  collapsed,
  ...props
}: React.ComponentProps<'aside'> & VariantProps<typeof sidebarVariants>) {
  return (
    <aside
      data-slot="sidebar"
      className={cn(sidebarVariants({ collapsed }), className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn('border-b border-indigo-200/60 dark:border-indigo-900/60', className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex min-h-0 flex-1 flex-col', className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn('border-t border-indigo-200/60 dark:border-indigo-900/60', className)}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" className={cn('px-2 py-3', className)} {...props} />
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('min-h-0', className)} {...props} />
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('m-0 list-none p-0', className)} {...props} />
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('mb-1', className)} {...props} />
}

const sidebarMenuButtonVariants = cva(
  'flex w-full items-center gap-3 rounded-lg border-l-[3px] py-2.5 text-sm font-medium leading-snug tracking-tight transition-all duration-200 active:scale-[0.97]',
  {
    variants: {
      collapsed: {
        true: 'justify-center px-0',
        false: 'px-3',
      },
      active: {
        true: 'border-indigo-500 bg-gradient-to-r from-indigo-500/14 via-violet-500/10 to-cyan-400/10 font-semibold text-indigo-700 shadow-[0_8px_18px_-14px_rgba(67,56,202,0.55)] dark:border-indigo-400 dark:text-indigo-200',
        false:
          'border-transparent text-muted-foreground hover:bg-white/65 hover:text-foreground dark:hover:bg-white/5',
      },
    },
    defaultVariants: {
      collapsed: false,
      active: false,
    },
  }
)

function SidebarMenuButton({
  className,
  asChild = false,
  collapsed,
  active,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="sidebar-menu-button"
      className={cn(sidebarMenuButtonVariants({ collapsed, active }), className)}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
}
