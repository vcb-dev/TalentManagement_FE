import { useLearningChecklist, useLearningLevels } from '@/features/learning-path/hooks'

export function useLevelProgress(levelId: string, starId: string) {
  const levels = useLearningLevels()
  const checklist = useLearningChecklist(levelId, starId)
  const levelTitle = levels.data?.find((l) => l.id === levelId || l.code === levelId)?.title ?? levelId
  return { levels, checklist, levelTitle }
}
