import { memo, useMemo, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
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
          <Link to={item.to} search={item.search} preload="intent" title={title}>
            {inner}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild collapsed={collapsed} active={active}>
        <Link to={item.to} preload="intent" title={title}>
          {inner}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
})

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

  const groups = useMemo(() => groupedSidebarNavItems(canId, user?.role), [canId, user?.role])

  /**
   * Trạng thái mở/đóng từng nhóm — chỉ lưu các nhóm user đã đóng tay.
   * - Mặc định: nhóm mở.
   * - User click → toggle, lưu `false` nếu đóng / xoá khỏi map nếu mở lại.
   * - Nhóm chứa item đang active luôn mở (không cho đóng) để tránh ẩn route hiện tại.
   */
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
            <nav aria-label="Menu \u0111i\u1ec1u h\u01b0\u1edbng" className="flex flex-col gap-2">
              {groups.map((group, idx) => {
                const groupHasActive = group.items.some((it) => isNavItemActive(pathname, it))
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
                          'group/header mx-1 flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                          groupHasActive
                            ? 'text-indigo-700 dark:text-indigo-200'
                            : 'text-muted-foreground/75 hover:bg-white/55 hover:text-foreground dark:hover:bg-white/5',
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
                      <div
                        aria-hidden
                        className="mx-2 my-1 h-px bg-indigo-200/50 dark:bg-indigo-900/40"
                      />
                    ) : null}
                    {isOpen ? (
                      <SidebarMenu id={`sidebar-group-${group.id}`} className="mt-1">
                        {group.items.map((item) => (
                          <NavLink
                            key={navItemDedupeKey(item) + item.label}
                            item={item}
                            active={isNavItemActive(pathname, item)}
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
