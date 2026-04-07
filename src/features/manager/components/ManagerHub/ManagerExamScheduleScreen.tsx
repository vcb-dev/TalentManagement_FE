import { Link } from '@tanstack/react-router'
import { Award, CalendarPlus, FileQuestion, FileText, UserX } from 'lucide-react'
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
import { MOCK_MANAGER_EXAMS } from '@/features/manager/mock/mockManagerHub'
import { ManagerScreenLayout } from './ManagerScreenLayout'

const ROW_ICONS = [FileText, FileQuestion, Award] as const

const ROW_ICON_BOX: { className: string }[] = [
  { className: 'bg-primary/10 text-primary' },
  { className: 'bg-orange-500/12 text-orange-700' },
  { className: 'bg-amber-500/12 text-amber-800' },
]

const LEVEL_BADGE: Record<string, string> = {
  'Tập sự': 'bg-primary/12 text-primary ring-1 ring-primary/15',
  'Biết việc': 'bg-teal-500/12 text-teal-900 ring-1 ring-teal-500/20',
  'Được việc': 'bg-violet-500/12 text-violet-900 ring-1 ring-violet-500/20',
}

const STATE_LABEL: Record<
  (typeof MOCK_MANAGER_EXAMS)[number]['state'],
  { label: string; className: string; dotClass: string }
> = {
  draft: {
    label: 'Nháp',
    className: 'bg-muted text-muted-foreground',
    dotClass: 'bg-slate-400',
  },
  scheduled: {
    label: 'Đã lên lịch',
    className: 'bg-sky-500/15 text-sky-900 ring-1 ring-sky-500/20',
    dotClass: 'bg-sky-500',
  },
  grading: {
    label: 'Đang chấm',
    className: 'bg-amber-500/12 text-amber-950 ring-1 ring-amber-500/20',
    dotClass: 'bg-amber-500',
  },
  done: {
    label: 'Hoàn tất',
    className: 'bg-emerald-500/12 text-emerald-900 ring-1 ring-emerald-500/20',
    dotClass: 'bg-emerald-500',
  },
}

function parseWindowLabel(s: string): { date: string; time: string | null } {
  const trimmed = s.trim()
  const m = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})(?:\s+(.+))?$/)
  if (!m) return { date: trimmed, time: null }
  const date = m[1] as string
  const rest = (m[2] ?? '').trim()
  if (!rest) return { date, time: null }
  return { date, time: rest }
}

function graderInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    const w = parts[0] as string
    return w.slice(0, 2).toUpperCase()
  }
  const first = parts[0] as string
  const last = parts[parts.length - 1] as string
  const a = first[0] ?? ''
  const b = last[0] ?? ''
  return (a + b).toUpperCase() || '?'
}

const PAGE_SUBTITLE =
  'Tạo kỳ thi, đặt khung giờ và gán Teacher tạm thời theo từng kỳ. Sau khi chấm xong, dùng phân lớp nếu cần.'

