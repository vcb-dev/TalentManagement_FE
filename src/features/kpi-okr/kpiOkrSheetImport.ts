import type { TeamMemberRow } from '@/features/organization/api'
import type { PerformanceKind } from './api'
import * as XLSX from 'xlsx'

const MAX_CONTENT_LEN = 500

export type ImportAssignmentItem = {
  assigneeUserId: string
  kind: PerformanceKind
  content: string
  priority?: number
  targetMetric?: string | null
  kpiSetAt?: string | null
  reviewerName?: string | null
  managerEvalStatus?: string | null
  managerReviewNote?: string | null
}

export type ParsedImportError = { row: number; message: string }

function foldVi(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Ghép tên trong team với cột Excel (bỏ dấu, không phân biệt hoa thường). */
export function resolveMemberIdByName(members: TeamMemberRow[], rawName: string): string | null {
  const q = foldVi(String(rawName ?? ''))
  if (!q) return null
  for (const m of members) {
    const dn = foldVi(m.displayName ?? '')
    if (dn && dn === q) return m.userId
    const emailLocal = foldVi((m.email ?? '').split('@')[0] ?? '')
    if (emailLocal && emailLocal === q) return m.userId
  }
  return null
}

function findColIndex(headers: string[], candidates: string[]): number {
  const norm = headers.map((h) => foldVi(String(h ?? '')))
  for (const c of candidates) {
    const fc = foldVi(c)
    const i = norm.findIndex((n) => n === fc || n.includes(fc) || fc.includes(n))
    if (i >= 0) return i
  }
  return -1
}

function parseKind(v: unknown): PerformanceKind | null {
  const s = String(v ?? '')
    .trim()
    .toUpperCase()
  if (s === 'KPI' || s === 'KPI ') return 'KPI'
  if (s === 'OKR') return 'OKR'
  return null
}

function parsePriorityCell(v: unknown): number {
  const raw = String(v ?? '').trim()
  if (!raw) return 0
  const s = foldVi(raw)
  const m = s.match(/uu\s*tien\s*(\d+)/) ?? s.match(/priority\s*(\d+)/)
  if (m) {
    const n = Number.parseInt(m[1], 10)
    if (Number.isInteger(n)) return Math.min(99, Math.max(0, n))
  }
  const n = Number(raw.replace(',', '.'))
  if (Number.isInteger(n) && n >= 0 && n <= 99) return n
  return 0
}

function parseTargetMetric(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  const s = String(v).trim()
  return s ? s.slice(0, 200) : null
}

/** Excel serial hoặc chuỗi ngày → ISO (giữa trưa local như form thủ công). */
export function cellToKpiIso(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number' && Number.isFinite(val)) {
    const p = XLSX.SSF.parse_date_code(val)
    if (!p?.y) return null
    const y = p.y
    const mo = String(p.m).padStart(2, '0')
    const d = String(p.d).padStart(2, '0')
    const dt = new Date(`${y}-${mo}-${d}T12:00:00`)
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
  }
  const s = String(val).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const dt = new Date(`${s.slice(0, 10)}T12:00:00`)
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
  }
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
  if (m) {
    const dt = new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T12:00:00`)
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
  }
  return null
}

function parseManagerEval(v: unknown): string | null {
  const s = String(v ?? '')
    .trim()
    .toUpperCase()
  if (s === 'OK' || s === 'NOT') return s
  return null
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQ = false
      } else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((x) => x.trim())
}

export function parseCsvToMatrix(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, '')
  const lines = t.split(/\r?\n/).filter((l) => l.length > 0)
  return lines.map(parseCsvLine)
}

export function parseXlsxFirstSheetToMatrix(buf: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(buf, { type: 'array', cellDates: false })
  const sn = wb.SheetNames[0]
  if (!sn) return []
  const sh = wb.Sheets[sn]
  const data = XLSX.utils.sheet_to_json<unknown[]>(sh, {
    header: 1,
    defval: '',
    raw: true,
  })
  return data as unknown[][]
}

function getCell(row: unknown[], i: number): unknown {
  if (i < 0 || i >= row.length) return ''
  return row[i]
}

/**
 * Parse bảng: hàng đầu là tiêu đề (như file báo cáo mẫu).
 * Bỏ qua hàng trống hoàn toàn (không báo lỗi).
 */
export function matrixToImportItems(
  matrix: unknown[][],
  members: TeamMemberRow[]
): { items: ImportAssignmentItem[]; errors: ParsedImportError[] } {
  const errors: ParsedImportError[] = []
  const items: ImportAssignmentItem[] = []
  if (!matrix.length) {
    errors.push({ row: 1, message: 'File không có dữ liệu.' })
    return { items, errors }
  }

  const headerRow = matrix[0].map((c) => String(c ?? ''))
  const ixAssignee = findColIndex(headerRow, ['Nhân sự', 'nhan su', 'Họ tên', 'assignee'])
  const ixKind = findColIndex(headerRow, ['Hạng mục', 'hang muc', 'kind', 'loại'])
  const ixPriority = findColIndex(headerRow, ['Thứ tự ưu tiên', 'uu tien', 'priority'])
  const ixContent = findColIndex(headerRow, [
    'Nội dung KPI/OKRs',
    'Nội dung KPI',
    'noi dung',
    'content',
  ])
  const ixTarget = findColIndex(headerRow, ['Chỉ số mục tiêu', 'chi so muc tieu', 'target'])
  const ixKpiDate = findColIndex(headerRow, [
    'Ngày set KPI/OKRs',
    'ngay set kpi',
    'ngay set',
    'kpi set',
  ])
  const ixReviewer = findColIndex(headerRow, ['Người đánh giá', 'nguoi danh gia', 'reviewer'])
  const ixQlEval = findColIndex(headerRow, ['QL ĐÁNH GIÁ', 'ql danh gia', 'danh gia ql'])
  const ixQlNote = findColIndex(headerRow, ['QL NHẬN XÉT', 'ql nhan xet', 'nhan xet ql'])

  if (ixAssignee < 0 || ixKind < 0 || ixContent < 0) {
    errors.push({
      row: 1,
      message:
        'Thiếu cột bắt buộc. Cần có tiêu đề: Nhân sự, Hạng mục, Nội dung KPI/OKRs (hoặc tương đương).',
    })
    return { items, errors }
  }

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] as unknown[]
    const excelRow = r + 1
    const nameRaw = String(getCell(row, ixAssignee) ?? '').trim()
    const kind = parseKind(getCell(row, ixKind))
    const content = String(getCell(row, ixContent) ?? '').trim()
    const priority = ixPriority >= 0 ? parsePriorityCell(getCell(row, ixPriority)) : 0

    if (!nameRaw && !kind && !content) continue

    if (!content) {
      errors.push({ row: excelRow, message: 'Thiếu nội dung KPI/OKR.' })
      continue
    }
    if (!kind) {
      errors.push({ row: excelRow, message: 'Hạng mục không hợp lệ (cần KPI hoặc OKR).' })
      continue
    }
    if (!nameRaw) {
      errors.push({ row: excelRow, message: 'Thiếu tên nhân sự.' })
      continue
    }

    const assigneeUserId = resolveMemberIdByName(members, nameRaw)
    if (!assigneeUserId) {
      errors.push({
        row: excelRow,
        message: `Không tìm thấy nhân sự "${nameRaw}" trong team hiện tại.`,
      })
      continue
    }

    if (content.length > MAX_CONTENT_LEN) {
      errors.push({
        row: excelRow,
        message: `Nội dung quá ${MAX_CONTENT_LEN} ký tự (${content.length}).`,
      })
      continue
    }

    const kpiIso = ixKpiDate >= 0 ? cellToKpiIso(getCell(row, ixKpiDate)) : null
    const reviewerName =
      ixReviewer >= 0 ? String(getCell(row, ixReviewer) ?? '').trim() || null : null
    const managerEvalStatus = ixQlEval >= 0 ? parseManagerEval(getCell(row, ixQlEval)) : null
    const managerReviewNote =
      ixQlNote >= 0 ? String(getCell(row, ixQlNote) ?? '').trim() || null : null

    const item: ImportAssignmentItem = {
      assigneeUserId,
      kind,
      content,
      priority,
      targetMetric: ixTarget >= 0 ? parseTargetMetric(getCell(row, ixTarget)) : null,
      kpiSetAt: kpiIso,
      reviewerName,
      managerEvalStatus: managerEvalStatus ?? undefined,
      managerReviewNote,
    }
    items.push(item)
  }

  if (items.length === 0 && errors.length === 0) {
    errors.push({ row: 1, message: 'Không có dòng dữ liệu hợp lệ sau tiêu đề.' })
  }

  return { items, errors }
}

export async function parseKpiOkrImportFile(
  file: File,
  members: TeamMemberRow[]
): Promise<{ items: ImportAssignmentItem[]; errors: ParsedImportError[] }> {
  const name = file.name.toLowerCase()
  let matrix: unknown[][]

  if (name.endsWith('.csv')) {
    const text = await file.text()
    matrix = parseCsvToMatrix(text) as unknown[][]
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer()
    matrix = parseXlsxFirstSheetToMatrix(buf)
  } else {
    throw new Error('unsupported')
  }

  return matrixToImportItems(matrix, members)
}
