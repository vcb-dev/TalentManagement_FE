import { Link, useRouterState } from '@tanstack/react-router'
import {
  isNavItemActive,
  mergeCompactHeaderNavItems,
  type AppNavItem,
} from '@/components/shared/AppNav/navItems'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

type HeaderNavGroup = {
  id: string
  label: string
  items: AppNavItem[]
}

function routeGroup(item: AppNavItem): string {
  if (item.to.startsWith('/manager')) return 'manager'
  if (item.to.startsWith('/hr-admin') || item.to.startsWith('/permissions')) return 'hr'
  if (item.to.startsWith('/teacher') || item.to.startsWith('/exam/grader')) return 'teacher'
  if (item.to.startsWith('/bod')) return 'bod'
  if (
    item.to.startsWith('/leader/kpi-okr') ||
    item.to.startsWith('/kpi-okr') ||
    item.to.startsWith('/monthly-report')
  ) {
    return 'kpi'
  }
  if (
    item.to.startsWith('/learning-path') ||
    item.to.startsWith('/learning-classes') ||
    item.to.startsWith('/exam')
  ) {
    return 'learning'
  }
  if (item.to.startsWith('/dashboard')) return 'dashboard'
  return 'other'
}

function buildHeaderGroups(items: AppNavItem[]): HeaderNavGroup[] {
  const labels: Record<string, string> = {
    dashboard: 'Tổng quan',
    learning: 'Học tập',
    kpi: 'KPI / Báo cáo',
    manager: 'Quản lý lớp',
    hr: 'Nhân sự',
    teacher: 'Giảng viên',
    bod: 'BOD',
    other: 'Khác',
  }
  const order = ['dashboard', 'learning', 'kpi', 'manager', 'hr', 'teacher', 'bod', 'other']

  const bucket = new Map<string, AppNavItem[]>()
  for (const item of items) {
    const key = routeGroup(item)
    const list = bucket.get(key) ?? []
    list.push(item)
    bucket.set(key, list)
  }

  return order
    .map((id) => ({ id, label: labels[id] ?? id, items: bucket.get(id) ?? [] }))
    .filter((group) => group.items.length > 0)
}

function HeaderNavLink({ item, active }: { item: AppNavItem; active: boolean }) {
  const Icon = item.icon
  const className = cn(
    'flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-sm text-[#24292f] transition-all duration-200 hover:bg-slate-50 active:scale-95',
    active && 'bg-slate-50 font-medium'
  )

  const inner = (
    <>
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem] text-[#57606a]',
          active && 'text-[#24292f]'
        )}
        strokeWidth={2.25}
      />
      <span className="whitespace-nowrap">{item.label}</span>
    </>
  )

  if (item.search !== undefined) {
    return (
      <Link to={item.to} search={item.search} preload="intent" className={className}>
        {inner}
      </Link>
    )
  }

  return (
    <Link to={item.to} preload="intent" className={className}>
      {inner}
    </Link>
  )
}

/** Điều hướng ngang trên header — gộp theo quyền hiệu lực (RBAC động). */
export function MemberLeaderHeaderNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { canId } = usePermission()
  const role = useAuthStore((s) => s.user?.role)
  const items = mergeCompactHeaderNavItems(canId, role)
  const groups = buildHeaderGroups(items)

  return (
    <NavigationMenu
      viewport={false}
      className="rounded-none border-0 bg-transparent px-0 py-0 shadow-none"
      aria-label="Điều hướng chính"
    >
      <NavigationMenuList>
        {groups.map((group) => {
          const active = group.items.some((item) => isNavItemActive(pathname, item))
          const isSingle = group.items.length === 1
          const singleItem = group.items[0]!

          if (isSingle) {
            return (
              <NavigationMenuItem key={group.id}>
                <NavigationMenuLink asChild>
                  <Link
                    to={singleItem.to}
                    search={singleItem.search}
                    preload="intent"
                    className={cn(
                      'group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 border border-transparent bg-transparent text-white/90 hover:border-white/25 hover:bg-white/10 hover:text-white focus:text-white',
                      active && 'border-white/30 bg-white/15 text-white'
                    )}
                  >
                    {group.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            )
          }

          return (
            <NavigationMenuItem key={group.id}>
              <NavigationMenuTrigger
                onPointerDown={(event) => {
                  event.preventDefault()
                }}
                onClick={(event) => {
                  event.preventDefault()
                }}
                className={cn(
                  'border-transparent bg-transparent text-white/90 hover:border-white/25 hover:bg-white/10 hover:text-white focus:text-white data-[state=open]:border-white/30 data-[state=open]:bg-white/15 data-[state=open]:text-white',
                  active && 'border-white/30 bg-white/15 text-white'
                )}
              >
                {group.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent className="z-50 min-w-[16rem] rounded-md border border-[#d0d7de] bg-white p-1.5 shadow-[0_8px_24px_rgba(140,149,159,0.2)]">
                <ul className="grid gap-1">
                  {group.items.map((item) => (
                    <li key={item.to + item.label}>
                      <NavigationMenuLink asChild>
                        <HeaderNavLink item={item} active={isNavItemActive(pathname, item)} />
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
