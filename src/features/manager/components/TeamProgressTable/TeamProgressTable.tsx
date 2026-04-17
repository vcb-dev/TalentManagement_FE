import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { StarEmblem } from '@/components/icons/StarEmblem'
import { Skeleton, SkeletonStatTile } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CARD_ENTRANCE_HOVER, CARD_HOVER, PROGRESS_BAR_FILL, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { ManagerHubNav } from '@/features/manager/components/ManagerHub/ManagerHubNav'
import type { TeamMemberProgress } from '@/features/manager/types'

const STATUS_BADGE: Record<NonNullable<TeamMemberProgress['statusVariant']>, string> = {
  success: 'bg-[#DCFCE7] text-[#166534]',
  warning: 'bg-[#FEF3C7] text-[#92400E]',
  info: 'bg-primary/10 text-primary',
  danger: 'bg-[#FEE2E2] text-[#991B1B]',
  neutral: 'border border-border bg-muted text-muted-foreground',
}

const BAR_FILL: Record<NonNullable<TeamMemberProgress['progressBarVariant']>, string> = {
  indigo: 'bg-primary',
  teal: 'bg-[#0E7490]',
  amber: 'bg-[#D97706]',
  red: 'bg-[#991B1B]',
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]?.[0]
    const b = parts[parts.length - 1]?.[0]
    if (a && b) return `${a}${b}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function StarRowMini({ filled, max }: { filled: number; max: number }) {
  const n = Math.min(Math.max(max, 1), 6)
  const f = Math.min(Math.max(filled, 0), n)
  return (
    <div className="flex flex-wrap items-center gap-0.5" title={`${filled}/${max} sao`}>
      {Array.from({ length: n }, (_, i) => {
        const full = i < Math.floor(f)
        const partial = i === Math.floor(f) && f % 1 >= 0.5
        const variant = full ? 'filled' : partial ? 'current' : 'empty'
        return <StarEmblem key={i} variant={variant} className="h-3.5 w-3.5 shrink-0" aria-hidden />
      })}
      <span className="ml-1 text-sm font-semibold tabular-nums text-primary md:text-base">
        {filled}/{max}
      </span>
    </div>
  )
}

function StarsCell({ row }: { row: TeamMemberProgress }) {
  if (row.starLabel) {
    return <span className="text-sm font-semibold text-primary md:text-base">{row.starLabel}</span>
  }
  const max = row.starMax ?? 6
  if (row.currentLevel === 'Tập sự' && row.currentStar === 0) {
    return <span className="text-base text-muted-foreground md:text-lg">—</span>
  }
  return <StarRowMini filled={row.currentStar} max={max} />
}

function progressBarVariant(row: TeamMemberProgress): keyof typeof BAR_FILL {
  if (row.progressBarVariant) return row.progressBarVariant
  const p = row.completionPercent
  if (p >= 100) return 'teal'
  if (p >= 60) return 'indigo'
  if (p >= 30) return 'amber'
  return 'red'
}

export interface TeamProgressTableProps {
  teamLabel: string
  teams?: { id: string; label: string }[]
  teamId?: string
  onTeamChange?: (teamId: string) => void
  members: TeamMemberProgress[]
  summary: {
    totalMembers: number
    eligibleExam: number
    onTrack: number
    onTrackPct: number
    behind: number
  }
  isLoading: boolean
}

export function TeamProgressTable({
  teamLabel,
  teams,
  teamId,
  onTeamChange,
  members,
  summary,
  isLoading,
}: TeamProgressTableProps) {
  const teamForm = useForm<{ teamId: string }>({
    defaultValues: { teamId: teamId ?? teams?.[0]?.id ?? '' },
  })
  const user = useAuthStore((s) => s.user)
  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'
  const displayName = user?.name ?? 'Manager'

  useEffect(() => {
    teamForm.reset({ teamId: teamId ?? teams?.[0]?.id ?? '' })
  }, [teamId, teams, teamForm])

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-base text-foreground md:-m-6 lg:-m-8">
      <div className="page-toolbar-gradient">
        <div
          className="pointer-events-none absolute inset-0 opacity-25 motion-safe:animate-[dash-shimmer_10s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            background:
              'linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 90%)',
            backgroundSize: '200% 100%',
          }}
        />
        <div className="relative text-base font-semibold tracking-tight md:text-lg">
          <span className="bg-gradient-to-r from-primary via-teal-700 to-violet-700 bg-clip-text text-transparent">
            Tiến độ học tập — {teamLabel}
          </span>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          {teams && teams.length > 0 && onTeamChange && (
            <Select
              value={teamForm.watch('teamId')}
              onValueChange={(value) => {
                teamForm.setValue('teamId', value)
                onTeamChange(value)
              }}
            >
              <SelectTrigger className="rounded-lg border border-primary/20 bg-card/95 px-3 py-2 text-sm text-foreground shadow-sm ring-1 ring-primary/10 backdrop-blur-sm md:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="rounded-full border border-emerald-200/70 bg-gradient-to-r from-emerald-500/12 to-teal-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-950 shadow-sm ring-1 ring-emerald-500/12 md:text-base">
            {displayName} ({roleLabel})
          </span>
        </div>
      </div>

      <ManagerHubNav />

      <div className="page-shell">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonStatTile key={i} />
              ))}
            </div>
            <div
              className={cn(
                'overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10',
                CARD_HOVER
              )}
            >
              <div className="space-y-0 p-3">
                {Array.from({ length: 6 }, (_, r) => (
                  <div
                    key={r}
                    className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-0"
                  >
                    <Skeleton className="h-14 w-14 shrink-0 rounded-2xl sm:h-16 sm:w-16" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 max-w-[60%] rounded" />
                      <Skeleton className="h-3 w-24 rounded" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <Skeleton className="h-2 min-w-[100px] flex-1 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {(
                [
                  {
                    key: 'm',
                    className:
                      'rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.09] via-card to-teal-500/[0.06] p-3.5 shadow-[var(--shadow-card)] ring-1 ring-primary/10',
                    body: (
                      <>
                        <div className="mb-1 text-xs font-semibold text-primary md:text-sm">
                          👥 Tổng thành viên
                        </div>
                        <div className="bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-[28px] font-extrabold leading-tight text-transparent">
                          {summary.totalMembers}
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'e',
                    className:
                      'rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 via-card to-teal-50/80 p-3.5 shadow-[var(--shadow-card)] ring-1 ring-emerald-500/15',
                    body: (
                      <>
                        <div className="mb-1 text-xs font-semibold text-emerald-800 md:text-sm">
                          ✅ Đủ điều kiện thi
                        </div>
                        <div className="text-[28px] font-extrabold leading-tight text-emerald-700">
                          {summary.eligibleExam}
                        </div>
                        <div className="mt-1 text-xs text-emerald-800 md:text-sm">
                          Cần duyệt ngay
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'o',
                    className:
                      'rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-card to-fuchsia-50/40 p-3.5 shadow-[var(--shadow-card)] ring-1 ring-violet-400/15',
                    body: (
                      <>
                        <div className="mb-1 text-xs font-semibold text-violet-900 md:text-sm">
                          ⚡ Đúng tiến độ
                        </div>
                        <div className="text-[28px] font-extrabold leading-tight text-violet-800">
                          {summary.onTrack}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground md:text-sm">
                          {summary.onTrackPct}% team
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'b',
                    className:
                      'rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/95 via-card to-orange-50/50 p-3.5 shadow-[var(--shadow-card)] ring-1 ring-rose-400/20',
                    body: (
                      <>
                        <div className="mb-1 text-xs font-semibold text-rose-900 md:text-sm">
                          ⚠️ Chậm tiến độ
                        </div>
                        <div className="text-[28px] font-extrabold leading-tight text-rose-800">
                          {summary.behind}
                        </div>
                        <div className="mt-1 text-xs text-rose-800 md:text-sm">Cần hỗ trợ</div>
                      </>
                    ),
                  },
                ] as const
              ).map((s, i) => (
                <div
                  key={s.key}
                  className={cn(s.className, CARD_ENTRANCE_HOVER)}
                  style={staggerStyle(i)}
                >
                  {s.body}
                </div>
              ))}
            </div>

            <div
              className={cn(
                'overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10',
                CARD_HOVER
              )}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-sm md:text-base">
                  <thead>
                    <tr className="bg-gradient-to-r from-primary/12 via-teal-500/8 to-violet-500/8">
                      {[
                        'Nhân viên',
                        'Cấp độ hiện tại',
                        'Sao',
                        'Tiến độ',
                        'Trạng thái',
                        'Cập nhật',
                      ].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap border-b border-border px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground md:text-sm"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((row, rowIdx) => {
                      const tone = row.rowTone ?? 'default'
                      const bar = progressBarVariant(row)
                      const statusVar = row.statusVariant ?? 'neutral'
                      return (
                        <tr
                          key={row.employeeId}
                          className={cn(
                            'border-b border-border transition-[background-color,box-shadow] duration-200 motion-safe:hover:bg-primary/[0.07]',
                            tone === 'success' && 'bg-[#FEFFF5]',
                            tone === 'danger' && 'bg-[#FFF9F9]'
                          )}
                        >
                          <td className="px-3 py-3.5 align-middle">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold shadow-md ring-2 ring-white/90 sm:h-16 sm:w-16 sm:text-base',
                                  row.avatarClass ?? 'bg-primary/10 text-primary'
                                )}
                              >
                                {row.initials ?? initialsFromName(row.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-foreground md:text-base">
                                  {row.name}
                                </div>
                                <div className="text-xs text-muted-foreground md:text-sm">
                                  {row.roleLabel ?? '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 align-middle font-medium text-foreground">
                            {row.currentLevel}
                          </td>
                          <td className="px-3 py-3.5 align-middle">
                            <StarsCell row={row} />
                          </td>
                          <td className="px-3 py-3.5 align-middle">
                            <div className="flex min-w-[120px] items-center gap-2">
                              <div className="h-2 min-w-[60px] flex-1 overflow-hidden rounded-full bg-primary/15">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    BAR_FILL[bar],
                                    PROGRESS_BAR_FILL
                                  )}
                                  style={{
                                    width: `${Math.min(100, row.completionPercent)}%`,
                                    transformOrigin: '0 50%',
                                    animationDelay: `${Math.min(rowIdx, 20) * 45 + 120}ms`,
                                  }}
                                />
                              </div>
                              <span className="min-w-[44px] text-sm font-semibold tabular-nums text-muted-foreground md:text-base">
                                {row.completionPercent}%
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 align-middle">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-3 py-1 text-sm font-bold md:text-base',
                                STATUS_BADGE[statusVar]
                              )}
                            >
                              {row.statusLabel ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 align-middle text-sm text-muted-foreground md:text-base">
                            {row.updatedLabel ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
