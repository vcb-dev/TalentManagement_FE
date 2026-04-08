/** URL hiển thị ảnh: đường dẫn tuyệt đối API (/uploads/...) hoặc URL đầy đủ từ đồng bộ. */
export function resolvePublicAssetUrl(ref: string | null | undefined): string | undefined {
  const t = ref?.trim()
  if (!t) return undefined
  if (/^https?:\/\//i.test(t)) return t
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
  if (t.startsWith('/')) return `${base}${t}`
  return `${base}/${t}`
}
