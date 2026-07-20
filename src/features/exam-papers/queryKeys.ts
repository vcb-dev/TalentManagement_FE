export const examPapersKeys = {
  all: ['exam-papers'] as const,
  list: () => [...examPapersKeys.all, 'list'] as const,
  detail: (id: string) => [...examPapersKeys.all, 'detail', id] as const,
}
