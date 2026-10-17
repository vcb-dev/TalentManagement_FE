import { describe, expect, it } from 'vitest'
import { getMockEmployees } from '../mock/mockEmployeesData'
import { employeeListApiSchema } from '../schemas'

describe('employee list pagination', () => {
  it('đưa trang vượt quá giới hạn về trang cuối có dữ liệu', () => {
    const result = getMockEmployees({ page: 999, pageSize: 10 })

    expect(result.page).toBe(result.totalPages)
    expect(result.data.length).toBeGreaterThan(0)
  })

  it('trả trang 1 khi bộ lọc không có kết quả', () => {
    const result = getMockEmployees({ page: 999, pageSize: 10, search: 'khong-ton-tai' })

    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(1)
    expect(result.data).toEqual([])
  })

  it('chấp nhận hồ sơ đồng bộ cũ chưa có email', () => {
    const result = getMockEmployees({ page: 1, pageSize: 10 })
    const firstEmployee = result.data[0]

    expect(firstEmployee).toBeDefined()
    expect(
      employeeListApiSchema.safeParse({
        ...result,
        data: [{ ...firstEmployee!, email: '' }, ...result.data.slice(1)],
      }).success
    ).toBe(true)
  })
})
