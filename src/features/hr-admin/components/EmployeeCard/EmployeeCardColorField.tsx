import { SelectController } from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
import type { EmployeeCardColorSummary } from '@/features/hr-admin/employeeCard'
import { useEmployeeCardColors } from '@/features/hr-admin/employeeCardHooks'
import { cn } from '@/lib/utils'
import { Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import {
  FieldLabel,
  fieldControlClass,
  inputEditable,
} from '../HrEmployeeProfile/profileFormLayout'
import { EmployeeCardColorLabel } from './EmployeeCardColorLabel'
import { EmployeeCardColorsDialog } from './EmployeeCardColorsDialog'

export function EmployeeCardColorField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  savedColor,
  canManage,
}: {
  control: Control<T>
  name: N
  label: string
  /** Màu đang lưu trong hồ sơ — giữ trong danh sách chọn kể cả khi đã ẩn hoặc danh mục chưa tải xong. */
  savedColor: EmployeeCardColorSummary | null | undefined
  canManage: boolean
}) {
  const { data: colors } = useEmployeeCardColors()
  const [manageOpen, setManageOpen] = useState(false)

  const options = useMemo<EmployeeCardColorSummary[]>(() => {
    if (!colors) return savedColor ? [savedColor] : []
    return colors.filter((c) => c.isActive || c.id === savedColor?.id)
  }, [colors, savedColor])

  return (
    <div className="space-y-1">
      <SelectController
        control={control}
        name={name}
        label={label}
        placeholder="Chọn màu thẻ"
        className="space-y-1.5"
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>{label}</FieldLabel>}
      >
        <SelectItem value="__none">Chưa chọn</SelectItem>
        {options.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <EmployeeCardColorLabel color={c} />
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
          Quản lý danh sách màu
        </button>
      ) : null}
      {canManage ? (
        <EmployeeCardColorsDialog open={manageOpen} onOpenChange={setManageOpen} />
      ) : null}
    </div>
  )
}
