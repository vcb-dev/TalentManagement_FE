import type { ExamFilters } from './types'

export const examKeys = {
  all: ['exams'] as const,
  lists: () => [...examKeys.all, 'list'] as const,
  list: (filters: ExamFilters) => [...examKeys.lists(), filters] as const,
  detail: (examId: string) => [...examKeys.all, 'detail', examId] as const,
  results: (examId: string) => [...examKeys.detail(examId), 'results'] as const,
}
