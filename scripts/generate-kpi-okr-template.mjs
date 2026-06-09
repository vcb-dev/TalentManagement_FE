import * as XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.join(process.cwd(), 'public')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const headers = [
  'Tiến độ',
  'Tháng',
  'Nhân sự',
  'Hạng mục',
  'Thứ tự ưu tiên',
  'Nội dung KPI/OKRs',
  'Chỉ số mục tiêu',
  'Số liệu',
  'Đơn vị',
  'Evidence',
  'Tự đánh giá',
  'Tự nhận xét',
]
const row1 = [
  '',
  'T3/2026',
  'Nguyễn Văn A',
  'KPI',
  'Ưu tiên 1',
  'Ví dụ: Hoàn thành chỉ tiêu doanh số tháng (sửa hoặc xóa dòng mẫu)',
  100,
  50000000,
  'VND',
  'https://example.com/evidence',
  'OK',
  'Đã hoàn thành mục tiêu',
]
const row2 = [
  '',
  'T3/2026',
  'Nguyễn Văn A',
  'OKR',
  'Ưu tiên 2',
  'Ví dụ: Ra mắt tính năng X trong quý (tối đa 500 ký tự)',
  1,
  '',
  '',
  '',
  'NOT',
  'Cần hỗ trợ thêm',
]

const ws = XLSX.utils.aoa_to_sheet([headers, row1, row2])
ws['!cols'] = [
  { wch: 8 },
  { wch: 10 },
  { wch: 22 },
  { wch: 8 },
  { wch: 16 },
  { wch: 50 },
  { wch: 14 },
  { wch: 12 },
  { wch: 10 },
  { wch: 18 },
  { wch: 12 },
  { wch: 24 },
]

const guide = [
  ['Hướng dẫn import KPI/OKR (khớp chức năng Upload trên HRM)'],
  [''],
  ['• Chọn đúng team và kỳ tháng/năm trên màn hình; hệ thống gán mọi dòng vào kỳ đó.'],
  ['• Cột bắt buộc: Nhân sự | Hạng mục (KPI hoặc OKR) | Nội dung KPI/OKRs.'],
  ['• Tên Nhân sự phải trùng họ tên (hoặc phần trước @ của email) trong danh sách team.'],
  ['• Ưu tiên: gõ Ưu tiên 1 … Ưu tiên 3 hoặc số 0–99.'],
  [
    '• Ngày xét được hệ thống tự lấy theo ngày tạo KPI/OKR. Tự đánh giá: OK hoặc NOT (có thể để trống).',
  ],
  ['• Mỗi dòng = một mục. Nội dung tối đa 500 ký tự. File .csv dùng cùng tiêu đề cột.'],
]
const wsG = XLSX.utils.aoa_to_sheet(guide)
wsG['!cols'] = [{ wch: 92 }]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Import KPI-OKR')
XLSX.utils.book_append_sheet(wb, wsG, 'Hướng dẫn')

const outDir = path.join(dir, 'templates')
fs.mkdirSync(outDir, { recursive: true })

const outXlsx = path.join(outDir, 'kpi-okr-import-mau.xlsx')
XLSX.writeFile(wb, outXlsx)
console.log('Wrote', outXlsx)

/** CSV (UTF-8 BOM) — mở được trong Excel/WPS khi .xlsx lỗi; dễ commit git. */
const csvBody = XLSX.utils.sheet_to_csv(ws, { FS: ',', RS: '\r\n' })
const outCsv = path.join(outDir, 'kpi-okr-import-mau.csv')
fs.writeFileSync(outCsv, '\uFEFF' + csvBody, 'utf8')
console.log('Wrote', outCsv)
