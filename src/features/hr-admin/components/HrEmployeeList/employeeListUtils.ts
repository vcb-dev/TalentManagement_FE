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

const LEVEL_META: Record<
  EmployeeLevel,
  { tierClass: string; label: string }
> = {
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

/**
 * Thứ hạng thành tích theo số sao (0–6): Đồng → Vàng → Kim cương.
 * Dùng chung thẻ danh sách / sheet (không phụ thuộc API thêm).
 */
export function memberStarRank(star: number): { label: string; badgeClass: string } {
  const s = Math.min(6, Math.max(0, star))
  if (s >= 5) {
    return {
      label: 'Hạng Kim cương',
      badgeClass:
        'bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 text-white shadow-sm ring-1 ring-cyan-300/50',
    }
  }
  if (s >= 3) {
    return {
      label: 'Hạng Vàng',
      badgeClass:
        'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 text-amber-950 shadow-sm ring-1 ring-amber-500/45',
    }
  }
  return {
    label: 'Hạng Đồng',
    badgeClass:
      'bg-gradient-to-br from-orange-800 via-amber-900 to-orange-950 text-amber-100 shadow-sm ring-1 ring-orange-700/40',
  }
}

/** Màu avatar theo vai trò (giống mock). */
export function avatarClassForRole(role: Role): string {
  switch (role) {
    case 'LEADER':
      return 'bg-sky-100 text-sky-900'
    case 'MANAGER':
      return 'bg-amber-100 text-amber-900'
    case 'HR_ADMIN':
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
    case 'HR_ADMIN':
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
      return 'TN KPI'
    case 'MANAGER':
      return 'QL'
    case 'HR_ADMIN':
      return 'HR'
    case 'TEACHER':
      return 'Chấm thi'
    case 'BOD':
      return 'BOD'
    default:
      return role
  }
}
