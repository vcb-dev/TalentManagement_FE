import type { EmployeeEntity } from '@/features/hr-admin/api'
import type { TeamLeaderSummary } from '@/features/profile/userSelf.types'

/** Giá trị "Chưa chọn" trong select (Radix Select không nhận value rỗng). */
export const TEAM_LEADER_NONE = '__none'

const NO_TEAM_LABEL = 'Chưa có team'

export type TeamLeaderOptionGroup = {
  label: string
  options: { value: string; label: string }[]
}

export function teamLeaderDisplayName(leader: TeamLeaderSummary | null | undefined): string {
  if (!leader) return ''
  return leader.fullNameLegal?.trim() || leader.email?.trim() || 'Trưởng nhóm'
}

/**
 * Nhóm trưởng nhóm theo team chính; team của nhân sự đang xem lên đầu, "Chưa có team" xuống cuối.
 * Người đang gán mà không còn trong danh sách (thôi làm trưởng nhóm / nghỉ) vẫn hiện để không mất giá trị.
 */
export function buildTeamLeaderOptionGroups(
  leaders: Pick<EmployeeEntity, 'id' | 'name' | 'teamNames' | 'employeeIdentifier'>[],
  ctx: {
    employeeId: string
    employeeTeamName: string | null | undefined
    current: TeamLeaderSummary | null | undefined
  }
): TeamLeaderOptionGroup[] {
  const byTeam = new Map<string, { value: string; label: string }[]>()
  for (const l of leaders) {
    if (l.id === ctx.employeeId) continue
    const team = l.teamNames?.[0]?.trim() || NO_TEAM_LABEL
    const code = l.employeeIdentifier?.trim()
    const list = byTeam.get(team) ?? []
    list.push({ value: l.id, label: code ? `${l.name} (${code})` : l.name })
    byTeam.set(team, list)
  }

  const ownTeam = ctx.employeeTeamName?.trim()
  const rank = (team: string) => (team === ownTeam ? 0 : team === NO_TEAM_LABEL ? 2 : 1)
  const groups = [...byTeam]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'vi'))
    .map(([label, options]) => ({
      label,
      options: options.sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    }))

  const current = ctx.current
  if (current && !groups.some((g) => g.options.some((o) => o.value === current.id))) {
    groups.unshift({
      label: 'Đang gán',
      options: [
        {
          value: current.id,
          label: `${teamLeaderDisplayName(current)} (không còn trong danh sách trưởng nhóm)`,
        },
      ],
    })
  }
  return groups
}
