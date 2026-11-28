import { useState } from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { BRAND_BTN_SOLID } from '@/components/shared/brandButtonStyles'
import { FormDialog } from '@/components/shared/FormDialog'
import { FormSection } from '@/components/shared/FormSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CriteriaWeightsField } from '@/features/exam-papers/components/CriteriaWeightsField'
import { sumCriteriaWeights, type EssayCriteriaWeights } from '@/features/exam-papers/criteria'
import { useUpdateClassSchedule } from '@/features/manager/hooks'
import {
  SubmissionWindowFields,
  formatWindowPoint,
  submissionWindowDraftError,
  type SubmissionWindowDraft,
} from '@/features/teacher/components/SubmissionWindowFields'
import {
  submissionWindowOf,
  type ScheduleExamQuestions,
} from '@/features/teacher/submissionDeadline'
import { extractCriteriaWeights } from '@/lib/examScheduleTime'
import { cn } from '@/lib/utils'

const FIELD_LABEL = 'block text-xs font-semibold text-muted-foreground'

export interface ReflectionWindowTarget {
  id: string
  classId: string
  className: string
  topic: string
  dateIso: string
  startTime: string
  endTime: string
  examQuestions?: unknown
  submissionDeadline: string | null
  submittedCount: number
}

function ReflectionWindowForm({
  target,
  onClose,
}: {
  target: ReflectionWindowTarget
  onClose: () => void
}) {
  const updateSchedule = useUpdateClassSchedule()
  const examQuestions = (target.examQuestions ?? null) as
    | (ScheduleExamQuestions & { gradingType?: string })
    | null
  const usesCriteria = (examQuestions?.gradingType ?? 'direct') !== 'rubric_reading'

  const [draft, setDraft] = useState<SubmissionWindowDraft>(() => {
    const w = submissionWindowOf({
      dateIso: target.dateIso,
      startTime: target.startTime,
      endTime: target.endTime,
      examQuestions,
      submissionDeadline: target.submissionDeadline,
    })
    return {
      openDate: w.openDateIso,
      openTime: w.openTime,
      closeDate: w.closeDateIso,
      closeTime: w.closeTime,
    }
  })
  const [topic, setTopic] = useState(target.topic)
  const [criteriaWeights, setCriteriaWeights] = useState<EssayCriteriaWeights>(() =>
    extractCriteriaWeights(target.examQuestions)
  )

  const windowError = submissionWindowDraftError(draft)
  const saving = updateSchedule.isPending

  const save = () => {
    if (windowError) {
      toast.error(windowError)
      return
    }
    if (!topic.trim()) {
      toast.error('Vui lòng nhập tên đợt nộp')
      return
    }
    if (usesCriteria) {
      const total = sumCriteriaWeights(criteriaWeights)
      if (total !== 100) {
        toast.error(`Tổng thang điểm 3 tiêu chí phải bằng 100% (hiện là ${total}%)`)
        return
      }
    }
    updateSchedule.mutate(
      {
        classId: target.classId,
        scheduleId: target.id,
        input: {
          dateIso: draft.openDate,
          startTime: draft.openTime,
          endTime: draft.closeTime,
          endDateIso: draft.closeDate,
          topic: topic.trim(),
          ...(usesCriteria ? { criteriaWeights } : {}),
        },
      },
      { onSuccess: onClose }
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Chỉnh sửa hạn nộp phản tư"
      description="Học viên nộp file bài phản tư trong khung thời gian dưới đây."
      icon={<CalendarClock className="size-5" />}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={cn(
              'text-xs',
              windowError ? 'font-semibold text-destructive' : 'text-muted-foreground'
            )}
          >
            {windowError ?? (
              <>
                Hạn chót:{' '}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatWindowPoint(draft.closeDate, draft.closeTime)}
                </span>
              </>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              className={cn('px-5', BRAND_BTN_SOLID)}
              onClick={save}
              disabled={saving || !!windowError}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu thay đổi
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <FormSection title="Đợt nộp">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className={FIELD_LABEL}>Lớp học</p>
              <p className="flex h-10 items-center truncate rounded-xl border border-border bg-muted/40 px-3 text-sm font-medium text-foreground">
                {target.className}
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reflection-topic" className={FIELD_LABEL}>
                Tên đợt nộp
              </label>
              <Input
                id="reflection-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ví dụ: Phản tư sách Trên Đường Băng"
                className="h-10 rounded-xl"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Thời gian nhận bài"
          description={
            target.submittedCount > 0
              ? `Đã có ${target.submittedCount} bài nộp — đổi hạn không ảnh hưởng các bài này.`
              : 'Không tính theo số phút làm bài: học viên nộp bất cứ lúc nào trong khoảng này.'
          }
        >
          <SubmissionWindowFields idPrefix="reflection-window" value={draft} onChange={setDraft} />
        </FormSection>

        {usesCriteria ? (
          <FormSection
            title="Thang điểm chấm"
            description="Giảng viên chấm bài phản tư (điểm 0–100) theo 3 tiêu chí này."
          >
            <CriteriaWeightsField
              value={criteriaWeights}
              onChange={setCriteriaWeights}
              idPrefix="reflection-criteria"
            />
          </FormSection>
        ) : null}
      </div>
    </FormDialog>
  )
}

export function ReflectionWindowDialog({
  target,
  onClose,
}: {
  target: ReflectionWindowTarget | null
  onClose: () => void
}) {
  if (!target) return null
  return <ReflectionWindowForm key={target.id} target={target} onClose={onClose} />
}
