import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Menu, Sparkles } from 'lucide-react'
import {
  isNavItemActive,
  mergeCompactHeaderNavItems,
  type AppNavItem,
} from '@/components/shared/AppNav/navItems'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'

function MobileNavLink({
  item,
  active,
  index,
  open,
  onSelect,
}: {
  item: AppNavItem
  active: boolean
  index: number
  open: boolean
  onSelect: () => void
}) {
  const Icon = item.icon
  const className = cn(
    'group flex items-center gap-3 rounded-xl border px-3.5 py-3 text-[15px] shadow-sm transition-all duration-300',
    active
      ? 'border-primary-600/35 bg-gradient-to-r from-primary-50 via-primary-50 to-white font-semibold text-primary-700 shadow-primary-100'
      : 'border-border/80 bg-white/90 text-slate-600 hover:-translate-y-0.5 hover:border-primary-300/60 hover:bg-primary-50/40 hover:text-foreground hover:shadow-md'
  )
  const style = {
    transitionDelay: open ? `${index * 35}ms` : '0ms',
  }

  const inner = (
    <>
      <span
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
          active
            ? 'bg-primary-600 text-white'
            : 'bg-slate-100 text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600'
        )}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2} />
      </span>
      <span className="truncate">{item.label}</span>
    </>
  )

  if (item.search !== undefined) {
    return (
      <Link
        to={item.to}
        search={item.search}
        className={cn(className, open ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0')}
        style={style}
        onClick={onSelect}
      >
        {inner}
      </Link>
    )
  }

  return (
    <Link
      to={item.to}
      className={cn(className, open ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0')}
      style={style}
      onClick={onSelect}
    >
      {inner}
    </Link>
  )
}

export function MobileHeaderNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { canId } = usePermission()
  const items = mergeCompactHeaderNavItems(canId)
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 hover:text-primary-800"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 h-dvh w-[min(88vw,23rem)] max-h-dvh max-w-none translate-y-0 content-start grid-rows-[auto_minmax(0,1fr)] rounded-none border-r border-l-0 border-t-0 border-b-0 border-primary-200/40 bg-gradient-to-b from-slate-50 via-white to-primary-50/30 p-4 transition-transform duration-500 ease-out data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 sm:p-5">
        <DialogHeader className="rounded-2xl border border-primary-100/70 bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-4 pr-12 text-white shadow-md">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4" strokeWidth={2.2} />
            Điều hướng nhanh
          </DialogTitle>
          <DialogDescription className="text-primary-100">
            Chọn màn hình cần truy cập
          </DialogDescription>
        </DialogHeader>
        <nav className="mt-4 grid gap-2.5 overflow-y-auto pr-1" aria-label="Điều hướng mobile">
          {items.map((item, index) => (
            <MobileNavLink
              key={item.to + item.label}
              item={item}
              index={index}
              open={open}
              active={isNavItemActive(pathname, item)}
              onSelect={() => setOpen(false)}
            />
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  )
}
