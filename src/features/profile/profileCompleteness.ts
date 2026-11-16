import type { MeUserDisplayKey, MeUserSelf } from '@/features/profile/userSelf.types'

export type ProfileMissingField = { key: MeUserDisplayKey; label: string }

/** Mục nhân sự tự điền được mà HR cần có — thiếu thì nhắc sau khi đăng nhập. */
const REQUIRED_PROFILE_FIELDS: ProfileMissingField[] = [
  { key: 'teamLeaderUserId', label: 'Trưởng nhóm phụ trách' },
  { key: 'phonePrimary', label: 'Điện thoại' },
  { key: 'birthDate', label: 'Ngày sinh' },
  { key: 'identityNumber', label: 'Số CCCD' },
  { key: 'attachmentIdFront', label: 'Ảnh CCCD mặt trước' },
  { key: 'attachmentIdBack', label: 'Ảnh CCCD mặt sau' },
  { key: 'addressCurrent', label: 'Địa chỉ hiện tại' },
  { key: 'emergencyContact1', label: 'Liên hệ khẩn cấp' },
  { key: 'bankAccountInfo', label: 'Tài khoản ngân hàng' },
]

/**
 * Chỉ nhân viên / giáo viên mới có trưởng nhóm phụ trách — trưởng nhóm, quản lý, BOD, HR không bắt
 * buộc (không có ai phù hợp để chọn thì sẽ bị nhắc mãi).
 */
export function roleNeedsTeamLeader(role: string | null | undefined): boolean {
  return role === 'MEMBER' || role === 'TEACHER'
}

/** Các mục bắt buộc còn trống, theo thứ tự hiển thị. `role` = vai trò app (auth store). */
export function missingProfileFields(
  u: MeUserSelf | null | undefined,
  role: string | null | undefined
): ProfileMissingField[] {
  if (!u) return []
  return REQUIRED_PROFILE_FIELDS.filter(({ key }) => {
    if (key === 'teamLeaderUserId' && !roleNeedsTeamLeader(role)) return false
    return String(u[key] ?? '').trim() === ''
  })
}

/** "A, B, C +2" — gọn trong một dòng. */
export function summarizeMissingFields(fields: ProfileMissingField[], max = 3): string {
  const shown = fields.slice(0, max).map((f) => f.label)
  const rest = fields.length - shown.length
  return rest > 0 ? `${shown.join(', ')} +${rest}` : shown.join(', ')
}
