/** URL hiển thị ảnh: đường dẫn tuyệt đối API (/uploads/...) hoặc URL đầy đủ từ đồng bộ. */
export function resolvePublicAssetUrl(ref: string | null | undefined): string | undefined {
  const t = ref?.trim()
  if (!t) return undefined
  if (/^https?:\/\//i.test(t)) return t
  const path = t.startsWith('/') ? t : `/${t}`
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
  if (base) return `${base}${path}`
  // Dev: vite proxy `/uploads` → BE so `<img src="/uploads/...">` on :5173 resolves correctly
  if (import.meta.env.DEV && path.startsWith('/uploads/')) return path
  return path
}
