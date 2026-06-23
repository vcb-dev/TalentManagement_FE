import { useMemo } from 'react'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Skeleton, SkeletonStatTile } from '@/components/ui/skeleton'
import { CARD_ENTRANCE_HOVER, PROGRESS_BAR_FILL } from '@/lib/cardMotion'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DashboardSection } from '@/components/shared/DashboardSection'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import type { BodDashboardPage } from '@/features/bod/types'

const SURFACE_CARD = 'border border-[#ECEEF4] bg-white shadow-[0_18px_60px_rgba(17,24,39,0.06)]'

const BAR_FILL: Record<BodDashboardPage['levelRows'][number]['barTone'], string> = {
  gray: 'bg-slate-300',
  indigo: 'bg-[#2563EB]',
  teal: 'bg-[#7DD3FC]',
  amber: 'bg-[#FBBF24]',
  red: 'bg-[#FB7185]',
}

const HR_BADGE: Record<BodDashboardPage['hrMovement'][number]['badgeTone'], string> = {
  green: 'bg-[#ECFDF3] text-[#027A48]',
  red: 'bg-[#FFF1F3] text-[#C01048]',
  blue: 'bg-[#EFF8FF] text-[#175CD3]',
  amber: 'bg-[#FFFAEB] text-[#B54708]',
  gray: 'border border-[#EAECF0] bg-[#F9FAFB] text-[#667085]',
}

const ALERT_STYLE: Record<
  BodDashboardPage['deptAlerts'][number]['tone'],
  { wrap: string; title: string; dot: string }
> = {
  danger: {
    wrap: 'border-[#FEE4E2] bg-[#FFFBFA]',
    title: 'text-[#B42318]',
    dot: 'bg-[#F04438]',
  },
  warning: {
    wrap: 'border-[#FEDF89] bg-[#FFFCF5]',
    title: 'text-[#B54708]',
    dot: 'bg-[#F79009]',
  },
  success: {
    wrap: 'border-[#ABEFC6] bg-[#F6FEF9]',
    title: 'text-[#067647]',
    dot: 'bg-[#17B26A]',
  },
}

