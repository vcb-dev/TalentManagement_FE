import { useState } from 'react'
import { ClipboardCheck, Eye, FileText, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePermission } from '@/hooks/usePermission'
import { formatChecklistTime, personName } from '../checklistAnswers'
import { useEmployeeChecklists } from '../hooks'
import { CHECKLIST_KIND_LABEL, type ChecklistFillTemplate } from '../types'
import { ChecklistPreview } from './ChecklistPreview'
import {
  ChecklistResponseDialog,
  type ChecklistResponseDialogTarget,
} from './ChecklistResponseDialog'

/** Hồ sơ nhân sự: mọi checklist gắn với nhân sự + mọi bản đã điền — chỉ admin (`checklist.manage`). */
export function EmployeeChecklistsCard({ employeeId }: { employeeId: string }) {
  const { canId } = usePermission()
  const canView = canId('checklist.manage')
  const { data, isLoading } = useEmployeeChecklists(employeeId, canView)
  const [viewing, setViewing] = useState<ChecklistResponseDialogTarget | null>(null)
  const [previewing, setPreviewing] = useState<ChecklistFillTemplate | null>(null)

  if (!canView) return null

  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ClipboardCheck className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Checklist</h2>
          <p className="text-xs text-muted-foreground">
            Bản nhân sự tự điền và bản trưởng nhóm phụ trách điền — chỉ admin xem được tất cả.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải…
        </div>
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">
          Chưa có checklist nào áp dụng cho team của nhân sự này.
        </p>
      ) : (
        <ul className="divide-y divide-border/70">
          {data.items.map((item) => (
            <li
              key={item.template.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{item.template.title}</span>
                  <Badge
                    variant={item.template.kind === 'SELF' ? 'success' : 'warning'}
                    className="px-1.5 py-0 text-[11px]"
                  >
                    {CHECKLIST_KIND_LABEL[item.template.kind]}
                  </Badge>
                  {!item.applicable ? (
                    <Badge variant="muted" className="px-1.5 py-0 text-[11px]">
                      Không còn áp dụng
                    </Badge>
                  ) : null}
                </div>
                {item.template.kind === 'LEADER' && item.responses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Trưởng nhóm phụ trách: {personName(data.employee.teamLeader)}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-button hover:underline"
                  onClick={() => setPreviewing(item.template)}
                >
                  <FileText className="size-3.5" aria-hidden />
                  Xem form
                </button>
              </div>
              {item.responses.length === 0 ? (
                <span className="text-xs font-medium text-warning">Chưa điền</span>
              ) : (
                <ul className="space-y-1 sm:text-right">
                  {item.responses.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground sm:justify-end"
                    >
                      <span>
                        {r.respondent.id === data.employee.id
                          ? 'Tự điền'
                          : personName(r.respondent)}{' '}
                        · {formatChecklistTime(r.updatedAt)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2"
                        onClick={() =>
                          setViewing({
                            title: item.template.title,
                            questions: item.template.questions,
                            subject: data.employee,
                            response: r,
                          })
                        }
                      >
                        <Eye className="size-3.5" aria-hidden />
                        Xem câu trả lời
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <ChecklistResponseDialog target={viewing} onClose={() => setViewing(null)} />

      <Dialog open={previewing !== null} onOpenChange={(open) => !open && setPreviewing(null)}>
        {/* 80vh: chừa chỗ cho thanh "Lưu thay đổi" cố định ở đáy hồ sơ; pt-12 để nút đóng không bị thẻ tiêu đề che. */}
        <DialogContent className="max-h-[80vh] overflow-y-auto bg-slate-50 pt-12 sm:max-w-3xl dark:bg-slate-950">
          <DialogHeader className="sr-only">
            <DialogTitle>{previewing?.title ?? 'Xem form'}</DialogTitle>
            <DialogDescription>Form checklist như người điền thấy, không lưu.</DialogDescription>
          </DialogHeader>
          {previewing ? (
            <ChecklistPreview
              key={previewing.id}
              title={previewing.title}
              description={previewing.description}
              questions={previewing.questions}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
