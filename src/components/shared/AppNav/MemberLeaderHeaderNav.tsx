import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import {
  isNavItemActive,
  mergeCompactHeaderNavItems,
  type AppNavItem,
} from '@/components/shared/AppNav/navItems'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'

type HeaderNavGroup = {
  id: string
  label: string
  items: AppNavItem[]
}

function groupTheme(groupId: string) {
  const map: Record<
    string,
    {
      trigger: string
      triggerActive: string
      dot: string
      panel: string
      itemActive: string
    }
  > = {
    dashboard: {
      trigger:
        'hover:border-indigo-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:text-indigo-700',
      triggerActive:
        'border-indigo-200 bg-gradient-to-r from-indigo-100 via-blue-100 to-cyan-100 text-indigo-700',
      dot: 'bg-indigo-500',
      panel: 'border-indigo-100/70 bg-gradient-to-b from-indigo-50/95 via-white to-blue-50/80',
      itemActive: 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700',
    },
    learning: {
      trigger:
        'hover:border-emerald-200 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:text-emerald-700',
      triggerActive:
        'border-emerald-200 bg-gradient-to-r from-emerald-100 via-teal-100 to-cyan-100 text-emerald-700',
      dot: 'bg-emerald-500',
      panel: 'border-emerald-100/70 bg-gradient-to-b from-emerald-50/95 via-white to-teal-50/80',
      itemActive: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700',
    },
    kpi: {
      trigger:
        'hover:border-fuchsia-200 hover:bg-gradient-to-r hover:from-fuchsia-50 hover:to-violet-50 hover:text-fuchsia-700',
      triggerActive:
        'border-fuchsia-200 bg-gradient-to-r from-fuchsia-100 via-violet-100 to-indigo-100 text-fuchsia-700',
      dot: 'bg-fuchsia-500',
      panel: 'border-fuchsia-100/70 bg-gradient-to-b from-fuchsia-50/95 via-white to-violet-50/80',
      itemActive: 'bg-gradient-to-r from-fuchsia-100 to-violet-100 text-fuchsia-700',
    },
    manager: {
      trigger:
        'hover:border-amber-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-700',
      triggerActive:
        'border-amber-200 bg-gradient-to-r from-amber-100 via-orange-100 to-rose-100 text-amber-700',
      dot: 'bg-amber-500',
      panel: 'border-amber-100/70 bg-gradient-to-b from-amber-50/95 via-white to-orange-50/80',
      itemActive: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700',
    },
    hr: {
      trigger:
        'hover:border-sky-200 hover:bg-gradient-to-r hover:from-sky-50 hover:to-cyan-50 hover:text-sky-700',
      triggerActive:
        'border-sky-200 bg-gradient-to-r from-sky-100 via-cyan-100 to-blue-100 text-sky-700',
      dot: 'bg-sky-500',
      panel: 'border-sky-100/70 bg-gradient-to-b from-sky-50/95 via-white to-cyan-50/80',
      itemActive: 'bg-gradient-to-r from-sky-100 to-cyan-100 text-sky-700',
    },
    teacher: {
      trigger:
        'hover:border-rose-200 hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 hover:text-rose-700',
      triggerActive:
        'border-rose-200 bg-gradient-to-r from-rose-100 via-pink-100 to-fuchsia-100 text-rose-700',
      dot: 'bg-rose-500',
      panel: 'border-rose-100/70 bg-gradient-to-b from-rose-50/95 via-white to-pink-50/80',
      itemActive: 'bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700',
    },
    bod: {
      trigger:
        'hover:border-violet-200 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 hover:text-violet-700',
      triggerActive:
        'border-violet-200 bg-gradient-to-r from-violet-100 via-purple-100 to-fuchsia-100 text-violet-700',
      dot: 'bg-violet-500',
      panel: 'border-violet-100/70 bg-gradient-to-b from-violet-50/95 via-white to-purple-50/80',
      itemActive: 'bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700',
    },
    other: {
      trigger:
        'hover:border-slate-200 hover:bg-gradient-to-r hover:from-slate-50 hover:to-zinc-50 hover:text-slate-700',
      triggerActive:
        'border-slate-200 bg-gradient-to-r from-slate-100 via-zinc-100 to-stone-100 text-slate-700',
      dot: 'bg-slate-500',
      panel: 'border-slate-100/70 bg-gradient-to-b from-slate-50/95 via-white to-zinc-50/80',
      itemActive: 'bg-gradient-to-r from-slate-100 to-zinc-100 text-slate-700',
    },
  }
  const fallback = map.other
  if (!fallback) {
    return {
      trigger:
        'hover:border-slate-200 hover:bg-gradient-to-r hover:from-slate-50 hover:to-zinc-50 hover:text-slate-700',
      triggerActive:
        'border-slate-200 bg-gradient-to-r from-slate-100 via-zinc-100 to-stone-100 text-slate-700',
      dot: 'bg-slate-500',
      panel: 'border-slate-100/70 bg-gradient-to-b from-slate-50/95 via-white to-zinc-50/80',
      itemActive: 'bg-gradient-to-r from-slate-100 to-zinc-100 text-slate-700',
    }
  }
  return map[groupId] ?? fallback
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

function HeaderNavLink({
  item,
  active,
  itemActiveClass,
}: {
  item: AppNavItem
  active: boolean
  itemActiveClass: string
}) {
  const Icon = item.icon
  const className = cn(
    'inline-flex h-9 w-full flex-none shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-sm font-medium tracking-tight transition-colors sm:gap-2.5 sm:px-3 sm:text-[0.9375rem]',
    active
      ? cn('font-semibold shadow-sm', itemActiveClass)
      : 'text-muted-foreground hover:bg-primary-50/70 hover:text-primary-600'
  )

  const inner = (
    <>
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]',
          active ? 'text-primary-600' : 'text-muted-foreground'
        )}
        strokeWidth={2.25}
      />
      <span className="whitespace-nowrap">{item.label}</span>
    </>
  )

  if (item.search !== undefined) {
    return (
      <Link to={item.to} search={item.search} className={className}>
        {inner}
      </Link>
    )
  }

  return (
    <Link to={item.to} className={className}>
      {inner}
    </Link>
  )
}

/** Điều hướng ngang trên header — gộp theo quyền hiệu lực (RBAC động). */
export function MemberLeaderHeaderNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { canId } = usePermission()
  const items = mergeCompactHeaderNavItems(canId)
  const groups = buildHeaderGroups(items)

  return (
    <nav
      className="inline-flex w-max shrink-0 flex-nowrap items-center gap-1"
      aria-label="Điều hướng chính"
    >
      {groups.map((group) => {
        const active = group.items.some((item) => isNavItemActive(pathname, item))
        const theme = groupTheme(group.id)
        return (
          <DropdownMenu key={group.id} modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-transparent px-3 text-sm font-semibold shadow-sm transition-all',
                  active
                    ? theme.triggerActive
                    : cn('text-muted-foreground hover:-translate-y-0.5', theme.trigger)
                )}
                aria-label={`Mở menu ${group.label}`}
              >
                <span className={cn('h-2 w-2 rounded-full', theme.dot)} aria-hidden />
                <span>{group.label}</span>
                <ChevronDown className="h-4 w-4" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className={cn('min-w-[15.5rem] rounded-xl border p-1.5 shadow-lg', theme.panel)}
            >
              {group.items.map((item) => (
                <HeaderNavLink
                  key={item.to + item.label}
                  item={item}
                  active={isNavItemActive(pathname, item)}
                  itemActiveClass={theme.itemActive}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
    </nav>
  )
}
