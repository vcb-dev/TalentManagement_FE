import { useMemo, useState } from 'react'
import {
  Badge,
  Castle,
  CheckCircle2,
  Gem,
  Download,
  GraduationCap,
  Handshake,
  ImageIcon,
  ListTodo,
  Lock,
  Pencil,
  Plus,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Trophy,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { StarEmblem } from '@/components/icons/StarEmblem'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { LEVEL_LABELS, LEVELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  MOCK_EXERCISES_BY_LEVEL,
  type ManagerExerciseItem,
} from '@/features/manager/mock/mockManagerHub'
import { ManagerScreenLayout } from './ManagerScreenLayout'

const PAGE_SUBTITLE =
  'Quản lý mục tiêu và lộ trình thăng tiến của nhân sự trong team. Member làm tuần tự — mục sau chỉ mở khi mục trước hoàn thành.'

const LEVEL_BENTO_ICONS: Record<LevelCode, typeof UserPlus> = {
  tap_su: UserPlus,
  biet_viec: GraduationCap,
  duoc_viec: CheckCircle2,
  dong_gop_ket_qua: Rocket,
  tuong: Castle,
}

const TASK_DECOR_ICONS = [Badge, ShieldCheck, Terminal, Handshake]

function starOptionsForLevel(level: LevelCode): number[] {
  const max = STARS_PER_LEVEL[level]
  if (max <= 0) return [1, 2]
  return Array.from({ length: max }, (_, i) => i + 1)
}

function countTasksForLevel(level: LevelCode): number {
  const block = MOCK_EXERCISES_BY_LEVEL[level]
  if (!block) return 0
  return Object.values(block).reduce((sum, arr) => sum + arr.length, 0)
}

function getItems(level: LevelCode, star: number): ManagerExerciseItem[] {
  const block = MOCK_EXERCISES_BY_LEVEL[level]
  if (!block) return []
  return block[star] ?? []
}

function itemStatusMeta(index: number, length: number) {
  if (length <= 1) {
    return {
      label: 'Đã hoàn thành',
      className: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
    }
  }
  if (index === 0) {
    return {
      label: 'Đã hoàn thành',
      className: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
    }
  }
  if (index === 1) {
    return {
      label: 'Chờ duyệt',
      className: 'bg-amber-500/15 text-amber-900 dark:text-amber-100',
    }
  }
  return {
    label: 'Chưa mở',
    className: 'bg-muted text-muted-foreground',
  }
}

function itemDescription(it: ManagerExerciseItem): string {
  const parts: string[] = []
  if (it.requiresEvidence) parts.push('Yêu cầu nộp bằng chứng minh chứng')
  if (it.lockedUntilPrev) parts.push('Mở sau khi hoàn thành mục trước trong cùng sao')
  if (parts.length === 0) return 'Mục checklist trong lộ trình — chỉnh sửa mô tả khi nối API.'
  return parts.join(' · ')
}

export function ManagerExercisesScreen() {
  const [level, setLevel] = useState<LevelCode>('tap_su')
  const stars = useMemo(() => starOptionsForLevel(level), [level])
  const [star, setStar] = useState(1)

  const safeStar = stars.includes(star) ? star : (stars[0] ?? 1)
  const items = getItems(level, safeStar)
  const totalInLevel = useMemo(() => countTasksForLevel(level), [level])

  const progressPct = useMemo(() => {
    if (items.length === 0) return 0
    const done = items.findIndex((_, i) => i > 0)
    const approx = Math.min(100, 28 + items.length * 18 + (done > 0 ? 12 : 0))
    return approx
  }, [items])

  const milestoneLabel =
    LEVELS[LEVELS.indexOf(level) + 1] != null
      ? `Tiến trình đạt hạng "${LEVEL_LABELS[LEVELS[LEVELS.indexOf(level) + 1]!]}"`
      : 'Hoàn thành cấp Tướng'

  const starMilestoneSlots = [1, 2, 3, 4] as const

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        {/* Header — giống code.html: tiêu đề + CTA */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Bài tập & checklist lộ trình</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>{PAGE_SUBTITLE}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl border-primary/20 bg-card px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary/5"
              onClick={() => toast.info('Xuất báo cáo (demo) — nối API.')}
            >
              <Download className="h-4 w-4" strokeWidth={2} />
              Xuất báo cáo
            </Button>
            <Button
              type="button"
              className="gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => toast.info('Thiết lập chung (demo)')}
            >
              <Settings2 className="h-4 w-4" strokeWidth={2} />
              Thiết lập chung
            </Button>
          </div>
        </div>

        {/* Bento tabs — 5 cấp */}
        <div className="grid grid-cols-2 gap-2 p-1.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3 lg:rounded-2xl lg:bg-muted/40 lg:ring-1 lg:ring-border/60">
          {LEVELS.map((code) => {
            const Icon = LEVEL_BENTO_ICONS[code]
            const count = countTasksForLevel(code)
            const active = level === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLevel(code)
                  setStar(1)
                }}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-3 py-3 transition-all sm:px-4 sm:py-4',
                  active
                    ? 'bg-card text-primary shadow-sm ring-1 ring-primary/25'
                    : 'text-muted-foreground hover:bg-card/80'
                )}
              >
                <Icon
                  className={cn('h-7 w-7 sm:h-8 sm:w-8', active ? 'text-primary' : '')}
                  strokeWidth={active ? 2.25 : 2}
                />
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-widest sm:text-xs',
                    active ? 'text-primary' : ''
                  )}
                >
                  {LEVEL_LABELS[code]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {count > 0 ? `${count} nhiệm vụ` : '—'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Cột chính — danh sách */}
          <div className="space-y-4 lg:col-span-8">
            <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                <ListTodo className="h-5 w-5 text-primary" strokeWidth={2} />
                Danh sách nhiệm vụ {LEVEL_LABELS[level]}
              </h2>
              <div className="text-xs font-semibold text-primary sm:text-sm">
                <span className="rounded-full bg-primary/10 px-3 py-1">
                  Tiến độ: {progressPct}%
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {STARS_PER_LEVEL[level] <= 0 ? 'Giai đoạn / mục' : 'Sao'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {stars.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStar(s)}
                    className={cn(
                      'min-w-[2.25rem] rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums',
                      safeStar === s
                        ? 'border-[#D4A017] bg-[#FFF9E6] text-[#8B6914] ring-1 ring-[#D4A017]/40'
                        : 'border-border bg-card text-muted-foreground hover:border-[#D4A017]/50'
                    )}
                  >
                    {STARS_PER_LEVEL[level] <= 0 ? `Mục ${s}` : `Sao ${s}`}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={cn(
                'rounded-xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-card)] ring-1 ring-primary/10 md:p-6',
                CARD_ENTRANCE_HOVER
              )}
            >
              {items.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Chưa có mục checklist cho{' '}
                    <span className="font-semibold text-foreground">
                      {LEVEL_LABELS[level]} ·{' '}
                      {STARS_PER_LEVEL[level] <= 0 ? `mục ${safeStar}` : `sao ${safeStar}`}
                    </span>
                    .
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 gap-2"
                    onClick={() => toast.info('Thêm mục checklist (demo) — nối API.')}
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} />
                    Thêm mục đầu tiên
                  </Button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((it, idx) => {
                    const status = itemStatusMeta(idx, items.length)
                    const DecorIcon = TASK_DECOR_ICONS[idx % TASK_DECOR_ICONS.length]!
                    const decorTone =
                      idx % 4 === 0
                        ? 'bg-primary/12 text-primary'
                        : idx % 4 === 1
                          ? 'bg-amber-500/12 text-amber-800 dark:text-amber-200'
                          : idx % 4 === 2
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-violet-500/10 text-violet-800 dark:text-violet-200'
                    return (
                      <li
                        key={it.id}
                        className={cn(
                          'group flex flex-col gap-4 rounded-[12px] border border-transparent bg-gradient-to-r from-card to-primary/[0.02] p-4 transition-all duration-300 hover:border-primary/10 hover:shadow-md sm:flex-row sm:items-center sm:gap-5 sm:p-5',
                          CARD_ENTRANCE_HOVER
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14',
                            decorTone
                          )}
                        >
                          <DecorIcon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground sm:text-base">
                              {it.title}
                            </h3>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter',
                                status.className
                              )}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-xs text-muted-foreground sm:line-clamp-1">
                            {itemDescription(it)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs sm:pl-0">
                            {it.requiresEvidence ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 font-medium text-teal-900 dark:text-teal-100">
                                <ImageIcon className="h-3 w-3" strokeWidth={2} />
                                Cần bằng chứng
                              </span>
                            ) : null}
                            {it.lockedUntilPrev ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 font-medium text-violet-900 dark:text-violet-100">
                                <Lock className="h-3 w-3" strokeWidth={2} />
                                Khóa đến khi xong mục trước
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div
                          className={cn(
                            'flex shrink-0 flex-wrap gap-2 sm:justify-end',
                            'opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100'
                          )}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg bg-muted/80 text-muted-foreground hover:text-primary"
                            onClick={() => toast.info('Sửa mục (demo)')}
                            aria-label="Sửa"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={2} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg bg-muted/80 text-rose-700 hover:text-rose-800"
                            onClick={() => toast.info('Xóa mục (demo)')}
                            aria-label="Xóa"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground"
                            onClick={() => toast.info('Chi tiết mục (demo)')}
                          >
                            Chi tiết
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => toast.info('Thêm mục mới vào cuối (demo)')}
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Thêm mục
                </Button>
              </div>
            ) : null}
          </div>

          {/* Sidebar — milestone + huy hiệu + stats */}
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-3xl bg-gradient-to-br from-primary via-teal-700 to-violet-800 p-6 text-primary-foreground shadow-xl shadow-primary/20">
              <h3 className="mb-4 text-base font-bold">Milestone thăng cấp</h3>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="max-w-[70%] font-medium text-primary-foreground/90">
                  {milestoneLabel}
                </span>
                <span className="font-bold tabular-nums">
                  {safeStar}/{stars.length} {STARS_PER_LEVEL[level] <= 0 ? 'mục' : 'sao'}
                </span>
              </div>
              <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{
                    width: `${Math.min(100, (safeStar / Math.max(1, stars.length)) * 100)}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {starMilestoneSlots.map((slot) => {
                  const active = safeStar >= slot
                  const current = safeStar === slot
                  return (
                    <div key={slot} className="flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full',
                          current
                            ? 'bg-white text-primary shadow-[0_0_15px_rgba(255,255,255,0.35)]'
                            : active
                              ? 'bg-white/25 text-white'
                              : 'border-2 border-dashed border-white/35 text-white/50'
                        )}
                      >
                        <StarEmblem
                          variant={active ? 'filled' : 'empty'}
                          className={cn(
                            'h-5 w-5',
                            !active
                              ? 'opacity-45 brightness-0 invert'
                              : current
                                ? ''
                                : 'brightness-0 invert opacity-95'
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-[9px] font-bold uppercase tracking-tighter',
                          current ? 'text-white' : 'text-primary-foreground/80'
                        )}
                      >
                        {`Mốc ${slot}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
                <Trophy className="h-5 w-5 text-primary" strokeWidth={2} />
                Huy hiệu lộ trình
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border/50">
                    <Rocket className="h-6 w-6 text-primary" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight text-foreground">
                      Siêu cấp {LEVEL_LABELS[level].toLowerCase()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Gắn với cấp đang chọn (demo)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border/50">
                    <Sparkles className="h-6 w-6 text-amber-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight text-foreground">
                      Hoàn thành checklist có bằng chứng
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {totalInLevel > 0 ? `${totalInLevel} mục trong dữ liệu mẫu` : 'Chưa có mục'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 opacity-40 grayscale">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-border bg-card">
                    <Gem className="h-6 w-6 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight text-foreground">Tinh hoa VCB</p>
                    <p className="text-[11px] text-muted-foreground">Mở khi đạt cấp Tướng</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border/40">
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                  Nhiệm vụ cấp
                </p>
                <p className="text-2xl font-black text-primary tabular-nums">{totalInLevel}</p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border/40">
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                  Đang xem
                </p>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                  {items.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAB */}
        <button
          type="button"
          className="group fixed bottom-10 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-800 text-primary-foreground shadow-[0_12px_32px_rgba(53,37,205,0.35)] transition hover:scale-110 active:scale-95 sm:right-10 sm:h-16 sm:w-16"
          onClick={() => toast.info('Thêm mục lộ trình mới (demo)')}
          aria-label="Thêm mục lộ trình mới"
        >
          <Plus className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.5} />
          <span className="pointer-events-none absolute right-[4.5rem] whitespace-nowrap rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            Thêm mục lộ trình mới
          </span>
        </button>
      </div>
    </ManagerScreenLayout>
  )
}
