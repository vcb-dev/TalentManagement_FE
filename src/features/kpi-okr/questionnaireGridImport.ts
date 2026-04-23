import { parseCsvToMatrix, parseXlsxFirstSheetToMatrix } from './kpiOkrSheetImport'

function foldVi(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Tiêu đề cột meta (form lưới khảo sát), không phải câu hỏi trắc nghiệm/tự luận cần import. */
function isGridMetadataHeader(cell: string): boolean {
  const t = cell.trim()
  if (t.length === 0) return true
  const f = foldVi(t)
  if (f.length <= 2) return true
  if (f.includes('tu danh gia')) return true
  if (f === 'danh gia' || f.startsWith('danh gia tong quan')) return true
  if (f.includes('ql tinh diem')) return true
  if (f.startsWith('tieu chuan chua ok')) return true
  if (f === 'quan ly' || f === 'nhan xet') return true
  if (f.startsWith('ngay thang')) return true
  if (f.startsWith('nhan su') || f.startsWith('ho va ten')) return true
  if (f.startsWith('dinh huong') && !f.includes('cau hoi')) return false
  return false
}

/**
 * Ô tiêu đề là câu hỏi (định dạng file lưới: "TC1 - Câu hỏi 1: ...").
 */
export function isQuestionGridHeader(cell: string): boolean {
  const t = cell.trim()
  if (t.length < 12) return false
  if (isGridMetadataHeader(t)) return false
  const f = foldVi(t)
  if (f.includes('tu danh gia')) return false
  if (/^tc\d+\s*-\s*cau hoi/.test(f)) return true
  if (/cau hoi\s*\d+\s*:/.test(f)) return true
  return false
}

/**
 * Trích danh sách câu hỏi từ bảng:
 * - Ưu tiên hàng đầu: các cột có tiêu đề dạng TCx - Câu hỏi… (file Excel lưới mẫu).
 * - Nếu không có: mỗi dòng cột đầu = một câu (txt / csv dọc).
 */
export function extractQuestionsFromMatrix(matrix: unknown[][]): string[] {
  if (!matrix.length) return []

  const row0 = (matrix[0] ?? []).map((c) => String(c ?? '').trim())
  const horizontal = row0.filter((cell) => isQuestionGridHeader(cell))
  if (horizontal.length >= 1) return horizontal

  const vertical: string[] = []
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? []
    const first = String(row[0] ?? '').trim()
    if (!first) continue
    if (r === 0 && horizontal.length === 0 && isGridMetadataHeader(first)) continue
    vertical.push(first)
  }
  const verticalFiltered = vertical.filter((c) => !isGridMetadataHeader(c))
  if (verticalFiltered.length > 0) return verticalFiltered

  return []
}

export async function parseQuestionnaireImportFile(file: File): Promise<string[]> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer()
    const matrix = parseXlsxFirstSheetToMatrix(buf)
    return extractQuestionsFromMatrix(matrix)
  }

  if (name.endsWith('.csv')) {
    const text = await file.text()
    const matrix = parseCsvToMatrix(text) as unknown[][]
    const fromGrid = extractQuestionsFromMatrix(matrix)
    if (fromGrid.length > 0) return fromGrid
    return text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }

  const text = await file.text()
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}
