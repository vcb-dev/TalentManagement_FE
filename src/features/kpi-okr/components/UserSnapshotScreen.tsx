// @ts-nocheck -- uses file-based router params not yet in route tree
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearch } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { performanceApi } from '@/features/kpi-okr/api'
import { Target, Star, TrendingUp, Clock, ChevronLeft, Building2, Briefcase } from 'lucide-react'
import { OrgUserAvatar } from '@/components/shared/EmployeeAvatar'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['performance', 'snapshot', userId, defaultYear, defaultMonth],
    queryFn: () => performanceApi.getUserSnapshot(userId, defaultYear, defaultMonth),
    enabled: !!userId,
  })

  const [activeTab, setActiveTab] = useState<'overview' | 'work-reports'>('overview')

  const navigateBack = () => window.history.back()

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-slate-500">Không thể tải hồ sơ nhân sự.</p>
        <Button variant="outline" size="sm" onClick={navigateBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    )
  }

  const { profile, latestOkr, topKpiP1, summary, teamHistory } = data

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <OrgUserAvatar
            name={profile.displayName?.trim() || profile.email?.trim() || '?'}
            avatarUrl={resolvePublicAssetUrl(profile.avatarUrl)}
            className="h-14 w-14 text-lg"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {profile.displayName || 'Chưa có tên'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {profile.jobTitle && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {profile.jobTitle}
                </span>
              )}
              {profile.divisionName && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {profile.divisionName}
                  {profile.teamName && ` / ${profile.teamName}`}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={navigateBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Quay lại
        </Button>
      </div>

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
                  <p className="text-sm text-slate-400">Chưa có OKR</p>
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
                  <p className="text-sm text-slate-400">Chưa có KPI P1</p>
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
                  <p className="text-sm text-slate-400">Chưa có dữ liệu tháng</p>
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
                <p className="text-sm text-slate-400">Chưa có dữ liệu quá trình công tác</p>
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
