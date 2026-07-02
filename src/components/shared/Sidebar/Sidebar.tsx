import { memo, useEffect, useMemo, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  type AppNavItem,
  groupedSidebarNavItems,
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

const NAV_ITEM_BASE =
  'h-10 rounded-md border border-transparent px-3 text-sm transition-colors duration-150'
const NAV_ITEM_ACTIVE = 'bg-muted text-foreground shadow-sm border-border'
const NAV_ITEM_INACTIVE = 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'

function navItemDedupeKey(item: NavItem): string {
  return item.to + (item.search !== undefined ? JSON.stringify(item.search) : '')
}

const NavLink = memo(function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
}) {
  const Icon = item.icon
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const currentSearch = routerState.location.search as Record<string, any>
  const childActive = Boolean(
    item.children?.some((child) => isNavItemActive(pathname, child, currentSearch))
  )
  const [isOpen, setIsOpen] = useState(childActive)

  useEffect(() => {
    if (childActive) setIsOpen(true)
  }, [childActive])

  const inner = (
    <>
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0',
          active || childActive ? 'text-primary' : 'text-muted-foreground'
        )}
        strokeWidth={2}
      />
      {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
      {item.children && !collapsed ? (
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          strokeWidth={2.25}
          aria-hidden
        />
      ) : null}
    </>
  )

  const title = collapsed ? item.label : undefined
  const buttonClassName = cn(
    NAV_ITEM_BASE,
    active || childActive ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE
  )

  if (item.children?.length) {
    return (
      <SidebarMenuItem className="flex flex-col gap-0.5">
        <SidebarMenuButton
          type="button"
          collapsed={collapsed}
          active={active || childActive}
          className={cn('w-full', buttonClassName)}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
        >
          <div className="flex w-full items-center gap-2">{inner}</div>
        </SidebarMenuButton>
        {isOpen && !collapsed ? (
          <div className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
            {item.children.map((child) => {
              const subActive = isNavItemActive(pathname, child, currentSearch)
              const ChildIcon = child.icon

              if (child.isDevelopment) {
                return (
                  <SidebarMenuButton
                    key={navItemDedupeKey(child)}
                    collapsed={false}
                    active={false}
                    className={cn('h-9 cursor-pointer', NAV_ITEM_BASE, NAV_ITEM_INACTIVE)}
                    onClick={() => toast.info('Tính năng đang phát triển')}
                  >
                    <ChildIcon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                    <span className="truncate text-[13px] font-medium">{child.label}</span>
                  </SidebarMenuButton>
                )
              }

              return (
                <SidebarMenuButton
                  key={navItemDedupeKey(child)}
                  asChild
                  collapsed={false}
                  active={subActive}
                  className={cn(
                    'h-9',
                    NAV_ITEM_BASE,
                    subActive ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE
                  )}
                >
                  <Link to={child.to} search={child.search} preload="intent" title={child.label}>
                    <ChildIcon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        subActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                      strokeWidth={2}
                    />
                    <span className="truncate text-[13px] font-medium">{child.label}</span>
                  </Link>
                </SidebarMenuButton>
              )
            })}
          </div>
        ) : null}
      </SidebarMenuItem>
    )
  }

  if (item.openNewTab) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          collapsed={collapsed}
          active={active}
          className={buttonClassName}
        >
          <a href={item.to} target="_blank" rel="noopener noreferrer" title={title}>
            {inner}
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  if (item.search !== undefined) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          collapsed={collapsed}
          active={active}
          className={buttonClassName}
        >
          <Link to={item.to} search={item.search} preload="intent" title={title}>
            {inner}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild collapsed={collapsed} active={active} className={buttonClassName}>
        <Link to={item.to} preload="intent" title={title}>
          {inner}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
})

export function Sidebar() {
  return <SidebarInner />
}

function SidebarInner() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const currentSearch = routerState.location.search as Record<string, any>

  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)
  const { canId } = usePermission()
  const collapsed = !sidebarOpen

  const groups = useMemo(() => groupedSidebarNavItems(canId, user), [canId, user])
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set())

  const isGroupOpen = (groupId: string, hasActive: boolean) => {
    if (collapsed) return true
    if (hasActive) return true
    return !collapsedGroupIds.has(groupId)
  }

  const toggleGroup = (id: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <UiSidebar collapsed={collapsed} className="h-full min-h-0">
      <SidebarHeader
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border',
          collapsed ? 'justify-center px-1' : 'justify-between gap-1 px-3'
        )}
      >
        {collapsed ? (
          <div className="flex flex-col items-center justify-center gap-0.5 py-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground shadow-sm">
              V
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Mở rộng menu"
              title="Mở rộng menu"
              className="h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          </div>
        ) : (
          <>
            <div className="min-w-0 truncate text-base font-extrabold leading-none tracking-tight text-foreground">
              VCB HRM
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Thu gọn menu"
              title="Thu gọn menu"
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </Button>
          </>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="min-h-0 flex-1 px-2 py-3">
          <SidebarGroupContent className="h-full overflow-y-auto">
            <nav aria-label="Menu điều hướng" className="flex flex-col gap-2">
              {groups.map((group, idx) => {
                const groupHasActive = group.items.some((it) =>
                  isNavItemActive(pathname, it, currentSearch)
                )
                const isOpen = isGroupOpen(group.id, groupHasActive)
                return (
                  <div key={group.id} className="flex flex-col">
                    {!collapsed ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        aria-expanded={isOpen}
                        aria-controls={`sidebar-group-${group.id}`}
                        className={cn(
                          'group/header mx-1 flex items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                          groupHasActive
                            ? 'text-primary'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                          idx === 0 ? 'mt-0' : 'mt-1'
                        )}
                      >
                        <span className="truncate">{group.label}</span>
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                            isOpen ? 'rotate-0' : '-rotate-90'
                          )}
                          strokeWidth={2.25}
                          aria-hidden
                        />
                      </button>
                    ) : idx > 0 ? (
                      <div aria-hidden className="mx-2 my-1 h-px bg-border" />
                    ) : null}
                    {isOpen ? (
                      <SidebarMenu id={`sidebar-group-${group.id}`} className="mt-1">
                        {group.items.map((item) => (
                          <NavLink
                            key={navItemDedupeKey(item) + item.label}
                            item={item}
                            active={isNavItemActive(pathname, item, currentSearch)}
                            collapsed={collapsed}
                          />
                        ))}
                      </SidebarMenu>
                    ) : null}
                  </div>
                )
              })}
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </UiSidebar>
  )
}
