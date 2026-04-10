import { Link, useRouterState } from '@tanstack/react-router'
import {
  isNavItemActive,
  mergeCompactHeaderNavItems,
  type AppNavItem,
} from '@/components/shared/AppNav/navItems'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'

function HeaderNavLink({ item, active }: { item: AppNavItem; active: boolean }) {
  const Icon = item.icon
  const className = cn(
    'inline-flex h-10 flex-none shrink-0 items-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent px-2 text-sm font-medium tracking-tight sm:gap-2.5 sm:px-3 sm:text-[0.9375rem]',
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

  return (
    <nav
      className="inline-flex w-max shrink-0 flex-nowrap items-center gap-0 sm:gap-1"
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
