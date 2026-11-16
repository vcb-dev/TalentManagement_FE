import { beforeEach, describe, expect, it } from 'vitest'
import {
  checklistReminderCopy,
  loginReminder,
  loginReminderCopy,
  pendingChecklists,
  useChecklistReminderStore,
} from '../loginReminder'
import type { ChecklistFillItem, ChecklistQuestion, LeaderChecklistEmployee } from '../types'

const Q = (id: string, type: ChecklistQuestion['type'] = 'SHORT_TEXT'): ChecklistQuestion => ({
  id,
  type,
  title: id,
  description: null,
  required: false,
})

function item(
  title: string,
  opts: { editable?: boolean; answered?: boolean; questions?: ChecklistQuestion[] } = {}
): ChecklistFillItem {
  return {
    template: {
      id: `t-${title}`,
      title,
      description: null,
      kind: 'SELF',
      isActive: true,
      questions: opts.questions ?? [],
    },
    editable: opts.editable ?? true,
    response: opts.answered ? { answers: {}, updatedAt: '2026-11-01T00:00:00Z' } : null,
  }
}

function employee(
  id: string,
  templateCount: number,
  answeredCount: number
): LeaderChecklistEmployee {
  return {
    id,
    fullNameLegal: id,
    email: null,
    employeeIdentifier: null,
    teamName: null,
    templateCount,
    answeredCount,
    lastUpdatedAt: null,
  }
}

describe('pendingChecklists', () => {
  it('trả null khi không còn gì phải điền / chưa có dữ liệu', () => {
    expect(pendingChecklists(undefined, undefined)).toBeNull()
    expect(pendingChecklists([], [])).toBeNull()
    expect(
      pendingChecklists(
        [item('A', { answered: true })],
        [employee('e1', 1, 1), employee('e2', 0, 0)]
      )
    ).toBeNull()
  })

  it('chỉ lấy checklist tự điền còn áp dụng mà chưa điền; đếm câu hỏi bỏ tiêu đề phần', () => {
    const p = pendingChecklists(
      [
        item('A', { questions: [Q('s', 'SECTION'), Q('q1'), Q('q2')] }),
        item('B', { answered: true }),
        item('C', { editable: false }),
      ],
      []
    )
    expect(p).toEqual({
      self: [{ id: 't-A', title: 'A', questionCount: 2 }],
      leaderEmployeeCount: 0,
    })
  })

  it('đếm nhân sự còn thiếu ít nhất một checklist trưởng nhóm', () => {
    const p = pendingChecklists(undefined, [
      employee('e1', 2, 1),
      employee('e2', 1, 0),
      employee('e3', 1, 1),
    ])
    expect(p).toEqual({ self: [], leaderEmployeeCount: 2 })
  })
})

describe('checklistReminderCopy', () => {
  const one = { id: 't-1', title: 'Nhân sự tự đánh giá', questionCount: 11 }
  const two = { id: 't-2', title: 'B', questionCount: 3 }

  it('đúng một checklist cá nhân → mở thẳng form đó', () => {
    const c = checklistReminderCopy({ self: [one], leaderEmployeeCount: 0 })
    expect(c.title).toBe('Bạn còn 1 checklist chưa điền')
    expect(c.primary).toEqual({ tab: 'mine', templateId: 't-1' })
  })

  it('nhiều checklist cá nhân → mở danh sách tab mine', () => {
    const c = checklistReminderCopy({ self: [one, two], leaderEmployeeCount: 0 })
    expect(c.title).toBe('Bạn còn 2 checklist chưa điền')
    expect(c.primary).toEqual({ tab: 'mine' })
  })

  it('chỉ checklist trưởng nhóm → mở tab leader', () => {
    const c = checklistReminderCopy({ self: [], leaderEmployeeCount: 3 })
    expect(c.title).toContain('3 nhân sự')
    expect(c.primary).toEqual({ tab: 'leader' })
  })

  it('cả hai → ưu tiên checklist của chính mình', () => {
    const c = checklistReminderCopy({ self: [one], leaderEmployeeCount: 4 })
    expect(c.title).toBe('Bạn còn checklist chưa điền')
    expect(c.primary).toEqual({ tab: 'mine', templateId: 't-1' })
  })
})

