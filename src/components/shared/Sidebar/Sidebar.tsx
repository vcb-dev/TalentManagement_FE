import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, ClipboardList, LogOut, MessageCircle } from 'lucide-react'
import { useLogout } from '@/features/auth/hooks'
import {
  BOD_ITEMS,
  HR_ADMIN_ITEMS,
  LEADER_KPI_ITEMS,
  MANAGER_OPS_ITEMS,
  MEMBER_SELF_ITEMS,
  TEACHER_CLASS_ITEMS,
  type AppNavItem,
  isNavItemActive,
} from '@/components/shared/AppNav/navItems'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { Role } from '@/types/auth'

type NavItem = AppNavItem

function graderNavItems(): NavItem[] {
  return [
    {
      to: '/exam/grader',
      label: 'Chấm bài & kỳ thi',
      icon: ClipboardList,
      match: 'custom',
      customMatch: (p) =>
        p === '/exam/grader' ||
        p.startsWith('/exam/grader/') ||
        /^\/exam\/[^/]+\/(grade|result)$/.test(p),
    },
  ]
}

type SidebarSection = { label: string; items: NavItem[] }

function sidebarSectionsForRole(role: Role | undefined): SidebarSection[] {
  if (!role) return []

  switch (role) {
    case 'HR_ADMIN':
      return [{ label: 'HR', items: HR_ADMIN_ITEMS }]
    case 'BOD':
      return [{ label: 'BOD', items: BOD_ITEMS }]
    case 'MANAGER':
      return [{ label: 'Quản lý', items: MANAGER_OPS_ITEMS }]
    case 'LEADER':
      return [{ label: 'Trưởng nhóm KPI', items: LEADER_KPI_ITEMS }]
    case 'MEMBER':
      return [{ label: 'Của tôi', items: MEMBER_SELF_ITEMS }]
    case 'TEACHER':
      return [{ label: 'Người chấm thi', items: TEACHER_CLASS_ITEMS }]
    default:
      return []
  }
}

function showGraderAssignmentBadge(role: Role | undefined): boolean {
  return role === 'TEACHER'
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
        className={cn(
          'h-[18px] w-[18px] shrink-0',
          active ? 'text-primary-600' : 'text-gray-500'
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
  const navigate = useNavigate()
  const { mutate: logout, isPending: logoutPending } = useLogout()
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)
  const collapsed = !sidebarOpen

  if (user?.role === 'MEMBER' || user?.role === 'LEADER') return null

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        void navigate({ to: '/login' })
      },
    })
  }

  const displayName = user?.name ?? 'Người dùng'
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const subtitle = `${displayName} · ${roleLabel}`

  const sections = sidebarSectionsForRole(user?.role)
  const graderItems = user?.role === 'TEACHER' ? graderNavItems() : []
  const showGraderBadge = showGraderAssignmentBadge(user?.role)

  return (
    <aside
      className={cn(
        'relative flex h-full min-h-0 shrink-0 flex-col border-r border-gray-200 bg-white font-sans transition-[width] duration-200',
        collapsed ? 'w-[4.25rem]' : 'w-64 min-w-[256px]'
      )}
    >
      <div
        className={cn(
          'border-b border-gray-200',
          collapsed ? 'px-2 pb-3 pt-4' : 'px-3 pb-3 pt-4'
        )}
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
              <div className="text-lg font-extrabold tracking-tight text-primary-600">
                VCB HRM
              </div>
              <div className="mt-1 text-sm leading-snug text-gray-500">{subtitle}</div>
              {showGraderBadge ? (
                <div className="mt-2 inline-block rounded-full bg-[#EAF3DE] px-2.5 py-1 text-xs font-semibold text-[#639922]">
                  Được chỉ định chấm thi (kỳ)
                </div>
              ) : null}
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

          {graderItems.length > 0 ? (
            <div className="mt-4">
              <SectionLabel collapsed={collapsed}>Chấm thi</SectionLabel>
              {graderItems.map((item) => (
                <NavLink
                  key={item.to}
                  item={item}
                  active={isNavItemActive(pathname, item)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ) : null}

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
              <MessageCircle
                className="h-[18px] w-[18px] shrink-0 text-gray-300"
                strokeWidth={2}
              />
              {!collapsed ? <span>Diễn đàn</span> : null}
            </div>
          </div>
        </nav>

        <div className="shrink-0 border-t border-gray-200 px-2 pb-4 pt-2">
          <button
            type="button"
            disabled={logoutPending}
            onClick={handleLogout}
            title={collapsed ? 'Đăng xuất' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-0' : 'px-3',
              'text-gray-600 hover:bg-red-50 hover:text-red-700',
              logoutPending && 'pointer-events-none opacity-60'
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-gray-500" strokeWidth={2} />
            {!collapsed ? <span>Đăng xuất</span> : null}
          </button>
        </div>
      </div>
    </aside>
  )
}
