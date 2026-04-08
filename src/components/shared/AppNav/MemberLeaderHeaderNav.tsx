import { Link, useRouterState } from '@tanstack/react-router'
import {
  HR_ITEMS,
  LEADER_KPI_ITEMS,
  MEMBER_SELF_ITEMS,
  TEACHER_HEADER_ITEMS,
  filterNavByPermissions,
  isNavItemActive,
  type AppNavItem,
} from '@/components/shared/AppNav/navItems'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/auth'

function HeaderNavLink({ item, active }: { item: AppNavItem; active: boolean }) {
  const Icon = item.icon
  const className = cn(
    'flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent px-2 text-sm font-medium tracking-tight sm:gap-2.5 sm:px-3 sm:text-[0.9375rem]',
    active
      ? 'border-primary-600 font-semibold text-primary-600'
      : 'text-gray-700 hover:text-primary-600'
  )

  const inner = (
    <>
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]',
          active ? 'text-primary-600' : 'text-gray-600'
        )}
        strokeWidth={2.25}
      />
      <span>{item.label}</span>
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

export interface MemberLeaderHeaderNavProps {
  role: Extract<Role, 'MEMBER' | 'LEADER' | 'HR' | 'TEACHER'>
}

/** Điều hướng ngang trên header — thay sidebar cho Member / Leader / HR Admin / Teacher. */
export function MemberLeaderHeaderNav({ role }: MemberLeaderHeaderNavProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { canId } = usePermission()
  const rawItems =
    role === 'LEADER'
      ? LEADER_KPI_ITEMS
      : role === 'HR'
        ? HR_ITEMS
        : role === 'TEACHER'
          ? TEACHER_HEADER_ITEMS
          : MEMBER_SELF_ITEMS
  const items = filterNavByPermissions(rawItems, canId)

  return (
    <nav
      className="flex w-full min-w-0 items-center gap-0 overflow-x-auto overflow-y-visible [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1 [&::-webkit-scrollbar]:hidden"
      aria-label="Điều hướng chính"
    >
      {items.map((item) => (
        <HeaderNavLink
          key={item.to + item.label}
          item={item}
          active={isNavItemActive(pathname, item)}
        />
      ))}
    </nav>
  )
}
