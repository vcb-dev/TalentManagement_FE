import { memo, useMemo } from 'react'
import { CalendarDays, Check, Clock, Flag, Hourglass, Lock, Route } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { useExams } from '@/features/exam/hooks'
import type { ExamScheduleRow } from '@/features/exam/schemas'
import { DashboardTrainingRoadmapCard } from '@/features/employee-dashboard/components/DashboardTrainingRoadmapCard'
import { useMyEnrolledClass } from '@/features/learning-path/hooks'
import type { MeEnrolledClassSchedule } from '@/features/learning-path/schemas'
import { LEVELS, LEVEL_LABELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function pickNextExam(rows: ExamScheduleRow[]): ExamScheduleRow | null {
  if (!rows.length) return null
  const upcoming = rows
    .filter((e) => e.status === 'UPCOMING')
    .map((e) => ({ e, t: new Date(e.scheduledAt).getTime() }))
    .filter((x) => !Number.isNaN(x.t))
    .sort((a, b) => a.t - b.t)
  if (upcoming.length) return upcoming[0]!.e
  const inProg = rows.filter((e) => e.status === 'IN_PROGRESS')
  if (inProg.length) {
    return [...inProg].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )[0]!
  }
  return null
}

function formatExamDateTime(iso: string): { dateLine: string; timeLine: string } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { dateLine: '—', timeLine: '—' }
  return {
    dateLine: d.toLocaleDateString('vi-VN'),
    timeLine: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  }
}

function parseScheduleStartMs(s: MeEnrolledClassSchedule): number {
  const base = new Date(s.dateIso)
  if (Number.isNaN(base.getTime())) return NaN
  const parts = s.startTime.split(':').map((x) => parseInt(x, 10))
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  base.setHours(h, m, 0, 0)
  return base.getTime()
}

function pickNextStudySlot(slots: MeEnrolledClassSchedule[]): MeEnrolledClassSchedule | null {
  const now = Date.now()
  const withT = slots
    .map((s) => ({ s, t: parseScheduleStartMs(s) }))
    .filter((x) => !Number.isNaN(x.t))
    .sort((a, b) => a.t - b.t)
  const next = withT.find((x) => x.t >= now)
  return next?.s ?? null
}

function formatSlotWhen(s: MeEnrolledClassSchedule): { dateLine: string; timeLine: string } {
  const start = new Date(s.dateIso)
  if (Number.isNaN(start.getTime())) return { dateLine: '—', timeLine: '—' }
  const dline = start.toLocaleDateString('vi-VN')
  const tline =
    s.endTime?.trim() && s.startTime?.trim()
      ? `${s.startTime.trim()} – ${s.endTime.trim()}`
      : (s.startTime?.trim() ?? '—')
  return { dateLine: dline, timeLine: tline }
}

export type DashboardLearningZoneProps = {
  /** Khi true, cột lộ trình hiển thị skeleton thay vì số liệu tạm. */
  isLoading?: boolean
  /** Cấp độ nghề nghiệp hiện tại (theo dashboard / API). */
  currentLevel: LevelCode
  /** Số sao trong cấp độ hiện tại. */
  currentStars: number
}

