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

export interface SubmitExamInput {
  classId?: string
  scheduleId?: string
  answers: any
}

export interface GradeSubmissionInput {
  submissionId: string
  graderNote: string
  status?: 'grading' | 'done'
  grades?: Record<string, { criteria: string[]; score: number }>
  totalScore?: number
  outcome?: 'DAT' | 'BAO_LUU' | 'CHO_HOC_LAI' | 'CHIA_TAY'
}
