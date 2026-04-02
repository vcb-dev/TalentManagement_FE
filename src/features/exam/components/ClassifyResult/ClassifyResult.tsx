import type { ExamResultCode } from '@/lib/constants'
import { EXAM_RESULTS } from '@/lib/constants'
import { Button } from '@/components/ui/button'

export interface ClassifyResultProps {
  value?: ExamResultCode
  onChange?: (v: ExamResultCode) => void
  onSubmit?: () => void
  disabled?: boolean
}

export function ClassifyResult({ value, onChange, onSubmit, disabled }: ClassifyResultProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {EXAM_RESULTS.map((r) => (
          <Button
            key={r}
            type="button"
            size="sm"
            variant={value === r ? 'default' : 'outline'}
            onClick={() => onChange?.(r)}
          >
            {r}
          </Button>
        ))}
      </div>
      {onSubmit ? (
        <Button type="button" disabled={disabled || !value} onClick={onSubmit}>
          Xác nhận phân loại
        </Button>
      ) : null}
    </div>
  )
}
