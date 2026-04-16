import { useMemo } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  type AppNavItem,
  flatSidebarNavItems,
  isNavItemActive,
} from '@/components/shared/AppNav/navItems'
import { cn } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

type NavItem = AppNavItem

function navItemDedupeKey(item: NavItem): string {
  return item.to + (item.search !== undefined ? JSON.stringify(item.search) : '')
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
}) {
  const Icon = item.icon
  const className = cn(
    'mb-1 flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium leading-snug tracking-tight transition-colors',
    collapsed ? 'justify-center px-0' : 'px-3',
    active
      ? 'border-l-[3px] border-primary-600 bg-primary-50 font-semibold text-primary-600'
      : 'border-l-[3px] border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
  )

  const inner = (
    <>
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0',
          active ? 'text-primary-600' : 'text-muted-foreground'
        )}
        strokeWidth={2}
      />
      {!collapsed ? <span>{item.label}</span> : null}
    </>
  )

  const title = collapsed ? item.label : undefined

  if (item.search !== undefined) {
    return (
      <Link to={item.to} search={item.search} className={className} title={title}>
        {inner}
      </Link>
    )
  }

  return (
    <Link to={item.to} className={className} title={title}>
      {inner}
    </Link>
  )
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'MEMBER' || user?.role === 'LEADER') return null
  return <SidebarInner />
}

function SidebarInner() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)
  const { canId } = usePermission()
  const collapsed = !sidebarOpen

  const items = useMemo(() => flatSidebarNavItems(canId), [canId])

  const displayName = user?.name ?? 'Ng\u01b0\u1eddi d\u00f9ng'

  return (
    <aside
      className={cn(
        'relative flex h-full min-h-0 shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200',
        collapsed ? 'w-[4.25rem]' : 'w-64 min-w-[256px]'
      )}
    >
      <div
        className={cn('border-b border-border', collapsed ? 'px-2 pb-3 pt-4' : 'px-3 pb-3 pt-4')}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-base font-extrabold text-white shadow-md ring-2 ring-primary-600/15">
              V
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={'M\u1edf r\u1ed9ng menu'}
              title={'M\u1edf r\u1ed9ng menu'}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1 pl-1">
              <div className="text-lg font-extrabold tracking-tight text-primary-600">VCB HRM</div>
              <div className="mt-1 text-sm leading-snug text-muted-foreground">{displayName}</div>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Thu gọn menu"
              title="Thu gọn menu"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <nav
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3"
          aria-label="Menu \u0111i\u1ec1u h\u01b0\u1edbng"
        >
          {items.map((item) => (
            <NavLink
              key={navItemDedupeKey(item) + item.label}
              item={item}
              active={isNavItemActive(pathname, item)}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>
    </aside>
  )
}
