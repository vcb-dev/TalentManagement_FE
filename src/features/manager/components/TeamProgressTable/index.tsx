import { useState } from 'react'
import { TeamProgressTable } from './TeamProgressTable'
import { useTeamProgressTable } from './useTeamProgressTable'

export function TeamProgressTableContainer() {
  const [teamId, setTeamId] = useState<string | undefined>('ns-01')
  const { page, isLoading } = useTeamProgressTable(teamId)

  const teams = page?.teams
  const selectedLabel =
    teams?.find((x) => x.id === teamId)?.label ?? 'Team Nhân sự'

  return (
    <TeamProgressTable
      teamLabel={selectedLabel}
      teams={teams}
      teamId={teamId}
      onTeamChange={teams && teams.length > 0 ? setTeamId : undefined}
      members={page?.members ?? []}
      summary={
        page?.summary ?? {
          totalMembers: 0,
          eligibleExam: 0,
          onTrack: 0,
          onTrackPct: 0,
          behind: 0,
        }
      }
      isLoading={isLoading}
    />
  )
}

export { TeamProgressTable }
