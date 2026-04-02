import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Bell, ChevronDown, Crown, Star, UserCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { demoGamificationFromSeed } from '@/lib/demoGamification'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { Sidebar } from '@/components/shared/Sidebar'
import { cn } from '@/lib/utils'

export interface AppShellProps {
  children: ReactNode
  title?: string
}

export function AppShell({ children, title }: AppShellProps) {
  const user = useAuthStore((s) => s.user)
  const displayName = user?.name ?? 'Người dùng'
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const seed = user?.email ?? user?.name ?? 'demo'
  const { points, rank } = useMemo(() => demoGamificationFromSeed(seed), [seed])

  return (
    <div className="flex min-h-screen bg-app-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-30 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-[hsl(248_35%_90%)] bg-white/95 px-4 py-2 shadow-[0_4px_24px_-8px_rgb(106_90_224/0.12)] backdrop-blur-sm sm:gap-3 sm:px-6">
          {title ? (
            <span className="min-w-0 flex-1 truncate text-base font-bold tracking-tight text-game-soft-foreground sm:text-lg">
              {title}
            </span>
          ) : (
            <span className="min-w-0 flex-1" aria-hidden />
          )}
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-1.5 sm:flex-none sm:gap-3">
            <div className="hidden items-center gap-1 rounded-full bg-game-soft px-2 py-1 text-sm font-semibold text-game-soft-foreground sm:flex">
              <Star className="h-4 w-4 shrink-0 fill-[#EAB308] text-[#EAB308]" strokeWidth={0} />
              <span>{points.toLocaleString('vi-VN')} pts</span>
            </div>
            <div className="hidden items-center gap-1 rounded-full bg-game-soft px-2 py-1 text-sm font-semibold text-game-soft-foreground md:flex">
              <Crown className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={2} />
              <span>#{rank}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Thông báo"
              onClick={() => toast.info('Chưa có thông báo mới (demo)')}
            >
              <Bell className="h-5 w-5" strokeWidth={2} />
            </Button>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Nhấn để mở hồ sơ cá nhân"
                  className={cn(
                    'group ml-0.5 flex max-w-[min(100vw-8rem,300px)] items-center gap-2 rounded-full border border-game-accent/15 bg-game-soft py-1 pl-1 pr-2 text-left shadow-sm outline-none transition-[box-shadow,background-color] hover:bg-[hsl(248_100%_97%)] focus-visible:ring-2 focus-visible:ring-game-accent/35 sm:pr-2.5 md:pr-3'
                  )}
                  aria-label="Mở menu hồ sơ cá nhân"
                  aria-haspopup="menu"
                >
                  <EmployeeAvatar
                    name={displayName}
                    showOnlineDot
                    className="h-9 w-9 border-2 border-white bg-gradient-to-br from-game-accent/90 to-[hsl(262_55%_52%)] text-[12px] font-bold text-white sm:h-10 sm:w-10"
                  />
                  <span className="hidden min-w-0 flex-1 truncate text-sm font-semibold text-game-soft-foreground sm:inline md:max-w-[180px]">
                    {displayName}
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-game-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-[min(calc(100vw-2rem),17rem)]">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
                    <span className="text-xs text-muted-foreground">{roleLabel}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to="/profile"
                    className="flex cursor-pointer flex-col items-stretch gap-0.5 py-2.5 !no-underline"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <UserCircle className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                      Hồ sơ cá nhân
                    </span>
                    <span className="pl-6 text-xs leading-snug text-muted-foreground">
                      Xem và chỉnh sửa thông tin, số điện thoại, mật khẩu
                    </span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-auto p-5 md:p-6">{children}</main>
      </div>
    </div>
  )
}
