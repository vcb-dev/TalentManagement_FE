import { LevelProgressDashboard } from './LevelProgressDashboard'
import { useLevelProgress } from './useLevelProgress'

export function LevelProgressDashboardContainer({
  levelId,
  starId,
}: {
  levelId: string
  starId: string
}) {
  const { levelTitle } = useLevelProgress(levelId, starId)
  return <LevelProgressDashboard levelTitle={levelTitle} />
}

export { LevelProgressDashboard }
