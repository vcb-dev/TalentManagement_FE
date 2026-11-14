import { useEffect, useId, useState } from 'react'
import { Gauge, Loader2 } from 'lucide-react'
import { FormDialog } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  useExamSettings,
  useSetReflectionPassScore,
  useSetSchedulePassScore,
} from '@/features/manager/hooks'
import { cn } from '@/lib/utils'

export type PassScoreTarget =
  | { kind: 'global' }
  | {
      kind: 'schedule'
      scheduleId: string
      /** "Lớp — Kỳ thi" để admin biết đang sửa đợt nào. */
      label: string
      /** Ngưỡng riêng hiện tại; null = đang theo ngưỡng chung. */
      passScore: number | null
    }

/** Số nguyên 1–100, rỗng / sai → null. */
export function parsePassScoreInput(value: string): number | null {
  const t = value.trim()
  if (!/^\d{1,3}$/.test(t)) return null
  const n = Number(t)
  return n >= 1 && n <= 100 ? n : null
}

function formatUpdated(iso: string | null, by: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const when = d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return by ? `Cập nhật ${when} bởi ${by}` : `Cập nhật ${when}`
}

const KEEP_RESULTS_NOTE =
  'Bài đã chấm giữ nguyên kết quả — ngưỡng mới áp dụng cho những lần chấm sau.'

/**
 * Admin (`grading.pass_score.manage`) đặt ngưỡng đạt bài phản tư: ngưỡng chung cho mọi đợt,
 * hoặc ngưỡng riêng cho một đợt (bỏ ngưỡng riêng → quay về ngưỡng chung).
 */
export function ReflectionPassScoreDialog({
  target,
  onClose,
}: {
  target: PassScoreTarget | null
  onClose: () => void
}) {
  const open = target !== null
  const inputId = useId()
  const { data: settings, isLoading } = useExamSettings(open)
  const setGlobal = useSetReflectionPassScore()
  const setSchedule = useSetSchedulePassScore()
  const globalScore = settings?.reflectionPassScore

  const [mode, setMode] = useState<'global' | 'custom'>('global')
  const [value, setValue] = useState('')

  // Mở hộp thoại → điền sẵn giá trị đang áp dụng.
  useEffect(() => {
    if (!target) return
    if (target.kind === 'schedule') {
      setMode(target.passScore === null ? 'global' : 'custom')
      setValue(target.passScore === null ? '' : String(target.passScore))
    } else {
      setValue(globalScore === undefined ? '' : String(globalScore))
    }
  }, [target, globalScore])

  const parsed = parsePassScoreInput(value)
  const needsValue = target?.kind === 'global' || mode === 'custom'
  const invalid = needsValue && parsed === null
  const isSaving = setGlobal.isPending || setSchedule.isPending

  const save = () => {
    if (!target || invalid || isSaving) return
    if (target.kind === 'global') {
      setGlobal.mutate(parsed!, { onSuccess: onClose })
      return
    }
    setSchedule.mutate(
      { scheduleId: target.scheduleId, passScore: mode === 'custom' ? parsed : null },
      { onSuccess: onClose }
    )
  }

  const scoreInput = (
    <div className="flex items-center gap-2">
      <Input
        id={inputId}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
        }}
        aria-invalid={invalid && value !== ''}
        aria-describedby={`${inputId}-hint`}
        className="h-11 w-28 rounded-xl text-base font-semibold tabular-nums"
        placeholder="80"
      />
      <span className="text-sm text-muted-foreground">/ 100 điểm</span>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSaving) onClose()
      }}
      icon={<Gauge className="size-5" aria-hidden />}
      title={target?.kind === 'schedule' ? 'Ngưỡng đạt của đợt phản tư' : 'Ngưỡng đạt bài phản tư'}
      description={
        target?.kind === 'schedule'
          ? target.label
          : 'Áp dụng cho mọi đợt "Nộp bài trực tuyến" chưa đặt ngưỡng riêng.'
      }
      className="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Huỷ
          </Button>
          <Button
            type="button"
            className="gap-2 font-semibold"
            onClick={save}
            disabled={invalid || isSaving || (target?.kind === 'global' && isLoading)}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Lưu ngưỡng
          </Button>
        </div>
      }
    >
      {target?.kind === 'global' ? (
        <div className="space-y-2">
          <Label htmlFor={inputId} className="text-sm font-semibold">
            Điểm tối thiểu để Đạt
          </Label>
          {isLoading ? (
            <p className="flex h-11 items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tải…
            </p>
          ) : (
            scoreInput
          )}
          <p id={`${inputId}-hint`} className="text-xs leading-relaxed text-muted-foreground">
            Bài từ ngưỡng này trở lên là <b className="text-foreground">Đạt</b>, thấp hơn là{' '}
            <b className="text-foreground">Chờ học lại</b>. {KEEP_RESULTS_NOTE}
          </p>
          {settings ? (
            <p className="text-xs text-muted-foreground">
              {formatUpdated(settings.updatedAt, settings.updatedByName)}
            </p>
          ) : null}
        </div>
      ) : target?.kind === 'schedule' ? (
        <div className="space-y-3">
          <RadioGroup
            value={mode}
            onValueChange={(v) => {
              const next = v === 'custom' ? 'custom' : 'global'
              setMode(next)
              // Chuyển sang đặt riêng → điền sẵn ngưỡng chung để chỉ cần sửa con số.
              if (next === 'custom' && !value && globalScore !== undefined) {
                setValue(String(globalScore))
              }
            }}
            className="gap-2"
          >
            <Label
              htmlFor={`${inputId}-global`}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 font-normal transition-colors',
                mode === 'global'
                  ? 'border-button/40 bg-button/5'
                  : 'border-border hover:bg-muted/40'
              )}
            >
              <RadioGroupItem id={`${inputId}-global`} value="global" className="mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  Theo ngưỡng chung
                  {globalScore !== undefined ? ` (${globalScore} điểm)` : ''}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Đổi ngưỡng chung thì đợt này đổi theo.
                </span>
              </span>
            </Label>
            <Label
              htmlFor={`${inputId}-custom`}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 font-normal transition-colors',
                mode === 'custom'
                  ? 'border-button/40 bg-button/5'
                  : 'border-border hover:bg-muted/40'
              )}
            >
              <RadioGroupItem id={`${inputId}-custom`} value="custom" className="mt-0.5" />
              <span className="block text-sm font-semibold text-foreground">
                Đặt riêng cho đợt này
              </span>
            </Label>
          </RadioGroup>
          {mode === 'custom' ? (
            <div className="space-y-1.5 pl-1">
              <Label htmlFor={inputId} className="text-sm font-semibold">
                Điểm tối thiểu để Đạt
              </Label>
              {scoreInput}
            </div>
          ) : null}
          <p id={`${inputId}-hint`} className="text-xs leading-relaxed text-muted-foreground">
            {KEEP_RESULTS_NOTE}
          </p>
        </div>
      ) : null}
    </FormDialog>
  )
}
