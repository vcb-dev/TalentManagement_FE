import type { components } from './api.generated'

export type Employee = components['schemas']['Employee']
export type CreateEmployeeInput = components['schemas']['CreateEmployeeInput']
export type ExamResult = components['schemas']['ExamResult']

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  message: string
  code: string
  errors?: Record<string, string[]>
}