function RoadmapSkeleton() {
  return (
    <div className="relative space-y-0 pl-0">
      <div
        className="absolute bottom-4 left-[19px] top-4 w-1 rounded-full bg-border/80"
        aria-hidden
      />
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={cn(
            'relative pl-12 motion-safe:animate-pulse motion-reduce:animate-none',
            i < 4 ? 'pb-10' : ''
          )}
        >
          <div className="absolute left-0 h-10 w-10 rounded-full bg-muted/90" />
          <div className="mb-2 h-3 w-28 rounded-md bg-muted/70" />
          <div className="h-5 max-w-[200px] rounded-md bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

/** Khối lộ trình học, thi cử — phần tab học tập (phần đầu dashboard nằm ở EmployeeLearningDashboard). */
export const DashboardLearningZone = memo(function DashboardLearningZone({
  isLoading = false,
  currentLevel,
  currentStars,
}: DashboardLearningZoneProps) {
  const levelIndex = useMemo(() => LEVELS.indexOf(currentLevel), [currentLevel])
  const currentIndex = levelIndex >= 0 ? levelIndex : 0
  const maxStarsActive = STARS_PER_LEVEL[currentLevel]
  const progressPct = useMemo(
    () =>
      maxStarsActive > 0 ? Math.round(Math.min(100, (currentStars / maxStarsActive) * 100)) : null,
    [currentStars, maxStarsActive]
  )

  const { data: examList, isLoading: examListLoading } = useExams({ page: 1, pageSize: 50 }, true)
  const { data: enrolled, isLoading: classLoading } = useMyEnrolledClass()

  const nextExam = useMemo(() => pickNextExam(examList?.data ?? []), [examList?.data])
  const nextExamFmt = useMemo(
    () => (nextExam ? formatExamDateTime(nextExam.scheduledAt) : null),
    [nextExam]
  )
  const nextSlot = useMemo(
    () => pickNextStudySlot(enrolled?.enrolledClass?.schedules ?? []),
    [enrolled?.enrolledClass?.schedules]
  )
  const nextSlotFmt = useMemo(() => (nextSlot ? formatSlotWhen(nextSlot) : null), [nextSlot])

  const blockLoading = examListLoading || classLoading

  return (
    <div className="space-y-8 text-sm text-foreground">
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <section
          className={cn(
            'relative flex h-full flex-col overflow-hidden rounded-3xl border border-primary/20 p-6 md:p-8'
          )}
          style={staggerStyle(0, 55)}
          aria-labelledby="dash-learning-path-title"
        >
          <h3
            id="dash-learning-path-title"
            className="relative mb-8 flex items-center gap-2 text-xl font-black tracking-tight text-foreground"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-[#006C49]">
              <Route className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            </span>
            <span>Lộ trình 5 cấp độ Lao động tri thức</span>
          </h3>
          {isLoading ? (
            <div className="flex-1">
              <RoadmapSkeleton />
            </div>
          ) : (
            <div className="relative flex-1 space-y-0 pl-0">
              <div
                className="absolute bottom-4 left-[19px] top-4 w-1 rounded-full bg-gradient-to-b from-primary via-accent to-border/80 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
                aria-hidden
              />

              {LEVELS.map((stepCode, i) => {
                const displayNum = String(i + 1)
                const title = LEVEL_LABELS[stepCode]
                const isLast = i === LEVELS.length - 1
                const baseDelay = 80 + i * 70

                if (i < currentIndex) {
                  return (
                    <div
                      key={stepCode}
                      className="relative pb-10 pl-12 motion-safe:animate-[dash-fade-up_0.5s_ease-out_both] motion-reduce:animate-none"
                      style={{ animationDelay: `${baseDelay}ms` }}
                    >
                      <div className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-lg shadow-primary/40 ring-2 ring-primary/30 motion-safe:transition-transform motion-safe:duration-300 hover:scale-110">
                        <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                      </div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#006C49]">
                        Cấp độ {displayNum}
                      </p>
                      <h4 className="text-lg font-bold leading-tight text-foreground">{title}</h4>
                      <span className="mt-1 inline-block rounded-md border border-primary/20 bg-[#006C49] px-2 py-0.5 text-sm font-semibold text-primary">
                        Hoàn thành
                      </span>
                    </div>
                  )
                }

                if (i === currentIndex) {
                  return (
                    <div
                      key={stepCode}
                      className={cn(
                        'relative pl-12 motion-safe:animate-[dash-fade-up_0.55s_ease-out_both] motion-reduce:animate-none',
                        !isLast ? 'pb-10' : ''
                      )}
                      style={{ animationDelay: `${baseDelay}ms` }}
                    >
                      <div className="absolute -left-1 z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-card bg-[#006C49] text-primary-foreground shadow-xl shadow-primary/40 motion-safe:animate-[dash-float-slow_4s_ease-in-out_infinite] motion-reduce:animate-none">
                        <Hourglass
                          className="h-6 w-6 motion-safe:animate-pulse motion-reduce:animate-none"
                          aria-hidden
                        />
                      </div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#006C49]">
                        Cấp độ {displayNum}
                      </p>
                      <h4 className="text-xl font-black leading-tight text-foreground">{title}</h4>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#006C49] px-3 py-1 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25">
                          Đang học
                        </span>
                        {progressPct !== null ? (
                          <span className="text-xs font-semibold text-muted-foreground">
                            Tiến độ: {progressPct}%
                          </span>
                        ) : null}
                      </div>
                      {progressPct !== null ? (
                        <div className="mt-3 h-2 max-w-[180px] overflow-hidden rounded-full bg-background/60 p-px shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-primary motion-safe:transition-[width] motion-safe:duration-[1s] motion-safe:ease-out"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                }

                return (
                  <div
                    key={stepCode}
                    className={cn(
                      'relative pl-12 opacity-[0.72]',
                      !isLast ? 'pb-10' : 'opacity-90'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-sm',
                        isLast
                          ? 'border-2 border-border bg-background/80 text-muted-foreground'
                          : 'border-2 border-dashed border-muted-foreground/35 bg-muted text-muted-foreground'
                      )}
                    >
                      {isLast ? (
                        <Flag className="h-5 w-5" strokeWidth={2} aria-hidden />
                      ) : (
                        <Lock className="h-5 w-5" strokeWidth={2} aria-hidden />
                      )}
                    </div>
                    <p
                      className={cn(
                        'mb-1 text-xs font-bold uppercase tracking-widest',
                        isLast ? 'text-muted-foreground' : 'text-muted-foreground'
                      )}
                    >
                      Cấp độ {displayNum}
                    </p>
                    <h4 className="text-lg font-bold leading-tight text-foreground">{title}</h4>
                    <span
                      className={cn(
                        'mt-1 inline-block text-sm font-medium',
                        isLast ? 'text-muted-foreground' : 'text-muted-foreground italic'
                      )}
                    >
                      {isLast ? 'Mục tiêu cuối' : 'Chưa mở'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div
          className={cn(
            'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-primary/15  p-6',
            CARD_ENTRANCE_HOVER,
            'motion-safe:transition-all motion-safe:duration-300 hover:-translate-y-1 hover:border-primary/25 motion-reduce:transition-none motion-reduce:hover:translate-y-0'
          )}
          style={staggerStyle(1, 55)}
          aria-busy={blockLoading}
        >
          <h4 className="relative mb-4 flex items-center gap-2 text-lg font-black text-foreground">
            <CalendarDays
              className="h-5 w-5 text-[#006C49] motion-safe:transition-transform group-hover:rotate-12"
              strokeWidth={2}
              aria-hidden
            />
            Kỳ thi tiếp theo
          </h4>
          <div className="relative flex flex-1 flex-col">
            {blockLoading ? (
              <div className="relative mb-4 space-y-3 rounded-2xl border border-primary/10 bg-card/95 p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-full max-w-[280px]" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : nextExam && nextExamFmt ? (
              <div className="relative mb-4 rounded-2xl border border-primary/10 bg-card/95 p-4 shadow-inner backdrop-blur-sm">
                <p className="mb-1 text-xs font-bold uppercase tracking-tighter text-primary/90">
                  {nextExam.status === 'IN_PROGRESS' ? 'Kỳ thi / lịch' : 'Môn thi & lịch'}
                </p>
                <p className="font-bold text-foreground">{nextExam.title}</p>
                <div className="mt-3 flex flex-wrap gap-4 border-t border-border/80 pt-3">
                  <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                    <CalendarDays className="h-4 w-4 text-accent" strokeWidth={2} />
                    {nextExamFmt.dateLine}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                    <Clock className="h-4 w-4 text-primary" strokeWidth={2} />
                    {nextExamFmt.timeLine}
                  </div>
                  {nextExam.status === 'IN_PROGRESS' ? (
                    <span className="text-xs font-bold uppercase text-primary">Đang mở</span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center justify-center text-center mb-4 w-full h-full rounded-2xl border border-dashed border-border bg-card/80 p-4 text-lg font-semibold text-muted-foreground">
                <CalendarDays className="h-10 w-10 text-accent" />
                Chưa có kỳ thi sắp tới trên hệ thống. Mở mục Thi và kết quả để cập nhật.
              </div>
            )}

            {blockLoading ? (
              <div className="relative mb-4 rounded-xl border border-border/60 bg-card/60 p-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="mt-2 h-4 w-full" />
              </div>
            ) : nextSlot && nextSlotFmt ? (
              <div className="relative mb-4 rounded-xl border border-accent/20 bg-gradient-to-r from-card/90 to-accent/[0.06] p-3 text-sm">
                <p className="mb-1 text-xs font-bold uppercase tracking-tight text-accent">
                  Buổi học gần nhất
                </p>
                <p className="font-bold text-foreground">{nextSlot.topic}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                    {nextSlotFmt.dateLine}
                  </span>
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <Clock className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
                    {nextSlotFmt.timeLine}
                  </span>
                </div>
              </div>
            ) : !classLoading && enrolled?.enrolledClass ? (
              <p className="relative mb-4 text-xs text-muted-foreground">
                Lớp {enrolled.enrolledClass.name}: chưa có buổi học tới trên lịch.
              </p>
            ) : null}

            <Button
              asChild
              className="relative mt-auto h-auto w-full rounded-xl py-3.5 text-sm font-black"
            >
              <Link to="/exam" className="relative z-10 flex w-full items-center justify-center">
                {nextExam && nextExam.status === 'IN_PROGRESS'
                  ? 'Vào mục thi và lịch'
                  : 'Đăng ký tham gia ngay'}
              </Link>
            </Button>
          </div>
        </div>

        <DashboardTrainingRoadmapCard staggerIndex={2} />
      </div>
    </div>
  )
})