function KpiAreaChart({ data }: { data: BodDashboardPage['levelRows'] }) {
  const chartData = useMemo(
    () =>
      data.map((row, index) => ({
        name: row.label.replace(/^.*?\s/, ''),
        value: row.count,
        fill:
          index === 0
            ? '#2563EB'
            : index === 1
              ? '#8B5CF6'
              : index === 2
                ? '#06B6D4'
                : index === 3
                  ? '#F59E0B'
                  : '#FB7185',
      })),
    [data]
  )

  return (
    <div className="h-[290px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 8, left: -8, bottom: 0 }}
          barCategoryGap="22%"
        >
          <CartesianGrid stroke="#EEF2F6" vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tick={{ fill: '#98A2B3' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tick={{ fill: '#98A2B3' }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
            contentStyle={{
              borderRadius: 18,
              border: '1px solid #EAECF0',
              boxShadow: '0 18px 50px rgba(17, 24, 39, 0.10)',
            }}
          />
          <Bar dataKey="value" radius={[14, 14, 6, 6]} maxBarSize={44}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function BodRadarSvg() {
  return (
    <svg className="max-w-full" width={320} height={250} viewBox="0 0 320 250" aria-hidden>
      <defs>
        <linearGradient id="radarSoftFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#111827" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <g transform="translate(160,125)">
        <polygon points="0,-88 76,-44 76,44 0,88 -76,44 -76,-44" fill="#FAFAFB" stroke="#EAECF0" />
        <polygon points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30" fill="none" stroke="#EAECF0" />
        <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="none" stroke="#EAECF0" />
        <line x1="0" y1="-88" x2="0" y2="88" stroke="#EAECF0" />
        <line x1="-76" y1="-44" x2="76" y2="44" stroke="#EAECF0" />
        <line x1="76" y1="-44" x2="-76" y2="44" stroke="#EAECF0" />
        <polygon
          points="0,-72 58,-28 44,36 -10,68 -64,20 -42,-36"
          fill="url(#radarSoftFill)"
          stroke="#111827"
          strokeWidth={2}
        />
        {[
          [0, -72],
          [58, -28],
          [44, 36],
          [-10, 68],
          [-64, 20],
          [-42, -36],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={4} fill="#fff" stroke="#111827" strokeWidth={1.8} />
        ))}
        {[
          { x: 0, y: -104, label: 'Kinh doanh' },
          { x: 106, y: -34, label: 'Marketing' },
          { x: 106, y: 52, label: 'Sản xuất' },
          { x: 0, y: 116, label: 'Hậu cần' },
          { x: -106, y: 52, label: 'Nhân sự' },
          { x: -106, y: -34, label: 'Kỹ thuật' },
        ].map((item) => (
          <text
            key={item.label}
            x={item.x}
            y={item.y}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="#667085"
            fontFamily="sans-serif"
          >
            {item.label}
          </text>
        ))}
      </g>
    </svg>
  )
}

function MetricCard({
  label,
  value,
  description,
  accent,
}: {
  label: string
  value: string | number
  description: string
  accent: string
}) {
  return (
    <article className={cn('rounded-[28px] p-5 transition hover:-translate-y-0.5', SURFACE_CARD)}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#98A2B3]">
          {label}
        </span>
        <span className={cn('h-2.5 w-2.5 rounded-full', accent)} />
      </div>
      <div className="text-[34px] font-semibold leading-none tracking-[-0.04em] text-[#2563EB]">
        {value}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#667085]">{description}</p>
    </article>
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
  const month = page?.monthLabel ?? '—'
  const reportYear = month.includes('/') ? month.split('/')[1] : '2026'
  const reportMonth = month.includes('/') ? month.split('/')[0] : '—'

  const onExportPdf = () => toast.info('Tính năng xuất PDF sắp ra mắt')
  const onShare = () => toast.info('Tính năng chia sẻ sắp ra mắt')

  return (
    <div className="-m-5 min-h-[calc(100vh-3rem)] min-w-0 bg-[#F7F8FB] text-sm text-[#111827] md:-m-6 lg:-m-8">
      <div className="relative overflow-hidden border-b border-[#ECEEF4] bg-[#FBFCFE]">
        <div className="absolute left-[-10%] top-[-55%] h-[360px] w-[360px] rounded-full bg-[#EDE9FE] blur-3xl" />
        <div className="absolute right-[-8%] top-[-35%] h-[320px] w-[320px] rounded-full bg-[#E0F2FE] blur-3xl" />
        <div className="relative mx-auto max-w-[1440px] px-5 py-8 md:px-8 lg:px-10">
          <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <PageHeader
              title="Tổng quan quản lý"
              variant="flat"
              className="min-w-0 flex-1 border-0 p-0"
              description="Bức tranh điều hành nhân sự, năng lực và biến động trong kỳ báo cáo."
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onExportPdf}
                className="rounded-full border-[#D0D5DD] bg-white px-4 text-xs font-semibold shadow-none"
              >
                Xuất PDF
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onShare}
                className="rounded-full bg-[#111827] px-4 text-xs font-semibold text-white shadow-none hover:bg-[#1F2937]"
              >
                Chia sẻ link
              </Button>
              <span className="rounded-full border border-[#EAECF0] bg-white px-3 py-1.5 text-xs font-semibold text-[#667085]">
                {displayName} ({roleLabel})
              </span>
            </div>
          </div>

          <section
            className={cn(
              'grid gap-4 rounded-[32px] p-4 lg:grid-cols-[1.35fr_0.65fr]',
              SURFACE_CARD
            )}
          >
            <div className="rounded-[26px] bg-[#111827] p-6 text-white md:p-8">
              <div className="mb-8 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                Tháng {month}
              </div>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.05em] md:text-5xl">
                Dashboard điều hành theo phong cách SaaS tối giản.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/68">
                Theo dõi nhanh tổng nhân sự, năng lực phòng ban, cấp độ nhân sự và các điểm cần chú
                ý trong một không gian trực quan, sạch và tập trung.
              </p>
            </div>
            <div className="grid gap-3 rounded-[26px] bg-[#F7F8FB] p-4">
              <div className="rounded-2xl border border-[#EAECF0] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#98A2B3]">
                  Năm
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{reportYear}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#EAECF0] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#98A2B3]">
                    Từ tháng
                  </div>
                  <div className="mt-2 text-lg font-semibold">{reportMonth}</div>
                </div>
                <div className="rounded-2xl border border-[#EAECF0] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#98A2B3]">
                    Đến tháng
                  </div>
                  <div className="mt-2 text-lg font-semibold">{reportMonth}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#EAECF0] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#98A2B3]">
                  Nhóm đang xem
                </div>
                <div className="mt-2 text-sm font-semibold text-[#344054]">HuyKQ · Branding</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] space-y-5 px-5 py-6 md:px-8 lg:px-10">
        {isLoading ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonStatTile key={i} />
              ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <div className={cn('overflow-hidden rounded-[32px] p-5', SURFACE_CARD)}>
                <Skeleton className="mb-4 h-4 w-48 rounded" />
                <Skeleton className="h-[280px] w-full rounded-[24px]" />
              </div>
              <div className={cn('space-y-3 overflow-hidden rounded-[32px] p-5', SURFACE_CARD)}>
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
          <EmptyState
            title="Không có dữ liệu"
            description="Chưa có báo cáo dashboard cho kỳ này."
            className={cn('rounded-[32px]', SURFACE_CARD, CARD_ENTRANCE_HOVER)}
          />
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Tổng nhân sự"
                value={page.stats.totalHeadcount}
                description={page.stats.totalDeltaLabel}
                accent="bg-[#111827]"
              />
              <MetricCard
                label="Hoàn thành mục tiêu"
                value={`${page.stats.goldTierPct}%`}
                description={page.stats.goldDeltaLabel}
                accent="bg-[#8B5CF6]"
              />
              <MetricCard
                label="Nhân sự cấp Tướng"
                value={page.stats.diamondCount}
                description={page.stats.diamondSubLabel}
                accent="bg-[#06B6D4]"
              />
              <MetricCard
                label="Nghỉ việc tháng này"
                value={page.stats.resignations}
                description={page.stats.turnoverLabel}
                accent="bg-[#FB7185]"
              />
              <MetricCard
                label="Bảo lưu"
                value={page.stats.reserveCount}
                description={page.stats.reserveSubLabel}
                accent="bg-[#F59E0B]"
              />
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-full border border-[#EAECF0] bg-white p-1 shadow-[0_8px_30px_rgba(17,24,39,0.04)]">
                <button className="rounded-full bg-[#111827] px-4 py-2 text-xs font-semibold text-white">
                  Học tập
                </button>
                <button className="rounded-full px-4 py-2 text-xs font-semibold text-[#667085]">
                  KPI - OKR
                </button>
              </div>
              <div className="rounded-full border border-[#EAECF0] bg-white px-4 py-2 text-xs font-semibold text-[#667085] shadow-[0_8px_30px_rgba(17,24,39,0.04)]">
                Cập nhật theo kỳ: Tháng {month}
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <DashboardSection
                title="Bản đồ năng lực theo phòng ban"
                className={cn('rounded-[32px]', SURFACE_CARD, CARD_ENTRANCE_HOVER)}
                contentClassName="flex min-w-0 items-center justify-center overflow-x-auto p-5 pt-0"
              >
                <BodRadarSvg />
              </DashboardSection>

              <DashboardSection
                title="Phân bố cấp độ toàn công ty"
                className={cn('rounded-[32px]', SURFACE_CARD, CARD_ENTRANCE_HOVER)}
                contentClassName="pt-1"
              >
                <KpiAreaChart data={page.levelRows} />
                <div className="mt-5 space-y-3">
                  {page.levelRows.map((row, index) => (
                    <div key={row.label}>
                      <div className="mb-1.5 flex justify-between gap-3 text-xs">
                        <span className="font-medium text-[#475467]">{row.label}</span>
                        <span className="shrink-0 tabular-nums text-[#98A2B3]">
                          {row.count} người · {row.pctLabel}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F2F4F7]">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            BAR_FILL[row.barTone],
                            PROGRESS_BAR_FILL
                          )}
                          style={{
                            width: `${Math.min(100, row.barPct)}%`,
                            transformOrigin: '0 50%',
                            animationDelay: `${index * 80}ms`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardSection>

              <DashboardSection
                title={`Biến động nhân sự tháng ${reportMonth}`}
                className={cn('rounded-[32px]', SURFACE_CARD, CARD_ENTRANCE_HOVER)}
                contentClassName="pt-0"
              >
                <div className="grid gap-3">
                  {page.hrMovement.map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col gap-2 rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="min-w-0 text-sm font-semibold text-[#344054]">
                        {row.label}
                      </span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 self-start rounded-full px-2.5 py-1 text-xs font-bold sm:self-auto',
                          HR_BADGE[row.badgeTone]
                        )}
                      >
                        {row.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </DashboardSection>

              <DashboardSection
                title="Phòng ban cần chú ý"
                className={cn('rounded-[32px]', SURFACE_CARD, CARD_ENTRANCE_HOVER)}
                contentClassName="space-y-3 pt-0"
              >
                {page.deptAlerts.map((a) => {
                  const st = ALERT_STYLE[a.tone]
                  return (
                    <div key={a.title} className={cn('rounded-2xl border px-4 py-3', st.wrap)}>
                      <div className="flex items-start gap-3">
                        <span className={cn('mt-1.5 h-2 w-2 rounded-full', st.dot)} />
                        <div>
                          <div className={cn('text-sm font-semibold', st.title)}>{a.title}</div>
                          <div className="mt-1 text-xs leading-5 text-[#667085]">{a.body}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </DashboardSection>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
