import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import {
  BOD_ITEMS,
  HR_ITEMS,
  LEADER_KPI_ITEMS,
  MANAGER_OPS_ITEMS,
  MEMBER_SELF_ITEMS,
  type AppNavItem,
  filterNavByPermissions,
  isNavItemActive,
} from '@/components/shared/AppNav/navItems'
import { cn } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { Role } from '@/types/auth'

type NavItem = AppNavItem

type SidebarSection = { label: string; items: NavItem[] }

function sidebarSectionsForRole(
  role: Role | undefined,
  canId: (id: string) => boolean
): SidebarSection[] {
  if (!role) return []

  switch (role) {
    case 'HR':
      return [{ label: 'HR', items: filterNavByPermissions(HR_ITEMS, canId) }]
    case 'BOD':
      return [{ label: 'BOD', items: filterNavByPermissions(BOD_ITEMS, canId) }]
    case 'MANAGER':
      return [{ label: 'Quản lý', items: filterNavByPermissions(MANAGER_OPS_ITEMS, canId) }]
    case 'LEADER':
      return [{ label: 'Trưởng nhóm KPI', items: filterNavByPermissions(LEADER_KPI_ITEMS, canId) }]
    case 'MEMBER':
      return [{ label: 'Của tôi', items: filterNavByPermissions(MEMBER_SELF_ITEMS, canId) }]
    default:
      return []
  }
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
      : 'border-l-[3px] border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
  )

  const inner = (
    <>
      <Icon
        className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-primary-600' : 'text-gray-500')}
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

function SectionLabel({ children, collapsed }: { children: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-1 h-px bg-gray-200" aria-hidden />
  return (
    <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
      {children}
    </div>
  )
}

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)
  const { canId } = usePermission()
  const collapsed = !sidebarOpen

  if (user?.role === 'MEMBER' || user?.role === 'LEADER') return null

  const displayName = user?.name ?? 'Người dùng'
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const subtitle = `${displayName} · ${roleLabel}`

  const sections = sidebarSectionsForRole(user?.role, canId)

  return (
    <aside
      className={cn(
        'relative flex h-full min-h-0 shrink-0 flex-col border-r border-gray-200 bg-white font-sans transition-[width] duration-200',
        collapsed ? 'w-[4.25rem]' : 'w-64 min-w-[256px]'
      )}
    >
      <div
        className={cn('border-b border-gray-200', collapsed ? 'px-2 pb-3 pt-4' : 'px-3 pb-3 pt-4')}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-base font-extrabold text-white shadow-md ring-2 ring-primary-600/15">
              V
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Mở rộng menu"
              title="Mở rộng menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1 pl-1">
              <div className="text-lg font-extrabold tracking-tight text-primary-600">VCB HRM</div>
              <div className="mt-1 text-sm leading-snug text-gray-500">{subtitle}</div>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Thu gọn menu"
              title="Thu gọn menu"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3">
          {sections.map((section, sIdx) => (
            <div key={section.label} className={cn(sIdx > 0 && 'mt-4')}>
              <SectionLabel collapsed={collapsed}>{section.label}</SectionLabel>
              {section.items.map((item) => (
                <NavLink
                  key={item.to + item.label}
                  item={item}
                  active={isNavItemActive(pathname, item)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ))}

          <div className="mt-4">
            <SectionLabel collapsed={collapsed}>Cộng đồng</SectionLabel>
            <div
              className={cn(
                'mb-1 flex cursor-not-allowed items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-gray-400 opacity-80',
                collapsed ? 'justify-center px-0' : 'px-3'
              )}
              title={collapsed ? 'Diễn đàn (sắp có)' : undefined}
              aria-disabled
            >
              <MessageCircle className="h-[18px] w-[18px] shrink-0 text-gray-300" strokeWidth={2} />
              {!collapsed ? <span>Diễn đàn</span> : null}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  )
}
