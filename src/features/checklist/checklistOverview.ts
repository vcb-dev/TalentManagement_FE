import { checklistQuestionNumbers, isAnswerEmpty } from './checklistAnswers'
import type {
  AdminChecklistSubject,
  ChecklistAnswerValue,
  ChecklistOption,
  ChecklistQuestion,
  ChecklistResponse,
  ChecklistTemplateResponses,
} from './types'

/** Một nhân sự trong phạm vi tổng quan + bản trả lời mới nhất về họ (nếu có). */
export type OverviewRow = { subject: AdminChecklistSubject; response: ChecklistResponse | null }

/** Giá trị lọc "chưa có team" / "chưa gán trưởng nhóm". */
export const OVERVIEW_NONE = '__none'

/** Câu trả lời không còn khớp mẫu: lựa chọn đã xoá, hoặc điểm nằm ngoài thang sau khi sửa thang. */
export const REMOVED_OPTION_ID = '__removed'
const REMOVED_OPTION_LABEL = '(lựa chọn đã xoá)'
const OUT_OF_SCALE_LABEL = '(điểm ngoài thang hiện tại)'

/** Chọn một tối đa bấy nhiêu lựa chọn thì vẽ biểu đồ tròn; nhiều hơn khó đọc → thanh ngang. */
export const DONUT_MAX_OPTIONS = 6

/**
 * Biểu đồ cột: từ MIN tới MAX đáp án thì cột dọc. Ít hơn (1–2 cột lơ thơ giữa khung rộng) hoặc
 * nhiều hơn thì cột ngang.
 */
export const COLUMN_MIN_OPTIONS = 3
export const COLUMN_MAX_OPTIONS = 5

/** Thang điểm từ 3 mức luôn cột dọc (mức điểm là trục số, nhãn ngắn); còn lại theo số đáp án. */
export function prefersColumns(stat: { kind: string; options: unknown[] }): boolean {
  const n = stat.options.length
  if (stat.kind === 'scale') return n >= COLUMN_MIN_OPTIONS
  return n >= COLUMN_MIN_OPTIONS && n <= COLUMN_MAX_OPTIONS
}

/** Quá bấy nhiêu lựa chọn thì mặc định chỉ hiện `LONG_LIST_PREVIEW` lựa chọn nhiều người chọn nhất. */
export const LONG_LIST_MAX = 12
export const LONG_LIST_PREVIEW = 10

/** Xếp lựa chọn theo số người giảm dần (bằng nhau giữ thứ tự trong form). */
export function byCountDesc<T extends { count: number }>(items: T[]): T[] {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => b.item.count - a.item.count || a.i - b.i)
    .map((x) => x.item)
}

export function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

function latestResponse(responses: ChecklistResponse[]): ChecklistResponse | null {
  let best: ChecklistResponse | null = null
  for (const r of responses) if (!best || r.updatedAt > best.updatedAt) best = r
  return best
}

/**
 * Mẫu đang dùng: nhân sự đang thuộc team áp dụng (người đã rời team không tính).
 * Mẫu đã ngừng: BE không trả danh sách team → chỉ người đã có câu trả lời.
 * Mẫu LEADER có thể có nhiều bản về một người (đổi trưởng nhóm) → lấy bản sửa gần nhất.
 */
export function overviewRows(data: ChecklistTemplateResponses): OverviewRow[] {
  return data.rows
    .filter((r) => (data.template.isActive ? r.inScope : r.responses.length > 0))
    .map((r) => ({ subject: r.subject, response: latestResponse(r.responses) }))
}

export function teamKey(s: AdminChecklistSubject): string {
  return s.teamName?.trim() || OVERVIEW_NONE
}

export function leaderKey(s: AdminChecklistSubject): string {
  return s.teamLeader?.id ?? OVERVIEW_NONE
}

/** Tháng / năm vào làm từ `YYYY-MM-DD`; thiếu hoặc sai định dạng → null. */
export function startMonthYear(s: AdminChecklistSubject): { month: number; year: number } | null {
  const m = /^(\d{4})-(\d{2})/.exec(s.startDateWork ?? '')
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null
}

/** Các năm vào làm có trong danh sách, mới nhất trước. */
export function startYears(rows: OverviewRow[]): number[] {
  const years = new Set<number>()
  for (const r of rows) {
    const start = startMonthYear(r.subject)
    if (start) years.add(start.year)
  }
  return [...years].sort((a, b) => b - a)
}

/** Số nhân sự vào làm theo từng tháng 1–12 (của `year`, hoặc mọi năm nếu null). */
export function startMonthCounts(rows: OverviewRow[], year: number | null): number[] {
  const counts = Array.from({ length: 12 }, () => 0)
  for (const r of rows) {
    const start = startMonthYear(r.subject)
    if (start && (year === null || start.year === year)) counts[start.month - 1]! += 1
  }
  return counts
}

