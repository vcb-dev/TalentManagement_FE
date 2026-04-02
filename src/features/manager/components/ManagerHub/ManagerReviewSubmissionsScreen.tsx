import { useState } from 'react'
import { CheckCircle2, FileText, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
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

  return (
    <ManagerScreenLayout
      title="Duyệt bài làm sau chấm"
      subtitle="Xem tick và nhận xét của Teacher, phê duyệt hoặc trả về làm lại trước khi ghi nhận vào lộ trình."
      toolbarExtra={
        <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-900 ring-1 ring-rose-500/20">
          {pending} hồ sơ chờ duyệt
        </span>
      }
    >
      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={cn(
              'rounded-xl border p-4 shadow-sm md:p-5',
              CARD_ENTRANCE_HOVER,
              row.state === 'pending' ? 'border-primary/25 bg-primary/[0.03]' : 'border-border bg-card'
            )}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-teal-500/10 text-primary">
                  <FileText className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-foreground">{row.employeeName}</h3>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold',
                        OUTCOME_CLASS[row.outcomeLabel]
                      )}
                    >
                      {row.outcomeLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{row.examTitle}</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    <span className="font-medium text-muted-foreground">Teacher:</span> {row.teacherName} ·{' '}
                    <span className="text-xs text-muted-foreground">{row.gradedAt}</span>
                  </p>
                  <div className="mt-3 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm leading-relaxed text-foreground">
                    {row.summary}
                  </div>
                  {STATE_NOTE[row.state] ? (
                    <p className="mt-2 text-xs font-medium text-primary">{STATE_NOTE[row.state]}</p>
                  ) : null}
                </div>
              </div>

              {row.state === 'pending' ? (
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
                  <Button
                    type="button"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onApprove(row.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                    Duyệt hoàn thành
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 border-rose-300 text-rose-900 hover:bg-rose-50"
                    onClick={() => onRedo(row.id)}
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                    Yêu cầu làm lại
                  </Button>
                </div>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  {row.state === 'approved' ? 'Đã xử lý' : 'Đã trả về'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ManagerScreenLayout>
  )
}
