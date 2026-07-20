import type { EssayCriteriaWeights } from '@/features/exam-papers/criteria'
import { DEFAULT_ESSAY_CRITERIA_WEIGHTS } from '@/features/exam-papers/criteria'

/** Chuẩn hóa thời lượng & hiển thị khoảng thi (theo đề đã gán hoặc endTime trong DB). */

export function parseHmToMinutes(hm: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hm.trim())
  if (!m) return null
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10)
}

export function formatMinutesAsHm(total: number): string {
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(wrapped / 60)
  const mm = wrapped % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Cộng phút vào giờ HH:mm (wrap trong ngày). */
export function addMinutesToHm(startHm: string, addMin: number): string {
  const start = parseHmToMinutes(startHm)
  if (start === null) return startHm.trim()
  return formatMinutesAsHm(start + addMin)
}

export function inferDurationMinutesFromStartEnd(startHm: string, endHm: string): number | null {
  const a = parseHmToMinutes(startHm)
  const b = parseHmToMinutes(endHm)
  if (a === null || b === null) return null
  if (b >= a) return b - a
  return 24 * 60 - a + b
}

/**
 * Lấy thời lượng từ JSON đề (hỗ trợ duration dạng number/string, hay chuỗi JSON stringify).
 */
export function extractDurationMinutes(examQuestions: unknown): number | undefined {
  if (examQuestions == null) return undefined

  let parsed: unknown = examQuestions
  if (typeof parsed === 'string') {
    const t = parsed.trim()
    if (!t) return undefined
    try {
      parsed = JSON.parse(t) as unknown
    } catch {
      return undefined
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined

  const d = (parsed as { duration?: unknown }).duration
  if (typeof d === 'number' && Number.isFinite(d) && d > 0) return Math.round(d)
  if (typeof d === 'string') {
    const n = Number.parseInt(d.trim(), 10)
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

/**
 * Thang điểm chấm tự luận của bank JSON cũ (`examQuestions.criteriaWeights`) — manager có thể
 * chỉnh qua màn "Lịch thi & Người chấm"; mặc định 40/50/10 nếu chưa cấu hình.
 */
export function extractCriteriaWeights(examQuestions: unknown): EssayCriteriaWeights {
  let parsed: unknown = examQuestions
  if (typeof parsed === 'string') {
    const t = parsed.trim()
    if (!t) return DEFAULT_ESSAY_CRITERIA_WEIGHTS
    try {
      parsed = JSON.parse(t) as unknown
    } catch {
      return DEFAULT_ESSAY_CRITERIA_WEIGHTS
    }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return DEFAULT_ESSAY_CRITERIA_WEIGHTS
  }
  const w = (parsed as { criteriaWeights?: unknown }).criteriaWeights
  if (typeof w !== 'object' || w === null) return DEFAULT_ESSAY_CRITERIA_WEIGHTS
  const record = w as Record<string, unknown>
  const ly_thuyet = record.ly_thuyet
  const thuc_te = record.thuc_te
  const trinh_bay = record.trinh_bay
  if (
    typeof ly_thuyet === 'number' &&
    typeof thuc_te === 'number' &&
    typeof trinh_bay === 'number'
  ) {
    return { ly_thuyet, thuc_te, trinh_bay }
  }
  return DEFAULT_ESSAY_CRITERIA_WEIGHTS
}

/** Ưu tiên payload từ all-exams; nếu không có duration thì lấy từ schedules nhúng trong GET /classes. */
export function mergeScheduleExamQuestions(
  fromAllExams: unknown,
  fromClassScheduleEmbed: unknown
): unknown {
  if (extractDurationMinutes(fromAllExams) != null) return fromAllExams ?? null
  if (extractDurationMinutes(fromClassScheduleEmbed) != null) return fromClassScheduleEmbed ?? null
  return fromAllExams ?? fromClassScheduleEmbed ?? null
}

function examPayloadHasQuestions(examQuestions: unknown): boolean {
  let parsed: unknown = examQuestions
  if (typeof parsed === 'string') {
    const t = parsed.trim()
    if (!t) return false
    try {
      parsed = JSON.parse(t) as unknown
    } catch {
      return false
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return false
  const q = (parsed as { questions?: unknown }).questions
  return Array.isArray(q) && q.length > 0
}

/**
 * Thời lượng phút ưu tiên: đề schedule → đề mẫu lớp (gộp merge) → khoảng end-start **chỉ khi chưa có đề** (tránh `endTime` là suất dài cả buổi).
 */
export function getExamDurationMinutes(
  examQuestions: unknown,
  startTime: string,
  fallbackEndHm?: string | null,
  classLevelExamQuestions?: unknown
): number {
  const merged = mergeScheduleExamQuestions(examQuestions, classLevelExamQuestions)
  const extracted =
    extractDurationMinutes(examQuestions) ??
    extractDurationMinutes(classLevelExamQuestions) ??
    extractDurationMinutes(merged)

  if (extracted != null) return extracted

  const hasQs =
    examPayloadHasQuestions(examQuestions) ||
    examPayloadHasQuestions(classLevelExamQuestions) ||
    examPayloadHasQuestions(merged)

  if (!hasQs && fallbackEndHm) {
    const inferred = inferDurationMinutesFromStartEnd(startTime, fallbackEndHm)
    if (inferred != null && inferred > 0) return inferred
  }

  return 120
}

export function examEpochBounds(e: {
  dateIso: string
  startTime: string
  endTime?: string | null
  examQuestions?: unknown
  classExamQuestions?: unknown
}): { startMs: number; endMs: number } {
  const startMs = new Date(`${e.dateIso}T${e.startTime}:00`).getTime()
  const dur = getExamDurationMinutes(
    e.examQuestions,
    e.startTime,
    e.endTime ?? null,
    e.classExamQuestions
  )
  const endMs = startMs + dur * 60_000
  return { startMs, endMs }
}

export type ExamLiveStatus = 'upcoming' | 'live' | 'past'

export function examLiveStatus(
  nowMs: number,
  e: {
    dateIso: string
    startTime: string
    endTime?: string | null
    examQuestions?: unknown
    classExamQuestions?: unknown
  }
): ExamLiveStatus {
  const { startMs, endMs } = examEpochBounds(e)
  if (nowMs < startMs) return 'upcoming'
  if (nowMs < endMs) return 'live'
  return 'past'
}
