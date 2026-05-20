/** Chuẩn hoá chuỗi ngày từ HR/CSV (vd. DD/MM/YYYY) sang yyyy-mm-dd cho `<input type="date">`. */
export function parseStoredDateToInputValue(s: string | null | undefined): string {
  if (s == null) return ''
  const t = String(s).trim()
  if (!t) return ''
  // Unix timestamp dạng milliseconds (13 chữ số) hoặc seconds (10 chữ số) — từ Lark sync
  if (/^\d{10,13}$/.test(t)) {
    const n = Number(t)
    const ms = t.length <= 10 ? n * 1000 : n
    const dt = new Date(ms)
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const d = Number(m[1])
    const mo = Number(m[2])
    const y = Number(m[3])
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y > 0) {
      const dt = new Date(y, mo - 1, d)
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
    }
  }
  return ''
}

/** Hiển thị ngày chỉ đọc kiểu DD/MM/YYYY (từ chuỗi HR hoặc yyyy-mm-dd). */
export function formatUserDateForReadonlyDisplay(s: string | null | undefined): string {
  if (s == null) return ''
  const t = String(s).trim()
  if (!t) return ''
  const iso = parseStoredDateToInputValue(t)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  return t
}
