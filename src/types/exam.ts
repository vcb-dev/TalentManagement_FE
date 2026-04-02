import type { ExamResultCode } from '@/lib/constants'

export interface ExamSummary {
  id: string
  title: string
  scheduledAt: string
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED'
}

export interface ExamGradeInput {
  score: number
  note?: string
}

export interface ExamResultView {
  examId: string
  employeeId: string
  result: ExamResultCode
  gradedAt: string
}
