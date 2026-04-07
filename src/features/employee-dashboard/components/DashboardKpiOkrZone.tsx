import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  Flag,
  RefreshCw,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import {
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/auth'

export type KpiOkrPaths = { kpiOkr: string }

const quartOut = '[transition-timing-function:cubic-bezier(0.25,1,0.5,1)]'

function monthLabelVi(d: Date): string {
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`
}

export interface DashboardKpiOkrZoneProps {
  role: Extract<Role, 'MEMBER' | 'LEADER'>
  paths: KpiOkrPaths
}

type SummaryCardProps = {
  title: string
  value: string
  percent: number
  barClass: string
  icon: ReactNode
  footer: ReactNode
  delay: number
}

function SummaryCard({ title, value, percent, barClass, icon, footer, delay }: SummaryCardProps) {
  const w = Math.min(100, Math.max(0, percent))
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm',
        quartOut,
        'transition-all duration-300 hover:-translate-y-0.5',
        CARD_ENTRANCE_HOVER
      )}
      style={staggerStyle(delay)}
    >
      <div className="pointer-events-none absolute right-3 top-3 opacity-[0.1] transition-opacity group-hover:opacity-[0.18]">
        {icon}
      </div>
      <div className="relative z-10">
        <h3 className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
        <p className="mb-4 text-3xl font-bold tabular-nums text-foreground">{value}</p>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full', barClass)} style={{ width: `${w}%` }} />
        </div>
        <div className="mt-3 text-xs font-medium text-muted-foreground">{footer}</div>
      </div>
    </div>
  )
}

/** Khối KPI · OKR · Báo cáo — nội dung thuật ngữ khớp màn KPI/OKR & báo cáo hàng tháng trong app (số liệu mẫu trước khi nối API). */
export function DashboardKpiOkrZone({ role, paths }: DashboardKpiOkrZoneProps) {
  const isLeader = role === 'LEADER'
  const now = new Date()

  /** Số liệu mẫu — đồng bộ với màn KPI/OKR & báo cáo tháng khi có API. */
  const kpi = isLeader
    ? {
        percent: 82,
        display: '82%',
        trend: '8/10 chỉ tiêu đạt mức tối thiểu · team',
      }
    : {
        percent: 75,
        display: '75%',
        trend: '3/4 chỉ tiêu đã hoàn thành',
      }
  const okr = isLeader
    ? {
        percent: 71,
        display: '71%',
        note: '5/7 kết quả then chốt đạt checkpoint',
      }
    : {
        percent: 66,
        display: '66%',
        note: '2/3 kết quả then chốt đạt checkpoint',
      }
  const report = isLeader
    ? {
        percent: 80,
        display: '80%',
        note: '4/5 thành viên đã nộp báo cáo đúng hạn',
      }
    : {
        percent: 100,
        display: '100%',
        note: 'Đã nộp báo cáo tháng này',
      }

  const milestonePct = isLeader ? 68 : 74

  return (
    <div className="space-y-8 text-sm text-foreground">
      {/* Tiêu đề kỳ */}
      <section
        className={cn(
          'flex flex-col justify-between gap-4 md:flex-row md:items-end',
          'motion-safe:animate-[dash-fade-up_0.45s_ease-out_both] motion-reduce:animate-none'
        )}
      >
        <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
          <h1 className={PAGE_HEADER_TITLE}>
            <span className={PAGE_HEADER_GRADIENT}>KPI · OKR · Báo cáo</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-md bg-primary/12 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary">
              Kỳ báo cáo
            </span>
            <p className="text-sm font-medium leading-relaxed text-muted-foreground">
              {isLeader
                ? `Phân bổ chỉ tiêu và báo cáo hàng tháng · ${monthLabelVi(now)}`
                : `Chỉ tiêu được giao và báo cáo tiến độ hàng tháng · ${monthLabelVi(now)}`}
            </p>
          </div>
        </div>
      </section>

      {/* Ba thẻ tổng quan */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SummaryCard
          title="Tiến độ KPI"
          value={kpi.display}
          percent={kpi.percent}
          barClass="bg-primary"
          icon={<Activity className="h-16 w-16 text-primary" strokeWidth={1.25} aria-hidden />}
          footer={
            <span className="flex items-center gap-1">
              <TrendingUp
                className="h-3.5 w-3.5 shrink-0 text-primary"
                strokeWidth={2}
                aria-hidden
              />
              {kpi.trend}
            </span>
          }
          delay={0}
        />
        <SummaryCard
          title="Tiến độ OKR"
          value={okr.display}
          percent={okr.percent}
          barClass="bg-primary-600"
          icon={<Flag className="h-16 w-16 text-primary-600" strokeWidth={1.25} aria-hidden />}
          footer={
            <span className="flex items-center gap-1">
              <RefreshCw
                className="h-3.5 w-3.5 shrink-0 text-primary-600"
                strokeWidth={2}
                aria-hidden
              />
              {okr.note}
            </span>
          }
          delay={1}
        />
        <SummaryCard
          title={isLeader ? 'Báo cáo hàng tháng (team)' : 'Báo cáo hàng tháng'}
          value={report.display}
          percent={report.percent}
          barClass="bg-accent"
          icon={<FileText className="h-16 w-16 text-accent" strokeWidth={1.25} aria-hidden />}
          footer={
            <span className="flex items-center gap-1">
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0 text-accent"
                strokeWidth={2}
                aria-hidden
              />
              {report.note}
            </span>
          }
          delay={2}
        />
      </section>

      {/* Chi tiết + cột phụ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-6 lg:col-span-8">
          <div
            className={cn('rounded-3xl bg-muted/50 p-6 md:p-8', CARD_ENTRANCE_HOVER)}
            style={staggerStyle(3)}
          >
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Chỉ tiêu KPI/OKR được giao</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isLeader
                    ? 'Tổng hợp tiến độ team — cùng nguồn với mục KPI & OKR trong team.'
                    : 'Tóm tắt tiến độ theo chỉ tiêu được giao — cùng nguồn với KPI & OKR của tôi.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted"
                  aria-label="Lọc"
                >
                  <Filter className="h-5 w-5" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted"
                  aria-label="Tải xuống"
                >
                  <Download className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <TrendingUp className="h-6 w-6" strokeWidth={2} aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">
                        {isLeader
                          ? 'Hoàn thành chỉ tiêu KPI nhóm (đánh giá kỳ)'
                          : 'Hoàn thành chỉ tiêu KPI cá nhân (đánh giá kỳ)'}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                        KPI được giao · Trọng số 40%
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 self-start rounded-full bg-primary/12 px-3 py-1 text-xs font-bold text-primary">
                    Đang thực hiện
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-3/4 rounded-full bg-primary" />
                  </div>
                  <span className="text-sm font-bold tabular-nums text-foreground">75%</span>
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <span>Thực tế: đạt 75% ngưỡng chỉ tiêu kỳ</span>
                  <span>Hạn: cuối {monthLabelVi(now)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning-muted text-warning">
                      <Flag className="h-6 w-6" strokeWidth={2} aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">
                        {isLeader
                          ? 'Nâng cao năng lực & lộ trình học tập của team'
                          : 'Nâng cao năng lực theo lộ trình học & thi cử'}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                        OKR · Kết quả then chốt 1
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 self-start rounded-full bg-warning-muted px-3 py-1 text-xs font-bold text-warning">
                    Cần đẩy nhanh
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[42%] rounded-full bg-warning" />
                  </div>
                  <span className="text-sm font-bold tabular-nums text-foreground">42%</span>
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <span>Tiến độ: 42% — còn bài tập / kỳ thi trong lộ trình</span>
                  <span>Hạn: cuối {monthLabelVi(now)}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col justify-end gap-3 sm:flex-row sm:gap-4">
              <Link
                to="/monthly-report"
                className={cn(
                  'inline-flex items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-bold text-primary transition-colors hover:bg-muted',
                  quartOut
                )}
              >
                {isLeader ? 'Báo cáo hàng tháng (team)' : 'Báo cáo hàng tháng'}
              </Link>
              <Link
                to={paths.kpiOkr}
                className={cn(
                  'inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-600 px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20',
                  quartOut,
                  'transition-all hover:opacity-95 active:scale-[0.98]'
                )}
              >
                {isLeader ? 'KPI & OKR trong team' : 'KPI & OKR của tôi'}
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div
            className={cn(
              'relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm',
              CARD_ENTRANCE_HOVER
            )}
            style={staggerStyle(4)}
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/[0.07]"
              aria-hidden
            />
            <h3 className="relative mb-6 text-lg font-bold text-foreground">
              Lộ trình học & thăng hạng
            </h3>
            <div className="relative">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-block rounded-full bg-primary/12 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {isLeader ? 'Team tiến tới mốc lộ trình chung' : 'Tiến tới cấp độ tiếp theo'}
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-primary">
                  {milestonePct}%
                </span>
              </div>
              <div className="mb-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${milestonePct}%` }}
                />
              </div>
            </div>
            <div className="relative mt-6 flex items-center gap-4 rounded-2xl border border-border bg-muted/50 p-4">
              <Trophy className="h-10 w-10 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Còn 1.240 XP để thăng cấp</p>
                <p className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-tighter text-muted-foreground">
                  Hoàn thành thêm KPI/OKR & báo cáo để tích điểm
                </p>
              </div>
            </div>
          </div>

          <div
            className={cn(
              'rounded-3xl border border-border bg-card p-6 shadow-sm',
              CARD_ENTRANCE_HOVER
            )}
            style={staggerStyle(5)}
          >
            <h3 className="mb-6 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Thông báo liên quan KPI/OKR
            </h3>
            <div className="space-y-6">
              {[
                {
                  title: 'Đã cập nhật điểm tổng hợp KPI trong kỳ',
                  meta: '2 giờ trước · Hệ thống',
                  dot: 'bg-primary',
                },
                {
                  title: 'Nhắc nhở: nộp báo cáo hàng tháng đúng hạn',
                  meta: 'Hôm qua · Nhân sự',
                  dot: 'bg-muted-foreground/40',
                },
                {
                  title: isLeader
                    ? 'Có chỉ tiêu OKR mới cần phân bổ cho thành viên'
                    : 'OKR mới đã được Trưởng nhóm duyệt',
                  meta: '2 ngày trước · Trưởng nhóm KPI',
                  dot: 'bg-muted-foreground/40',
                },
              ].map((row) => (
                <div key={row.title} className="flex gap-4">
                  <div
                    className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', row.dot)}
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{row.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.meta}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-8 w-full rounded-xl py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
            >
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
