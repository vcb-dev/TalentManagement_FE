import { useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { MOCK_REVIEW_QUEUE, type ManagerReviewRow } from '@/features/manager/mock/mockManagerHub'
import { ManagerScreenLayout } from './ManagerScreenLayout'

const OUTCOME_CLASS: Record<ManagerReviewRow['outcomeLabel'], string> = {
  Đạt: 'bg-emerald-500/12 text-emerald-900 ring-1 ring-emerald-500/25',
  'Bảo lưu': 'bg-amber-500/12 text-amber-950 ring-1 ring-amber-500/25',
  'Chờ học lại': 'bg-orange-500/12 text-orange-950 ring-1 ring-orange-500/25',
  'Chưa đủ': 'bg-muted text-muted-foreground',
}

const STATE_NOTE: Record<ManagerReviewRow['state'], string | null> = {
  pending: null,
  approved: 'Đã duyệt — đồng bộ lộ trình',
  redo: 'Đã yêu cầu làm lại',
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    const a = parts[0]?.[0]
    const b = parts[parts.length - 1]?.[0]
    if (a && b) return `${a}${b}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '—'
}

function starCountFromExamTitle(examTitle: string): string | null {
  const m = examTitle.match(/Sao\s*(\d+)/i)
  return m?.[1] ?? null
}

export function ManagerReviewSubmissionsScreen() {
  const [rows] = useState(MOCK_REVIEW_QUEUE)
  const pending = rows.filter((r) => r.state === 'pending').length

  const onApprove = (id: string) => {
    toast.success('Đã duyệt hoàn thành (demo)')
    void id
  }

  const onRedo = (id: string) => {
    toast.message('Đã gửi yêu cầu làm lại tới nhân viên & Teacher (demo)')
    void id
  }

  const pageSubtitle =
    'Xem tick và nhận xét của Teacher, phê duyệt hoặc trả về làm lại trước khi ghi nhận vào lộ trình.'

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Duyệt bài làm sau chấm</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>{pageSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-primary/10">
              <ClipboardList className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
              {pending} hồ sơ chờ duyệt
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
        {rows.map((row, idx) => {
          const stars = starCountFromExamTitle(row.examTitle)

          return (
            <div
              key={row.id}
              className={cn(
                'group relative overflow-hidden rounded-[20px] border p-6 shadow-sm transition-shadow duration-300 hover:shadow-md',
                CARD_ENTRANCE_HOVER,
                row.state === 'pending' ? 'border-primary/25 bg-card' : 'border-border bg-card'
              )}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div
                className="pointer-events-none absolute right-0 top-0 h-32 w-32 opacity-40"
                style={{
                  background:
                    'radial-gradient(circle at center, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
                }}
              />

              <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      'flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-primary/15 bg-gradient-to-br from-primary/15 to-teal-500/10 text-base font-bold text-primary'
                    )}
                  >
                    {initialsFromName(row.employeeName)}
                  </div>
                  {stars ? (
                    <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-background bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-md">
                      STARS {stars}
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-3">
                    <h3 className="font-bold text-foreground">{row.employeeName}</h3>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider',
                        OUTCOME_CLASS[row.outcomeLabel]
                      )}
                    >
                      {row.outcomeLabel}
                    </span>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200/90">
                      <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
                      {row.examTitle}
                    </div>
                    {row.cohortLabel ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={2} />
                        {row.cohortLabel}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Search className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                        <span className="text-xs font-bold text-foreground">
                          Teacher: {row.teacherName}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{row.gradedAt}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{row.summary}</p>
                  </div>

                  {STATE_NOTE[row.state] ? (
                    <p className="mt-2 text-xs font-medium text-primary">{STATE_NOTE[row.state]}</p>
                  ) : null}
                </div>

                <div className="flex w-full min-w-[160px] shrink-0 flex-col gap-2 self-center md:w-auto">
                  {row.state === 'pending' ? (
                    <>
                      <Button
                        type="button"
                        className="h-auto gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/90 py-3 text-sm font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-95"
                        onClick={() => onApprove(row.id)}
                      >
                        <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                        Duyệt hoàn thành
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto gap-2 rounded-xl border-border bg-muted/40 py-3 text-sm font-bold text-muted-foreground hover:border-rose-300 hover:bg-rose-50 hover:text-rose-900 dark:hover:bg-rose-950/30"
                        onClick={() => onRedo(row.id)}
                      >
                        <RotateCcw className="h-5 w-5" strokeWidth={2} />
                        Yêu cầu làm lại
                      </Button>
                    </>
                  ) : (
                    <span className="text-center text-xs font-medium text-muted-foreground md:text-left">
                      {row.state === 'approved' ? 'Đã xử lý' : 'Đã trả về'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </ManagerScreenLayout>
  )
}
