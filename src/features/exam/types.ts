import type { ExamResultCode } from '@/lib/constants'

export interface ExamFilters {
  page: number
  pageSize: number
  status?: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED'
}

export interface GradeExamInput {
  examId: string
  employeeId: string
  score: number
  note?: string
}

export interface ClassifyExamInput {
  examId: string
  employeeId: string
  result: ExamResultCode
}
