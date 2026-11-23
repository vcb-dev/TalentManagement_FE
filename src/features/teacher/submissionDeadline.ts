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
  const fromExam = schedule.examQuestions?.submissionDeadline
  const submissionDeadline =
    roadmapDeadline ||
    fromExam ||
    buildSubmissionDeadlineIso(
      schedule.examQuestions?.endDateIso || schedule.dateIso,
      schedule.endTime || '23:59'
    )
  const endDateIso = roadmapDeadline
    ? dateIsoInVietnam(roadmapDeadline)
    : schedule.examQuestions?.endDateIso ||
      (fromExam ? dateIsoInVietnam(fromExam) : dateIsoInVietnam(submissionDeadline))
  return { endDateIso, submissionDeadline }
}

export function formatDeadlineRange(schedule: {
  dateIso: string
  startTime: string
  endTime: string
  examQuestions?: ScheduleExamQuestions | null
  roadmapItems?: Array<{ deadline?: string | null }>
}): string {
  const firstDeadline = schedule.roadmapItems?.[0]?.deadline
  if (firstDeadline) {
    const endD = dateIsoInVietnam(firstDeadline)
    if (endD !== schedule.dateIso) {
      return `${schedule.dateIso} (${schedule.startTime}) đến ${endD} (${timeHmInVietnam(firstDeadline)})`
    }
  }

  const { endDateIso, submissionDeadline } = resolveSubmissionDeadline(schedule)
  if (endDateIso !== schedule.dateIso) {
    return `${schedule.dateIso} (${schedule.startTime}) đến ${endDateIso} (${timeHmInVietnam(submissionDeadline)})`
  }
  return `${schedule.dateIso} · ${schedule.startTime} - ${schedule.endTime}`
}

export function isSameDayDeadline(dateIso: string, endDateIso: string | undefined | null): boolean {
  const end = (endDateIso || dateIso).trim()
  return end === dateIso
}
