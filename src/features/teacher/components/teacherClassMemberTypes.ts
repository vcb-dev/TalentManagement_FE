export type ClassMemberRow = {
  id: string
  name: string
  email: string
  isMakeup?: boolean
  makeupScheduleIds?: string[]
  /** `null` — chưa có kết quả thi trong lớp */
  examResult: string | null
}
