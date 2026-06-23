import { TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useLearningOpsSummary } from '@/features/dashboard/hooks'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoHint } from '@/components/shared/InfoHint'
import { ErrorState } from '@/components/shared/ErrorState'
import { DashboardSection } from '@/components/shared/DashboardSection'

export type ManagerHrSnapshotCardsProps = {
  reportYear: number
  rangeStartMonth: number
  rangeEndMonth: number
}

const HR_HINT =
  'Tổng: không tính trạng thái đã nghỉ / inactive trên hồ sơ HR. Off: theo ngày nghỉ trong dữ liệu đồng bộ; thiếu ngày thì ước lượng theo lần cập nhật gần nhất. Mới: ngày vào làm (startDateWork) nằm trong kỳ đã chọn.'

function pct(part: number, total: number): string {
  if (!total) return '—'
  return `${((part / total) * 100).toFixed(1)}%`
}

export function ManagerHrSnapshotCards({
  reportYear,
  rangeStartMonth,
  rangeEndMonth,
}: ManagerHrSnapshotCardsProps) {
  const { data, isLoading, isError, refetch, isFetching } = useLearningOpsSummary(
    reportYear,
    rangeStartMonth,
    rangeEndMonth,
    { enabled: true }
  )

  const inSingleMonth = rangeStartMonth === rangeEndMonth
  const periodSuffix = inSingleMonth ? 'trong tháng' : 'trong kỳ'
  const total = data?.totalHeadcount ?? 0
  const off = data?.offboardedInPeriod ?? 0
  const newHires = data?.newHiresInPeriod ?? 0

  return (
    <div className="space-y-3">
      {isError ? (
        <ErrorState
          title="Không tải được thống kê nhân sự"
          onRetry={() => void refetch()}
          retrying={isFetching}
          compact
          className="rounded-2xl border border-destructive/30 bg-destructive/5"
        />
      ) : null}

      <DashboardSection
        title="Nhân sự"
        icon={<Users className="h-4 w-4" strokeWidth={2} aria-hidden />}
        hint={
          <InfoHint
            text={HR_HINT}
            label="Cách tính nhân sự Tổng / Off / Mới"
            className="self-start"
          />
        }
        className="border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-[0_18px_60px_rgba(17,24,39,0.06)]"
        contentClassName="pt-0"
      >
        {isLoading && !data ? (
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_0.9fr]">
            <Skeleton className="h-28 w-full rounded-[24px]" />
            <Skeleton className="h-28 w-full rounded-[24px]" />
            <Skeleton className="h-28 w-full rounded-[24px]" />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_0.9fr]">
            <div className="group relative overflow-hidden rounded-[24px] border border-primary/15 bg-gradient-to-br from-indigo-500/12 via-violet-500/8 to-fuchsia-500/10 p-4 shadow-[0_18px_50px_rgba(99,102,241,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(99,102,241,0.16)]">
              <div
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600/80">
                    Tổng nhân sự
                  </p>
                  <p className="mt-3 text-4xl font-black leading-none tabular-nums text-foreground">
                    {total.toLocaleString('vi-VN')}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">nhân sự đang làm việc</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/80 text-indigo-600 shadow-sm ring-1 ring-border/60">
                  <Users className="h-5 w-5" aria-hidden />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-background/70 px-3 py-2 ring-1 ring-border/50">
                  <p className="text-[11px] text-muted-foreground">Tỷ lệ</p>
                  <p className="mt-1 text-sm font-bold text-foreground">100%</p>
                </div>
                <div className="rounded-2xl bg-background/70 px-3 py-2 ring-1 ring-border/50">
                  <p className="text-[11px] text-muted-foreground">Off</p>
                  <p className="mt-1 text-sm font-bold text-rose-600">{off}</p>
                </div>
                <div className="rounded-2xl bg-background/70 px-3 py-2 ring-1 ring-border/50">
                  <p className="text-[11px] text-muted-foreground">Mới</p>
                  <p className="mt-1 text-sm font-bold text-emerald-600">{newHires}</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[24px] border border-rose-200/70 bg-gradient-to-br from-rose-50 via-white to-rose-100/70 p-4 shadow-[0_18px_50px_rgba(244,63,94,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(244,63,94,0.12)]">
              <div
                className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-rose-400/10 blur-2xl"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600/80">
                    Nghỉ việc {periodSuffix}
                  </p>
                  <p className="mt-3 text-4xl font-black leading-none tabular-nums text-foreground">
                    {off.toLocaleString('vi-VN')}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{pct(off, total)} tổng</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-rose-500 shadow-sm ring-1 ring-rose-100">
                  <TrendingDown className="h-5 w-5" aria-hidden />
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-rose-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500"
                  style={{ width: `${Math.min(100, (off / Math.max(1, total)) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-rose-700/80">Tỷ lệ biến động trong kỳ</p>
            </div>

            <div className="group relative overflow-hidden rounded-[24px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-cyan-100/70 p-4 shadow-[0_18px_50px_rgba(16,185,129,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(16,185,129,0.12)]">
              <div
                className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600/80">
                    Tuyển mới {periodSuffix}
                  </p>
                  <p className="mt-3 text-4xl font-black leading-none tabular-nums text-foreground">
                    {newHires.toLocaleString('vi-VN')}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{pct(newHires, total)} tổng</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-emerald-500 shadow-sm ring-1 ring-emerald-100">
                  <TrendingUp className="h-5 w-5" aria-hidden />
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500"
                  style={{ width: `${Math.min(100, (newHires / Math.max(1, total)) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-emerald-700/80">Tỷ lệ tuyển mới trong kỳ</p>
            </div>
          </div>
        )}

        {isFetching && data ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">Đang cập nhật…</p>
        ) : null}
      </DashboardSection>
    </div>
  )
}
