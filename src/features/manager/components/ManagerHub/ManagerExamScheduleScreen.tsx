import { Link } from '@tanstack/react-router'
import { CalendarPlus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { MOCK_MANAGER_EXAMS } from '@/features/manager/mock/mockManagerHub'
import { ManagerScreenLayout } from './ManagerScreenLayout'

const STATE_LABEL: Record<
  (typeof MOCK_MANAGER_EXAMS)[number]['state'],
  { label: string; className: string }
> = {
  draft: { label: 'Nháp', className: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Đã lên lịch', className: 'bg-sky-500/15 text-sky-900 ring-1 ring-sky-500/20' },
  grading: { label: 'Đang chấm', className: 'bg-amber-500/12 text-amber-950 ring-1 ring-amber-500/20' },
  done: { label: 'Hoàn tất', className: 'bg-emerald-500/12 text-emerald-900 ring-1 ring-emerald-500/20' },
}

export function ManagerExamScheduleScreen() {
  return (
    <ManagerScreenLayout
      title="Lịch thi & chỉ định người chấm"
      subtitle="Tạo kỳ thi, đặt khung giờ và gán Teacher tạm thời theo từng kỳ. Sau khi chấm xong, dùng phân lớp nếu cần."
      toolbarExtra={
        <Button
          type="button"
          size="sm"
          className="gap-2"
          onClick={() => toast.info('Form tạo kỳ thi (demo) — nối API sau.')}
        >
          <CalendarPlus className="h-4 w-4" strokeWidth={2} />
          Tạo kỳ thi mới
        </Button>
      }
    >
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10',
          CARD_ENTRANCE_HOVER
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-primary/12 via-teal-500/8 to-violet-500/8">
                {['Kỳ thi', 'Khung giờ', 'Cấp độ', 'Người chấm (tạm)', 'Trạng thái', 'Thao tác'].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b border-border px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_MANAGER_EXAMS.map((row) => {
                const st = STATE_LABEL[row.state]
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border transition-colors hover:bg-primary/[0.04]"
                  >
                    <td className="px-3 py-3 align-middle">
                      <div className="font-semibold text-foreground">{row.title}</div>
                      <div className="text-xs text-muted-foreground">ID: {row.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-3 py-3 align-middle text-muted-foreground">{row.windowLabel}</td>
                    <td className="px-3 py-3 align-middle">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {row.levelLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <UserPlus className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                        {row.graderName}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', st.className)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => toast.info('Gán / đổi Teacher (demo)')}
                        >
                          Gán chấm
                        </Button>
                        {row.state !== 'draft' ? (
                          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" asChild>
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

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Chỉ Quản lý mở được màn phân lớp sau thi. Kỳ ở trạng thái nháp chưa hiển thị link phân lớp.
      </p>
    </ManagerScreenLayout>
  )
}
