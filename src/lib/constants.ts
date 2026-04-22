export const ROLES = ['MEMBER', 'LEADER', 'MANAGER', 'HR', 'TEACHER', 'BOD'] as const

export type RoleConst = (typeof ROLES)[number]

export const LEVELS = ['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong'] as const

export type LevelCode = (typeof LEVELS)[number]

export const LEVEL_LABELS: Record<LevelCode, string> = {
  tap_su: 'Tập sự',
  biet_viec: 'Biết việc',
  duoc_viec: 'Được việc',
  dong_gop_ket_qua: 'Đóng góp kết quả',
  tuong: 'Tướng',
}

export const STARS_PER_LEVEL: Record<LevelCode, number> = {
  tap_su: 6,
  biet_viec: 6,
  duoc_viec: 6,
  dong_gop_ket_qua: 6,
  tuong: 6,
}

export const EXAM_RESULTS = ['DAT', 'BAO_LUU', 'CHO_HOC_LAI', 'CHIA_TAY'] as const

export type ExamResultCode = (typeof EXAM_RESULTS)[number]
