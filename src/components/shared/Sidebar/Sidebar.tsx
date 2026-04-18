import { useMemo } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  type AppNavItem,
  flatSidebarNavItems,
  isNavItemActive,
} from '@/components/shared/AppNav/navItems'
import { Button } from '@/components/ui/button'
import {
  Sidebar as UiSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
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
      <SidebarMenuItem>
        <SidebarMenuButton asChild collapsed={collapsed} active={active}>
          <Link to={item.to} search={item.search} title={title}>
            {inner}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild collapsed={collapsed} active={active}>
        <Link to={item.to} title={title}>
          {inner}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
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
    <UiSidebar collapsed={collapsed}>
      <SidebarHeader className={cn(collapsed ? 'px-2 pb-3 pt-4' : 'px-3 pb-3 pt-4')}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-base font-extrabold text-white shadow-md ring-2 ring-primary-600/15">
              V
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={'M\u1edf r\u1ed9ng menu'}
              title={'M\u1edf r\u1ed9ng menu'}
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1 pl-1">
              <div className="text-lg font-extrabold tracking-tight text-primary-600">VCB HRM</div>
              <div className="mt-1 text-sm leading-snug text-muted-foreground">{displayName}</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Thu gọn menu"
              title="Thu gọn menu"
              className="mt-0.5 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="min-h-0 flex-1 px-2 py-3">
          <SidebarGroupContent className="h-full overflow-y-auto">
            <nav aria-label="Menu \u0111i\u1ec1u h\u01b0\u1edbng">
              <SidebarMenu>
                {items.map((item) => (
                  <NavLink
                    key={navItemDedupeKey(item) + item.label}
                    item={item}
                    active={isNavItemActive(pathname, item)}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </UiSidebar>
  )
}
