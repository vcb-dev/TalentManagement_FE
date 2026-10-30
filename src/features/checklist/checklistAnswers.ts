import { format } from 'date-fns'
import {
  CHECKLIST_LIMITS,
  type ChecklistAnswers,
  type ChecklistAnswerValue,
  type ChecklistOption,
  type ChecklistPerson,
  type ChecklistQuestion,
  type ChecklistTemplateInput,
} from './types'

/** Id câu hỏi / lựa chọn — BE chỉ nhận `[A-Za-z0-9_-]{1,64}`, giữ nguyên khi sửa mẫu. */
export function newChecklistId(prefix: 'q' | 'o'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function personName(p: ChecklistPerson | null | undefined): string {
  return p?.fullNameLegal?.trim() || p?.email?.trim() || '—'
}

/** Bỏ dấu + chữ thường để ô tìm kiếm khớp "dat" với "Đạt". */
export function foldSearch(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd')
}

/** Số câu hỏi thật (không tính tiêu đề phần). */
export function countChecklistQuestions(questions: ChecklistQuestion[]): number {
  return questions.filter((q) => q.type !== 'SECTION').length
}

/** Số thứ tự hiển thị của từng câu hỏi (bỏ qua tiêu đề phần); tiêu đề phần không có số. */
export function checklistQuestionNumbers(questions: ChecklistQuestion[]): Map<string, number> {
  const out = new Map<string, number>()
  let n = 0
  for (const q of questions) if (q.type !== 'SECTION') out.set(q.id, ++n)
  return out
}

function isGridAnswer(v: ChecklistAnswerValue | undefined): v is Record<string, string> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function isAnswerEmpty(v: ChecklistAnswerValue | undefined): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  if (isGridAnswer(v)) return Object.values(v).every((c) => !c)
  return false
}

/** Câu bắt buộc chưa trả lời; lưới bắt buộc thì phải chọn đủ mọi dòng. */
export function missingRequiredQuestions(
  questions: ChecklistQuestion[],
  answers: ChecklistAnswers
): ChecklistQuestion[] {
  return questions.filter((q) => {
    if (!q.required || q.type === 'SECTION') return false
    const v = answers[q.id]
    if (q.type === 'GRID') {
      return !isGridAnswer(v) || (q.rows ?? []).some((r) => !v[r.id])
    }
    return isAnswerEmpty(v)
  })
}

/** Bỏ câu trống / câu không còn trong mẫu / dòng lưới để trống trước khi gửi. */
export function cleanChecklistAnswers(
  questions: ChecklistQuestion[],
  answers: ChecklistAnswers
): ChecklistAnswers {
  const out: ChecklistAnswers = {}
  for (const q of questions) {
    if (q.type === 'SECTION') continue
    const v = answers[q.id]
    if (v === undefined || isAnswerEmpty(v)) continue
    if (q.type === 'GRID' && isGridAnswer(v)) {
      const rows: Record<string, string> = {}
      for (const r of q.rows ?? []) if (v[r.id]) rows[r.id] = v[r.id]!
      out[q.id] = rows
      continue
    }
    out[q.id] = typeof v === 'string' ? v.trim() : v
  }
  return out
}

const REMOVED_OPTION = '(lựa chọn đã xoá)'

function optionLabel(options: ChecklistOption[] | undefined, id: string): string {
  return options?.find((o) => o.id === id)?.label ?? REMOVED_OPTION
}

/** Lưới: từng dòng đã chọn → `{ row, value }` (theo thứ tự dòng trong mẫu). */
export function gridAnswerLines(
  q: ChecklistQuestion,
  v: ChecklistAnswerValue | undefined
): { row: string; value: string }[] {
  if (!isGridAnswer(v)) return []
  return (q.rows ?? [])
    .filter((r) => v[r.id])
    .map((r) => ({ row: r.label, value: optionLabel(q.options, v[r.id]!) }))
}

/** Câu trả lời dạng chữ để hiển thị / xuất Excel; trống → `''`. */
export function formatChecklistAnswer(
  q: ChecklistQuestion,
  v: ChecklistAnswerValue | undefined
): string {
  if (isAnswerEmpty(v)) return ''
  switch (q.type) {
    case 'SINGLE_CHOICE':
      return typeof v === 'string' ? optionLabel(q.options, v) : String(v)
    case 'MULTIPLE_CHOICE':
      return Array.isArray(v) ? v.map((id) => optionLabel(q.options, id)).join(', ') : String(v)
    case 'SCALE':
      return `${String(v)} / ${q.scale?.max ?? 5}`
    case 'DATE': {
      const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) : null
      return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v)
    }
    case 'GRID':
      return gridAnswerLines(q, v)
        .map((l) => `${l.row}: ${l.value}`)
        .join('\n')
    default:
      return Array.isArray(v) ? v.join(', ') : String(v)
  }
}

export function formatChecklistTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : format(d, 'dd/MM/yyyy HH:mm')
}

function validateOptionList(
  options: ChecklistOption[] | undefined,
  label: string,
  noun: string
): string | null {
  if (!options?.length) return `${label}: cần ít nhất 1 ${noun}`
  const seen = new Set<string>()
  for (const o of options) {
    const text = o.label.trim()
    if (!text) return `${label}: có ${noun} đang để trống`
    const key = text.toLocaleLowerCase('vi')
    if (seen.has(key)) return `${label}: ${noun} "${text}" bị trùng`
    seen.add(key)
  }
  return null
}

/** Kiểm tra nhanh trước khi lưu mẫu (BE kiểm tra lại đầy đủ). `null` = hợp lệ. */
export function validateChecklistTemplate(input: ChecklistTemplateInput): string | null {
  if (!input.title.trim()) return 'Nhập tên checklist'
  if (input.title.trim().length > CHECKLIST_LIMITS.title) {
    return `Tên checklist tối đa ${CHECKLIST_LIMITS.title} ký tự`
  }
  if (countChecklistQuestions(input.questions) === 0) return 'Checklist cần ít nhất 1 câu hỏi'
  if (input.questions.length > CHECKLIST_LIMITS.questions) {
    return `Checklist tối đa ${CHECKLIST_LIMITS.questions} mục`
  }
  let questionNo = 0
  let sectionNo = 0
  for (const q of input.questions) {
    if (q.type === 'SECTION') {
      sectionNo += 1
      if (!q.title.trim()) return `Tiêu đề phần ${sectionNo}: nhập tên phần`
      continue
    }
    const label = `Câu ${++questionNo}`
    if (!q.title.trim()) return `${label}: nhập nội dung câu hỏi`
    const error =
      q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE'
        ? validateOptionList(q.options, label, 'lựa chọn')
        : q.type === 'GRID'
          ? (validateOptionList(q.rows, label, 'dòng') ??
            validateOptionList(q.options, label, 'cột'))
          : null
    if (error) return error
  }
  return null
}
