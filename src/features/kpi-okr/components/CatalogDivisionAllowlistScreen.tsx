import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Info, ListChecks } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { performanceApi } from '@/features/kpi-okr/api'
import { useHrOrgTree } from '@/features/hr-admin/useHrOrgTree'
import { cn } from '@/lib/utils'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { CARD_ENTRANCE } from '@/lib/cardMotion'

export function CatalogDivisionAllowlistScreen() {
  const qc = useQueryClient()
  const mock = isMockApiEnabled()
  const treeQ = useHrOrgTree()

  const listQ = useQuery({
    queryKey: ['performance', 'catalog-division-allowlist'],
    queryFn: () => performanceApi.getCatalogDivisionAllowlist(),
    enabled: !mock,
    staleTime: 30_000,
  })

  const envIdSet = useMemo(
    () => new Set(listQ.data?.envDivisionIds ?? []),
    [listQ.data?.envDivisionIds]
  )
  const serverDbKey = listQ.data?.databaseDivisionIds?.join('\n') ?? ''

  const [dbSelected, setDbSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!listQ.data) return
    setDbSelected(new Set(listQ.data.databaseDivisionIds))
  }, [serverDbKey, listQ.data])

  const divisions = useMemo(() => {
    const rows = treeQ.data?.departments ?? []
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [treeQ.data?.departments])

  const saveM = useMutation({
    mutationFn: (divisionIds: string[]) => performanceApi.putCatalogDivisionAllowlist(divisionIds),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['performance', 'catalog-division-allowlist'] })
      toast.success('Đã lưu danh sách phòng ban áp dụng danh mục KPI/OKR.')
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : ''
      toast.error(msg || 'Không lưu được — kiểm tra quyền chỉnh danh mục KPI.')
    },
  })

  const mergedCount = useMemo(() => {
    const env = listQ.data?.envDivisionIds ?? []
    return new Set([...env, ...dbSelected]).size
  }, [listQ.data?.envDivisionIds, dbSelected])

  const toggleDb = (divisionId: string) => {
    if (envIdSet.has(divisionId)) return
    setDbSelected((prev) => {
      const next = new Set(prev)
      if (next.has(divisionId)) next.delete(divisionId)
      else next.add(divisionId)
      return next
    })
  }

  const selectAllDb = () => {
    const allIds = divisions.map((d) => d.id).filter((id) => !envIdSet.has(id))
    setDbSelected(new Set(allIds))
  }

  const clearDb = () => setDbSelected(new Set())

  if (mock) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Chế độ giả lập — không tải được danh sách phòng ban từ máy chủ.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Phòng ban áp dụng danh mục KPI/OKR
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Chọn phòng ban được bật tự khởi tạo mục tiêu và luồng danh mục KPI/OKR trên hệ thống (gom
          cấu hình môi trường và danh sách do HR lưu).
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="space-y-1 text-xs text-blue-900 dark:text-blue-200">
          <p>
            Một số phòng ban được cố định sẵn ở cấp hệ thống — không thể bỏ chọn tại đây. Liên hệ
            quản trị nếu cần điều chỉnh.
          </p>
          <p>
            Tổng phòng ban được áp dụng: <strong>{listQ.isSuccess ? mergedCount : '—'}</strong>.
          </p>
        </div>
      </div>

      <Card className={CARD_ENTRANCE}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" />
            Phòng ban trong danh sách áp dụng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {listQ.isLoading || treeQ.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : listQ.isError ? (
            <p className="text-sm text-destructive">Không tải được danh sách — thử lại sau.</p>
          ) : divisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu cây phòng ban.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllDb}>
                  Chọn tất cả phòng ban có thể chỉnh
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearDb}>
                  Bỏ chọn đã lưu
                </Button>
              </div>
              <div className="max-h-[min(480px,60vh)] space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                {divisions.map((d) => {
                  const fromEnv = envIdSet.has(d.id)
                  const fromDb = dbSelected.has(d.id)
                  const checked = fromEnv || fromDb
                  return (
                    <label
                      key={d.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50',
                        fromEnv && 'cursor-not-allowed opacity-80'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={fromEnv}
                        onCheckedChange={() => toggleDb(d.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{d.name}</div>
                        {fromEnv && (
                          <div className="text-[11px] text-muted-foreground">
                            Cố định tại hệ thống
                          </div>
                        )}
                        {fromDb && !fromEnv && (
                          <div className="text-[11px] text-muted-foreground">
                            Đã chọn trong danh sách
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
              <Button
                type="button"
                disabled={saveM.isPending}
                onClick={() => saveM.mutate([...dbSelected])}
              >
                {saveM.isPending ? 'Đang lưu…' : 'Lưu danh sách'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
