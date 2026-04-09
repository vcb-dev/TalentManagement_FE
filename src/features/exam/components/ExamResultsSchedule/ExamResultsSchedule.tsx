import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  ArrowRight,
  Award,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Link2,
  MapPin,
  Shield,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ProgressStar } from '@/components/shared/ProgressStar/ProgressStar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatViDate } from '@/lib/date'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import type { z } from 'zod'
import { type examSummaryApiSchema } from '@/features/exam/schemas'

type ExamRow = z.infer<typeof examSummaryApiSchema>

export interface ExamResultsScheduleProps {
  exams: ExamRow[]
  total: number
  totalPages: number
  page: number
  isLoading: boolean
  onPageChange: (page: number) => void
  onOpenExam: (id: string) => void
}

function formatViWeekdayDate(iso: string): string {
  return format(new Date(iso), 'EEEE, dd/MM/yyyy', { locale: vi })
}

function formatViTime(iso: string): string {
  return format(new Date(iso), 'HH:mm', { locale: vi })
}

function cleanExamTitle(title: string): string {
  return title.replace(/\s*\((?:[a-z_]+\s*->\s*[a-z_]+)\)\s*$/i, '').trim()
}

const STATUS_LABEL: Record<ExamRow['status'], string> = {
  UPCOMING: 'Sắp diễn ra',
  IN_PROGRESS: 'Đang mở',
  COMPLETED: 'Đã hoàn thành',
}

