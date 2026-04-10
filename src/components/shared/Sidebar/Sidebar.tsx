import { useEffect, useMemo, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import {
  BOD_ITEMS,
  HR_ITEMS,
  LEADER_KPI_ITEMS,
  MANAGER_OPS_ITEMS,
  MEMBER_SELF_ITEMS,
  TEACHER_HEADER_ITEMS,
  type AppNavItem,
  filterNavByPermissions,
  isNavItemActive,
} from '@/components/shared/AppNav/navItems'
import { cn } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import { formatRoleLabelsVi } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
type NavItem = AppNavItem

type SidebarSection = { label: string; items: NavItem[] }

function navItemDedupeKey(item: NavItem): string {
  return item.to + (item.search !== undefined ? JSON.stringify(item.search) : '')
}

/** Sidebar (BOD / Quản lý): hiển thị từng nhóm nếu có ít nhất một mục sau lọc quyền. Trùng `to` giữa các nhóm chỉ hiển thị một lần (thứ tự: BOD → Quản lý → HR → …). */
function sidebarSectionsFromPermissions(canId: (id: string) => boolean): SidebarSection[] {
  const out: SidebarSection[] = []
  const seenTo = new Set<string>()
  const pushSection = (label: string, source: NavItem[]) => {
    const items = filterNavByPermissions(source, canId).filter((item) => {
      const key = navItemDedupeKey(item)
      if (seenTo.has(key)) return false
      seenTo.add(key)
      return true
    })
    if (items.length) out.push({ label, items })
  }
  pushSection('BOD', BOD_ITEMS)
  pushSection('Quản lý', MANAGER_OPS_ITEMS)
  pushSection('HR', HR_ITEMS)
  pushSection('Trưởng nhóm KPI', LEADER_KPI_ITEMS)
  pushSection('Của tôi', MEMBER_SELF_ITEMS)
  pushSection('Giảng viên / chấm thi', TEACHER_HEADER_ITEMS)
  return out
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

function SidebarNavSection({
  label,
  sectionDomId,
  items,
  pathname,
  collapsed,
  open,
  onToggle,
  sectionIndex,
}: {
  label: string
  /** id HTML ổn định (tránh ký tự đặc biệt trong nhãn tiếng Việt). */
  sectionDomId: string
  items: NavItem[]
  pathname: string
  collapsed: boolean
  open: boolean
  onToggle: () => void
  sectionIndex: number
}) {
  if (collapsed) {
    return (
      <div className={cn(sectionIndex > 0 && 'mt-4')}>
        <SectionLabel collapsed={collapsed}>{label}</SectionLabel>
        {items.map((item) => (
          <NavLink
            key={navItemDedupeKey(item) + item.label}
            item={item}
            active={isNavItemActive(pathname, item)}
            collapsed={collapsed}
          />
        ))}
      </div>
    )
  }

  const triggerId = `${sectionDomId}-trigger`

  return (
    <div className={cn(sectionIndex > 0 && 'mt-1')}>
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={sectionDomId}
        onClick={onToggle}
        className="mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
      >
        <span className="min-w-0 truncate pl-1">{label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90'
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={sectionDomId} role="region" aria-labelledby={triggerId} className="space-y-0">
          {items.map((item) => (
            <NavLink
              key={navItemDedupeKey(item) + item.label}
              item={item}
              active={isNavItemActive(pathname, item)}
              collapsed={collapsed}
            />
          ))}
        </div>
      ) : null}
    </div>
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

  const sections = useMemo(() => sidebarSectionsFromPermissions(canId), [canId])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Mở accordion của section chứa route sau khi điều hướng (không có cách derive thuần thay thế hành vi này).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ mở section theo pathname
    setOpenSections((prev) => {
      const next = { ...prev }
      let changed = false
      for (const s of sections) {
        if (s.items.some((item) => isNavItemActive(pathname, item))) {
          if (next[s.label] !== true) {
            next[s.label] = true
            changed = true
          }
        }
      }
      return changed ? next : prev
    })
  }, [pathname, sections])

  const displayName = user?.name ?? 'Người dùng'
  const roleLabel = user ? formatRoleLabelsVi(user) : '—'
  const subtitle = `${displayName} · ${roleLabel}`

  /** Mặc định đóng để menu không kéo dài tràn màn hình; section chứa route hiện tại được mở trong effect theo pathname. */
  const isSectionOpen = (label: string) => openSections[label] ?? false

  const toggleSection = (label: string) => {
    setOpenSections((prev) => {
      const cur = prev[label] ?? false
      return { ...prev, [label]: !cur }
    })
  }

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
        <nav
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3"
          aria-label="Menu điều hướng"
        >
          {sections.map((section, sIdx) => (
            <SidebarNavSection
              key={section.label}
              label={section.label}
              sectionDomId={`sidebar-nav-section-${sIdx}`}
              items={section.items}
              pathname={pathname}
              collapsed={collapsed}
              open={isSectionOpen(section.label)}
              onToggle={() => toggleSection(section.label)}
              sectionIndex={sIdx}
            />
          ))}

          <div className={cn(sections.length > 0 && 'mt-3')}>
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
