import { describe, expect, it } from 'vitest'
import { buildTeamLeaderOptionGroups, teamLeaderDisplayName } from '../teamLeaderOptions'

const leader = (id: string, name: string, team?: string, code?: string) => ({
  id,
  name,
  teamNames: team ? [team] : [],
  employeeIdentifier: code ?? null,
})

const leaders = [
  leader('l1', 'Trần Bình', 'SALE ONLINE', 'A120'),
  leader('l2', 'An Hoà', 'Media'),
  leader('l3', 'Lê Cường', 'Content'),
  leader('l4', 'Phạm Dũng'),
  leader('self', 'Chính Mình', 'Media'),
]

describe('buildTeamLeaderOptionGroups', () => {
  it('nhóm theo team, team của nhân sự lên đầu, "Chưa có team" cuối; bỏ chính nhân sự', () => {
    const groups = buildTeamLeaderOptionGroups(leaders, {
      employeeId: 'self',
      employeeTeamName: 'SALE ONLINE',
      current: null,
    })
    expect(groups.map((g) => g.label)).toEqual(['SALE ONLINE', 'Content', 'Media', 'Chưa có team'])
    expect(groups[0]!.options).toEqual([{ value: 'l1', label: 'Trần Bình (A120)' }])
    expect(groups.flatMap((g) => g.options.map((o) => o.value))).not.toContain('self')
  })

  it('người đang gán không còn trong danh sách vẫn hiện ở nhóm "Đang gán"', () => {
    const groups = buildTeamLeaderOptionGroups(leaders, {
      employeeId: 'self',
      employeeTeamName: null,
      current: { id: 'old', fullNameLegal: 'Ngô Cũ', email: null },
    })
    expect(groups[0]).toEqual({
      label: 'Đang gán',
      options: [{ value: 'old', label: 'Ngô Cũ (không còn trong danh sách trưởng nhóm)' }],
    })
  })

  it('người đang gán còn trong danh sách → không thêm nhóm "Đang gán"', () => {
    const groups = buildTeamLeaderOptionGroups(leaders, {
      employeeId: 'self',
      employeeTeamName: null,
      current: { id: 'l2', fullNameLegal: 'An Hoà', email: null },
    })
    expect(groups.map((g) => g.label)).not.toContain('Đang gán')
  })
})

describe('teamLeaderDisplayName', () => {
  it('ưu tiên họ tên, rồi email', () => {
    expect(teamLeaderDisplayName(null)).toBe('')
    expect(teamLeaderDisplayName({ id: 'x', fullNameLegal: ' An ', email: 'a@x' })).toBe('An')
    expect(teamLeaderDisplayName({ id: 'x', fullNameLegal: null, email: 'a@x' })).toBe('a@x')
  })
})