export function ManagerExamScheduleScreen() {
  const unassignedCount = MOCK_MANAGER_EXAMS.filter(
    (e) => e.state === 'draft' || e.graderName.includes('chưa gán')
  ).length

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Lịch thi & chỉ định người chấm</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>{PAGE_SUBTITLE}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              className="gap-2 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md hover:from-primary hover:to-primary/85"
              onClick={() => toast.info('Form tạo kỳ thi (demo) — nối API sau.')}
            >
              <CalendarPlus className="h-4 w-4" strokeWidth={2} />
              Tạo kỳ thi mới
            </Button>
          </div>
        </div>

      <div
        className={cn(
          'overflow-hidden rounded-xl border border-primary/15 bg-card p-1 shadow-[var(--shadow-card)] ring-1 ring-primary/10',
          CARD_ENTRANCE_HOVER
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-muted/35">
                {['Kỳ thi (ID)', 'Khung giờ', 'Cấp độ', 'Người chấm (tạm)', 'Trạng thái', 'Thao tác'].map(
                  (h) => (
                    <th
                      key={h}
                      className={cn(
                        'whitespace-nowrap border-b border-border px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground',
                        h === 'Thao tác' && 'text-right'
                      )}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_MANAGER_EXAMS.map((row, i) => {
                const st = STATE_LABEL[row.state]
                const { date, time } = parseWindowLabel(row.windowLabel)
                const iconIdx = i % ROW_ICONS.length
                const RowIcon = ROW_ICONS[iconIdx] as (typeof ROW_ICONS)[number]
                const iconBox = ROW_ICON_BOX[iconIdx] as (typeof ROW_ICON_BOX)[number]
                const levelCls = LEVEL_BADGE[row.levelLabel] ?? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                const isUnassigned = row.graderName.includes('chưa gán')
                const examIdShort = `EXAM-${row.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

                return (
                  <tr key={row.id} className="transition-colors hover:bg-primary/[0.04]">
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                            iconBox.className
                          )}
                        >
                          <RowIcon className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">{row.title}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{examIdShort}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">{date}</span>
                        {time ? (
                          <span className="text-xs text-muted-foreground">{time}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          levelCls
                        )}
                      >
                        {row.levelLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      {isUnassigned ? (
                        <div className="inline-flex items-center text-sm italic text-muted-foreground">
                          <UserX className="mr-2 h-4 w-4 shrink-0" strokeWidth={2} />
                          — (chưa gán)
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-background bg-muted text-[10px] font-bold text-primary"
                            aria-hidden
                          >
                            {graderInitials(row.graderName)}
                          </div>
                          <span className="text-sm font-medium text-foreground">{row.graderName}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          st.className
                        )}
                      >
                        <span className={cn('mr-2 h-1.5 w-1.5 shrink-0 rounded-full', st.dotClass)} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-middle text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold text-primary hover:bg-primary/10"
                          onClick={() => toast.info('Gán / đổi Teacher (demo)')}
                        >
                          Gán chấm
                        </Button>
                        {row.state !== 'draft' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-bold text-primary hover:bg-primary/10"
                            asChild
                          >
                            <Link to="/exam/$examId/classify" params={{ examId: row.id }}>
                              Phân lớp
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-teal-500/[0.06] p-5 shadow-sm ring-1 ring-primary/10">
          <div className="pointer-events-none absolute -right-3 -top-3 text-primary/15">
            <Award className="h-20 w-20" strokeWidth={1.5} />
          </div>
          <div className="relative">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">Hiệu suất chấm thi</p>
            <h3 className="mb-2 text-2xl font-bold text-foreground">92.4%</h3>
            <div className="h-1 w-full overflow-hidden rounded-full bg-primary/15">
              <div className="h-full w-[92.4%] rounded-full bg-primary" />
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">+5.2% so với tháng trước</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/25 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-800">
              <CalendarPlus className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-950">
              CẦN XỬ LÝ
            </span>
          </div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kỳ thi chưa gán</p>
          <h3 className="mb-0 text-2xl font-bold text-foreground">{unassignedCount}</h3>
          <p className="mt-2 text-[10px] text-muted-foreground">Yêu cầu chỉ định người chấm ngay</p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-sm">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tiến độ tổng thể
            </p>
            <h3 className="text-2xl font-bold text-foreground">Về đích: 85%</h3>
          </div>
          <div className="mt-4 flex -space-x-2">
            {['PL', 'NT', 'HK'].map((ini) => (
              <div
                key={ini}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-bold text-primary"
              >
                {ini}
              </div>
            ))}
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-bold text-primary-foreground">
              +18
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Chỉ Quản lý mở được màn phân lớp sau thi. Kỳ ở trạng thái nháp chưa hiển thị link phân lớp.
      </p>
      </div>
    </ManagerScreenLayout>
  )
}
