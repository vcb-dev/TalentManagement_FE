import { Link, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  LayoutList,
  School,
  Users,
  FileCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-3 py-2.5 shadow-[var(--shadow-card)] backdrop-blur-sm md:px-4">
      <div className="mx-auto flex max-w-[1400px] flex-wrap gap-1.5 md:gap-2">
        {MANAGER_NAV.map((item) => {
          const Icon = item.icon
          const active = navActive(pathname, item)
          return (
            <Button
              key={item.to}
              asChild
              size="sm"
              variant={active ? 'default' : 'outline'}
              className={cn(
                'h-auto min-h-0 gap-1.5 px-3 py-1.5 text-xs md:text-sm transition-all duration-200 active:scale-95',
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
  )
}
