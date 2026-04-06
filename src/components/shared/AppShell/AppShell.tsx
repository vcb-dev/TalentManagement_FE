import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Bell, ChevronDown, LogOut, Star, UserCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useLogout } from '@/features/auth/hooks'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MemberLeaderHeaderNav } from '@/components/shared/AppNav/MemberLeaderHeaderNav'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { Sidebar } from '@/components/shared/Sidebar'
import { demoGamificationFromSeed } from '@/lib/demoGamification'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

export interface AppShellProps {
  children: ReactNode
  title?: string
}

export function AppShell({ children, title }: AppShellProps) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { mutate: logout, isPending: logoutPending } = useLogout()
  const displayName = user?.name ?? 'Người dùng'
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const seed = user?.email ?? user?.name ?? 'demo'
  const { points } = useMemo(() => demoGamificationFromSeed(seed), [seed])
  /** Không dùng sidebar — điều hướng bằng header ngang. */
  const compactNavNoSidebar =
    user?.role === 'MEMBER' ||
    user?.role === 'LEADER' ||
    user?.role === 'HR_ADMIN' ||
    user?.role === 'TEACHER'

  const toolbar = (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1.5 sm:gap-3">
      <div className="hidden items-center gap-1 rounded-full bg-rank-bg px-2.5 py-1 text-[13px] font-semibold text-rank-text sm:flex">
        <Star className="h-4 w-4 shrink-0 fill-tier-gold text-tier-gold" strokeWidth={0} />
        <span>Hạng Vàng</span>
      </div>
      <div className="hidden items-center gap-1 rounded-full bg-points-bg px-2.5 py-1 text-[13px] font-semibold text-white md:flex">
        <span>{points.toLocaleString('vi-VN')} pts</span>
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
              'group ml-0.5 flex max-w-[min(100vw-8rem,300px)] items-center gap-2 rounded-full border border-primary-600/15 bg-primary-50 py-1 pl-1 pr-2 text-left shadow-sm outline-none transition-[box-shadow,background-color] hover:bg-primary-100/80 focus-visible:ring-2 focus-visible:ring-primary-600/30 sm:pr-2.5 md:pr-3'
            )}
            aria-label="Mở menu hồ sơ cá nhân"
            aria-haspopup="menu"
          >
            <EmployeeAvatar
              name={displayName}
              showOnlineDot
              className="h-9 w-9 border-2 border-white bg-gradient-to-br from-primary-600 to-primary-500 text-[12px] font-bold text-white sm:h-10 sm:w-10"
            />
            <span className="hidden min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 sm:inline md:max-w-[180px]">
              {displayName}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={logoutPending}
            className="cursor-pointer gap-2"
            onClick={() =>
              logout(undefined, {
                onSuccess: () => {
                  void navigate({ to: '/login' })
                },
              })
            }
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-app-canvas">
      {!compactNavNoSidebar ? <Sidebar /> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            'sticky top-0 z-30 shrink-0 border-b border-gray-200 bg-white/95 px-4 py-2 shadow-[var(--shadow-card)] backdrop-blur-sm sm:px-6',
            compactNavNoSidebar
              ? 'flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2'
              : 'flex min-h-14 flex-wrap items-center gap-2 sm:gap-3'
          )}
        >
          {compactNavNoSidebar && user ? (
            <>
              <div className="flex min-h-10 min-w-0 flex-1 items-center gap-6 sm:gap-8">
                <Link
                  to={
                    user.role === 'HR_ADMIN'
                      ? '/hr-admin'
                      : user.role === 'TEACHER'
                        ? '/teacher/classes'
                        : '/dashboard'
                  }
                  search={user.role === 'HR_ADMIN' ? { page: 1 } : undefined}
                  className="flex h-10 shrink-0 items-center text-lg font-bold leading-none tracking-tight text-primary-600 sm:text-[18px]"
                >
                  VCB HRM
                </Link>
                <div className="min-w-0 flex-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <MemberLeaderHeaderNav
                    role={
                      user.role === 'LEADER'
                        ? 'LEADER'
                        : user.role === 'HR_ADMIN'
                          ? 'HR_ADMIN'
                          : user.role === 'TEACHER'
                            ? 'TEACHER'
                            : 'MEMBER'
                    }
                  />
                </div>
              </div>
              {toolbar}
            </>
          ) : (
            <>
              {title ? (
                <span className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-primary-600 sm:text-[18px]">
                  {title}
                </span>
              ) : (
                <span className="min-w-0 flex-1" aria-hidden />
              )}
              {toolbar}
            </>
          )}
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-5 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
