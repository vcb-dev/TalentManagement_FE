import { format } from 'date-fns'
import type { z } from 'zod'
import { ESSAY_CRITERIA } from '@/features/exam-papers/criteria'
import type { examExportScheduleApiSchema } from './schemas'

export type ExamExportSchedule = z.infer<typeof examExportScheduleApiSchema>
type ExamExportStudent = ExamExportSchedule['students'][number]
type ExamExportSubmission = NonNullable<ExamExportStudent['submission']>

/** Thông tin kỳ thi đã tính sẵn cho bảng Lịch thi (giờ kết thúc, thời lượng, trạng thái…). */
export type ExamExportInfo = {
  scheduleId: string
  className: string
  topic: string
  dateIso: string
  startTime: string
  endTime: string
  durationMinutes: number
  statusLabel: string
  location: string | null
  graderName: string | null
  /** Mã đề gán cho lịch thi, vd. "VH01, VH02". */
  paperCodes: string
  /** Ngưỡng đạt đang áp dụng, vd. "80" hoặc "70, 80" khi các đề khác ngưỡng. */
  passScoreLabel: string
}

export type CellValue = string | number | Date | null | { text: string; hyperlink: string }

/**
 * Kiểu cột quyết định căn lề, định dạng số / ngày và cách tính chiều cao dòng:
 * `long` = đoạn văn dài (bài làm, nhận xét) — xuống dòng, căn trên, dòng bị giới hạn chiều cao;
 * `text` = chữ ngắn được xuống dòng; `clip` = chữ lặp lại mỗi dòng (lớp, kỳ thi, email…) —
 * giữ một dòng cho bảng gọn, bấm vào ô để xem đủ.
 */
export type ColumnKind =
  | 'index'
  | 'text'
  | 'clip'
  | 'long'
  | 'center'
  | 'number'
  | 'decimal'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'link'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted'

export type ExportColumn = {
  header: string
  width: number
  kind: ColumnKind
  /** Tô màu ô theo giá trị (trạng thái, kết quả, đúng / sai). */
  tone?: (value: CellValue) => Tone | null
  bold?: boolean
}

export type ExportSheet = {
  name: string
  title: string
  /** Ghi chú thêm sau dòng "Ngày xuất …" (vd. cách xem ô dài). */
  note?: string
  columns: ExportColumn[]
  /** Số cột cố định bên trái khi cuộn ngang. */
  frozenColumns: number
  rows: CellValue[][]
  /** Nhóm của từng dòng (cùng kỳ thi / cùng bài làm) — các nhóm xen kẽ nền để dễ dò. */
  rowGroups: number[]
  /** Dòng tổng cộng dưới bảng (không nằm trong vùng lọc). */
  totals?: CellValue[]
}

const SUBMISSION_STATUS_LABEL: Record<ExamExportSubmission['status'], string> = {
  started: 'Đang làm dở',
  pending: 'Chờ chấm',
  grading: 'Đang chấm',
  done: 'Đã chấm',
}
const NOT_STARTED_LABEL = 'Chưa làm bài'

const OUTCOME_LABEL: Record<NonNullable<ExamExportSubmission['outcome']>, string> = {
  DAT: 'Đạt',
  BAO_LUU: 'Bảo lưu',
  CHO_HOC_LAI: 'Chờ học lại',
  CHIA_TAY: 'Chia tay',
}

const CRITERIA_LABEL = new Map<string, string>(ESSAY_CRITERIA.map((c) => [c.id, c.label]))

function toneOf(map: Record<string, Tone>) {
  return (value: CellValue): Tone | null =>
    typeof value === 'string' ? (map[value] ?? null) : null
}

const EXAM_STATUS_TONE = toneOf({
  'Sắp diễn ra': 'warning',
  'Đang diễn ra': 'info',
  'Đã kết thúc': 'muted',
})
const SUBMISSION_TONE = toneOf({
  'Đã chấm': 'success',
  'Chờ chấm': 'warning',
  'Đang chấm': 'warning',
  'Đang làm dở': 'muted',
  [NOT_STARTED_LABEL]: 'muted',
})
const OUTCOME_TONE = toneOf({
  Đạt: 'success',
  'Bảo lưu': 'warning',
  'Chờ học lại': 'danger',
  'Chia tay': 'danger',
})
const CORRECT_TONE = toneOf({ Đúng: 'success', Sai: 'danger', 'Bỏ trống': 'muted' })
const MEMBER_TONE = toneOf({ Không: 'muted' })

