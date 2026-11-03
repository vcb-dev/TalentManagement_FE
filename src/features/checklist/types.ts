/** Khớp BE `src/checklists/checklist-form.util.ts` + `checklists.dto.ts`. */
export type ChecklistKind = 'SELF' | 'LEADER'

export const CHECKLIST_KIND_LABEL: Record<ChecklistKind, string> = {
  SELF: 'Nhân sự tự điền',
  LEADER: 'Trưởng nhóm điền',
}

export type ChecklistQuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'SCALE'
  | 'DATE'
  /** Lưới chọn: mỗi dòng chọn 1 cột (như Google Form). */
  | 'GRID'
  /** Tiêu đề phần — chia form thành các phần, không có câu trả lời. */
  | 'SECTION'

export const CHECKLIST_QUESTION_TYPE_LABEL: Record<ChecklistQuestionType, string> = {
  SINGLE_CHOICE: 'Chọn một',
  MULTIPLE_CHOICE: 'Chọn nhiều',
  SHORT_TEXT: 'Trả lời ngắn',
  LONG_TEXT: 'Đoạn văn',
  SCALE: 'Thang điểm',
  DATE: 'Ngày',
  GRID: 'Lưới chọn',
  SECTION: 'Tiêu đề phần',
}

export const CHECKLIST_QUESTION_TYPES = Object.keys(
  CHECKLIST_QUESTION_TYPE_LABEL
) as ChecklistQuestionType[]

export const CHECKLIST_LIMITS = {
  questions: 100,
  options: 50,
  title: 300,
  description: 2000,
  optionLabel: 300,
  scaleLabel: 100,
  shortText: 500,
  longText: 5000,
} as const

export type ChecklistOption = { id: string; label: string }

export type ChecklistScale = {
  min: 0 | 1
  max: number
  minLabel: string | null
  maxLabel: string | null
}

export type ChecklistQuestion = {
  id: string
  type: ChecklistQuestionType
  title: string
  description: string | null
  /** SECTION luôn `false`; GRID bắt buộc = phải chọn đủ mọi dòng. */
  required: boolean
  /** SINGLE_CHOICE / MULTIPLE_CHOICE: các lựa chọn; GRID: các cột. */
  options?: ChecklistOption[]
  /** Chỉ có ở GRID: các dòng. */
  rows?: ChecklistOption[]
  scale?: ChecklistScale
}

/**
 * SINGLE_CHOICE = id lựa chọn, MULTIPLE_CHOICE = mảng id, SCALE = số, DATE = `yyyy-MM-dd`,
 * GRID = `{ [id dòng]: id cột }`, còn lại = chữ.
 */
export type ChecklistAnswerValue = string | string[] | number | Record<string, string>
export type ChecklistAnswers = Record<string, ChecklistAnswerValue>

export type ChecklistPerson = {
  id: string
  fullNameLegal: string | null
  email: string | null
}

export type ChecklistSubject = ChecklistPerson & {
  employeeIdentifier: string | null
  teamName: string | null
}

export type ChecklistTemplate = {
  id: string
  title: string
  description: string | null
  kind: ChecklistKind
  isActive: boolean
  questions: ChecklistQuestion[]
  teams: { id: string; name: string }[]
  responseCount: number
  createdAt: string
  updatedAt: string
}

export type ChecklistTemplateInput = {
  title: string
  description: string | null
  kind: ChecklistKind
  questions: ChecklistQuestion[]
  teamIds: string[]
}

export type ChecklistFillTemplate = Pick<
  ChecklistTemplate,
  'id' | 'title' | 'description' | 'kind' | 'isActive' | 'questions'
>

export type ChecklistFillItem = {
  template: ChecklistFillTemplate
  /** `false` = mẫu đã ngừng / không còn áp dụng cho team — chỉ xem lại bản đã điền. */
  editable: boolean
  response: { answers: ChecklistAnswers; updatedAt: string } | null
}

export type ChecklistResponse = {
  id: string
  respondent: ChecklistPerson
  answers: ChecklistAnswers
  createdAt: string
  updatedAt: string
}

export type LeaderChecklistEmployee = ChecklistSubject & {
  templateCount: number
  answeredCount: number
  lastUpdatedAt: string | null
}

export type LeaderEmployeeChecklists = {
  employee: ChecklistSubject
  items: ChecklistFillItem[]
}

export type AdminChecklistSubject = ChecklistSubject & { teamLeader: ChecklistPerson | null }

export type ChecklistTemplateResponses = {
  template: ChecklistTemplate
  rows: { subject: AdminChecklistSubject; inScope: boolean; responses: ChecklistResponse[] }[]
}

export type EmployeeChecklists = {
  employee: AdminChecklistSubject
  items: { template: ChecklistFillTemplate; applicable: boolean; responses: ChecklistResponse[] }[]
}
