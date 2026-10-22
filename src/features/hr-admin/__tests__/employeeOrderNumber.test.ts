import { describe, expect, it } from 'vitest'
import { employeeOrderNumberHint } from '../employeeOrderNumber'

describe('employeeOrderNumberHint', () => {
  it('có số → ghi nhóm đang xét và số người được đánh số', () => {
    expect(
      employeeOrderNumberHint({
        position: 3,
        total: 26,
        scope: 'PROJECT',
        groupName: 'ĐVKD 9 - Bangkok',
        reason: null,
      })
    ).toBe('Theo dự án ĐVKD 9 - Bangkok · 26 người')
    expect(
      employeeOrderNumberHint({
        position: 1,
        total: 33,
        scope: 'TEAM',
        groupName: 'SALE ONLINE',
        reason: null,
      })
    ).toBe('Theo team SALE ONLINE · 33 người')
  })

  it('không có số → nêu lý do', () => {
    const base = { position: null, total: 0, scope: null, groupName: null } as const
    expect(employeeOrderNumberHint({ ...base, reason: 'INACTIVE' })).toBe(
      'Đã nghỉ việc nên không đánh số'
    )
    expect(employeeOrderNumberHint({ ...base, reason: 'NO_START_DATE' })).toBe(
      'Cần nhập ngày bắt đầu làm việc để đánh số'
    )
    expect(employeeOrderNumberHint({ ...base, reason: 'NO_GROUP' })).toBe(
      'Chưa thuộc dự án hoặc team nào'
    )
  })
})
