import type { EmployeeFilters } from './types'

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: EmployeeFilters) => [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  detailByID: () => [...employeeKeys.all, 'detailByID'] as const,
  detailEmployeeByID: (id: string) => [...employeeKeys.detailByID(), id] as const,
}