export function startFilterLabel(month: number | null, year: number | null): string {
  if (month !== null && year !== null) return `Tháng ${month}/${year}`
  if (year !== null) return `Năm ${year}`
  if (month !== null) return `Tháng ${month} (mọi năm)`
  return 'Mọi thời gian'
}

/** `startMonth` / `startYear` lọc độc lập (như lọc nhân viên): chọn tháng mà bỏ trống năm = tháng đó của mọi năm. */
export type OverviewFilter = {
  team: string | null
  leader: string | null
  startMonth?: number | null
  startYear?: number | null
}

export function filterOverviewRows(rows: OverviewRow[], f: OverviewFilter): OverviewRow[] {
  const byStart = f.startMonth != null || f.startYear != null
  return rows.filter((r) => {
    if (f.team !== null && teamKey(r.subject) !== f.team) return false
    if (f.leader !== null && leaderKey(r.subject) !== f.leader) return false
    if (!byStart) return true
    const start = startMonthYear(r.subject)
    return (
      start !== null &&
      (f.startMonth == null || start.month === f.startMonth) &&
      (f.startYear == null || start.year === f.startYear)
    )
  })
}

export type OverviewGroup = { key: string; label: string; total: number; done: number }

function groupLabel(row: OverviewRow, by: 'team' | 'leader'): string {
  if (by === 'team') return row.subject.teamName?.trim() || 'Chưa có team'
  const leader = row.subject.teamLeader
  return leader
    ? leader.fullNameLegal?.trim() || leader.email?.trim() || '—'
    : 'Chưa gán trưởng nhóm'
}

/** Tiến độ điền theo team / trưởng nhóm — nhóm có tỷ lệ thấp nhất xếp trước để dễ đôn đốc. */
export function overviewGroups(rows: OverviewRow[], by: 'team' | 'leader'): OverviewGroup[] {
  const groups = new Map<string, OverviewGroup>()
  for (const r of rows) {
    const key = by === 'team' ? teamKey(r.subject) : leaderKey(r.subject)
    let g = groups.get(key)
    if (!g) {
      g = { key, label: groupLabel(r, by), total: 0, done: 0 }
      groups.set(key, g)
    }
    g.total += 1
    if (r.response) g.done += 1
  }
  return [...groups.values()].sort(
    (a, b) => a.done / a.total - b.done / b.total || a.label.localeCompare(b.label, 'vi')
  )
}

export type OptionStat = { id: string; label: string; count: number; subjectIds: string[] }

type StatBase = { question: ChecklistQuestion; number: number }

export type QuestionStat =
  | (StatBase & {
      kind: 'choice'
      multiple: boolean
      options: OptionStat[]
      /** Số bản có trả lời câu này. */
      answered: number
      /** Người đã điền checklist nhưng bỏ trống câu này. */
      skippedIds: string[]
    })
  | (StatBase & {
      kind: 'grid'
      columns: ChecklistOption[]
      rows: { id: string; label: string; options: OptionStat[]; answered: number }[]
    })
  | (StatBase & {
      kind: 'scale'
      /** Các mức của thang; điểm ngoài thang (thang bị sửa hẹp lại) gom vào `REMOVED_OPTION_ID`. */
      options: OptionStat[]
      answered: number
      /** Số bản có điểm nằm trong thang hiện tại — `average` chỉ tính trên các bản này. */
      scored: number
      average: number | null
    })
  /**
   * Câu tự luận / ngày: không thống kê nội dung. `subjectIds` = người trả lời, bản sửa gần nhất
   * trước — thẻ tổng quan hiện vài câu đầu, danh sách đầy đủ cùng thứ tự.
   */
  | (StatBase & { kind: 'text'; answered: number; subjectIds: string[] })

export type OverviewSection = {
  id: string
  title: string | null
  description: string | null
  stats: QuestionStat[]
}

function optionBuckets(options: ChecklistOption[] | undefined): Map<string, OptionStat> {
  const out = new Map<string, OptionStat>()
  for (const o of options ?? [])
    out.set(o.id, { id: o.id, label: o.label, count: 0, subjectIds: [] })
  return out
}

function addTo(
  buckets: Map<string, OptionStat>,
  optionId: string,
  subjectId: string,
  removedLabel = REMOVED_OPTION_LABEL
) {
  let b = buckets.get(optionId)
  if (!b) {
    // Câu trả lời cũ trỏ tới lựa chọn admin đã xoá khỏi mẫu.
    b = buckets.get(REMOVED_OPTION_ID)
    if (!b) {
      b = { id: REMOVED_OPTION_ID, label: removedLabel, count: 0, subjectIds: [] }
      buckets.set(REMOVED_OPTION_ID, b)
    }
  }
  b.count += 1
  b.subjectIds.push(subjectId)
}

function bucketList(buckets: Map<string, OptionStat>): OptionStat[] {
  return [...buckets.values()].filter((b) => b.id !== REMOVED_OPTION_ID || b.count > 0)
}

type Filled = { subjectId: string; value: ChecklistAnswerValue | undefined; updatedAt: string }

