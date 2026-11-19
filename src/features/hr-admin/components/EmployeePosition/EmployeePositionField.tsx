import { SelectController } from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
import type { EmployeePosition } from '@/features/hr-admin/employeePosition'
import { useEmployeePositions } from '@/features/hr-admin/employeePositionHooks'
import { cn } from '@/lib/utils'
import { Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import {
  FieldLabel,
  fieldControlClass,
  inputEditable,
} from '../HrEmployeeProfile/profileFormLayout'
import { EmployeePositionsDialog } from './EmployeePositionsDialog'

/**
 * Ô "Chức vụ" trên hồ sơ / form tạo nhân sự. Đổi chức vụ thì BE đổi role theo chức vụ; admin
 * (`position.manage`) mở được danh mục để thêm / sửa / ẩn / xoá.
 */
export function EmployeePositionField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  savedPositionId,
  canManage,
  required = false,
}: {
  control: Control<T>
  name: N
  /** Chức vụ đang lưu trong hồ sơ — giữ trong danh sách chọn kể cả khi đã ẩn. */
  savedPositionId?: string | null
  canManage: boolean
  required?: boolean
}) {
  const { data: positions } = useEmployeePositions()
  const [manageOpen, setManageOpen] = useState(false)

  const options = useMemo<EmployeePosition[]>(
    () => (positions ?? []).filter((p) => p.isActive || p.id === savedPositionId),
    [positions, savedPositionId]
  )

  return (
    <div className="space-y-1">
      <SelectController
        control={control}
        name={name}
        label="Chức vụ"
        placeholder="Chọn chức vụ"
        rules={required ? { required: 'Chọn chức vụ' } : undefined}
        className="space-y-1.5"
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel required={required}>Chức vụ</FieldLabel>}
      >
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
            {p.isActive ? null : (
              <span className="ml-1 text-xs font-normal text-slate-400">(đã ẩn)</span>
            )}
          </SelectItem>
        ))}
      </SelectController>
      {canManage ? (
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          Quản lý danh sách chức vụ
        </button>
      ) : null}
      {canManage ? (
        <EmployeePositionsDialog open={manageOpen} onOpenChange={setManageOpen} />
      ) : null}
    </div>
  )
}
