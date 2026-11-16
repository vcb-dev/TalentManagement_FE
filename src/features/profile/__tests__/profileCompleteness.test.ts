import { describe, expect, it } from 'vitest'
import { MOCK_USER_SELF } from '../mock/mockUserSelf'
import {
  missingProfileFields,
  roleNeedsTeamLeader,
  summarizeMissingFields,
} from '../profileCompleteness'
import type { MeUserSelf } from '../userSelf.types'

const FULL: MeUserSelf = {
  ...MOCK_USER_SELF,
  teamLeaderUserId: '22222222-2222-4222-8222-222222222222',
  phonePrimary: '0901 234 567',
  birthDate: '15/08/1995',
  identityNumber: '001095012345',
  attachmentIdFront: 'u/front.jpg',
  attachmentIdBack: 'u/back.jpg',
  addressCurrent: 'Hà Nội',
  emergencyContact1: 'Mẹ - 0912 000 000',
  bankAccountInfo: 'VCB 0011 0000 1234',
}

const keys = (u: MeUserSelf | null | undefined, role: string | null) =>
  missingProfileFields(u, role).map((f) => f.key)

describe('missingProfileFields', () => {
  it('hồ sơ đủ / chưa có dữ liệu → không thiếu gì', () => {
    expect(keys(FULL, 'MEMBER')).toEqual([])
    expect(keys(undefined, 'MEMBER')).toEqual([])
  })

  it('ô chỉ có khoảng trắng tính là trống, giữ thứ tự hiển thị', () => {
    const u = { ...FULL, bankAccountInfo: '  ', phonePrimary: null, attachmentIdBack: null }
    expect(keys(u, 'MEMBER')).toEqual(['phonePrimary', 'attachmentIdBack', 'bankAccountInfo'])
  })

  it('trưởng nhóm phụ trách chỉ bắt buộc với nhân viên / giáo viên', () => {
    const u = { ...FULL, teamLeaderUserId: null }
    expect(keys(u, 'MEMBER')).toEqual(['teamLeaderUserId'])
    expect(keys(u, 'TEACHER')).toEqual(['teamLeaderUserId'])
    for (const role of ['LEADER', 'MANAGER', 'BOD', 'HR', null]) {
      expect(keys(u, role)).toEqual([])
      expect(roleNeedsTeamLeader(role)).toBe(false)
    }
  })
})

describe('summarizeMissingFields', () => {
  const f = (label: string) => ({ key: 'phonePrimary' as const, label })

  it('tối đa 3 mục, phần còn lại thành +N', () => {
    expect(summarizeMissingFields([f('A'), f('B')])).toBe('A, B')
    expect(summarizeMissingFields([f('A'), f('B'), f('C'), f('D'), f('E')])).toBe('A, B, C +2')
  })
})
