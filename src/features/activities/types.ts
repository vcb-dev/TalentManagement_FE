export type CompanyActivity = {
  id: string
  title: string
  location: string
  /** ISO 8601. */
  startAt: string
  endAt: string
}

export type ActivityInput = Omit<CompanyActivity, 'id'>

/** `month` từ 1 đến 12. */
export type ActivityMonth = {
  year: number
  month: number
}
