import { Link, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  CalendarClock,
  LayoutList,
  School,
  Sparkles,
  Users,
  FileCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'

type NavDef = {
  to: string
  label: string
  icon: LucideIcon
  match: 'exact' | 'prefix'
}

const MANAGER_NAV: NavDef[] = [
  { to: '/hr-admin', label: 'Danh sách nhân sự', icon: Users, match: 'prefix' },
  { to: '/manager/classes', label: 'Chia lớp', icon: School, match: 'prefix' },
  { to: '/manager/exam-schedule', label: 'Lịch thi', icon: CalendarClock, match: 'prefix' },
  { to: '/manager/approvals', label: 'Thăng cấp / sao', icon: LayoutList, match: 'prefix' },
  {
    to: '/manager/learning-submissions',
    label: 'Duyệt minh chứng',
    icon: FileCheck,
    match: 'prefix',
  },
  { to: '/manager/exercises', label: 'Bài tập lộ trình', icon: BookOpen, match: 'prefix' },
]

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1)
  return p
}

function navActive(pathname: string, item: NavDef): boolean {
  const p = normalizePath(pathname)
  const t = normalizePath(item.to)
  if (item.match === 'exact') return p === t
  return p === t || p.startsWith(`${t}/`)
}

export function ManagerHubNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { canId } = usePermission()

  const items: NavDef[] = [
    ...MANAGER_NAV,
    ...(canId('company.landing.edit')
      ? ([
          {
            to: '/hr-admin/settings/company-landing',
            label: 'Trang giới thiệu công ty',
            icon: Sparkles,
            match: 'prefix',
          },
        ] satisfies NavDef[])
      : []),
  ]

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-card/95 py-2 shadow-[var(--shadow-card)] backdrop-blur-sm md:py-2.5">
      <div className="mx-auto max-w-[1400px] px-1 sm:px-2 md:px-4">
        <div
          className={cn(
            'flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]',
            'md:flex-wrap md:overflow-x-visible md:pb-0',
            '[&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border'
          )}
        >
          {items.map((item) => {
            const Icon = item.icon
            const active = navActive(pathname, item)
            return (
              <Button
                key={item.to}
                asChild
                size="sm"
                variant={active ? 'default' : 'outline'}
                className={cn(
                  'h-auto min-h-0 shrink-0 gap-1.5 px-3 py-1.5 text-xs md:shrink md:text-sm transition-all duration-200 active:scale-95',
                  active
                    ? 'shadow-[var(--shadow-game-float)]'
                    : 'border-border/80 bg-card text-muted-foreground hover:border-primary/25 hover:bg-primary/[0.06] hover:text-foreground'
                )}
              >
                <Link to={item.to} preload="intent">
                  <Icon className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" strokeWidth={2} />
                  {item.label}
                </Link>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
