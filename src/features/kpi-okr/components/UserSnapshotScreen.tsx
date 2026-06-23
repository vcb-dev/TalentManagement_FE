// @ts-nocheck -- uses file-based router params not yet in route tree
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearch } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SkeletonProfileForm } from '@/components/ui/skeleton'
import { performanceApi } from '@/features/kpi-okr/api'
import { Target, Star, TrendingUp, Clock, ChevronLeft, Building2, Briefcase } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { UserWorkReportHistory } from './UserWorkReportHistory'

export function UserSnapshotScreen() {
  const { userId } = useParams({ from: '/_protected/manager/people/$userId' })
  const { year, month } = useSearch({
    from: '/_protected/manager/people/$userId',
  })

  const defaultYear = year ?? new Date().getFullYear()
  const defaultMonth = month ?? new Date().getMonth() + 1

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['performance', 'snapshot', userId, defaultYear, defaultMonth],
    queryFn: () => performanceApi.getUserSnapshot(userId, defaultYear, defaultMonth),
    enabled: !!userId,
  })

  const [activeTab, setActiveTab] = useState<'overview' | 'work-reports'>('overview')

  const navigateBack = () => window.history.back()

  if (isLoading) {
    return (
      <div className="p-6">
        <SkeletonProfileForm />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <ErrorState
          title="Không thể tải hồ sơ nhân sự"
          onRetry={() => void refetch()}
          retrying={isFetching}
          className="max-w-lg"
        />
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={navigateBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Quay lại
          </Button>
        </div>
      </div>
    )
  }

  const { profile, latestOkr, topKpiP1, summary, teamHistory } = data

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        onBack={navigateBack}
        title={profile.displayName || 'Chưa có tên'}
        description={
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {profile.jobTitle ? (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {profile.jobTitle}
              </span>
            ) : null}
            {profile.divisionName ? (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {profile.divisionName}
                {profile.teamName ? ` / ${profile.teamName}` : ''}
              </span>
            ) : null}
          </div>
        }
        variant="flat"
        className="border-0 pb-0"
      />

      {/* Tab nav */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/60 p-1 dark:border-slate-800 dark:bg-slate-900/60">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          Tổng quan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('work-reports')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'work-reports'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          Báo cáo tháng
        </button>
      </div>

      {activeTab === 'work-reports' && <UserWorkReportHistory userId={userId} />}

      {activeTab === 'overview' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* OKR moi nhat */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Target className="h-3.5 w-3.5" />
                  OKR mới nhất
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestOkr ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                      {latestOkr.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {latestOkr.kpiSetAt && (
                        <span>{format(new Date(latestOkr.kpiSetAt), 'dd/MM/yyyy')}</span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-4 text-xs font-bold px-1',
                          latestOkr.status === 'done'
                            ? 'border-emerald-200 text-emerald-600'
                            : 'border-slate-200 text-slate-500'
                        )}
                      >
                        {latestOkr.status === 'done' ? 'Đạt' : 'Chưa đạt'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="Chưa có OKR"
                    compact
                    className="border-0 bg-transparent py-2"
                  />
                )}
              </CardContent>
            </Card>

            {/* KPI top P1 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Star className="h-3.5 w-3.5" />
                  KPI P1 nổi bật
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topKpiP1 ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                      {topKpiP1.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      {topKpiP1.numericValue != null && (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(topKpiP1.numericValue).toLocaleString('vi-VN')}
                          {topKpiP1.numericUnit ? ` ${topKpiP1.numericUnit}` : ''}
                        </span>
                      )}
                      <EvalBadge status={topKpiP1.finalEvalStatus ?? topKpiP1.managerEvalStatus} />
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="Chưa có KPI P1"
                    compact
                    className="border-0 bg-transparent py-2"
                  />
                )}
              </CardContent>
            </Card>

            {/* Summary thang */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Tóm tắt T{defaultMonth}/{defaultYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">KPI</span>
                      <span className="font-bold tabular-nums">
                        <span className="text-emerald-600">{summary.kpiOkCount}</span>
                        {' / '}
                        <span className="text-rose-600">{summary.kpiNotCount}</span>
                        {summary.kpiGrade && (
                          <GradeBadge grade={summary.kpiGrade} className="ml-1.5" />
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">OKR</span>
                      <span className="font-bold tabular-nums">
                        <span className="text-emerald-600">{summary.okrOkCount}</span>
                        {' / '}
                        <span className="text-rose-600">{summary.okrNotCount}</span>
                        {summary.okrGrade && (
                          <GradeBadge grade={summary.okrGrade} className="ml-1.5" />
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="Chưa có dữ liệu tháng"
                    compact
                    className="border-0 bg-transparent py-2"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Clock className="h-4 w-4" />
                Quá trình công tác (12 kỳ gần nhất)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamHistory && teamHistory.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-4">
                  {teamHistory.map((h, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-400 ring-4 ring-white dark:ring-slate-950" />
                      <div className="text-xs text-slate-400">
                        T{h.month}/{h.year}
                      </div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {h.departmentName || 'Chưa rõ phòng ban'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Chưa có dữ liệu quá trình công tác"
                  compact
                  className="border-0 bg-transparent py-4"
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function EvalBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null
  const isOk = status === 'OK'
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-4 text-xs font-bold px-1',
        isOk
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
          : 'border-rose-200 bg-rose-50 text-rose-600'
      )}
    >
      {status}
    </Badge>
  )
}

function GradeBadge({ grade, className }: { grade: string; className?: string }) {
  const map: Record<string, string> = {
    A: 'border-emerald-300 bg-emerald-100 text-emerald-700',
    B: 'border-amber-300 bg-amber-100 text-amber-700',
    C: 'border-rose-300 bg-rose-100 text-rose-700',
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-4 text-xs font-extrabold px-1',
        map[grade] || 'border-slate-200 text-slate-500',
        className
      )}
    >
      {grade}
    </Badge>
  )
}