describe('useChecklistReminderStore — hoãn nhắc checklist khi sang hồ sơ', () => {
  const store = () => useChecklistReminderStore.getState()
  const snapshot = () => {
    const { pending, scope, deferred } = store()
    return { pending, scope, deferred }
  }
  beforeEach(() => store().reset())

  it('đăng nhập → nhắc tất cả', () => {
    store().request()
    expect(snapshot()).toEqual({ pending: true, scope: 'all', deferred: 'none' })
  })

  it('sang hồ sơ → vào /profile → lưu hồ sơ thì nhắc lại riêng checklist, đúng một lần', () => {
    store().request()
    store().clear()
    store().deferChecklists()
    store().markOnProfile()
    expect(snapshot()).toEqual({ pending: false, scope: 'all', deferred: 'onProfile' })
    store().resumeChecklists()
    expect(snapshot()).toEqual({ pending: true, scope: 'checklists', deferred: 'none' })
    store().clear()
    store().resumeChecklists()
    expect(store().pending).toBe(false)
  })

  it('không hoãn thì lưu hồ sơ không nhắc gì', () => {
    store().resumeChecklists()
    expect(snapshot()).toEqual({ pending: false, scope: 'all', deferred: 'none' })
  })

  it('đăng nhập lại / đăng xuất bỏ lần hoãn cũ', () => {
    store().deferChecklists()
    store().request()
    expect(store().deferred).toBe('none')
    store().deferChecklists()
    store().reset()
    expect(snapshot()).toEqual({ pending: false, scope: 'all', deferred: 'none' })
  })
})

describe('loginReminder / loginReminderCopy', () => {
  const checklists = { self: [{ id: 't-1', title: 'A', questionCount: 2 }], leaderEmployeeCount: 0 }
  const missing = [
    { key: 'teamLeaderUserId', label: 'Trưởng nhóm phụ trách' },
    { key: 'birthDate', label: 'Ngày sinh' },
  ] as const

  it('không còn checklist lẫn mục hồ sơ → null', () => {
    expect(loginReminder(null, [])).toBeNull()
  })

  it('chỉ checklist → giữ nguyên nội dung cũ, nút "Điền ngay"', () => {
    const c = loginReminderCopy(loginReminder(checklists, [])!)
    expect(c.title).toBe('Bạn còn 1 checklist chưa điền')
    expect(c.primary).toEqual({ to: '/checklists', search: { tab: 'mine', templateId: 't-1' } })
    expect(c.primaryLabel).toBe('Điền ngay')
  })

  it('chỉ hồ sơ thiếu → mở trang hồ sơ', () => {
    const c = loginReminderCopy(loginReminder(null, [...missing])!)
    expect(c.title).toBe('Cập nhật hồ sơ cá nhân')
    expect(c.description).toContain('thiếu 2 mục')
    expect(c.primary).toEqual({ to: '/profile' })
    expect(c.primaryLabel).toBe('Cập nhật ngay')
  })

  it('nhắc lại sau khi sửa hồ sơ chỉ còn phần checklist', () => {
    const c = loginReminderCopy(loginReminder(checklists, [])!)
    expect(c.primaryLabel).toBe('Điền ngay')
  })

  it('cả hai → gộp một hộp, nút chính vẫn là checklist', () => {
    const c = loginReminderCopy(loginReminder(checklists, [...missing])!)
    expect(c.title).toBe('Bạn còn việc cần hoàn thành')
    expect(c.primary).toEqual({ to: '/checklists', search: { tab: 'mine', templateId: 't-1' } })
    expect(c.primaryLabel).toBe('Điền checklist')
  })
})
