import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  LineChart,
  ListChecks,
  ListOrdered,
  LogOut,
  MessageCircle,
  School,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useLogout } from '@/features/auth/hooks'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { Role } from '@/types/auth'

type MatchMode = 'exact' | 'prefix' | 'custom'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  match: MatchMode
  search?: { page: number }
  customMatch?: (normalizedPath: string) => boolean
}

/** Member: dashboard cá nhân, lộ trình, thi — không menu chấm thi. Hồ sơ mở từ avatar header. */
const MEMBER_SELF_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard cá nhân', icon: LayoutGrid, match: 'exact' },
  { to: '/learning-path', label: 'Lộ trình học', icon: ListOrdered, match: 'exact' },
  {
    to: '/learning-path/tap_su/1',
    label: 'Checklist theo sao',
    icon: ListChecks,
    match: 'prefix',
  },
  {
    to: '/exam',
    label: 'Kết quả & lịch thi',
    icon: Calendar,
    match: 'custom',
    customMatch: (p) => {
      if (p === '/exam/grader' || p.startsWith('/exam/grader')) return false
      return p === '/exam' || (p.startsWith('/exam/') && !p.startsWith('/exam/grader'))
    },
  },
]

const HR_ADMIN_ITEMS: NavItem[] = [
  { to: '/hr-admin', label: 'Nhân sự (CRUD)', icon: Users, match: 'prefix', search: { page: 1 } },
]

const BOD_ITEMS: NavItem[] = [
  { to: '/bod/dashboard', label: 'Tổng quan nhân sự', icon: LineChart, match: 'prefix' },
  { to: '/bod/trainee-ranking', label: 'Xếp hạng tập sự', icon: BarChart3, match: 'prefix' },
  { to: '/bod/team-comparison', label: 'So sánh team', icon: BarChart3, match: 'prefix' },
]

/** Manager: team, chia lớp, duyệt, lịch thi, thăng cấp, bài tập — không gộp menu Member trừ hồ sơ. */
const MANAGER_OPS_ITEMS: NavItem[] = [
  {
    to: '/manager/team-progress',
    label: 'Nhân sự trong team',
    icon: Users,
    match: 'custom',
    customMatch: (p) => p === '/manager/team-progress' || p.startsWith('/manager/team/'),
  },
  { to: '/manager/classes', label: 'Chia lớp', icon: School, match: 'prefix' },
  { to: '/manager/review-submissions', label: 'Duyệt bài làm', icon: ShieldCheck, match: 'prefix' },
  { to: '/manager/exam-schedule', label: 'Lịch thi & chỉ định chấm', icon: Calendar, match: 'prefix' },
  { to: '/manager/approvals', label: 'Duyệt thăng cấp / sao', icon: ShieldCheck, match: 'prefix' },
  { to: '/manager/exercises', label: 'Bài tập lộ trình', icon: BookOpen, match: 'prefix' },
]

const TEACHER_CLASS_ITEMS: NavItem[] = [
  { to: '/teacher/classes', label: 'Lớp & thành viên', icon: School, match: 'prefix' },
]

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

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1)
  return p
}

function isActive(pathname: string, item: NavItem): boolean {
  const p = normalizePath(pathname)
  if (item.match === 'custom' && item.customMatch) return item.customMatch(p)
  const t = normalizePath(item.to)
  if (item.match === 'exact') return p === t
  if (item.match === 'prefix') return p === t || p.startsWith(`${t}/`)
  return p === t || p.startsWith(`${t}/`)
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
    'mb-1.5 flex items-center gap-3 rounded-full py-2.5 text-base leading-snug tracking-tight transition-colors',
    collapsed ? 'justify-center px-0' : 'px-3',
    active
      ? 'bg-game-accent font-semibold text-game-accent-foreground shadow-[0_4px_14px_rgb(106_90_224/0.38)]'
      : 'font-medium text-game-muted hover:bg-white/80 hover:text-game-soft-foreground'
  )

  const inner = (
    <>
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0',
          active ? 'text-game-accent-foreground' : 'text-game-muted'
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
  if (collapsed) return <div className="my-1 h-px bg-[hsl(248_35%_88%)]" aria-hidden />
  return (
    <div className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.14em] text-game-muted/80">
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
        'relative flex shrink-0 flex-col border-r border-[hsl(248_40%_88%)] bg-gradient-to-b from-game-soft via-[hsl(248_100%_98%)] to-[hsl(262_60%_96%)] font-sans transition-[width] duration-200',
        collapsed ? 'w-[4.25rem]' : 'w-64 min-w-[256px]'
      )}
    >
      <div
        className={cn(
          'border-b border-[hsl(248_35%_90%)]',
          collapsed ? 'px-2 pb-3 pt-4' : 'px-3 pb-3 pt-4'
        )}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-base font-extrabold text-game-accent shadow-[var(--shadow-game-float)] ring-2 ring-game-accent/15">
              V
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Mở rộng menu"
              title="Mở rộng menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-game-muted transition-colors hover:bg-white/70 hover:text-game-soft-foreground"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1 pl-1">
              <div className="text-lg font-extrabold tracking-tight text-game-soft-foreground">
                VCB HRM
              </div>
              <div className="mt-1 text-sm leading-snug text-game-muted">{subtitle}</div>
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
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-game-muted transition-colors hover:bg-white/70 hover:text-game-soft-foreground"
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
                  active={isActive(pathname, item)}
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
                  active={isActive(pathname, item)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <SectionLabel collapsed={collapsed}>Cộng đồng</SectionLabel>
            <div
              className={cn(
                'mb-1 flex cursor-not-allowed items-center gap-3 rounded-full py-2.5 text-base font-medium text-game-muted/50 opacity-80',
                collapsed ? 'justify-center px-0' : 'px-3'
              )}
              title={collapsed ? 'Diễn đàn (sắp có)' : undefined}
              aria-disabled
            >
              <MessageCircle
                className="h-[18px] w-[18px] shrink-0 text-game-muted/40"
                strokeWidth={2}
              />
              {!collapsed ? <span>Diễn đàn</span> : null}
            </div>
          </div>
        </nav>

        <div className="shrink-0 border-t border-[hsl(248_35%_90%)] px-2 pb-4 pt-2">
          <button
            type="button"
            disabled={logoutPending}
            onClick={handleLogout}
            title={collapsed ? 'Đăng xuất' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-full py-2.5 text-base font-medium transition-colors',
              collapsed ? 'justify-center px-0' : 'px-3',
              'text-game-muted hover:bg-red-500/[0.08] hover:text-red-800',
              logoutPending && 'pointer-events-none opacity-60'
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-game-muted" strokeWidth={2} />
            {!collapsed ? <span>Đăng xuất</span> : null}
          </button>
        </div>
      </div>
    </aside>
  )
}