/** Excel giới hạn 32.767 ký tự mỗi ô — cắt bớt bài làm quá dài thay vì làm hỏng file. */
const MAX_CELL_TEXT = 32_000

function text(value: string | null | undefined): string {
  const v = (value ?? '').trim()
  return v.length > MAX_CELL_TEXT ? `${v.slice(0, MAX_CELL_TEXT)}… (đã cắt bớt)` : v
}

/**
 * ExcelJS ghi Date theo giờ UTC → dựng Date "UTC" mang đúng ngày giờ địa phương,
 * để ô hiển thị đúng giờ Việt Nam và vẫn sắp xếp / lọc được như ngày thật.
 */
export function excelDate(dateIso: string): Date | string {
  const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number)
  return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : dateIso
}

export function excelDateTime(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes())
  )
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Đã nộp = có bài và không còn đang làm dở (khớp cột "Tiến độ chấm" trên màn hình). */
function isSubmitted(s: ExamExportStudent): boolean {
  return s.submission !== null && s.submission.status !== 'started'
}

export function examScheduleStats(students: ExamExportStudent[] = []) {
  const graded = students.flatMap((s) => (s.submission?.status === 'done' ? [s.submission] : []))
  const scores = graded.flatMap((s) => (s.totalScore === null ? [] : [s.totalScore]))
  const passed = graded.filter((s) => s.outcome === 'DAT').length
  const notPassed = graded.filter((s) => s.outcome !== null && s.outcome !== 'DAT').length
  return {
    students: students.length,
    submitted: students.filter(isSubmitted).length,
    notSubmitted: students.filter((s) => !isSubmitted(s)).length,
    graded: graded.length,
    average: scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    max: scores.length ? Math.max(...scores) : null,
    min: scores.length ? Math.min(...scores) : null,
    passed,
    notPassed,
    /** Tỉ lệ 0–1 (ô định dạng %). */
    passRate: graded.length ? passed / graded.length : null,
  }
}

/** Các cột thống kê của sheet Kỳ thi — để trống khi chưa có bài nào được chấm. */
function statCells(st: ReturnType<typeof examScheduleStats>, memberCount: number | null) {
  const hasGraded = st.graded > 0
  return [
    memberCount,
    st.submitted,
    st.notSubmitted,
    st.graded,
    st.submitted - st.graded,
    st.average,
    st.max,
    st.min,
    hasGraded ? st.passed : null,
    hasGraded ? st.notPassed : null,
    st.passRate,
  ]
}

/**
 * 3 sheet: tổng hợp mỗi kỳ thi; điểm mỗi học viên mỗi kỳ thi (cả người chưa làm bài);
 * chi tiết từng câu của mỗi bài làm. Thứ tự kỳ thi giữ như danh sách đang lọc trên màn hình.
 */
