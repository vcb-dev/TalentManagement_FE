import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiClient, mockEnabled } = vi.hoisted(() => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  mockEnabled: { value: false },
}))
vi.mock('@/lib/axios', () => ({ apiClient }))
vi.mock('@/lib/mockEnv', () => ({ isMockApiEnabled: () => mockEnabled.value }))

import { USER_SELF_FORM_SECTIONS } from '@/features/profile/userSelfFormLayout'
import {
  EMPLOYEE_CARD_STATUSES,
  employeeCardColorApi,
  employeeCardStatusLabel,
} from '../employeeCard'
import { EMPLOYEE_PATCH_KEYS } from '../types'

describe('tình trạng cấp thẻ', () => {
  it('khớp enum EmployeeCardStatus ở BE, đúng thứ tự hiển thị', () => {
    expect(EMPLOYEE_CARD_STATUSES).toEqual(['NOT_ISSUED', 'TEMP_CARD_ISSUED', 'PHOTO_CARD_ISSUED'])
  })

  it('nhãn tiếng Việt; trống = chưa cập nhật; giá trị lạ hiện nguyên văn', () => {
    expect(employeeCardStatusLabel('TEMP_CARD_ISSUED')).toBe('Đã cấp thẻ tạm')
    expect(employeeCardStatusLabel(null)).toBe('')
    expect(employeeCardStatusLabel('')).toBe('')
    expect(employeeCardStatusLabel('LOST')).toBe('LOST')
  })
})

describe('hồ sơ nhân sự — trường thẻ', () => {
  it('form HR gửi kèm tình trạng & màu thẻ khi lưu', () => {
    expect(EMPLOYEE_PATCH_KEYS).toContain('employeeCardStatus')
    expect(EMPLOYEE_PATCH_KEYS).toContain('employeeCardColorId')
  })

  it('bố cục hồ sơ dùng ô chọn riêng cho 2 trường thẻ', () => {
    const fields = USER_SELF_FORM_SECTIONS.flatMap((s) => s.fields)
    expect(fields.find((f) => f.key === 'employeeCardStatus')?.kind).toBe('card-status-select')
    expect(fields.find((f) => f.key === 'employeeCardColorId')?.kind).toBe('card-color-select')
  })
})

describe('employeeCardColorApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnabled.value = false
  })

  it('gọi đúng endpoint /employee-card-colors', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    apiClient.post.mockResolvedValue({ data: { id: 'c1' } })
    apiClient.patch.mockResolvedValue({ data: { id: 'c1' } })
    apiClient.delete.mockResolvedValue({ data: { id: 'c1' } })

    await employeeCardColorApi.list()
    await employeeCardColorApi.create({ name: 'Xanh dương' })
    await employeeCardColorApi.update('c1', { isActive: false })
    await employeeCardColorApi.remove('c1')

    expect(apiClient.get).toHaveBeenCalledWith('/employee-card-colors')
    expect(apiClient.post).toHaveBeenCalledWith('/employee-card-colors', { name: 'Xanh dương' })
    expect(apiClient.patch).toHaveBeenCalledWith('/employee-card-colors/c1', { isActive: false })
    expect(apiClient.delete).toHaveBeenCalledWith('/employee-card-colors/c1')
  })

  it('chế độ mock: danh sách rỗng, không cho sửa danh mục, không gọi BE', async () => {
    mockEnabled.value = true
    await expect(employeeCardColorApi.list()).resolves.toEqual([])
    await expect(employeeCardColorApi.create({ name: 'Đỏ' })).rejects.toThrow(
      'Chế độ mock chưa hỗ trợ quản lý màu thẻ'
    )
    expect(apiClient.get).not.toHaveBeenCalled()
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})
