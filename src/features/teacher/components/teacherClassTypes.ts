export type TeacherClassTrack = 'tap_su' | 'biet_viec'

export type TeacherClassRow = {
  id: string
  title: string
  periodBadge: string
  examLine: string
  memberCount: number
  metaIcon: 'trending' | 'school'
  accent: 'primary' | 'amber'
  track: TeacherClassTrack
}