export function buildExamExportSheets(
  exams: ExamExportInfo[],
  results: ExamExportSchedule[]
): ExportSheet[] {
  const resultById = new Map(results.map((r) => [r.scheduleId, r]))

  const examRows: CellValue[][] = []
  const allStudents: ExamExportStudent[] = []
  let totalMembers = 0
  exams.forEach((e, i) => {
    const r = resultById.get(e.scheduleId)
    const students = r?.students ?? []
    allStudents.push(...students)
    totalMembers += r?.memberCount ?? 0
    examRows.push([
      i + 1,
      e.className,
      e.topic,
      r?.courseTitle ?? '',
      r?.courseTitle ? (r.coursePathTitle ?? 'Cả khoá học') : '',
      excelDate(e.dateIso),
      e.startTime,
      e.endTime,
      e.durationMinutes,
      e.statusLabel,
      e.location ?? '',
      r?.classTeacherName ?? '',
      e.graderName ?? '',
      e.paperCodes,
      e.passScoreLabel,
      ...statCells(examScheduleStats(students), r?.memberCount ?? null),
    ])
  })
  const examTotals: CellValue[] = [
    null,
    `Tổng ${exams.length} kỳ thi`,
    ...Array<CellValue>(13).fill(null),
    ...statCells(examScheduleStats(allStudents), totalMembers),
  ]

  const scoreRows: CellValue[][] = []
  const scoreGroups: number[] = []
  const questionRows: CellValue[][] = []
  const questionGroups: number[] = []
  let submissionIndex = 0
  exams.forEach((e, examIndex) => {
    for (const s of resultById.get(e.scheduleId)?.students ?? []) {
      const sub = s.submission
      scoreGroups.push(examIndex)
      scoreRows.push([
        scoreRows.length + 1,
        s.fullName,
        s.employeeIdentifier ?? '',
        s.teamName ?? '',
        s.email ?? '',
        e.className,
        e.topic,
        excelDate(e.dateIso),
        s.isMember ? 'Có' : 'Không',
        sub ? SUBMISSION_STATUS_LABEL[sub.status] : NOT_STARTED_LABEL,
        excelDateTime(sub?.createdAt),
        sub?.paperCode ? `${sub.paperCode}${sub.paperTitle ? ` – ${sub.paperTitle}` : ''}` : '',
        sub?.totalScore ?? null,
        sub?.passScore ?? null,
        sub?.outcome ? OUTCOME_LABEL[sub.outcome] : '',
        sub?.graderName ?? '',
        excelDateTime(sub?.gradedAt),
        text(sub?.graderNote),
        sub?.fileUrl ? { text: sub.fileName ?? 'File bài làm', hyperlink: sub.fileUrl } : '',
        text(sub?.studentFeedback),
      ])
      if (!sub?.questions.length) continue
      submissionIndex += 1
      for (const q of sub.questions) {
        questionGroups.push(submissionIndex)
        questionRows.push([
          questionRows.length + 1,
          s.fullName,
          s.employeeIdentifier ?? '',
          e.className,
          e.topic,
          excelDate(e.dateIso),
          sub.paperCode ?? '',
          SUBMISSION_STATUS_LABEL[sub.status],
          q.order,
          q.type === 'mcq' ? 'Trắc nghiệm' : 'Tự luận',
          text(q.stem) || '(Câu không còn trong đề)',
          text(q.answer),
          q.correctAnswer ?? '',
          q.isCorrect === null ? '' : !q.answer.trim() ? 'Bỏ trống' : q.isCorrect ? 'Đúng' : 'Sai',
          q.score,
          q.maxScore,
          q.criteria.map((c) => CRITERIA_LABEL.get(c) ?? c).join(', '),
          text(q.note),
        ])
      }
    }
  })

  return [
    {
      name: 'Kỳ thi',
      title: 'TỔNG HỢP KỲ THI',
      columns: [
        { header: 'STT', width: 5, kind: 'index' },
        { header: 'Lớp', width: 24, kind: 'text', bold: true },
        { header: 'Kỳ thi', width: 26, kind: 'text' },
        { header: 'Khoá học', width: 20, kind: 'text' },
        { header: 'Lộ trình', width: 18, kind: 'text' },
        { header: 'Ngày thi', width: 11, kind: 'date' },
        { header: 'Bắt đầu', width: 8, kind: 'center' },
        { header: 'Kết thúc', width: 8, kind: 'center' },
        { header: 'Thời lượng (phút)', width: 10, kind: 'number' },
        { header: 'Trạng thái', width: 13, kind: 'center', tone: EXAM_STATUS_TONE },
        { header: 'Địa điểm', width: 20, kind: 'text' },
        { header: 'Giáo viên lớp', width: 22, kind: 'text' },
        { header: 'Người chấm', width: 22, kind: 'text' },
        { header: 'Đề thi', width: 30, kind: 'text' },
        { header: 'Ngưỡng đạt', width: 9, kind: 'center' },
        { header: 'Sĩ số lớp', width: 8, kind: 'number' },
        { header: 'Đã nộp', width: 8, kind: 'number' },
        { header: 'Chưa nộp', width: 8, kind: 'number' },
        { header: 'Đã chấm', width: 8, kind: 'number' },
        { header: 'Chờ chấm', width: 8, kind: 'number' },
        { header: 'Điểm TB (%)', width: 9, kind: 'decimal', bold: true },
        { header: 'Cao nhất (%)', width: 9, kind: 'number' },
        { header: 'Thấp nhất (%)', width: 9, kind: 'number' },
        { header: 'Đạt', width: 7, kind: 'number' },
        { header: 'Chưa đạt', width: 8, kind: 'number' },
        { header: 'Tỉ lệ đạt', width: 9, kind: 'percent', bold: true },
      ],
      frozenColumns: 2,
      rows: examRows,
      rowGroups: examRows.map((_, i) => i),
      totals: exams.length > 0 ? examTotals : undefined,
    },
    {
      name: 'Điểm thi',
      title: 'ĐIỂM THI CỦA HỌC VIÊN',
      note: 'Mỗi dòng là một học viên trong một kỳ thi, gồm cả người chưa làm bài',
      columns: [
        { header: 'STT', width: 5, kind: 'index' },
        { header: 'Họ và tên', width: 24, kind: 'text', bold: true },
        { header: 'Mã định danh', width: 10, kind: 'center' },
        { header: 'Team', width: 16, kind: 'clip' },
        { header: 'Email', width: 28, kind: 'clip' },
        { header: 'Lớp', width: 22, kind: 'clip' },
        { header: 'Kỳ thi', width: 26, kind: 'clip' },
        { header: 'Ngày thi', width: 11, kind: 'date' },
        { header: 'Còn trong lớp', width: 9, kind: 'center', tone: MEMBER_TONE },
        { header: 'Trạng thái bài', width: 13, kind: 'center', tone: SUBMISSION_TONE },
        { header: 'Thời điểm làm bài', width: 16, kind: 'datetime' },
        { header: 'Đề được gán', width: 18, kind: 'clip' },
        { header: 'Điểm (%)', width: 8, kind: 'number', bold: true },
        { header: 'Ngưỡng đạt', width: 9, kind: 'number' },
        { header: 'Kết quả', width: 12, kind: 'center', tone: OUTCOME_TONE },
        { header: 'Người chấm', width: 22, kind: 'clip' },
        { header: 'Ngày chấm', width: 16, kind: 'datetime' },
        { header: 'Nhận xét của người chấm', width: 46, kind: 'long' },
        { header: 'File bài làm', width: 28, kind: 'link' },
        { header: 'Phản hồi của học viên', width: 40, kind: 'long' },
      ],
      frozenColumns: 2,
      rows: scoreRows,
      rowGroups: scoreGroups,
    },
    {
      name: 'Chi tiết từng câu',
      title: 'CHI TIẾT TỪNG CÂU',
      note: 'Ô có nội dung dài được thu gọn — bấm vào ô để đọc đầy đủ',
      columns: [
        { header: 'STT', width: 5, kind: 'index' },
        { header: 'Họ và tên', width: 22, kind: 'text', bold: true },
        { header: 'Mã định danh', width: 10, kind: 'center' },
        { header: 'Lớp', width: 20, kind: 'clip' },
        { header: 'Kỳ thi', width: 24, kind: 'clip' },
        { header: 'Ngày thi', width: 11, kind: 'date' },
        { header: 'Đề', width: 13, kind: 'clip' },
        { header: 'Trạng thái bài', width: 13, kind: 'center', tone: SUBMISSION_TONE },
        { header: 'Câu', width: 5, kind: 'center' },
        { header: 'Loại câu', width: 11, kind: 'center' },
        { header: 'Nội dung câu hỏi', width: 44, kind: 'long' },
        { header: 'Câu trả lời', width: 56, kind: 'long' },
        { header: 'Đáp án đúng', width: 24, kind: 'long' },
        { header: 'Đúng / Sai', width: 10, kind: 'center', tone: CORRECT_TONE },
        { header: 'Điểm câu', width: 8, kind: 'number', bold: true },
        { header: 'Điểm tối đa', width: 8, kind: 'number' },
        { header: 'Tiêu chí đạt', width: 24, kind: 'text' },
        { header: 'Nhận xét', width: 40, kind: 'long' },
      ],
      frozenColumns: 2,
      rows: questionRows,
      rowGroups: questionGroups,
    },
  ]
}

