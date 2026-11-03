import type { ComponentProps } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

/**
 * `Checkbox` dùng chung bo `rounded-sm` (= 8px với `--radius` 0.75rem) nên ô 16px thành hình tròn,
 * trông như nút radio. Checklist cần ô vuông để phân biệt "chọn nhiều" với "chọn một".
 */
export function SquareCheckbox({ className, ...props }: ComponentProps<typeof Checkbox>) {
  return <Checkbox className={cn('rounded-[4px]', className)} {...props} />
}
