import { format } from 'date-fns'
import {
  CHECKLIST_KIND_LABEL,
  type ChecklistAnswers,
  type ChecklistTemplateResponses,
} from './types'
import { formatChecklistAnswer, formatChecklistTime, personName } from './checklistAnswers'

const FONT = 'Arial'
const BRAND = 'FF006C49'
const BORDER = 'FFC9D6CF'
const MUTED = 'FF5F6B66'
const HEADER_ROW = 4

type AnswerColumn = { header: string; value: (answers: ChecklistAnswers) => string }

/**
 * Mỗi bản trả lời một dòng, mỗi câu hỏi một cột (như bảng tính của Google Form):
 * bỏ tiêu đề phần, lưới chọn tách mỗi dòng của lưới thành một cột "Câu [Dòng]".
 */
export function checklistResponsesToRows(data: ChecklistTemplateResponses): {
  header: string[]
  rows: string[][]
} {
  const { template } = data
  const answerColumns: AnswerColumn[] = template.questions.flatMap((q): AnswerColumn[] => {
    if (q.type === 'SECTION') return []
    if (q.type === 'GRID') {
      return (q.rows ?? []).map((row) => ({
        header: `${q.title} [${row.label}]`,
        value: (answers) => {
          const v = answers[q.id]
          const colId = typeof v === 'object' && !Array.isArray(v) ? v[row.id] : undefined
          return colId ? (q.options?.find((o) => o.id === colId)?.label ?? '') : ''
        },
      }))
    }
    return [{ header: q.title, value: (answers) => formatChecklistAnswer(q, answers[q.id]) }]
  })
  const header = [
    'STT',
    'Mã định danh',
    'Họ và tên',
    'Team',
    'Người điền',
    'Cập nhật lúc',
    ...answerColumns.map((c) => c.header),
  ]
  const rows: string[][] = []
  for (const row of data.rows) {
    for (const r of row.responses) {
      rows.push([
        String(rows.length + 1),
        row.subject.employeeIdentifier ?? '',
        personName(row.subject),
        row.subject.teamName ?? '',
        r.respondent.id === row.subject.id ? 'Tự điền' : personName(r.respondent),
        formatChecklistTime(r.updatedAt),
        ...answerColumns.map((c) => c.value(r.answers)),
      ])
    }
  }
  return { header, rows }
}

export async function downloadChecklistResponsesExcel(data: ChecklistTemplateResponses) {
  const { header, rows } = checklistResponsesToRows(data)
  const mod = await import('exceljs')
  const ExcelJS = mod.default ?? mod
  const exportedAt = new Date()
  const wb = new ExcelJS.Workbook()
  wb.created = exportedAt
  const ws = wb.addWorksheet('Câu trả lời', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: HEADER_ROW, showGridLines: false }],
  })
  ws.columns = header.map((_, i) => ({ width: [6, 13, 26, 18, 22, 17][i] ?? 30 }))

  ws.mergeCells(1, 1, 1, header.length)
  const title = ws.getCell(1, 1)
  title.value = data.template.title.toUpperCase()
  title.font = { name: FONT, size: 14, bold: true, color: { argb: BRAND } }
  title.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(1).height = 26

  ws.mergeCells(2, 1, 2, header.length)
  const subtitle = ws.getCell(2, 1)
  subtitle.value = `${CHECKLIST_KIND_LABEL[data.template.kind]}  ·  Ngày xuất: ${format(exportedAt, 'dd/MM/yyyy HH:mm')}  ·  ${rows.length} câu trả lời`
  subtitle.font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } }

  const border = {
    top: { style: 'thin', color: { argb: BORDER } },
    left: { style: 'thin', color: { argb: BORDER } },
    bottom: { style: 'thin', color: { argb: BORDER } },
    right: { style: 'thin', color: { argb: BORDER } },
  } as const

  const headerRow = ws.getRow(HEADER_ROW)
  headerRow.values = header
  headerRow.height = 36
  headerRow.eachCell((cell) => {
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = border
  })
  rows.forEach((values, i) => {
    const row = ws.getRow(HEADER_ROW + 1 + i)
    row.values = values
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: FONT, size: 10 }
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.border = border
    })
  })
  ws.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW + rows.length, column: header.length },
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `checklist-${format(exportedAt, 'yyyyMMdd-HHmm')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
