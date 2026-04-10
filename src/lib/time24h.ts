/**
 * Parse & chuẩn hóa giờ 24h dạng HH:mm (nhập tay).
 * Trả null nếu không hợp lệ.
 */
export function parseTime24h(value: string): string | null {
  const v = value.trim()
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(v)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Chuẩn hóa giờ từ API (08:00, 8:00, 08:00:00) → HH:mm hiển thị. */
export function normalizeTimeFromApi(value: string): string {
  const v = value.trim()
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(v)
  if (!m) return v
  const h = Number(m[1])
  const min = Number(m[2])
  if (Number.isNaN(h) || Number.isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return v
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Chỉ số, tối đa 2 ký tự — dùng khi đang gõ ô giờ/phút. */
export function digitsOnlyMax2(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 2)
}

/** Chuẩn hóa phần giờ 0–23 (sau blur). */
export function clampHourPart(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 2)
  if (d === '') return '00'
  let n = parseInt(d, 10)
  if (Number.isNaN(n)) return '00'
  n = Math.min(23, Math.max(0, n))
  return String(n).padStart(2, '0')
}

/** Chuẩn hóa phần phút 0–59 (sau blur). */
export function clampMinutePart(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 2)
  if (d === '') return '00'
  let n = parseInt(d, 10)
  if (Number.isNaN(n)) return '00'
  n = Math.min(59, Math.max(0, n))
  return String(n).padStart(2, '0')
}

/** Ghép HH:mm từ hai ô (đã clamp). */
export function joinTimeHm(hour: string, minute: string): string {
  return `${clampHourPart(hour)}:${clampMinutePart(minute)}`
}

/** Tách HH:mm → [hh, mm] cho form hai ô. */
export function splitTimeToParts(hhmm: string): [string, string] {
  const n = normalizeTimeFromApi(hhmm)
  const p = parseTime24h(n)
  if (!p) return ['00', '00']
  const [h, m] = p.split(':')
  return [h, m]
}
