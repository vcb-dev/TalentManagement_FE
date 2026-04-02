import { toast } from 'sonner'
import { SkeletonApprovalCardList } from '@/components/ui/skeleton'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { ManagerHubNav } from '@/features/manager/components/ManagerHub/ManagerHubNav'
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

  const onGraderConfirm = (id: string) => {
    toast.success('Đã xác nhận kết quả chấm')
    void id
  }

  const onGraderRedo = (id: string) => {
    toast.info('Đã gửi yêu cầu chấm lại (demo)')
    void id
  }

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="page-toolbar-flat">
        <div>
          <div className="text-base font-semibold tracking-tight text-foreground">
            Duyệt thăng cấp & thăng sao
          </div>
          <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
            Phê duyệt khi nhân viên đủ điều kiện; có thể từ chối kèm lý do (nối API).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#FEF3C7] px-2.5 py-1 text-xs font-bold text-[#92400E]">
            {page?.pendingCount ?? 0} chờ duyệt
          </span>
          <span className="rounded-full bg-[#EAF3DE] px-2.5 py-1 text-xs font-medium text-[#375623]">
            {displayName} ({roleLabel})
          </span>
        </div>
      </div>

      <ManagerHubNav />

      <div className="page-shell">
        {isLoading ? (
          <SkeletonApprovalCardList count={5} />
        ) : !page ? (
          <div
            className={cn(
              'rounded-xl border border-border bg-card p-8 text-center text-muted-foreground',
              CARD_ENTRANCE_HOVER
            )}
          >
            Không có dữ liệu
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {page.promotions.map((p, pi) => (
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
                      <span className="text-xs font-medium text-muted-foreground">
                        Đã xử lý
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {page.graderReviews.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
                <div className="card-section-header">
                  Duyệt bài người chấm đã chấm
                </div>
                <div className="p-4">
                  {page.graderReviews.map((row, idx) => (
                    <div
                      key={row.id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-2 py-2 text-xs',
                        idx < page.graderReviews.length - 1 && 'border-b border-border'
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
          </>
        )}
      </div>
    </div>
  )
}