// ── Ghi file ────────────────────────────────────────────────────────────────

const FONT = 'Arial'
const BRAND = 'FF006C49'
const BRAND_SOFT = 'FFE6F2EC'
const BAND = 'FFF5F8F6'
const BORDER = 'FFD5DFD9'
const GROUP_BORDER = 'FF9DB8AA'
const MUTED = 'FF6B7280'
const LINK = 'FF1D4ED8'
const TITLE_ROW = 1
const HEADER_ROW = 4

const TONE_STYLE: Record<Tone, { font: string; fill?: string }> = {
  success: { font: 'FF047857', fill: 'FFE3F5EC' },
  warning: { font: 'FFB45309', fill: 'FFFEF3C7' },
  danger: { font: 'FFB91C1C', fill: 'FFFDE8E8' },
  info: { font: 'FF1D4ED8', fill: 'FFE3ECFD' },
  muted: { font: MUTED },
}

const NUM_FMT: Partial<Record<ColumnKind, string>> = {
  decimal: '0.0',
  percent: '0.0%',
  date: 'dd/mm/yyyy',
  datetime: 'dd/mm/yyyy hh:mm',
}

/** Dòng cao tối đa ~5 dòng chữ — bài làm dài không kéo dòng cao cả màn hình. */
const LINE_HEIGHT_PT = 13
const MIN_ROW_HEIGHT = 20
const MAX_ROW_HEIGHT = 5 * LINE_HEIGHT_PT + 6

