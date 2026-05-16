import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton, SkeletonStatTile } from '@/components/ui/skeleton'
import { CARD_ENTRANCE_HOVER, PROGRESS_BAR_FILL, staggerStyle } from '@/lib/cardMotion'
import { StatCard } from '@/components/shared/StatCard'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import type { BodDashboardPage } from '@/features/bod/types'

const BAR_FILL: Record<BodDashboardPage['levelRows'][number]['barTone'], string> = {
  gray: 'bg-muted-foreground/40',
  indigo: 'bg-primary',
  teal: 'bg-cyan-600',
  amber: 'bg-amber-500',
  red: 'bg-red-700',
}

const HR_BADGE: Record<BodDashboardPage['hrMovement'][number]['badgeTone'], string> = {
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-primary/10 text-primary',
  amber: 'bg-amber-50 text-amber-800',
  gray: 'border border-border bg-muted text-muted-foreground',
}

const ALERT_STYLE: Record<
  BodDashboardPage['deptAlerts'][number]['tone'],
  { wrap: string; title: string }
> = {
  danger: {
    wrap: 'border-l-4 border-red-700 bg-red-50',
    title: 'text-red-700',
  },
  warning: {
    wrap: 'border-l-4 border-amber-500 bg-amber-50',
    title: 'text-amber-800',
  },
  success: {
    wrap: 'border-l-4 border-green-500 bg-green-50',
    title: 'text-green-700',
  },
}

function BodRadarSvg() {
  return (
    <svg className="radar max-w-full" width={240} height={200} viewBox="0 0 240 200" aria-hidden>
      <g transform="translate(120,100)">
        <polygon
          points="0,-78 67,-39 67,39 0,78 -67,39 -67,-39"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        <polygon
          points="0,-52 45,-26 45,26 0,52 -45,26 -45,-26"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        <polygon
          points="0,-26 22,-13 22,13 0,26 -22,13 -22,-13"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        <line x1="0" y1="-78" x2="0" y2="78" stroke="#e5e7eb" strokeWidth={0.8} />
        <line x1="-67" y1="-39" x2="67" y2="39" stroke="#e5e7eb" strokeWidth={0.8} />
        <line x1="67" y1="-39" x2="-67" y2="39" stroke="#e5e7eb" strokeWidth={0.8} />
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
          fill="#6b7280"
          fontFamily="sans-serif"
        >
          Kinh doanh
        </text>
        <text
          x="74"
          y="-28"
          textAnchor="start"
          fontSize={10}
          fill="#6b7280"
          fontFamily="sans-serif"
        >
          Marketing
        </text>
        <text x="74" y="38" textAnchor="start" fontSize={10} fill="#6b7280" fontFamily="sans-serif">
          Sản xuất
        </text>
        <text x="0" y="92" textAnchor="middle" fontSize={10} fill="#6b7280" fontFamily="sans-serif">
          Hậu cần
        </text>
        <text x="-74" y="38" textAnchor="end" fontSize={10} fill="#6b7280" fontFamily="sans-serif">
          Nhân sự
        </text>
        <text x="-74" y="-28" textAnchor="end" fontSize={10} fill="#6b7280" fontFamily="sans-serif">
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

  const onExportPdf = () => toast.info('Tính năng xuất PDF sắp ra mắt')
  const onShare = () => toast.info('Tính năng chia sẻ sắp ra mắt')

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] min-w-0 flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className={cn('page-toolbar-flat', 'max-sm:flex-col max-sm:items-stretch max-sm:gap-3')}>
        <div className="min-w-0 text-sm font-semibold leading-snug tracking-tight text-foreground sm:text-base">
          Tổng quan ban lãnh đạo — Tháng {page?.monthLabel ?? '—'}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
            {displayName} ({roleLabel})
          </span>
        </div>
      </div>

      <div className="page-shell">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                title="Tổng nhân sự"
                value={page.stats.totalHeadcount}
                description={page.stats.totalDeltaLabel}
                tone="info"
              />
              <StatCard
                title="Hoàn thành mục tiêu"
                value={`${page.stats.goldTierPct}%`}
                description={page.stats.goldDeltaLabel}
                tone="warning"
              />
              <StatCard
                title="Nhân sự cấp Tướng"
                value={page.stats.diamondCount}
                description={page.stats.diamondSubLabel}
                tone="default"
              />
              <StatCard
                title="Nghỉ việc tháng này"
                value={page.stats.resignations}
                description={page.stats.turnoverLabel}
                tone="danger"
              />
              <StatCard
                title="Bảo lưu"
                value={page.stats.reserveCount}
                description={page.stats.reserveSubLabel}
                tone="danger"
              />
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
                <div className="flex min-w-0 items-center justify-center overflow-x-auto p-3 sm:p-4">
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
                      <div className="mb-1 flex flex-wrap justify-between gap-x-2 gap-y-1 text-xs">
                        <span
                          className={cn(
                            'min-w-0',
                            row.barTone === 'red'
                              ? 'font-medium text-[#991B1B]'
                              : 'text-muted-foreground'
                          )}
                        >
                          {row.label}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 tabular-nums',
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
                        'flex flex-col gap-1.5 py-2 text-sm sm:flex-row sm:items-center sm:justify-between',
                        i < page.hrMovement.length - 1 && 'border-b border-border'
                      )}
                    >
                      <span className="min-w-0 text-xs font-semibold text-foreground">
                        {row.label}
                      </span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-bold sm:self-auto',
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
