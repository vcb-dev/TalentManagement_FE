import { create } from 'zustand'
import type { ProfileMissingField } from '@/features/profile/profileCompleteness'
import { countChecklistQuestions } from './checklistAnswers'
import type { ChecklistFillItem, LeaderChecklistEmployee } from './types'

/**
 * Cờ "vừa đăng nhập" — bật ở màn login khi đăng nhập thành công (mật khẩu hoặc Google), tắt sau
 * khi `ChecklistLoginReminder` đã kiểm tra xong (checklist + hồ sơ cá nhân). Chỉ nằm trong bộ nhớ:
 * F5 hay mở lại tab khi còn phiên cookie thì không nhắc lại.
 */
/** `all` = checklist + hồ sơ (lúc đăng nhập); `checklists` = chỉ checklist (nhắc lại sau khi sửa hồ sơ). */
export type ReminderScope = 'all' | 'checklists'

/**
 * Bấm sang hồ sơ từ hộp nhắc khi còn checklist chưa điền → hoãn nhắc checklist:
 * `going` (đang chuyển trang) → `onProfile` (đã vào /profile) → nhắc lại khi lưu hồ sơ hoặc rời trang.
 */
export type DeferredChecklistReminder = 'none' | 'going' | 'onProfile'

type ChecklistReminderStore = {
  pending: boolean
  scope: ReminderScope
  deferred: DeferredChecklistReminder
  /** Vừa đăng nhập — nhắc tất cả, bỏ mọi lần hoãn cũ. */
  request: () => void
  clear: () => void
  deferChecklists: () => void
  markOnProfile: () => void
  /** Đang hoãn thì nhắc lại phần checklist; không hoãn thì bỏ qua. */
  resumeChecklists: () => void
  reset: () => void
}

export const useChecklistReminderStore = create<ChecklistReminderStore>((set, get) => ({
  pending: false,
  scope: 'all',
  deferred: 'none',
  request: () => set({ pending: true, scope: 'all', deferred: 'none' }),
  clear: () => set({ pending: false }),
  deferChecklists: () => set({ deferred: 'going' }),
  markOnProfile: () => {
    if (get().deferred === 'going') set({ deferred: 'onProfile' })
  },
  resumeChecklists: () => {
    if (get().deferred === 'none') return
    set({ pending: true, scope: 'checklists', deferred: 'none' })
  },
  reset: () => set({ pending: false, scope: 'all', deferred: 'none' }),
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

/** Mọi việc cần nhắc ngay sau khi đăng nhập — gộp chung một hộp. */
export type LoginReminder = {
  checklists: PendingChecklists | null
  /** Mục hồ sơ bắt buộc còn trống (`missingProfileFields`). */
  profileMissing: ProfileMissingField[]
}

/** `null` = không có gì để nhắc. */
export function loginReminder(
  checklists: PendingChecklists | null,
  profileMissing: ProfileMissingField[]
): LoginReminder | null {
  if (!checklists && profileMissing.length === 0) return null
  return { checklists, profileMissing }
}

export type LoginReminderTarget =
  | { to: '/checklists'; search: ChecklistReminderTarget }
  | { to: '/profile' }

export type LoginReminderCopy = {
  title: string
  description: string
  /** Checklist trước (có hạn chấm); chỉ còn hồ sơ thì mở trang hồ sơ. */
  primary: LoginReminderTarget
  primaryLabel: string
}

export function loginReminderCopy(r: LoginReminder): LoginReminderCopy {
  const missing = r.profileMissing.length
  if (r.checklists) {
    const copy = checklistReminderCopy(r.checklists)
    const primary: LoginReminderTarget = { to: '/checklists', search: copy.primary }
    if (missing === 0) return { ...copy, primary, primaryLabel: 'Điền ngay' }
    return {
      title: 'Bạn còn việc cần hoàn thành',
      description: 'Gồm checklist chưa điền và hồ sơ cá nhân còn thiếu thông tin.',
      primary,
      primaryLabel: 'Điền checklist',
    }
  }
  return {
    title: 'Cập nhật hồ sơ cá nhân',
    description: `Hồ sơ của bạn còn thiếu ${missing} mục. Vui lòng bổ sung để HR có thông tin đầy đủ.`,
    primary: { to: '/profile' },
    primaryLabel: 'Cập nhật ngay',
  }
}
