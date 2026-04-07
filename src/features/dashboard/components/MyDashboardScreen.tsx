import { Building2, CalendarDays, IdCard, Phone, Star, TrendingUp } from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProgressStar } from '@/components/shared/ProgressStar/ProgressStar'
import { Skeleton } from '@/components/ui/skeleton'
import { formatViDate } from '@/lib/date'
import { LEVEL_LABELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { cn } from '@/lib/utils'
import { useMyDashboard } from '@/features/dashboard/hooks'

function parseLevel(v: unknown): LevelCode {
  if (typeof v === 'string' && Object.prototype.hasOwnProperty.call(LEVEL_LABELS, v)) {
    return v as LevelCode
  }
  return 'tap_su'
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5 shadow-[var(--shadow-card)]">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-foreground">{value || '—'}</div>
      </div>
    </div>
  )
}

export function MyDashboardScreen() {
  const { data, isLoading, isError } = useMyDashboard()

  if (isLoading) {
    return (
      <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
        <div className="page-shell">
          <PageHeader title="Dashboard" description="Đang tải dữ liệu…" />
          <div className="mx-auto max-w-6xl space-y-6 pb-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Skeleton className="h-56 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-2xl lg:col-span-2" />
            </div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
        <div className="page-shell">
          <PageHeader title="Dashboard" />
          <div className="mx-auto max-w-6xl rounded-2xl border border-border/80 bg-card p-6 text-muted-foreground shadow-[var(--shadow-card)]">
            Không tải được dashboard. Vui lòng thử lại sau.
          </div>
        </div>
      </div>
    )
  }

  const u = data.user
  const displayName = u.displayName?.trim() || u.fullNameLegal?.trim() || 'Nhân viên'
  const level = parseLevel(data.career?.careerLevel)
  const stars = data.career?.currentStars ?? 0
  const maxStars = STARS_PER_LEVEL[level] || 6
  const levelLabel = LEVEL_LABELS[level]

  const promos = [...data.promotionHistory].sort(
    (a, b) => new Date(b.promotedAt).getTime() - new Date(a.promotedAt).getTime()
  )

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="page-shell">
        <PageHeader
          title="Dashboard"
          description="Thông tin cá nhân, cấp độ hiện tại và lịch sử thăng cấp của bạn."
        />

        <div className="mx-auto max-w-6xl space-y-8 pb-10">
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3" aria-label="Tóm tắt">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start gap-4">
                <EmployeeAvatar
                  name={displayName}
                  photoUrl={resolvePublicAssetUrl(u.portraitRef)}
                  className="h-14 w-14 rounded-xl ring-2 ring-border"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold">{displayName}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {u.email?.trim() || '—'}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                    <Star className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {levelLabel}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <InfoRow
                  icon={<Phone className="h-4 w-4" aria-hidden />}
                  label="Điện thoại"
                  value={u.phonePrimary?.trim() || '—'}
                />
                <InfoRow
                  icon={<IdCard className="h-4 w-4" aria-hidden />}
                  label="Mã nhân viên"
                  value={u.employeeCodePrimary?.trim() || '—'}
                />
                <InfoRow
                  icon={<Building2 className="h-4 w-4" aria-hidden />}
                  label="Phòng ban / Team"
                  value={[
                    u.departmentName?.trim() || null,
                    u.teamGroup?.trim() || null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Cấp độ hiện tại</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {data.career?.eligiblePromote ? 'Đủ điều kiện thăng cấp' : 'Đang trong lộ trình'}
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
                  Sao: {stars}/{maxStars}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {Array.from({ length: maxStars }, (_, i) => (
                  <ProgressStar key={i} filled={i < stars} variant="primary" className="h-6 w-6" />
                ))}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <InfoRow
                  icon={<CalendarDays className="h-4 w-4" aria-hidden />}
                  label="Ngày vào làm"
                  value={u.startDateWork?.trim() || '—'}
                />
                <InfoRow
                  icon={<Star className="h-4 w-4" aria-hidden />}
                  label="Chức danh"
                  value={u.jobTitle?.trim() || '—'}
                />
              </div>
            </div>
          </section>

          <section
            className="rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-card)]"
            aria-label="Lịch sử thăng cấp"
          >
            <div className="card-section-header">Lịch sử thăng cấp</div>
            <div className="p-5">
              {promos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có lịch sử thăng cấp.</p>
              ) : (
                <ul className="space-y-3">
                  {promos.map((p, idx) => {
                    const from = p.fromLevel ? LEVEL_LABELS[p.fromLevel] : '—'
                    const to = LEVEL_LABELS[p.toLevel]
                    return (
                      <li
                        key={`${p.promotedAt}-${idx}`}
                        className={cn(
                          'rounded-xl border border-border/70 bg-muted/25 p-4',
                          'flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4'
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {from} → {to}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {formatViDate(p.promotedAt)}
                            {p.note?.trim() ? ` · ${p.note.trim()}` : ''}
                          </div>
                        </div>
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          <Star className="h-3.5 w-3.5" aria-hidden />
                          Thăng cấp
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

