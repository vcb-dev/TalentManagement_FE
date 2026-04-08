export const learningKeys = {
  all: ['learning'] as const,
  myPath: () => [...learningKeys.all, 'me-path'] as const,
  levels: () => [...learningKeys.all, 'levels'] as const,
  level: (levelId: string) => [...learningKeys.levels(), levelId] as const,
  checklist: (levelId: string, starId: string) =>
    [...learningKeys.level(levelId), 'star', starId] as const,
  submissions: (starId: string) => [...learningKeys.all, 'submissions', starId] as const,
}
