import type { EmployeeCardColorSummary } from '@/features/hr-admin/employeeCard'

export function EmployeeCardColorLabel({ color }: { color: EmployeeCardColorSummary }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{color.name}</span>
      {color.isActive ? null : (
        <span className="text-xs font-normal text-slate-400">(đã ẩn)</span>
      )}
    </span>
  )
}
