import {
  EMPLOYEE_ORDER_NUMBER_RULE,
  employeeOrderNumberHint,
} from '@/features/hr-admin/employeeOrderNumber'
import { useEmployeeOrderNumber } from '@/features/hr-admin/hooks'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { FieldLabel, fieldControlClass, profileFieldBoxClass } from './profileFormLayout'

/** Chỉ đọc — BE tính lại mỗi lần tải, không sửa tay. */
export function EmployeeOrderNumberField({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError } = useEmployeeOrderNumber(employeeId)

  return (
    <div className={profileFieldBoxClass}>
      <FieldLabel>Số thứ tự</FieldLabel>
      <div
        className={cn(
          fieldControlClass,
          'flex items-center border-slate-200 bg-slate-100/70 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300'
        )}
        title={EMPLOYEE_ORDER_NUMBER_RULE}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-slate-400" aria-label="Đang tải" />
        ) : data?.position != null ? (
          <span className="font-bold tabular-nums">{data.position}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>
      {data ? (
        <p className="text-xs text-slate-500">{employeeOrderNumberHint(data)}</p>
      ) : isError ? (
        <p className="text-xs text-destructive">Không tải được số thứ tự</p>
      ) : null}
    </div>
  )
}
