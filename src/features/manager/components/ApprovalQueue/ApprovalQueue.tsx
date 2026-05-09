import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Award,
  History,
  Inbox,
  LayoutList,
  Medal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { SkeletonApprovalCardList } from '@/components/ui/skeleton'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { ManagerScreenLayout } from '@/features/manager/components/ManagerHub/ManagerScreenLayout'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ApprovalsPage } from '@/features/manager/types'

const BADGE_TONE: Record<string, string> = {
  success: 'bg-[#DCFCE7] text-[#166534]',
  neutral: 'border border-border bg-muted text-muted-foreground',
  warning: 'bg-[#FEF3C7] text-[#92400E]',
  danger: 'bg-[#FEE2E2] text-[#991B1B]',
  info: 'bg-primary/10 text-primary',
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? '?'
    const b = parts[parts.length - 1]?.[0] ?? '?'
    return (a + b).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export interface ApprovalQueueProps {
  page: ApprovalsPage | undefined
  isLoading: boolean
  isApproving?: string | null
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

export function ApprovalQueue({
  page,
  isLoading,
  isApproving,
  onApprove,
  onReject,
}: ApprovalQueueProps) {
  const user = useAuthStore((s) => s.user)
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const displayName = user?.name ?? 'Manager'

  const [searchQuery, setSearchQuery] = React.useState('')
  const [levelFilter, setLevelFilter] = React.useState<string>('all')
  const [teamFilter, setTeamFilter] = React.useState<string>('all')

  const pendingCount = page?.pendingCount ?? 0
  const hasPromotions = !!page && page.promotions.length > 0
  const hasGrader = !!page && page.graderReviews.length > 0

  // Extract unique teams for filtering
  const uniqueTeams = React.useMemo(() => {
    if (!page) return []
    const teams = new Set<string>()
    page.promotions.forEach((p) => {
      const match = p.description.match(/Team: (.*?) ·/)
      if (match && match[1]) teams.add(match[1])
    })
    return Array.from(teams).sort()
  }, [page])

  // Apply filters locally
  const filteredPromotions = React.useMemo(() => {
    if (!page) return []
    return page.promotions.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())

      const levelBadge = p.badges.find(
        (b) => b.label === 'Tập sự' || b.label === 'Biết việc'
      )?.label
      const matchesLevel = levelFilter === 'all' || levelBadge === levelFilter

      const matchesTeam = teamFilter === 'all' || p.description.includes(`Team: ${teamFilter}`)

      return matchesSearch && matchesLevel && matchesTeam
    })
  }, [page, searchQuery, levelFilter, teamFilter])

  const showQueueEmpty = !!page && filteredPromotions.length === 0 && !hasGrader
  const showNoPage = !page

  const onGraderConfirm = (id: string) => {
    toast.success('Đã xác nhận kết quả chấm')
    void id
  }

  const onGraderRedo = (id: string) => {
    toast.info('Đã gửi yêu cầu chấm lại (demo)')
    void id
  }

  const onQuickApprove = () => {
    if (!page?.promotions?.length) {
      toast.info('Không có dữ liệu chờ duyệt')
      return
    }
    const actionable = page.promotions.filter((p) => p.state === 'actionable')
    if (actionable.length === 0) {
      toast.info('Không có dữ liệu chờ duyệt')
      return
    }
    toast.success('Đã duyệt nhanh (demo)')
  }

  const promotionApproveLabel = (p: ApprovalsPage['promotions'][number]): React.ReactNode => {
    if (isApproving === p.id) {
      return <RefreshCw className="h-3 w-3 animate-spin" />
    }
    const starBadge = p.badges.find((b) => b.label.includes('sao'))
    const stars = starBadge ? parseInt(starBadge.label, 10) : 0

    if (stars >= 6) {
      const levelBadge = p.badges.find((b) =>
        ['Tập sự', 'Biết việc', 'Được việc'].includes(b.label)
      )
      const currentLevel = levelBadge?.label || ''
      let nextLevelLabel = 'cấp mới'
      if (currentLevel === 'Tập sự') nextLevelLabel = 'Biết việc'
      else if (currentLevel === 'Biết việc') nextLevelLabel = 'Được việc'

      return `Duyệt lên ${nextLevelLabel}`
    }

    return 'Thăng cấp sao'
  }

  const pageSubtitle = 'Phê duyệt khi nhân viên đủ điều kiện; có thể từ chối kèm lý do (nối API).'

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Duyệt thăng cấp & thăng sao</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>{pageSubtitle}</p>
          </div>
        </div>

        {/* Redesigned Filter Bar (Compact) */}
        <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-card/40 p-1.5 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Inbox className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/40" />
            <input
              type="text"
              placeholder="Tìm kiếm nhân sự..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-lg border-none bg-transparent pl-9 pr-3 text-[13px] font-medium focus:ring-0 placeholder:text-muted-foreground/40"
            />
          </div>

          <div className="hidden h-5 w-px bg-border/60 sm:block" />

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <div className="relative">
              <ShieldCheck className="absolute left-2.5 top-[50%] z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="h-auto min-h-[32px] w-full border-border bg-muted/20 pl-8 pr-2 py-1 text-xs font-semibold leading-tight sm:w-[120px]">
                  <SelectValue placeholder="Cấp bậc" />
                </SelectTrigger>
                <SelectContent className="min-w-[120px]">
                  <SelectItem className="py-1 text-xs" value="all">
                    Tất cả cấp bậc
                  </SelectItem>
                  <SelectItem className="py-1 text-xs" value="Tập sự">
                    Tập sự
                  </SelectItem>
                  <SelectItem className="py-1 text-xs" value="Biết việc">
                    Biết việc
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <LayoutList className="absolute left-2.5 top-[50%] z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="h-auto min-h-[32px] w-full border-border bg-muted/20 pl-8 pr-2 py-1 text-xs font-semibold leading-tight sm:w-[150px]">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent className="max-h-64 min-w-[150px]">
                  <SelectItem className="py-1 text-xs" value="all">
                    Tất cả Team
                  </SelectItem>
                  {uniqueTeams.map((team) => (
                    <SelectItem key={team} className="py-1 text-xs" value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || levelFilter !== 'all' || teamFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setLevelFilter('all')
                  setTeamFilter('all')
                }}
                className="h-8 rounded-lg px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                Xóa lọc
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <SkeletonApprovalCardList count={5} />
        ) : (
          <div className="space-y-8">
            {(showNoPage || showQueueEmpty) && (
              <div
                className={cn(
                  'relative flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-border/60 bg-muted/30 px-6 py-10 text-center',
                  CARD_ENTRANCE_HOVER
                )}
              >
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
                  <div className="absolute left-1/2 top-8 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
                </div>
                <div className="relative mb-6 flex h-52 w-52 items-center justify-center">
                  <div className="absolute -right-2 -top-2 flex h-14 w-14 rotate-12 items-center justify-center rounded-2xl border border-border bg-[#FEF3C7] shadow-md">
                    <Sparkles className="h-6 w-6 text-[#d97706]" strokeWidth={2} />
                  </div>
                  <div className="relative flex h-44 w-44 flex-col items-center justify-center overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                    <div className="absolute left-0 right-0 top-0 h-1.5 bg-primary" />
                    <Inbox
                      className="pointer-events-none absolute -bottom-3 -right-3 h-28 w-28 text-primary/10"
                      strokeWidth={1}
                    />
                    <ShieldCheck
                      className="relative z-10 h-12 w-12 text-primary"
                      strokeWidth={1.75}
                    />
                    <div className="relative z-10 mt-3 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary/25" />
                      <span className="h-2 w-8 rounded-full bg-primary" />
                      <span className="h-2 w-2 rounded-full bg-primary/25" />
                    </div>
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {showNoPage ? 'Không có dữ liệu' : 'Không có dữ liệu chờ duyệt'}
                </h3>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  {showNoPage
                    ? 'Không thể tải dữ liệu. Vui lòng thử lại sau.'
                    : 'Hiện tại không có yêu cầu thăng cấp hoặc thăng sao nào cần xử lý. Hãy quay lại sau!'}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/hr-admin"
                    search={{ page: 1, pageSize: 15 }}
                    className="rounded-xl border border-primary/20 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-card"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" strokeWidth={2} />
                      Xem lịch sử
                    </span>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => window.location.reload()}
                    className="rounded-xl px-4 py-2 text-xs font-semibold normal-case tracking-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
                      Tải lại trang
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {hasPromotions && (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="border-b border-border bg-muted/30 px-6 py-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Danh sách nhân sự chờ duyệt thăng cấp / sao
                  </h3>
                </div>
                <div className="divide-y divide-border md:hidden">
                  {filteredPromotions.map((p, pi) => (
                    <div
                      key={p.id}
                      className={cn(
                        'space-y-3 p-4',
                        p.state === 'waiting' && 'opacity-70',
                        p.state === 'done' && 'opacity-60'
                      )}
                      style={staggerStyle(pi, 30)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-background shadow-sm',
                            p.avatarClass ?? 'bg-primary/10 text-primary'
                          )}
                        >
                          {p.initials ?? initialsFromName(p.name)}
                        </div>
                        <span className="min-w-0 break-words text-sm font-bold text-foreground">
                          {p.name}
                        </span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.badges.map((b, i) => (
                          <span
                            key={i}
                            className={cn(
                              'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                              b.tone === 'info' && 'bg-blue-50 text-blue-700 ring-blue-700/10',
                              b.tone === 'warning' &&
                                'bg-amber-50 text-amber-700 ring-amber-700/10',
                              b.tone === 'success' &&
                                'bg-emerald-50 text-emerald-700 ring-emerald-700/10',
                              b.tone === 'danger' && 'bg-rose-50 text-rose-700 ring-rose-700/10',
                              (!b.tone || b.tone === 'neutral') &&
                                'bg-gray-50 text-gray-600 ring-gray-500/10'
                            )}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {p.state === 'actionable' && onApprove && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isApproving === p.id}
                            onClick={() => onApprove(p.id)}
                            className="h-10 w-full min-w-0 rounded-lg bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 sm:flex-1"
                          >
                            {promotionApproveLabel(p)}
                          </Button>
                        )}
                        {p.state === 'actionable' && onReject && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onReject(p.id)}
                            className="h-10 w-full rounded-lg border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-bold text-rose-700 shadow-sm hover:bg-rose-100 sm:flex-1"
                          >
                            Từ chối
                          </Button>
                        )}
                        {p.state === 'waiting' && (
                          <span className="text-[10px] font-bold text-muted-foreground rounded-md bg-muted px-2 py-1">
                            {p.stateLabel ?? 'Đang chờ'}
                          </span>
                        )}
                        {p.state === 'done' && (
                          <span className="text-[10px] font-bold italic text-muted-foreground">
                            Hoàn tất
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="px-6 py-3">Nhân sự</th>
                        <th className="px-6 py-3">Team & Phòng ban</th>
                        <th className="px-6 py-3">Thông tin thăng cấp</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPromotions.map((p, pi) => (
                        <tr
                          key={p.id}
                          className={cn(
                            'group transition-colors hover:bg-muted/30',
                            p.state === 'waiting' && 'opacity-70',
                            p.state === 'done' && 'opacity-60'
                          )}
                          style={staggerStyle(pi, 30)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-background shadow-sm',
                                  p.avatarClass ?? 'bg-primary/10 text-primary'
                                )}
                              >
                                {p.initials ?? initialsFromName(p.name)}
                              </div>
                              <span className="max-w-[150px] truncate text-sm font-bold text-foreground">
                                {p.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-medium leading-relaxed text-muted-foreground">
                              {p.description}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {p.badges.map((b, i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                                    b.tone === 'info' &&
                                      'bg-blue-50 text-blue-700 ring-blue-700/10',
                                    b.tone === 'warning' &&
                                      'bg-amber-50 text-amber-700 ring-amber-700/10',
                                    b.tone === 'success' &&
                                      'bg-emerald-50 text-emerald-700 ring-emerald-700/10',
                                    b.tone === 'danger' &&
                                      'bg-rose-50 text-rose-700 ring-rose-700/10',
                                    (!b.tone || b.tone === 'neutral') &&
                                      'bg-gray-50 text-gray-600 ring-gray-500/10'
                                  )}
                                >
                                  {b.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {p.state === 'actionable' && onApprove && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isApproving === p.id}
                                  onClick={() => onApprove(p.id)}
                                  className="h-8 min-w-[100px] rounded-lg bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
                                >
                                  {promotionApproveLabel(p)}
                                </Button>
                              )}
                              {p.state === 'actionable' && onReject && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onReject(p.id)}
                                  className="h-8 rounded-lg border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-bold text-rose-700 shadow-sm hover:bg-rose-100"
                                >
                                  Từ chối
                                </Button>
                              )}
                              {p.state === 'waiting' && (
                                <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                                  {p.stateLabel ?? 'Đang chờ'}
                                </span>
                              )}
                              {p.state === 'done' && (
                                <span className="text-[10px] font-bold italic text-muted-foreground">
                                  Hoàn tất
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {hasGrader && (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
                <div className="card-section-header">Duyệt bài người chấm đã chấm</div>
                <div className="p-4">
                  {page!.graderReviews.map((row, idx) => (
                    <div
                      key={row.id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-2 py-2 text-xs',
                        idx < page!.graderReviews.length - 1 && 'border-b border-border'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-foreground">{row.employeeName}</span>
                        <span className="text-muted-foreground"> · {row.detail} </span>
                        <span
                          className={cn(
                            'ml-1 inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-bold',
                            row.graderVerdict === 'pass'
                              ? 'bg-[#DCFCE7] text-[#166534]'
                              : 'bg-[#FEE2E2] text-[#991B1B]'
                          )}
                        >
                          {row.graderVerdict === 'pass'
                            ? 'Người chấm: Đạt'
                            : 'Người chấm: Không đạt'}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onGraderConfirm(row.id)}
                          className="rounded-[9px] border-[#67E8F9] bg-[#CFFAFE] px-2.5 py-1 text-xs font-medium text-[#0E7490] hover:bg-[#B2E8E2]"
                        >
                          Xác nhận
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onGraderRedo(row.id)}
                          className="rounded-[9px] border-[#FCA5A5] bg-[#FEE2E2] px-2.5 py-1 text-xs font-medium text-[#991B1B] hover:bg-[#FECACA]"
                        >
                          Chấm lại
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
              <div
                className={cn(
                  'group flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center lg:col-span-8',
                  CARD_ENTRANCE_HOVER
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-sm">
                    <TrendingUp className="h-7 w-7" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-sm font-semibold text-foreground">
                      Tiến độ thăng cấp tuần này
                    </h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      85% nhân sự đã hoàn thành KPI tối thiểu
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-base font-bold text-primary">12/14</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Nhân sự đủ chuẩn
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  'relative overflow-hidden rounded-3xl border border-[#FEF3C7] bg-[#FEF3C7]/80 p-5 shadow-[var(--shadow-card)] lg:col-span-4',
                  CARD_ENTRANCE_HOVER
                )}
              >
                <div className="relative z-10">
                  <Award className="mb-2 h-5 w-5 text-[#92400E]" strokeWidth={1.75} />
                  <h4 className="text-sm font-bold text-[#78350f]">Ngôi sao sáng</h4>
                  <p className="mt-1 text-xs text-[#92400E]/90">Nguyễn Văn A · 6.2k pts</p>
                </div>
                <Medal
                  className="pointer-events-none absolute -bottom-2 -right-2 h-24 w-24 rotate-12 text-[#d97706]/15"
                  strokeWidth={1}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ManagerScreenLayout>
  )
}