export function ExamResultsSchedule({
  exams,
  total,
  totalPages,
  page,
  isLoading,
  onPageChange,
  onOpenExam,
}: ExamResultsScheduleProps) {
  const [yearFilter, setYearFilter] = useState<string>('all')

  const { upcoming, completed } = useMemo(() => {
    const u: ExamRow[] = []
    const c: ExamRow[] = []
    for (const e of exams) {
      if (e.status === 'UPCOMING' || e.status === 'IN_PROGRESS') u.push(e)
      else if (e.status === 'COMPLETED') c.push(e)
    }
    return { upcoming: u, completed: c }
  }, [exams])

  const yearOptions = useMemo(() => {
    const years = new Set<number>()
    for (const e of completed) {
      years.add(new Date(e.scheduledAt).getFullYear())
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [completed])

  const filteredCompleted = useMemo(() => {
    if (yearFilter === 'all') return completed
    const y = Number.parseInt(yearFilter, 10)
    return completed.filter((e) => new Date(e.scheduledAt).getFullYear() === y)
  }, [completed, yearFilter])

  const upcomingShow = upcoming.slice(0, 2)

  if (isLoading) {
    return (
      <div className="space-y-10 text-sm text-foreground">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Skeleton className="min-h-[280px] rounded-xl" />
            <Skeleton className="min-h-[280px] rounded-xl" />
            <Skeleton className="min-h-[280px] rounded-xl" />
          </div>
        </section>
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-7 w-56 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-8 w-48 rounded-lg" />
          </div>
        </section>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 text-sm text-foreground">
      {/* Lịch thi sắp tới */}
      <section id="lich-thi-sap-toi" className="scroll-mt-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight text-foreground">Lịch thi sắp tới</h2>
          </div>
          <a
            href="#ket-qua-thi-da-dat"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Xem tất cả
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {upcomingShow.map((exam, idx) => {
            const Icon = idx % 2 === 0 ? Building2 : Shield
            const isOptional = idx % 2 === 1
            return (
              <div
                key={exam.id}
                className={cn(
                  'group relative overflow-hidden rounded-xl border border-border bg-muted/40 p-6 shadow-sm transition-all duration-300 hover:shadow-md',
                  CARD_ENTRANCE_HOVER
                )}
              >
                <div className="absolute right-0 top-0 p-4">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wider',
                      isOptional
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-primary-100 text-primary-700'
                    )}
                  >
                    {isOptional ? 'Tự chọn' : 'Bắt buộc'}
                  </span>
                </div>
                <div className="mb-6">
                  <Icon className="mb-4 block h-9 w-9 text-primary" strokeWidth={2} aria-hidden />
                  <h3 className="mb-2 text-lg font-bold leading-tight text-foreground">
                    {cleanExamTitle(exam.title)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {STATUS_LABEL[exam.status]} · {formatViWeekdayDate(exam.scheduledAt)}
                  </p>
                </div>
                <div className="mb-8 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>{formatViWeekdayDate(exam.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>Bắt đầu {formatViTime(exam.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>Theo lịch hệ thống VCB HRM</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (exam.status === 'COMPLETED' || exam.status === 'IN_PROGRESS') {
                      onOpenExam(exam.id)
                    }
                  }}
                  disabled={exam.status === 'UPCOMING'}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-lg py-3 text-base font-bold text-white shadow-sm transition-all',
                    'vcb-cta-exam-gradient hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70'
                  )}
                >
                  {exam.status === 'IN_PROGRESS'
                    ? 'Vào thi'
                    : exam.status === 'COMPLETED'
                      ? 'Xem chi tiết'
                      : 'Đã lên lịch'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )
          })}

          {upcomingShow.length < 2 &&
            Array.from({ length: 2 - upcomingShow.length }, (_, i) => (
              <div
                key={`placeholder-${i}`}
                className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-muted-foreground"
              >
                <Calendar className="mb-2 h-10 w-10 opacity-50" aria-hidden />
                <p className="text-sm font-medium">Chưa có thêm lịch thi sắp tới trên trang này.</p>
              </div>
            ))}

          {/* Gamification */}
          <div
            className={cn(
              'relative flex flex-col justify-between overflow-hidden rounded-xl border border-primary/20 bg-primary p-6 text-primary-foreground shadow-lg',
              CARD_ENTRANCE_HOVER
            )}
          >
            <div className="pointer-events-none absolute -bottom-4 -right-4 opacity-[0.12]">
              <Award className="h-[120px] w-[120px]" aria-hidden />
            </div>
            <div>
              <span className="mb-4 block text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-primary-foreground/90">
                Gamification
              </span>
              <h3 className="mb-2 text-2xl font-bold">Thử thách Ngôi sao</h3>
              <p className="text-sm leading-relaxed text-primary-foreground/90">
                Hoàn thành các mốc trong lộ trình học để nhận điểm thưởng và huy hiệu trên VCB HRM.
              </p>
            </div>
            <div className="mt-8">
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="rounded-lg bg-white font-bold text-primary hover:bg-white/95"
              >
                <Link to="/learning-path" search={{ levelId: 'biet_viec', starId: 1 }}>
                  Khám phá ngay
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Kết quả thi đã đạt */}
      <section id="ket-qua-thi-da-dat" className="scroll-mt-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 shrink-0 rounded-full bg-brand-tertiary" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight text-foreground">Kết quả thi đã đạt</h2>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="sr-only">Lọc theo năm</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Tất cả kỳ thi</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  Năm {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-muted/60 text-muted-foreground">
                  <th className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-wider">
                    Tên kỳ thi
                  </th>
                  <th className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-wider">
                    Ngày hoàn thành
                  </th>
                  <th className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-wider">
                    Điểm số
                  </th>
                  <th className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-wider">
                    Xếp hạng (6 Sao)
                  </th>
                  <th className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCompleted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                      Không có kỳ thi đã hoàn thành trong mục lọc này.
                    </td>
                  </tr>
                ) : (
                  filteredCompleted.map((exam, rowIdx) => (
                    <tr key={exam.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                              rowIdx % 3 === 0 && 'bg-warning-muted text-warning',
                              rowIdx % 3 === 1 && 'bg-primary-100 text-primary-700',
                              rowIdx % 3 === 2 && 'bg-danger-muted text-danger'
                            )}
                          >
                            <Link2 className="h-5 w-5" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{cleanExamTitle(exam.title)}</p>
                            <p className="text-xs text-muted-foreground">Kỳ thi nội bộ</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-muted-foreground">
                        {formatViDate(exam.scheduledAt)}
                      </td>
                      <td className="px-6 py-5 text-muted-foreground">—</td>
                      <td className="px-6 py-5">
                        <div className="flex gap-1" aria-hidden>
                          {Array.from({ length: 6 }, (_, s) => (
                            <ProgressStar
                              key={s}
                              filled={false}
                              variant="primary"
                              className="h-5 w-5"
                            />
                          ))}
                        </div>
                        <span className="sr-only">Chưa có dữ liệu xếp hạng sao</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full bg-success-muted px-3 py-1 text-[0.6875rem] font-bold text-success">
                          HOÀN THÀNH
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() => onOpenExam(exam.id)}
                          className="text-xs font-bold text-primary underline-offset-4 hover:underline"
                        >
                          Xem kết quả
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Hiển thị {exams.length} kỳ thi trên trang · Tổng {total} kỳ thi
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[7rem] text-center text-sm font-medium text-foreground">
              Trang {page} / {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Thống kê nhanh — bố cục như mock; một số chỉ số chờ API chi tiết */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {[
          { label: 'Tổng khóa học', value: String(total) },
          { label: 'Tỷ lệ Đạt', value: '—' },
          { label: 'Điểm trung bình', value: '—' },
          { label: 'Chứng chỉ mới', value: '—' },
        ].map((tile) => (
          <div
            key={tile.label}
            className={cn(
              'rounded-xl border border-border/80 bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border/40',
              '[background:radial-gradient(circle_at_center,rgb(99_102_241/0.06)_0%,transparent_70%)]',
              CARD_ENTRANCE_HOVER
            )}
          >
            <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <p className="text-3xl font-extrabold text-primary">{tile.value}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