function estimateLines(value: CellValue, width: number): number {
  if (typeof value !== 'string' || !value) return 1
  const perLine = Math.max(4, Math.floor(width * 1.15))
  return value
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)), 0)
}

export function rowHeightFor(values: CellValue[], columns: ExportColumn[]): number {
  let lines = 1
  values.forEach((v, i) => {
    const col = columns[i]
    if (col && (col.kind === 'long' || col.kind === 'text')) {
      lines = Math.max(lines, estimateLines(v, col.width))
    }
  })
  return Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, lines * LINE_HEIGHT_PT + 6))
}

function horizontalFor(kind: ColumnKind): 'left' | 'center' | 'right' {
  if (kind === 'index' || kind === 'center' || kind === 'date' || kind === 'datetime') {
    return 'center'
  }
  if (kind === 'number' || kind === 'decimal' || kind === 'percent') return 'right'
  return 'left'
}

export async function downloadExamDataExcel(
  exams: ExamExportInfo[],
  results: ExamExportSchedule[],
  scopeNote: string
): Promise<{ examCount: number; studentRows: number }> {
  const sheets = buildExamExportSheets(exams, results)
  const mod = await import('exceljs')
  const ExcelJS = mod.default ?? mod
  const exportedAt = new Date()
  const wb = new ExcelJS.Workbook()
  wb.created = exportedAt

  const thin = (argb: string) => ({ style: 'thin' as const, color: { argb } })

  for (const sheet of sheets) {
    const { columns } = sheet
    const lastCol = columns.length
    const ws = wb.addWorksheet(sheet.name, {
      properties: { tabColor: { argb: BRAND } },
      views: [
        {
          state: 'frozen',
          xSplit: sheet.frozenColumns,
          ySplit: HEADER_ROW,
          showGridLines: false,
          zoomScale: 100,
        },
      ],
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}`,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      },
    })
    ws.columns = columns.map((c) => ({ width: c.width }))

    // Tiêu đề + dòng mô tả: gộp ngang hết bảng, nền nhạt cùng tông thương hiệu.
    ws.mergeCells(TITLE_ROW, 1, TITLE_ROW, lastCol)
    const title = ws.getCell(TITLE_ROW, 1)
    title.value = sheet.title
    title.font = { name: FONT, size: 15, bold: true, color: { argb: BRAND } }
    title.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
    ws.getRow(TITLE_ROW).height = 30

    ws.mergeCells(TITLE_ROW + 1, 1, TITLE_ROW + 1, lastCol)
    const subtitle = ws.getCell(TITLE_ROW + 1, 1)
    subtitle.value = [
      `Ngày xuất: ${format(exportedAt, 'dd/MM/yyyy HH:mm')}`,
      scopeNote,
      `${sheet.rows.length} dòng`,
      sheet.note,
    ]
      .filter(Boolean)
      .join('   ·   ')
    subtitle.font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } }
    subtitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
    ws.getRow(TITLE_ROW + 1).height = 18
    for (const r of [TITLE_ROW, TITLE_ROW + 1]) {
      ws.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_SOFT } }
    }
    ws.getRow(HEADER_ROW - 1).height = 8

    const headerRow = ws.getRow(HEADER_ROW)
    headerRow.values = columns.map((c) => c.header)
    headerRow.height = 34
    headerRow.eachCell((cell) => {
      cell.font = { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = {
        top: thin(BRAND),
        bottom: thin(BRAND),
        left: thin('FF2F8A66'),
        right: thin('FF2F8A66'),
      }
    })

    sheet.rows.forEach((values, i) => {
      const rowNumber = HEADER_ROW + 1 + i
      const row = ws.getRow(rowNumber)
      const group = sheet.rowGroups[i] ?? i
      const banded = group % 2 === 1
      const startsGroup = i > 0 && sheet.rowGroups[i - 1] !== group
      row.height = rowHeightFor(values, columns)

      columns.forEach((col, c) => {
        const value = values[c] ?? null
        const cell = row.getCell(c + 1)
        cell.value = value
        const tone = col.tone?.(value) ?? null
        const toneStyle = tone ? TONE_STYLE[tone] : null
        const isLink = value !== null && typeof value === 'object' && !(value instanceof Date)

        cell.font = {
          name: FONT,
          size: 10,
          bold: Boolean(col.bold || (toneStyle && tone !== 'muted')),
          italic: tone === 'muted',
          color: { argb: isLink ? LINK : (toneStyle?.font ?? 'FF1F2937') },
          underline: isLink,
        }
        const fill = toneStyle?.fill ?? (banded ? BAND : null)
        if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
        const numFmt = NUM_FMT[col.kind]
        if (numFmt) cell.numFmt = numFmt
        cell.alignment = {
          horizontal: horizontalFor(col.kind),
          vertical: col.kind === 'long' ? 'top' : 'middle',
          wrapText: col.kind === 'long' || col.kind === 'text',
        }
        cell.border = {
          top: thin(startsGroup ? GROUP_BORDER : BORDER),
          bottom: thin(BORDER),
          left: thin(BORDER),
          right: thin(BORDER),
        }
      })
    })

    const lastDataRow = HEADER_ROW + sheet.rows.length
    if (sheet.rows.length > 0) {
      ws.autoFilter = {
        from: { row: HEADER_ROW, column: 1 },
        to: { row: lastDataRow, column: lastCol },
      }
    }

    if (sheet.totals) {
      const row = ws.getRow(lastDataRow + 1)
      row.height = 22
      columns.forEach((col, c) => {
        const cell = row.getCell(c + 1)
        cell.value = sheet.totals?.[c] ?? null
        cell.font = { name: FONT, size: 10, bold: true, color: { argb: BRAND } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_SOFT } }
        const numFmt = NUM_FMT[col.kind]
        if (numFmt) cell.numFmt = numFmt
        cell.alignment = {
          horizontal: c === 1 ? 'left' : horizontalFor(col.kind),
          vertical: 'middle',
        }
        cell.border = { top: { style: 'double', color: { argb: BRAND } }, bottom: thin(BRAND) }
      })
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lich-thi-diem-so-${format(exportedAt, 'yyyyMMdd-HHmm')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)

  return { examCount: exams.length, studentRows: sheets[1]?.rows.length ?? 0 }
}
