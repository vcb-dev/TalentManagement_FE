/** URL hiển thị ảnh: URL đầy đủ, `/uploads/...` (ghép host API khi cần), hoặc đường dẫn FE tĩnh (vd. `/Image_VCB/...`). */
export function resolvePublicAssetUrl(ref: string | null | undefined): string | undefined {
  const t = ref?.trim()
  if (!t) return undefined
  if (/^https?:\/\//i.test(t)) return t
  const path = t.startsWith('/') ? t : `/${t}`
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
  if (path.startsWith('/uploads/')) {
    // Dev: dùng URL tương đối cùng origin với Vite (:5173) để proxy `/uploads` luôn trúng BE.
    // Tránh lỗi preview khi trang chạy localhost:5173 nhưng img gọi thẳng host/port API khác (tunnel, firewall, v.v.).
    if (import.meta.env.DEV) return path
    if (base) return `${base}${path}`
    return path
  }
  return path
}
