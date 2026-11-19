import { describe, expect, it } from 'vitest'
import { positionDisplayName, type EmployeePosition } from '../employeePosition'
import { teamPositionOptions } from '../teamPositionOptions'

const CATALOG: EmployeePosition[] = [
  {
    id: 'p-member',
    name: 'Nhân viên',
    linkedRole: 'MEMBER',
    sortOrder: 0,
    isActive: true,
    userCount: 3,
  },
  {
    id: 'p-old',
    name: 'Phó phòng',
    linkedRole: 'MANAGER',
    sortOrder: 1,
    isActive: false,
    userCount: 1,
  },
]

describe('positionDisplayName', () => {
  it('dùng tên chức vụ, kể cả chức vụ đã ẩn', () => {
    expect(positionDisplayName('p-member', CATALOG, 'LEADER')).toBe('Nhân viên')
    expect(positionDisplayName('p-old', CATALOG, 'MEMBER')).toBe('Phó phòng')
  })

  it('chưa có chức vụ / danh mục chưa tải → nhãn vai trò', () => {
    expect(positionDisplayName(null, CATALOG, 'LEADER')).toBe('Trưởng nhóm')
    expect(positionDisplayName('p-member', undefined, 'BOD')).toBe('Ban lãnh đạo')
    expect(positionDisplayName('khong-co', CATALOG, 'MEMBER')).toBe('Nhân viên')
  })
})

describe('teamPositionOptions', () => {
  it('không còn tên chức vụ trong loại hợp đồng', () => {
    const values = teamPositionOptions.map((o) => o.value)
    for (const position of ['Trưởng nhóm', 'Quản lý', 'Chuyên gia', 'BOD']) {
      expect(values).not.toContain(position)
    }
  })
})
