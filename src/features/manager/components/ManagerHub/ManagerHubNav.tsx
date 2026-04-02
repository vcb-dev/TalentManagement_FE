import { Link, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  LayoutList,
  School,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavDef = {
  to: string
  label: string
  icon: LucideIcon
  /** `exact` — khớp đúng path; `prefix` — path bắt đầu bằng `to`; `team-hub` — danh sách team + chi tiết `/manager/team/...` */
  match: 'exact' | 'prefix' | 'team-hub'
}

const MANAGER_NAV: NavDef[] = [
  { to: '/manager/team-progress', label: 'Tiến độ nhóm', icon: Users, match: 'team-hub' },
  { to: '/manager/classes', label: 'Chia lớp', icon: School, match: 'prefix' },
  { to: '/manager/review-submissions', label: 'Duyệt bài làm', icon: ClipboardCheck, match: 'prefix' },
  { to: '/manager/exam-schedule', label: 'Lịch thi', icon: CalendarClock, match: 'prefix' },
  { to: '/manager/approvals', label: 'Thăng cấp / sao', icon: LayoutList, match: 'prefix' },
  { to: '/manager/exercises', label: 'Bài tập lộ trình', icon: BookOpen, match: 'prefix' },
]

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1)
  return p
}

function navActive(pathname: string, item: NavDef): boolean {
  const p = normalizePath(pathname)
  const t = normalizePath(item.to)
  if (item.match === 'team-hub') {
    return p === t || p.startsWith('/manager/team/')
  }
  if (item.match === 'exact') return p === t
  return p === t || p.startsWith(`${t}/`)
}

export function ManagerHubNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="sticky top-0 z-10 border-b border-[hsl(248_35%_90%)] bg-gradient-to-r from-white/98 via-[hsl(248_100%_99%)] to-white/95 px-3 py-2.5 shadow-[0_6px_20px_-12px_rgb(106_90_224/0.25)] backdrop-blur-sm md:px-4">
      <div className="mx-auto flex max-w-[1400px] flex-wrap gap-1.5 md:gap-2">
        {MANAGER_NAV.map((item) => {
          const Icon = item.icon
          const active = navActive(pathname, item)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors md:text-sm',
                active
                  ? 'bg-game-accent text-game-accent-foreground shadow-[0_4px_14px_rgb(106_90_224/0.35)]'
                  : 'border border-border/80 bg-card text-muted-foreground hover:border-primary/25 hover:bg-primary/[0.06] hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" strokeWidth={2} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
