/** Khớp `dateMatchesMonthYear` ở BE. */
export function isoDateMatchesMonthYear(
  iso: string | null | undefined,
  month?: number,
  year?: number,
  day?: number
): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso?.trim() ?? '')
  if (!m) return false
  if (day !== undefined && Number(m[3]) !== day) return false
  if (month !== undefined && Number(m[2]) !== month) return false
  if (year !== undefined && Number(m[1]) !== year) return false
  return true
}
