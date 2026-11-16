import { describe, expect, it } from 'vitest'
import { checklistSubjectInfoItems } from '../components/ChecklistSubjectInfo'

describe('checklistSubjectInfoItems', () => {
  it('4 mục theo thứ tự phòng ban, nhóm, dự án, trưởng nhóm; nhiều giá trị nối bằng dấu phẩy', () => {
    const items = checklistSubjectInfoItems({
      departmentName: 'Marketing traffic',
      teamNames: ['ADS', 'SALE ONLINE'],
      projectNames: ['ĐVKD 9 - Bangkok', 'Tây Ban Nha'],
      teamLeaderName: 'LỆNH NGỌC KHÁNH',
    })
    expect(items.map((i) => [i.label, i.value])).toEqual([
      ['Phòng ban', 'Marketing traffic'],
      ['Nhóm', 'ADS, SALE ONLINE'],
      ['Dự án tham gia', 'ĐVKD 9 - Bangkok, Tây Ban Nha'],
      ['Trưởng nhóm phụ trách', 'LỆNH NGỌC KHÁNH'],
    ])
  })

  it('chưa có dữ liệu → value null (hiện "Chưa cập nhật")', () => {
    const items = checklistSubjectInfoItems({
      departmentName: null,
      teamNames: [],
      projectNames: [],
      teamLeaderName: null,
    })
    expect(items.every((i) => i.value === null)).toBe(true)
  })
})
