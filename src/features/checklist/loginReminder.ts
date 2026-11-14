import { create } from 'zustand'
import { countChecklistQuestions } from './checklistAnswers'
import type { ChecklistFillItem, LeaderChecklistEmployee } from './types'

/**
 * Cờ "vừa đăng nhập" — bật ở màn login khi đăng nhập thành công (mật khẩu hoặc Google), tắt sau
 * khi `ChecklistLoginReminder` đã kiểm tra xong. Chỉ nằm trong bộ nhớ: F5 hay mở lại tab khi còn
 * phiên cookie thì không nhắc lại.
 */
type ChecklistReminderStore = {
  pending: boolean
  request: () => void
  clear: () => void
}

export const useChecklistReminderStore = create<ChecklistReminderStore>((set) => ({
  pending: false,
  request: () => set({ pending: true }),
  clear: () => set({ pending: false }),
}))

export type PendingSelfChecklist = { id: string; title: string; questionCount: number }

export type PendingChecklists = {
  /** Checklist tự điền còn áp dụng mà chưa điền. */
  self: PendingSelfChecklist[]
  /** Số nhân sự mình phụ trách còn ít nhất một checklist trưởng nhóm chưa điền. */
  leaderEmployeeCount: number
}

/** `null` = không còn gì phải điền. Dữ liệu chưa có / lỗi coi như không có gì. */
export function pendingChecklists(
  mine: ChecklistFillItem[] | undefined,
  leaderRows: LeaderChecklistEmployee[] | undefined
): PendingChecklists | null {
  const self = (mine ?? [])
    .filter((item) => item.editable && !item.response)
    .map((item) => ({
      id: item.template.id,
      title: item.template.title,
      questionCount: countChecklistQuestions(item.template.questions),
    }))
  const leaderEmployeeCount = (leaderRows ?? []).filter(
    (row) => row.answeredCount < row.templateCount
  ).length
  if (self.length === 0 && leaderEmployeeCount === 0) return null
  return { self, leaderEmployeeCount }
}

/** Trang mở khi bấm "Điền ngay" — `search` của route `/checklists`. */
export type ChecklistReminderTarget = { tab: 'mine' | 'leader'; templateId?: string }

export type ChecklistReminderCopy = {
  title: string
  description: string
  /** Ưu tiên checklist của chính mình; chỉ còn đúng một bản thì mở thẳng form. */
  primary: ChecklistReminderTarget
}

export function checklistReminderCopy(p: PendingChecklists): ChecklistReminderCopy {
  const self = p.self.length
  const leader = p.leaderEmployeeCount
  const only = self === 1 ? p.self[0] : undefined
  const primary: ChecklistReminderTarget = only
    ? { tab: 'mine', templateId: only.id }
    : self > 1
      ? { tab: 'mine' }
      : { tab: 'leader' }
  if (self > 0 && leader > 0) {
    return {
      title: 'Bạn còn checklist chưa điền',
      description: 'Gồm checklist của bạn và checklist cho nhân sự bạn phụ trách.',
      primary,
    }
  }
  if (self > 0) {
    return {
      title: `Bạn còn ${self} checklist chưa điền`,
      description:
        'Vui lòng điền checklist dưới đây. Bạn có thể sửa lại câu trả lời bất cứ lúc nào.',
      primary,
    }
  }
  return {
    title: `Còn ${leader} nhân sự chưa được bạn điền checklist`,
    description:
      'Checklist trưởng nhóm đánh giá nhân sự bạn phụ trách — nhân sự không thấy bản này.',
    primary,
  }
}
