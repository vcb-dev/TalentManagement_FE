import { useState } from 'react'
import { GraduationCap, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/auth'
import { DashboardKpiOkrZone } from '@/features/employee-dashboard/components/DashboardKpiOkrZone'
import { DashboardLearningZone } from '@/features/employee-dashboard/components/DashboardLearningZone'

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
      <div className="page-shell">
        {showKpiZone ? (
          <>
            <div
              className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              role="tablist"
              aria-label="Chế độ xem dashboard"
            >
              <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
                <button
                  type="button"
                  role="tab"
                  id="dash-tab-learning"
                  aria-selected={tab === 'learning'}
                  aria-controls="dash-panel-learning"
                  tabIndex={tab === 'learning' ? 0 : -1}
                  onClick={() => setTab('learning')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    tab === 'learning'
                      ? 'bg-primary text-primary-foreground shadow-[var(--shadow-game-float)]'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
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
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    tab === 'kpi'
                      ? 'bg-primary text-primary-foreground shadow-[var(--shadow-game-float)]'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
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
