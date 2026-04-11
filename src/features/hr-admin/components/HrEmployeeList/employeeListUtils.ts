import type { EmployeeEntity } from '@/features/hr-admin/api'
import type { EmployeeLevel } from '@/types/employee'
import type { Role } from '@/types/auth'

export function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase()
  const first = p[0]!
  const last = p[p.length - 1]!
  const a = first[0] ?? '?'
  const b = last[0] ?? '?'
  return (a + b).toUpperCase()
}

export function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 6)
}

/** Hien thi ten phong ban (API departmentName). */
export function employeeDeptDisplay(employee: EmployeeEntity): string {
  const n = employee.departmentName?.trim()
  return n && n.length > 0 ? n : 'Không có'
}

/** Hien thi ten nhom (teamNames, cach nhau boi dau phay). */
export function employeeTeamsDisplay(employee: EmployeeEntity): string {
  const parts = (employee.teamNames ?? []).map((t) => t.trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Không có'
}

const LEVEL_META: Record<EmployeeLevel, { tierClass: string; label: string }> = {
  tap_su: {
    tierClass:
      'bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-sm ring-1 ring-amber-400/40',
    label: '🥉 Tập sự',
  },
  biet_viec: {
    tierClass:
      'bg-gradient-to-br from-slate-600 to-violet-700 text-white shadow-sm ring-1 ring-violet-400/30',
    label: '🥈 Biết việc',
  },
  duoc_viec: {
    tierClass:
      'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-sm ring-1 ring-violet-400/35',
    label: '🥇 Được việc',
  },
  dong_gop_ket_qua: {
    tierClass: 'bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/20',
    label: '💎 Đóng góp KQ',
  },
  tuong: {
    tierClass:
      'bg-gradient-to-br from-primary via-sky-600 to-accent text-white shadow-lg shadow-[0_12px_32px_-8px_hsl(var(--accent)_/_0.45)]',
    label: '👑 Tướng',
  },
}

export function levelMeta(level: EmployeeLevel) {
  return LEVEL_META[level] ?? LEVEL_META.tap_su
}

/** Nhãn cấp độ trên thẻ danh sách (không emoji, gọn cho pill). */
const LEVEL_PILL_TEXT: Record<EmployeeLevel, string> = {
  tap_su: 'Tập sự',
  biet_viec: 'Biết việc',
  duoc_viec: 'Được việc',
  dong_gop_ket_qua: 'Đóng góp KQ',
  tuong: 'Tướng',
}

export function levelPillText(level: EmployeeLevel): string {
  return LEVEL_PILL_TEXT[level] ?? LEVEL_PILL_TEXT.tap_su
}

/** Màu avatar theo vai trò (giống mock). */
export function avatarClassForRole(role: Role): string {
  switch (role) {
    case 'LEADER':
      return 'bg-sky-100 text-sky-900'
    case 'MANAGER':
      return 'bg-amber-100 text-amber-900'
    case 'HR':
    case 'TEACHER':
    case 'BOD':
      return 'bg-primary/8 text-primary'
    default:
      return 'bg-emerald-100 text-emerald-800'
  }
}

export function statusDotClass(status: EmployeeEntity['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-500'
    case 'RESERVED':
    case 'PROBATION':
      return 'bg-amber-500'
    case 'INACTIVE':
      return 'bg-slate-400'
    default:
      return 'bg-slate-400'
  }
}

export function statusLabelVi(status: EmployeeEntity['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'Hoạt động'
    case 'INACTIVE':
      return 'Ngừng HĐ'
    case 'PROBATION':
      return 'Thử việc'
    case 'RESERVED':
      return 'Bảo lưu'
    default:
      return status
  }
}

export function roleBadgeClass(role: Role): string {
  switch (role) {
    case 'LEADER':
      return 'border border-sky-300/70 bg-sky-100 text-sky-950 shadow-sm ring-1 ring-sky-400/25'
    case 'MANAGER':
      return 'border border-amber-300/70 bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-400/25'
    case 'HR':
    case 'TEACHER':
    case 'BOD':
      return 'border border-violet-300/60 bg-violet-500/12 text-violet-900 ring-1 ring-violet-500/15'
    default:
      return 'border border-emerald-200/80 bg-emerald-500/10 text-emerald-900 shadow-sm ring-1 ring-emerald-500/15'
  }
}

export function roleShortLabel(role: Role): string {
  switch (role) {
    case 'MEMBER':
      return 'NV'
    case 'LEADER':
      return 'Leader'
    case 'MANAGER':
      return 'QL'
    case 'HR':
      return 'HR'
    case 'TEACHER':
      return 'Chấm thi'
    case 'BOD':
      return 'BOD'
    default:
      return role
  }
}
