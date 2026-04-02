import { EmployeeTable } from './EmployeeTable'
import { useEmployeeTable } from './useEmployeeTable'
import type { EmployeeFilters } from '@/features/hr-admin/types'

export function EmployeeTableContainer(props?: { initial?: Partial<EmployeeFilters> }) {
  const table = useEmployeeTable(props?.initial)
  return <EmployeeTable {...table} />
}

export { EmployeeTable }
