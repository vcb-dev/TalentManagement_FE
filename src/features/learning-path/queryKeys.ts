export const learningKeys = {
  all: ['learning'] as const,
  myPath: () => [...learningKeys.all, 'me-path'] as const,
  myEnrolledClass: (range?: { startDate?: string; endDate?: string }) =>
    [
      ...learningKeys.all,
      'me-enrolled-class',
      range?.startDate ?? '',
      range?.endDate ?? '',
    ] as const,
  levels: () => [...learningKeys.all, 'levels'] as const,
  level: (levelId: string) => [...learningKeys.levels(), levelId] as const,
  checklist: (levelId: string, starId: string) =>
    [...learningKeys.level(levelId), 'star', starId] as const,
  submissions: (starId: string) => [...learningKeys.all, 'submissions', starId] as const,
  sendFeedback: (submissionId: string) =>
    [...learningKeys.all, 'send-feedback', submissionId] as const,
  getFeedback: (classId: string, scheduleId: string) =>
    [...learningKeys.all, 'get-feedback', classId, scheduleId] as const,
}