function questionStat(q: ChecklistQuestion, number: number, filled: Filled[]): QuestionStat {
  const answeredIds = filled.filter((f) => !isAnswerEmpty(f.value)).map((f) => f.subjectId)
  switch (q.type) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE': {
      const buckets = optionBuckets(q.options)
      const skippedIds: string[] = []
      for (const f of filled) {
        if (isAnswerEmpty(f.value)) skippedIds.push(f.subjectId)
        else if (Array.isArray(f.value)) for (const id of f.value) addTo(buckets, id, f.subjectId)
        else if (typeof f.value === 'string') addTo(buckets, f.value, f.subjectId)
      }
      return {
        kind: 'choice',
        question: q,
        number,
        multiple: q.type === 'MULTIPLE_CHOICE',
        options: bucketList(buckets),
        answered: answeredIds.length,
        skippedIds,
      }
    }
    case 'GRID':
      return {
        kind: 'grid',
        question: q,
        number,
        columns: q.options ?? [],
        rows: (q.rows ?? []).map((row) => {
          const buckets = optionBuckets(q.options)
          let answered = 0
          for (const f of filled) {
            const v = f.value
            const colId =
              typeof v === 'object' && v !== null && !Array.isArray(v) ? v[row.id] : undefined
            if (!colId) continue
            answered += 1
            addTo(buckets, colId, f.subjectId)
          }
          return { id: row.id, label: row.label, options: bucketList(buckets), answered }
        }),
      }
    case 'SCALE': {
      const min = q.scale?.min ?? 1
      const max = q.scale?.max ?? 5
      const buckets = new Map<string, OptionStat>()
      for (let v = min; v <= max; v++) {
        const label =
          v === min && q.scale?.minLabel
            ? `${v} · ${q.scale.minLabel}`
            : v === max && q.scale?.maxLabel
              ? `${v} · ${q.scale.maxLabel}`
              : String(v)
        buckets.set(String(v), { id: String(v), label, count: 0, subjectIds: [] })
      }
      let sum = 0
      let answered = 0
      let scored = 0
      for (const f of filled) {
        if (typeof f.value !== 'number') continue
        answered += 1
        const b = buckets.get(String(f.value))
        if (!b) {
          addTo(buckets, REMOVED_OPTION_ID, f.subjectId, OUT_OF_SCALE_LABEL)
          continue
        }
        b.count += 1
        b.subjectIds.push(f.subjectId)
        sum += f.value
        scored += 1
      }
      return {
        kind: 'scale',
        question: q,
        number,
        options: [...buckets.values()],
        answered,
        scored,
        average: scored > 0 ? sum / scored : null,
      }
    }
    default:
      return {
        kind: 'text',
        question: q,
        number,
        answered: answeredIds.length,
        subjectIds: filled
          .filter((f) => !isAnswerEmpty(f.value))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map((f) => f.subjectId),
      }
  }
}

/**
 * Thống kê từng câu hỏi trên các bản đã điền, chia theo tiêu đề phần của form.
 * Câu đứng trước tiêu đề phần đầu tiên gom vào một phần không tên; phần không có câu nào bị bỏ.
 */
export function overviewSections(
  questions: ChecklistQuestion[],
  rows: OverviewRow[]
): OverviewSection[] {
  const numbers = checklistQuestionNumbers(questions)
  const filled = rows.filter((r) => r.response)
  const sections: OverviewSection[] = []
  let current: OverviewSection | null = null
  for (const q of questions) {
    if (q.type === 'SECTION') {
      current = { id: q.id, title: q.title, description: q.description, stats: [] }
      sections.push(current)
      continue
    }
    if (!current) {
      current = { id: '__intro', title: null, description: null, stats: [] }
      sections.push(current)
    }
    current.stats.push(
      questionStat(
        q,
        numbers.get(q.id) ?? 0,
        filled.map((r) => ({
          subjectId: r.subject.id,
          value: r.response!.answers[q.id],
          updatedAt: r.response!.updatedAt,
        }))
      )
    )
  }
  return sections.filter((s) => s.stats.length > 0)
}

/** Số bản được điền hoặc sửa trong `days` ngày gần nhất. */
export function countUpdatedSince(rows: OverviewRow[], days: number, now = new Date()): number {
  const since = now.getTime() - days * 24 * 60 * 60 * 1000
  return rows.filter((r) => r.response && new Date(r.response.updatedAt).getTime() >= since).length
}

/** Ngắt nhãn trục thành tối đa `maxLines` dòng ~`maxChars` ký tự; dòng cuối thừa thì thêm "…". */
export function wrapChartLabel(label: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of label.trim().split(/\s+/)) {
    if (!line) line = word
    else if (`${line} ${word}`.length <= maxChars) line = `${line} ${word}`
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  const tail = kept[maxLines - 1]!
  kept[maxLines - 1] = `${tail.length >= maxChars ? tail.slice(0, maxChars - 1) : tail}…`
  return kept
}
