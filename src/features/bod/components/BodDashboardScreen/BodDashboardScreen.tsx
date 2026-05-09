import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton, SkeletonStatTile } from '@/components/ui/skeleton'
import { CARD_ENTRANCE_HOVER, PROGRESS_BAR_FILL, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import type { BodDashboardPage } from '@/features/bod/types'

const BAR_FILL: Record<BodDashboardPage['levelRows'][number]['barTone'], string> = {
  gray: 'bg-[#888780]',
  indigo: 'bg-primary',
  teal: 'bg-[#0E7490]',
  amber: 'bg-[#D97706]',
  red: 'bg-[#991B1B]',
}

const HR_BADGE: Record<BodDashboardPage['hrMovement'][number]['badgeTone'], string> = {
  green: 'bg-[#DCFCE7] text-[#166534]',
  red: 'bg-[#FEE2E2] text-[#991B1B]',
  blue: 'bg-primary/10 text-primary',
  amber: 'bg-[#FEF3C7] text-[#92400E]',
  gray: 'border border-border bg-muted text-muted-foreground',
}

const ALERT_STYLE: Record<
  BodDashboardPage['deptAlerts'][number]['tone'],
  { wrap: string; title: string }
> = {
  danger: {
    wrap: 'border-l-4 border-[#991B1B] bg-[#FEF2F2]',
    title: 'text-[#991B1B]',
  },
  warning: {
    wrap: 'border-l-4 border-[#F59E0B] bg-[#FFFBEB]',
    title: 'text-[#92400E]',
  },
  success: {
    wrap: 'border-l-4 border-[#22C55E] bg-[#F0FDF4]',
    title: 'text-[#166534]',
  },
}

function BodRadarSvg() {
  return (
    <svg className="radar max-w-full" width={240} height={200} viewBox="0 0 240 200" aria-hidden>
      <g transform="translate(120,100)">
        <polygon
          points="0,-78 67,-39 67,39 0,78 -67,39 -67,-39"
          fill="none"
          stroke="#D9D9D9"
          strokeWidth={1}
        />
        <polygon
          points="0,-52 45,-26 45,26 0,52 -45,26 -45,-26"
          fill="none"
          stroke="#D9D9D9"
          strokeWidth={1}
        />
        <polygon
          points="0,-26 22,-13 22,13 0,26 -22,13 -22,-13"
          fill="none"
          stroke="#D9D9D9"
          strokeWidth={1}
        />
        <line x1="0" y1="-78" x2="0" y2="78" stroke="#D9D9D9" strokeWidth={0.8} />
        <line x1="-67" y1="-39" x2="67" y2="39" stroke="#D9D9D9" strokeWidth={0.8} />
        <line x1="67" y1="-39" x2="-67" y2="39" stroke="#D9D9D9" strokeWidth={0.8} />
        <polygon
          points="0,-65 54,-25 48,32 -12,60 -56,22 -42,-32"
          fill="rgba(43,87,154,.12)"
          stroke="#2B579A"
          strokeWidth={1.5}
        />
        <circle cx="0" cy="-65" r={3.5} fill="#2B579A" />
        <circle cx="54" cy="-25" r={3.5} fill="#2B579A" />
        <circle cx="48" cy="32" r={3.5} fill="#2B579A" />
        <circle cx="-12" cy="60" r={3.5} fill="#2B579A" />
        <circle cx="-56" cy="22" r={3.5} fill="#2B579A" />
        <circle cx="-42" cy="-32" r={3.5} fill="#2B579A" />
        <text
          x="0"
          y="-84"
          textAnchor="middle"
          fontSize={10}
          fill="#5F5E5A"
          fontFamily="sans-serif"
        >
          Kinh doanh
        </text>
        <text
          x="74"
          y="-28"
          textAnchor="start"
          fontSize={10}
          fill="#5F5E5A"
          fontFamily="sans-serif"
        >
          Marketing
        </text>
        <text x="74" y="38" textAnchor="start" fontSize={10} fill="#5F5E5A" fontFamily="sans-serif">
          Sản xuất
        </text>
        <text x="0" y="92" textAnchor="middle" fontSize={10} fill="#5F5E5A" fontFamily="sans-serif">
          Hậu cần
        </text>
        <text x="-74" y="38" textAnchor="end" fontSize={10} fill="#5F5E5A" fontFamily="sans-serif">
          Nhân sự
        </text>
        <text x="-74" y="-28" textAnchor="end" fontSize={10} fill="#5F5E5A" fontFamily="sans-serif">
          Kỹ thuật
        </text>
      </g>
    </svg>
  )
}

export interface BodDashboardScreenProps {
  page: BodDashboardPage | undefined
  isLoading: boolean
}

export function BodDashboardScreen({ page, isLoading }: BodDashboardScreenProps) {
  const user = useAuthStore((s) => s.user)
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const displayName = user?.name ?? 'BOD'

  const onExportPdf = () => toast.info('Đang xuất PDF (demo)…')
  const onShare = () => toast.success('Đã sao chép link chia sẻ (demo)')

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="page-toolbar-flat">
        <div className="text-base font-semibold tracking-tight text-foreground">
          Tổng quan ban lãnh đạo — Tháng {page?.monthLabel ?? '—'}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            className="rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            Xuất PDF
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onShare}
            className="rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            Chia sẻ link
          </Button>
          <span className="rounded-full bg-[#FEE2E2] px-2.5 py-1 text-xs font-medium text-[#991B1B]">
            {displayName} ({roleLabel})
          </span>
        </div>
      </div>

      <div className="page-shell">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonStatTile key={i} />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-hidden rounded-[13px] border border-border bg-white p-4 shadow-[var(--shadow-card)]">
                <Skeleton className="mb-4 h-4 w-48 rounded" />
                <Skeleton className="mx-auto h-[200px] w-full max-w-[240px] rounded-lg" />
              </div>
              <div className="space-y-3 overflow-hidden rounded-[13px] border border-border bg-white p-4 shadow-[var(--shadow-card)]">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between gap-2">
                      <Skeleton className="h-3 w-24 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !page ? (
          <div
            className={cn(
              'rounded-[13px] border border-border bg-white p-8 text-center text-muted-foreground',
              CARD_ENTRANCE_HOVER
            )}
          >
            Không có dữ liệu
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {(
                [
                  {
                    k: 't',
                    className:
                      'rounded-[9px] border border-border bg-card p-3.5 shadow-[var(--shadow-card)]',
                    body: (
                      <>
                        <div className="mb-1 text-xs font-semibold text-muted-foreground">
                          👥 Tổng nhân sự
                        </div>
                        <div className="text-[28px] font-extrabold leading-tight text-foreground">
                          {page.stats.totalHeadcount}
                        </div>
                        <div className="mt-1 text-xs text-[#0E7490]">
                          {page.stats.totalDeltaLabel}
                        </div>
                      </>
                    ),
                  },
                  {
                    k: 'g',
                    className:
                      'rounded-[9px] border border-[#FCD34D] p-3.5 shadow-[var(--shadow-card)]',
                    style: { background: 'linear-gradient(135deg,#FEF9C3,#FEF3C7)' } as const,
                    body: (
                      <>
                        <div className="mb-1 text-xs font-semibold text-[#92400E]">
                          Chỉ số hoàn thành mục tiêu
                        </div>
                        <div className="text-[28px] font-extrabold leading-tight text-[#92400E]">
                          {page.stats.goldTierPct}%
                        </div>
                        <div className="mt-1 text-xs text-[#B45309]">
                          {page.stats.goldDeltaLabel}
                        </div>
                      </>
                    ),
                  },
                  {
                    k: 'd',
                    className:
                      'rounded-[9px] border border-[#C4B5FD] p-3.5 shadow-[var(--shadow-card)]',
                    style: { background: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)' } as const,
                    body: (
                      <>
                        <div className="mb-1 text-xs font-semibold text-primary">
                          Nhân sự cấp Tướng
                        </div>
                        <div className="text-[28px] font-extrabold leading-tight text-primary">
                          {page.stats.diamondCount}
                        </div>
                        <div className="mt-1 text-xs text-primary">
                          {page.stats.diamondSubLabel}
                        </div>
                      </>
                    ),
                  },
                  {
                    k: 'r',
                    className:
                      'rounded-[9px] border border-border bg-card p-3.5 shadow-[var(--shadow-card)]',
                    body: (
                      <>
                        <div className="mb-1 text-xs font-semibold text-muted-foreground">
                          📉 Nghỉ việc T3
                        </div>
                        <div className="text-[28px] font-extrabold leading-tight text-foreground">
                          {page.stats.resignations}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {page.stats.turnoverLabel}
                        </div>
                      </>
                    ),
                  },
                  {
                    k: 'v',
                    className:
                      'rounded-[9px] border border-[#FCA5A5] p-3.5 shadow-[var(--shadow-card)]',
                    style: { background: 'linear-gradient(135deg,#FEF2F2,#FEE2E2)' } as const,
                    body: (
                      <>
                        <div className="mb-1 text-xs font-semibold text-[#991B1B]">⚠️ Bảo lưu</div>
                        <div className="text-[28px] font-extrabold leading-tight text-[#991B1B]">
                          {page.stats.reserveCount}
                        </div>
                        <div className="mt-1 text-xs text-[#991B1B]">
                          {page.stats.reserveSubLabel}
                        </div>
                      </>
                    ),
                  },
                ] as const
              ).map((s, i) => (
                <div
                  key={s.k}
                  className={cn(s.className, CARD_ENTRANCE_HOVER)}
                  style={{ ...('style' in s ? s.style : {}), ...staggerStyle(i) }}
                >
                  {s.body}
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div
                className={cn(
                  'overflow-hidden rounded-[13px] border border-border bg-white shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(0)}
              >
                <div className="card-section-header font-bold">
                  Bản đồ năng lực theo phòng ban (Radar chart)
                </div>
                <div className="flex items-center justify-center p-4">
                  <BodRadarSvg />
                </div>
              </div>

              <div
                className={cn(
                  'overflow-hidden rounded-[13px] border border-border bg-white shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(1)}
              >
                <div className="card-section-header font-bold">
                  Phân bố cấp độ toàn công ty ({page.stats.totalHeadcount} NV)
                </div>
                <div className="flex flex-col gap-3 p-4">
                  {page.levelRows.map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span
                          className={cn(
                            row.barTone === 'red'
                              ? 'font-medium text-[#991B1B]'
                              : 'text-muted-foreground'
                          )}
                        >
                          {row.label}
                        </span>
                        <span
                          className={cn(
                            row.barTone === 'red' ? 'text-[#991B1B]' : 'text-muted-foreground'
                          )}
                        >
                          {row.count} người · {row.pctLabel}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-primary/15">
                        <div
                          className={cn('h-full rounded', BAR_FILL[row.barTone], PROGRESS_BAR_FILL)}
                          style={{
                            width: `${Math.min(100, row.barPct)}%`,
                            transformOrigin: '0 50%',
                            animationDelay: '100ms',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  'overflow-hidden rounded-[13px] border border-border bg-white shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(2)}
              >
                <div className="card-section-header font-bold">
                  Biến động nhân sự tháng {page.monthLabel.split('/')[0] ?? '—'}
                </div>
                <div className="p-4">
                  {page.hrMovement.map((row, i) => (
                    <div
                      key={row.label}
                      className={cn(
                        'flex items-center justify-between py-2 text-sm',
                        i < page.hrMovement.length - 1 && 'border-b border-border'
                      )}
                    >
                      <span className="text-xs font-semibold text-foreground">{row.label}</span>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold',
                          HR_BADGE[row.badgeTone]
                        )}
                      >
                        {row.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  'overflow-hidden rounded-[13px] border border-border bg-white shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(3)}
              >
                <div className="card-section-header font-bold">Phòng ban cần chú ý</div>
                <div className="space-y-2 p-4">
                  {page.deptAlerts.map((a) => {
                    const st = ALERT_STYLE[a.tone]
                    return (
                      <div key={a.title} className={cn('rounded-r-[9px] py-2 pl-3 pr-2', st.wrap)}>
                        <div className={cn('text-xs font-semibold', st.title)}>{a.title}</div>
                        <div className="mt-1 text-xs leading-snug text-muted-foreground">
                          {a.body}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
