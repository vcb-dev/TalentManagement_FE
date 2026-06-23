import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Bell, BellOff, ChevronDown, LogOut, UserCircle } from 'lucide-react'
import { useLogout } from '@/features/auth/hooks'
import { AssistantWidget } from '@/components/shared/AssistantWidget'
import { MemberLeaderHeaderNav } from '@/components/shared/AppNav/MemberLeaderHeaderNav'
import { MobileHeaderNav } from '@/components/shared/AppNav/MobileHeaderNav'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { Sidebar } from '@/components/shared/Sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { defaultEntryPathFromSession } from '@/lib/routeGuards'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { formatRoleLabelsVi } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import { PAGE_MAX_WIDTH_CLASS } from '@/lib/pageLayout'
import { useAuthStore } from '@/stores/auth.store'

export interface AppShellProps {
  children: ReactNode
  title?: string
}

const SHELL_HEADER_HEIGHT_CLASS = 'h-14'
const SHELL_CONTENT_PADDING_CLASS = 'p-4 sm:p-5 md:p-6'

export function AppShell({ children }: AppShellProps) {
  const user = useAuthStore((s) => s.user)
  const { mutate: logout, isPending: logoutPending } = useLogout()
  const displayName = user?.name ?? 'Người dùng'
  const roleLabel = user ? formatRoleLabelsVi(user) : '—'
  const brandHomeTo = user ? defaultEntryPathFromSession(user) : '/dashboard'
  const brandHomeSearch = brandHomeTo === '/hr-admin' ? { page: 1, pageSize: 15 } : undefined
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const cskhSearch = useRouterState({ select: (s) => s.location.search as { tab?: string } })
  const cskhTab = pathname.startsWith('/cskh-quality') ? (cskhSearch.tab ?? null) : null
  const cskhAuditLayout = pathname.startsWith('/cskh-quality') && cskhTab === 'audit'
  const wideMain = pathname.startsWith('/cskh-quality') && cskhTab !== 'config'
  const compactNavNoSidebar =
    user?.role === 'MEMBER' ||
    user?.role === 'LEADER' ||
    user?.role === 'HR' ||
    user?.role === 'TEACHER'

  const toolbar = (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-foreground/80 hover:bg-muted hover:text-foreground"
            aria-label="Thông báo"
          >
            <Bell className="h-5 w-5" strokeWidth={2} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Thông báo</p>
          </div>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <BellOff className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Bạn chưa có thông báo mới</p>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            title="Nhấn để mở hồ sơ cá nhân"
            className={cn(
              'group h-auto min-h-0 shrink-0 gap-2 rounded-full border border-border bg-card px-1 py-1 pl-1 text-left font-normal normal-case tracking-normal text-foreground shadow-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary'
            )}
            aria-label="Mở menu hồ sơ cá nhân"
            aria-haspopup="menu"
          >
            <EmployeeAvatar
              name={displayName}
              photoUrl={user?.portraitRef ? resolvePublicAssetUrl(user.portraitRef) : null}
              showOnlineDot
              className="h-8 w-8 border border-border bg-primary text-xs font-bold text-primary-foreground sm:h-9 sm:w-9"
            />
            <span className="hidden max-w-[11rem] truncate text-sm font-semibold text-foreground xl:inline">
              {displayName}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
              strokeWidth={2}
              aria-hidden
            />
          </Button>
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
            onClick={() => logout(undefined)}
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const showSidebar = !compactNavNoSidebar

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background text-foreground">
      {showSidebar ? (
        <aside className="hidden h-full min-h-0 shrink-0 lg:block">
          <Sidebar />
        </aside>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            'sticky top-0 z-30 shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85',
            SHELL_HEADER_HEIGHT_CLASS
          )}
        >
          <div className="flex h-full items-center justify-between gap-2 px-3 sm:px-4 md:px-6 lg:hidden">
            <div className="flex items-center gap-2">
              <MobileHeaderNav />
              <Link
                to={brandHomeTo}
                search={brandHomeSearch}
                className="flex h-9 shrink-0 items-center text-base font-extrabold leading-none tracking-tight text-foreground"
              >
                VCB HRM
              </Link>
            </div>
            <div className="flex shrink-0 items-center">{toolbar}</div>
          </div>

          {compactNavNoSidebar && user ? (
            <div className="hidden h-full w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 sm:gap-2.5 sm:px-5 lg:grid lg:px-6">
              <Link
                to={brandHomeTo}
                search={brandHomeSearch}
                className="flex h-9 shrink-0 items-center text-base font-extrabold leading-none tracking-tight text-foreground sm:text-[17px]"
              >
                VCB HRM
              </Link>
              <div className="relative min-h-9 min-w-0 overflow-visible">
                <div className="inline-flex max-w-full">
                  <MemberLeaderHeaderNav />
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-self-end pl-1.5 sm:pl-2.5 lg:pl-3">
                {toolbar}
              </div>
            </div>
          ) : (
            <div className="hidden h-full w-full items-center justify-end gap-2 px-4 sm:gap-3 lg:flex lg:px-6">
              {toolbar}
            </div>
          )}
        </header>

        <main
          className={cn(
            'min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-y-contain bg-background',
            wideMain
              ? cskhAuditLayout
                ? 'overflow-y-hidden'
                : 'overflow-hidden'
              : 'overflow-y-auto'
          )}
        >
          <div
            key={pathname}
            className={cn(
              'mx-auto w-full min-h-full animate-page-entrance',
              SHELL_CONTENT_PADDING_CLASS,
              wideMain ? 'flex h-full min-h-0 max-w-none flex-col' : PAGE_MAX_WIDTH_CLASS
            )}
          >
            {children}
          </div>
        </main>
      </div>
      <AssistantWidget />
    </div>
  )
}
