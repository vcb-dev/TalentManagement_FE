import { useState } from 'react'
import { GraduationCap, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/auth'
import { DashboardKpiOkrZone } from '@/features/employee-dashboard/components/DashboardKpiOkrZone'
import { DashboardLearningZone } from '@/features/employee-dashboard/components/DashboardLearningZone'

function monthLabelVi(d: Date): string {
  return `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}`
}

function kpiOkrPaths(role: Role | undefined): { kpiOkr: string } {
  if (role === 'LEADER') return { kpiOkr: '/leader/kpi-okr' }
  return { kpiOkr: '/kpi-okr' }
}

type DashboardTab = 'learning' | 'kpi'

export function EmployeeLearningDashboard() {
  const role = useAuthStore((s) => s.user?.role)
  const showKpiZone = role === 'MEMBER' || role === 'LEADER'
  const paths = kpiOkrPaths(role)
  const [tab, setTab] = useState<DashboardTab>('learning')

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div
        className={cn(
          'page-toolbar-gradient items-center',
          'motion-safe:animate-[profile-card-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40 motion-safe:animate-[dash-shimmer_8s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            background:
              'linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.12) 45%, transparent 90%)',
            backgroundSize: '200% 100%',
          }}
        />
        <div className="relative text-base font-semibold tracking-tight text-foreground">
          <span className="bg-gradient-to-r from-primary via-violet-600 to-accent bg-clip-text text-transparent">
            Dashboard
          </span>
        </div>
        <div className="relative rounded-full border border-primary/20 bg-card/90 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur-sm">
          {monthLabelVi(new Date())}
        </div>
      </div>

      <div className="page-shell">
        {showKpiZone ? (
          <>
            <div
              className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              role="tablist"
              aria-label="Chế độ xem dashboard"
            >
              <p className="text-xs font-medium text-muted-foreground sm:max-w-[min(100%,280px)]">
                Chọn tab để xem lộ trình học & thi, hoặc KPI · OKR · báo cáo.
              </p>
              <div className="inline-flex rounded-full border border-[hsl(248_35%_88%)] bg-white/90 p-1 shadow-sm">
                <button
                  type="button"
                  role="tab"
                  id="dash-tab-learning"
                  aria-selected={tab === 'learning'}
                  aria-controls="dash-panel-learning"
                  tabIndex={tab === 'learning' ? 0 : -1}
                  onClick={() => setTab('learning')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors',
                    tab === 'learning'
                      ? 'bg-game-accent text-game-accent-foreground shadow-[0_4px_14px_rgb(106_90_224/0.35)]'
                      : 'text-game-muted hover:bg-white/80 hover:text-game-soft-foreground'
                  )}
                >
                  <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Học tập & thi cử
                </button>
                <button
                  type="button"
                  role="tab"
                  id="dash-tab-kpi"
                  aria-selected={tab === 'kpi'}
                  aria-controls="dash-panel-kpi"
                  tabIndex={tab === 'kpi' ? 0 : -1}
                  onClick={() => setTab('kpi')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors',
                    tab === 'kpi'
                      ? 'bg-game-accent text-game-accent-foreground shadow-[0_4px_14px_rgb(106_90_224/0.35)]'
                      : 'text-game-muted hover:bg-white/80 hover:text-game-soft-foreground'
                  )}
                >
                  <Target className="h-4 w-4 shrink-0" strokeWidth={2} />
                  KPI · OKR · Báo cáo
                </button>
              </div>
            </div>

            <div
              id="dash-panel-learning"
              role="tabpanel"
              aria-labelledby="dash-tab-learning"
              hidden={tab !== 'learning'}
            >
              <DashboardLearningZone />
            </div>
            <div
              id="dash-panel-kpi"
              role="tabpanel"
              aria-labelledby="dash-tab-kpi"
              hidden={tab !== 'kpi'}
            >
              <DashboardKpiOkrZone role={role as 'MEMBER' | 'LEADER'} paths={paths} />
            </div>
          </>
        ) : (
          <DashboardLearningZone />
        )}
      </div>
    </div>
  )
}
