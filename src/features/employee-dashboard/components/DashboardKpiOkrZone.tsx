import { Link } from '@tanstack/react-router'
import { ChevronRight, FileText, Target } from 'lucide-react'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/auth'

export type KpiOkrPaths = { kpiOkr: string }

type ProgressLineProps = {
  label: string
  sublabel: string
  percent: number
  doneLabel: string
  tone: 'violet' | 'sky' | 'teal'
  delay: number
}

function toneBar(tone: ProgressLineProps['tone']): string {
  switch (tone) {
    case 'violet':
      return 'from-violet-600 via-fuchsia-500 to-violet-500'
    case 'sky':
      return 'from-sky-600 via-cyan-500 to-sky-500'
    case 'teal':
      return 'from-teal-600 via-emerald-500 to-teal-500'
    default:
      return 'from-primary via-sky-600 to-accent'
  }
}

function ProgressLine({ label, sublabel, percent, doneLabel, tone, delay }: ProgressLineProps) {
  const w = Math.min(100, Math.max(0, percent))
  return (
    <div className="rounded-[11px] border border-border/60 bg-white/90 px-3 py-2.5 shadow-sm">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-foreground">{label}</div>
          <div className="text-[0.7rem] text-muted-foreground">{sublabel}</div>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">{Math.round(w)}%</span>
      </div>
      <div className="mb-1 h-2 overflow-hidden rounded-full bg-primary/10">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r motion-safe:animate-[profile-progress-fill_1s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none',
            toneBar(tone)
          )}
          style={{ width: `${w}%`, transformOrigin: 'left', animationDelay: `${delay}ms` }}
        />
      </div>
      <div className="text-[0.7rem] text-muted-foreground">{doneLabel}</div>
    </div>
  )
}

function monthLabelVi(d: Date): string {
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`
}

export interface DashboardKpiOkrZoneProps {
  role: Extract<Role, 'MEMBER' | 'LEADER'>
  paths: KpiOkrPaths
}

/** Khối riêng: tiến độ KPI, OKR, báo cáo + liên kết chi tiết. */
export function DashboardKpiOkrZone({ role, paths }: DashboardKpiOkrZoneProps) {
  const isLeader = role === 'LEADER'
  const now = new Date()

  const kpi = isLeader
    ? { percent: 82, sub: 'Tổng hợp team', done: '8/10 chỉ tiêu đạt mức tối thiểu' }
    : { percent: 75, sub: 'Cá nhân', done: '3/4 chỉ tiêu đã hoàn thành' }
  const okr = isLeader
    ? { percent: 71, sub: 'Objectives trong team', done: '5/7 key result đạt checkpoint' }
    : { percent: 66, sub: 'Objectives cá nhân', done: '2/3 key result đạt checkpoint' }
  const report = isLeader
    ? { percent: 80, sub: 'Báo cáo tháng (team)', done: '4/5 thành viên đã nộp đúng hạn' }
    : { percent: 100, sub: 'Kỳ hiện tại', done: 'Đã nộp báo cáo tháng này' }

  return (
    <section
      className={cn(
        'mb-5 overflow-hidden rounded-[15px] border-2 border-violet-300/45 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/50 shadow-[var(--shadow-card)] ring-1 ring-violet-200/35',
        CARD_ENTRANCE_HOVER
      )}
      style={staggerStyle(0)}
      aria-labelledby="dash-kpi-zone-title"
    >
      <div className="border-b border-violet-200/60 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/8 to-transparent px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-800">
              <Target className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2 id="dash-kpi-zone-title" className="text-sm font-extrabold tracking-tight text-violet-950 md:text-base">
                KPI · OKR · Báo cáo
              </h2>
              <p className="text-[0.7rem] text-violet-900/70">
                Tiến độ hoàn thành kỳ {monthLabelVi(now)}
                {isLeader ? ' · phạm vi team' : ''}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-violet-300/50 bg-white/80 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
            Theo dõi mục tiêu
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        <ProgressLine
          label="KPI"
          sublabel={kpi.sub}
          percent={kpi.percent}
          doneLabel={kpi.done}
          tone="violet"
          delay={80}
        />
        <ProgressLine
          label="OKR"
          sublabel={okr.sub}
          percent={okr.percent}
          doneLabel={okr.done}
          tone="sky"
          delay={140}
        />
        <ProgressLine
          label="Báo cáo"
          sublabel={report.sub}
          percent={report.percent}
          doneLabel={report.done}
          tone="teal"
          delay={200}
        />

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link
            to={paths.kpiOkr}
            className="inline-flex items-center justify-center gap-1 rounded-[9px] border border-violet-400/45 bg-white px-4 py-2.5 text-xs font-semibold text-violet-950 shadow-sm transition-colors hover:bg-violet-50"
          >
            Chi tiết KPI & OKR
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
          <Link
            to="/monthly-report"
            className="inline-flex items-center justify-center gap-1 rounded-[9px] border border-teal-400/45 bg-white px-4 py-2.5 text-xs font-semibold text-teal-950 shadow-sm transition-colors hover:bg-teal-50"
          >
            <FileText className="h-3.5 w-3.5" strokeWidth={2} />
            Chi tiết báo cáo
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  )
}
