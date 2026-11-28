const VN_TZ = 'Asia/Ho_Chi_Minh'
const VN_OFFSET = '+07:00'

export type ScheduleExamQuestions = {
  gradingType?: string
  endDateIso?: string
  submissionDeadline?: string
}

/** ISO deadline từ ngày + HH:mm (giờ Việt Nam). */
export function buildSubmissionDeadlineIso(dateIso: string, timeHm: string): string {
  return new Date(`${dateIso}T${timeHm}:00${VN_OFFSET}`).toISOString()
}

export function dateIsoInVietnam(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: VN_TZ })
}

export function timeHmInVietnam(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: VN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function readExamQuestionsObject(examQuestions: unknown): ScheduleExamQuestions | null {
  let parsed: unknown = examQuestions
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      return null
    }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  return parsed as ScheduleExamQuestions
}

/**
 * Hạn nộp tường minh (giáo viên đặt/gia hạn, có thể sang ngày khác) lưu trong
 * `examQuestions.submissionDeadline` / `endDateIso`. Trả về null nếu lịch không có —
 * khi đó caller tự tính theo giờ bắt đầu + thời lượng như lịch thi thường.
 */
export function explicitSubmissionDeadlineIso(schedule: {
  endTime?: string | null
  examQuestions?: unknown
}): string | null {
  const eq = readExamQuestionsObject(schedule.examQuestions)
  if (!eq) return null
  if (eq.submissionDeadline && !Number.isNaN(new Date(eq.submissionDeadline).getTime())) {
    return new Date(eq.submissionDeadline).toISOString()
  }
  const endDateIso = eq.endDateIso?.trim()
  if (endDateIso) return buildSubmissionDeadlineIso(endDateIso, schedule.endTime || '23:59')
  return null
}

export function resolveSubmissionDeadline(schedule: {
  dateIso: string
  startTime: string
  endTime: string
  examQuestions?: ScheduleExamQuestions | null
  roadmapItems?: Array<{ deadline?: string | null }>
}): { endDateIso: string; submissionDeadline: string } {
  const roadmapDeadline = schedule.roadmapItems?.find((item) => item.deadline)?.deadline ?? null
  const submissionDeadline =
    roadmapDeadline ||
    explicitSubmissionDeadlineIso(schedule) ||
    buildSubmissionDeadlineIso(schedule.dateIso, schedule.endTime || '23:59')
  const endDateIso = roadmapDeadline
    ? dateIsoInVietnam(roadmapDeadline)
    : schedule.examQuestions?.endDateIso?.trim() || dateIsoInVietnam(submissionDeadline)
  return { endDateIso, submissionDeadline }
}

export function formatDeadlineRange(schedule: {
  dateIso: string
  startTime: string
  endTime: string
  examQuestions?: ScheduleExamQuestions | null
  roadmapItems?: Array<{ deadline?: string | null }>
}): string {
  const { submissionDeadline } = resolveSubmissionDeadline(schedule)
  const close = timeHmInVietnam(submissionDeadline)
  const closeDate = dateIsoInVietnam(submissionDeadline)
  if (closeDate === schedule.dateIso) {
    return `${formatDateIsoVi(schedule.dateIso)} · ${schedule.startTime} → ${close}`
  }
  return `${schedule.startTime} ${formatDateIsoVi(schedule.dateIso)} → ${close} ${formatDateIsoVi(closeDate)}`
}

export function formatDateIsoVi(dateIso: string): string {
  const [y, m, d] = dateIso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : dateIso
}

const WEEKDAYS_VI = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

export function weekdayVi(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? '' : (WEEKDAYS_VI[d.getUTCDay()] ?? '')
}

export function addDaysToDateIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return dateIso
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function vnEpochMs(dateIso: string, timeHm: string): number {
  return new Date(`${dateIso}T${timeHm}:00${VN_OFFSET}`).getTime()
}

export function formatWindowLength(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const totalMin = Math.round(ms / 60_000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const minutes = totalMin % 60
  const parts: string[] = []
  if (days) parts.push(`${days} ngày`)
  if (hours) parts.push(`${hours} giờ`)
  if (minutes && !days) parts.push(`${minutes} phút`)
  return parts.join(' ') || 'dưới 1 phút'
}

export type SubmissionWindowStatus = 'upcoming' | 'open' | 'closed'

export type SubmissionWindow = {
  openDateIso: string
  openTime: string
  closeDateIso: string
  closeTime: string
  openMs: number
  closeMs: number
}

export function submissionWindowOf(schedule: {
  dateIso: string
  startTime: string
  endTime: string
  examQuestions?: ScheduleExamQuestions | null
  roadmapItems?: Array<{ deadline?: string | null }>
  submissionDeadline?: string | null
}): SubmissionWindow {
  const deadlineIso =
    schedule.submissionDeadline || resolveSubmissionDeadline(schedule).submissionDeadline
  return {
    openDateIso: schedule.dateIso,
    openTime: schedule.startTime,
    closeDateIso: dateIsoInVietnam(deadlineIso),
    closeTime: timeHmInVietnam(deadlineIso),
    openMs: vnEpochMs(schedule.dateIso, schedule.startTime),
    closeMs: new Date(deadlineIso).getTime(),
  }
}

export function submissionWindowStatus(
  nowMs: number,
  w: Pick<SubmissionWindow, 'openMs' | 'closeMs'>
): SubmissionWindowStatus {
  if (nowMs < w.openMs) return 'upcoming'
  if (nowMs < w.closeMs) return 'open'
  return 'closed'
}

export function isSameDayDeadline(dateIso: string, endDateIso: string | undefined | null): boolean {
  const end = (endDateIso || dateIso).trim()
  return end === dateIso
}
