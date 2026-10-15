import type { EmployeeExportRow } from '@/features/hr-admin/api'
import { format } from 'date-fns'
import type { Workbook } from 'exceljs'

type CellValue = string | number | Date

type Column = {
  header: string
  width: number
  align?: 'left' | 'center'
  /** Ô ngày (dd/mm/yyyy) — giá trị là Date thật để Excel lọc/sắp xếp được. */
  date?: boolean
  value: (e: EmployeeExportRow, index: number) => CellValue
}

const FONT = 'Arial'
const BRAND = 'FF006C49'
const ZEBRA = 'FFF1F7F4'
const BORDER = 'FFC9D6CF'
const MUTED = 'FF5F6B66'

/** Dòng tiêu đề cột (dòng 1–2: tên báo cáo + thông tin xuất, dòng 3 để trống). */
const HEADER_ROW = 4

/** "yyyy-MM-dd…" → Date UTC (Excel hiển thị đúng ngày, không lệch múi giờ); sai định dạng giữ nguyên chuỗi. */
function isoToExcelDate(iso: string | null): CellValue {
  const raw = iso?.trim() ?? ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : raw
}

const COLUMNS: Column[] = [
  { header: 'STT', width: 6, align: 'center', value: (_, i) => i + 1 },
  { header: 'Mã định danh', width: 13, align: 'center', value: (e) => e.employeeIdentifier ?? '' },
  { header: 'Họ và tên', width: 26, value: (e) => e.name },
  {
    header: 'Ngày sinh',
    width: 12,
    align: 'center',
    date: true,
    value: (e) => isoToExcelDate(e.birthDate),
  },
  { header: 'Nơi sinh', width: 26, value: (e) => e.birthPlace ?? '' },
  { header: 'Địa chỉ thường trú', width: 38, value: (e) => e.addressHousehold ?? '' },
  { header: 'Địa chỉ tạm trú (Hiện tại)', width: 38, value: (e) => e.addressCurrent ?? '' },
  { header: 'CCCD / Ngày cấp - Nơi cấp', width: 34, value: (e) => e.identityDocument ?? '' },
  { header: 'Trình độ học vấn', width: 18, value: (e) => e.educationLevel ?? '' },
  { header: 'SĐT', width: 14, align: 'center', value: (e) => e.phone ?? '' },
  {
    header: 'Team',
    width: 24,
    value: (e) =>
      e.teamNames
        .map((t) => t.trim())
        .filter(Boolean)
        .join(', '),
  },
  { header: 'Vị trí', width: 20, value: (e) => e.jobTitle ?? '' },
  {
    header: 'Ngày bắt đầu công việc',
    width: 14,
    align: 'center',
    date: true,
    value: (e) => isoToExcelDate(e.startDate),
  },
]

export const EXPORT_HEADER = COLUMNS.map((c) => c.header)

export function employeesToExportRows(employees: EmployeeExportRow[]): CellValue[][] {
  return employees.map((e, i) => COLUMNS.map((c) => c.value(e, i)))
}

export async function buildEmployeesWorkbook(
  employees: EmployeeExportRow[],
  exportedAt: Date
): Promise<Workbook> {
  const mod = await import('exceljs')
  const ExcelJS = mod.default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.created = exportedAt

  const lastCol = COLUMNS.length
  const ws = wb.addWorksheet('Nhân sự', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: HEADER_ROW, showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}`,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
    headerFooter: { oddFooter: '&C&8Trang &P / &N' },
  })
  ws.columns = COLUMNS.map((c) => ({ width: c.width }))

  ws.mergeCells(1, 1, 1, lastCol)
  const title = ws.getCell(1, 1)
  title.value = 'DANH SÁCH NHÂN SỰ'
  title.font = { name: FONT, size: 16, bold: true, color: { argb: BRAND } }
  title.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 30

  ws.mergeCells(2, 1, 2, lastCol)
  const subtitle = ws.getCell(2, 1)
  subtitle.value = `Ngày xuất: ${format(exportedAt, 'dd/MM/yyyy HH:mm')}  ·  Tổng số: ${employees.length} nhân sự`
  subtitle.font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } }
  subtitle.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(3).height = 8

  const border = {
    top: { style: 'thin', color: { argb: BORDER } },
    left: { style: 'thin', color: { argb: BORDER } },
    bottom: { style: 'thin', color: { argb: BORDER } },
    right: { style: 'thin', color: { argb: BORDER } },
  } as const

  const header = ws.getRow(HEADER_ROW)
  header.values = EXPORT_HEADER
  header.height = 36
  header.eachCell((cell) => {
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = border
  })

  employeesToExportRows(employees).forEach((values, i) => {
    const row = ws.getRow(HEADER_ROW + 1 + i)
    row.values = values
    COLUMNS.forEach((col, c) => {
      const cell = row.getCell(c + 1)
      cell.font = { name: FONT, size: 10, bold: c === 2 }
      cell.alignment = { horizontal: col.align ?? 'left', vertical: 'middle', wrapText: true }
      cell.border = border
      if (col.date) cell.numFmt = 'dd/mm/yyyy'
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
      }
    })
  })

  ws.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW + employees.length, column: lastCol },
  }

  return wb
}

export async function downloadEmployeesExcel(employees: EmployeeExportRow[], fileName: string) {
  const wb = await buildEmployeesWorkbook(employees, new Date())
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
