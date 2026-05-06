import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { performanceApi } from '@/features/kpi-okr/api'
import { Trophy, Medal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { resolveEffectivePermissionSet } from '@/features/permissions/resolveEffective'
import { isMockApiEnabled } from '@/lib/mockEnv'

export function HonorBoardCard({
  year,
  month,
  className,
}: {
  year: number
  month: number
  className?: string
}) {
  const user = useAuthStore((s) => s.user)
  const allowed = useMemo(() => {
    if (!user) return false
    return resolveEffectivePermissionSet(user).has('kpi.honor_board_view')
  }, [user])

  const mockApi = isMockApiEnabled()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['performance', 'honor-board', year, month],
    queryFn: () => performanceApi.getHonorBoard(year, month),
    staleTime: 5 * 60 * 1000,
    enabled: allowed && !mockApi,
  })

  if (!allowed || mockApi) return null

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-bold tracking-tight">Bảng vinh danh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card className={cn(className, 'border-dashed')}>
        <CardContent className="pt-6 text-sm text-slate-400 text-center">
          Không tải được dữ liệu bảng vinh danh.
        </CardContent>
      </Card>
    )
  }

  const { topByDepartment, outstandingOkr } = data

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Bảng vinh danh tháng {month}/{year}
          </span>
        </div>

        {/* Top 1 per department */}
        {topByDepartment.length === 0 ? (
          <Card className="border-dashed border-slate-200">
            <CardContent className="pt-6 text-sm text-slate-400 text-center">
              Chưa có dữ liệu vinh danh tháng này.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topByDepartment.map((item, idx) => (
              <Card
                key={item.departmentId || idx}
                className={cn(
                  'group overflow-hidden transition-all hover:shadow-md',
                  idx === 0 &&
                    'border-amber-300 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/10'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
                        idx === 0 ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'
                      )}
                    >
                      {item.user.displayName?.charAt(0) ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.user.displayName || item.user.email}
                        </span>
                        {idx === 0 && (
                          <Badge className="h-4 bg-amber-500 text-[9px] font-bold text-white border-none px-1.5">
                            #1
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {item.departmentName || '—'}
                      </div>
                      <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                        {item.content}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] font-extrabold uppercase border-indigo-400/30 bg-indigo-500/10 text-indigo-600"
                        >
                          {item.kind}
                        </Badge>
                        {item.numericValue > 0 && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {item.numericValue.toLocaleString('vi-VN')}
                            {item.numericUnit ? ` ${item.numericUnit}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* OKR Outstanding */}
      {outstandingOkr.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Medal className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              OKR xuất sắc tháng
            </span>
          </div>
          <div className="space-y-2">
            {outstandingOkr.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                <span className="text-xs font-bold text-slate-400 tabular-nums w-4">{idx + 1}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {item.user.displayName}
                </span>
                <span className="text-slate-400">—</span>
                <span className="truncate text-slate-600 dark:text-slate-400">{item.content}</span>
                <span className="ml-auto shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {item.numericValue.toLocaleString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
