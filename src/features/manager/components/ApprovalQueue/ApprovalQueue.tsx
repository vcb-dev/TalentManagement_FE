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
import { Button } from '@/components/ui/button'
import { SkeletonApprovalCardList } from '@/components/ui/skeleton'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { ManagerScreenLayout } from '@/features/manager/components/ManagerHub/ManagerScreenLayout'
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
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

export function ApprovalQueue({ page, isLoading, onApprove, onReject }: ApprovalQueueProps) {
  const user = useAuthStore((s) => s.user)
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const displayName = user?.name ?? 'Manager'

  const pendingCount = page?.pendingCount ?? 0
  const hasPromotions = !!page && page.promotions.length > 0
  const hasGrader = !!page && page.graderReviews.length > 0
  const showQueueEmpty = !!page && !hasPromotions && !hasGrader
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

  const pageSubtitle =
    'Phê duyệt khi nhân viên đủ điều kiện; có thể từ chối kèm lý do (nối API).'

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              <span className="bg-gradient-to-r from-primary via-teal-700 to-violet-700 bg-clip-text text-transparent">
                Duyệt thăng cấp & thăng sao
              </span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">{pageSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-primary/10">
              <LayoutList className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
              {pendingCount} chờ duyệt
            </span>
            <Button
              type="button"
              className="gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md"
              onClick={onQuickApprove}
            >
              <Zap className="h-4 w-4" strokeWidth={2} />
              Duyệt nhanh
            </Button>
            <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-50/90 px-3 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm ring-1 ring-emerald-500/10 dark:bg-emerald-950/30 dark:text-emerald-50">
              <User className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" strokeWidth={2} />
              {displayName} ({roleLabel})
            </span>
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
                    to="/manager/team-progress"
                    className="rounded-xl border border-primary/20 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-card"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" strokeWidth={2} />
                      Xem lịch sử
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
                      Tải lại trang
                    </span>
                  </button>
                </div>
              </div>
            )}

            {hasPromotions && (
              <div className="space-y-3">
                {page!.promotions.map((p, pi) => (
                  <div
                    key={p.id}
                    className={cn(
                      'flex flex-wrap items-start gap-3 rounded-[9px] border p-4 shadow-[0_1px_3px_rgba(30,58,95,.04)]',
                      CARD_ENTRANCE_HOVER,
                      p.highlighted ? 'border-primary/30 bg-primary/10' : 'border-border bg-card',
                      p.state === 'waiting' && 'opacity-70',
                      p.state === 'done' && 'opacity-60'
                    )}
                    style={staggerStyle(pi, 55)}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        p.avatarClass ?? 'bg-primary/10 text-primary'
                      )}
                    >
                      {p.initials ?? initialsFromName(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{p.name}</div>
                      <div className="mt-1 text-sm leading-snug text-muted-foreground">
                        {p.description}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.badges.map((b, i) => (
                          <span
                            key={i}
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold',
                              BADGE_TONE[b.tone] ?? BADGE_TONE.neutral
                            )}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 self-center">
                      {p.state === 'actionable' && onApprove && (
                        <button
                          type="button"
                          onClick={() => onApprove(p.id)}
                          className="whitespace-nowrap rounded-[9px] border border-[#67E8F9] bg-[#CFFAFE] px-3 py-1.5 text-xs font-medium text-[#0E7490] transition-colors hover:bg-[#B2E8E2]"
                        >
                          ✓ Duyệt thăng
                        </button>
                      )}
                      {p.state === 'actionable' && onReject && (
                        <button
                          type="button"
                          onClick={() => onReject(p.id)}
                          className="whitespace-nowrap rounded-[9px] border border-[#FCA5A5] bg-[#FEE2E2] px-3 py-1.5 text-xs font-medium text-[#991B1B] transition-colors hover:bg-[#FECACA]"
                        >
                          ✗ Từ chối
                        </button>
                      )}
                      {p.state === 'waiting' && (
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed whitespace-nowrap rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-50"
                        >
                          {p.stateLabel ?? 'Chờ chấm xong'}
                        </button>
                      )}
                      {p.state === 'done' && (
                        <span className="text-xs font-medium text-muted-foreground">Đã xử lý</span>
                      )}
                    </div>
                  </div>
                ))}
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
                        <button
                          type="button"
                          onClick={() => onGraderConfirm(row.id)}
                          className="rounded-[9px] border border-[#67E8F9] bg-[#CFFAFE] px-2.5 py-1 text-xs font-medium text-[#0E7490] hover:bg-[#B2E8E2]"
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => onGraderRedo(row.id)}
                          className="rounded-[9px] border border-[#FCA5A5] bg-[#FEE2E2] px-2.5 py-1 text-xs font-medium text-[#991B1B] hover:bg-[#FECACA]"
                        >
                          Chấm lại
                        </button>
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
