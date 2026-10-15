import { describe, expect, it } from 'vitest'
import type { EmployeeExportRow } from '../api'
import {
  buildEmployeesWorkbook,
  employeesToExportRows,
  EXPORT_HEADER,
} from '../components/HrEmployeeList/exportEmployeesExcel'
import { isoDateMatchesMonthYear } from '../employeeListFilters'

describe('isoDateMatchesMonthYear', () => {
  it('khớp theo tháng, theo năm, hoặc cả hai', () => {
    expect(isoDateMatchesMonthYear('2025-03-14', 3)).toBe(true)
    expect(isoDateMatchesMonthYear('2025-03-14', 4)).toBe(false)
    expect(isoDateMatchesMonthYear('2025-03-14', undefined, 2025)).toBe(true)
    expect(isoDateMatchesMonthYear('2025-03-14', 3, 2024)).toBe(false)
    expect(isoDateMatchesMonthYear('2025-03-14', 3, 2025)).toBe(true)
  })

  it('thiếu ngày hoặc sai định dạng → không khớp', () => {
    expect(isoDateMatchesMonthYear(null, 3)).toBe(false)
    expect(isoDateMatchesMonthYear('', 3)).toBe(false)
    expect(isoDateMatchesMonthYear('14/03/2025', 3)).toBe(false)
  })
})

const exportRow: EmployeeExportRow = {
  id: 'u1',
  employeeIdentifier: 'A745',
  name: 'Nguyễn Văn A',
  birthDate: '1995-03-07',
  birthPlace: 'Hưng Yên',
  addressHousehold: 'Thôn 1, Hưng Yên',
  addressCurrent: 'Cầu Giấy, Hà Nội',
  identityDocument: '033099009960 - 10/08/2023 - Cục CS QLHC về TTXH',
  educationLevel: 'Đại học',
  phone: '0912345678',
  teamNames: ['Team A', ' ', 'Team B'],
  jobTitle: 'MKT',
  startDate: '2024-11-20',
}

describe('employeesToExportRows', () => {
  it('đủ cột theo mẫu HR, ngày là Date, sai định dạng giữ nguyên chuỗi', () => {
    expect(EXPORT_HEADER).toEqual([
      'STT',
      'Mã định danh',
      'Họ và tên',
      'Ngày sinh',
      'Nơi sinh',
      'Địa chỉ thường trú',
      'Địa chỉ tạm trú (Hiện tại)',
      'CCCD / Ngày cấp - Nơi cấp',
      'Trình độ học vấn',
      'SĐT',
      'Team',
      'Vị trí',
      'Ngày bắt đầu công việc',
    ])

    const [row, second] = employeesToExportRows([
      exportRow,
      { ...exportRow, birthDate: '7/3/1995' },
    ])
    const col = (h: string) => row![EXPORT_HEADER.indexOf(h)]
    expect(col('STT')).toBe(1)
    expect(col('Mã định danh')).toBe('A745')
    expect(col('Ngày sinh')).toEqual(new Date(Date.UTC(1995, 2, 7)))
    expect(col('Ngày bắt đầu công việc')).toEqual(new Date(Date.UTC(2024, 10, 20)))
    expect(col('Team')).toBe('Team A, Team B')
    expect(col('CCCD / Ngày cấp - Nơi cấp')).toBe(exportRow.identityDocument)
    expect(second![EXPORT_HEADER.indexOf('Ngày sinh')]).toBe('7/3/1995')
  })
})

describe('buildEmployeesWorkbook', () => {
  it('có tiêu đề, dòng header tô màu, cố định header và bộ lọc', async () => {
    const wb = await buildEmployeesWorkbook([exportRow], new Date(2026, 9, 15, 9, 30))
    const ws = wb.getWorksheet('Nhân sự')!

    expect(ws.getCell('A1').value).toBe('DANH SÁCH NHÂN SỰ')
    expect(ws.getCell('A2').value).toContain('Tổng số: 1 nhân sự')
    expect(ws.getCell('A4').value).toBe('STT')
    expect(ws.getCell('A4').fill).toMatchObject({ fgColor: { argb: 'FF006C49' } })
    expect(ws.getCell('C5').value).toBe('Nguyễn Văn A')
    expect(ws.getCell('D5').numFmt).toBe('dd/mm/yyyy')
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 4 })
    expect(ws.autoFilter).toBeTruthy()
  })
})
