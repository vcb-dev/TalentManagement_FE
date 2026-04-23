export type TeacherClassTrack = 'tap_su' | 'biet_viec' | 'duoc_viec' | 'dong_gop_ket_qua' | 'tuong'

export type TeacherClassRow = {
  id: string
  title: string
  periodBadge: string
  examLine: string
  memberCount: number
  metaIcon: 'trending' | 'school' | 'star' | 'crown' | 'target'
  accent: 'primary' | 'amber' | 'emerald' | 'violet' | 'rose'
  track: TeacherClassTrack
}
