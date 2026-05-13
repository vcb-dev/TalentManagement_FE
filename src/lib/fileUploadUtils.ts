import { useAuthStore } from '@/stores/auth.store'

export const UPLOAD_ACCEPT_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const UPLOAD_MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8MB

/** Trả về thông báo lỗi nếu file không hợp lệ, null nếu OK. */
export function validateUploadFile(
  file: File,
  options?: {
    maxSizeBytes?: number
    accept?: readonly string[]
  }
): string | null {
  const maxSize = options?.maxSizeBytes ?? UPLOAD_MAX_SIZE_BYTES
  if (file.size > maxSize) {
    const mb = Math.round(maxSize / 1024 / 1024)
    return `File quá lớn — tối đa ${mb}MB (file hiện tại: ${(file.size / 1024 / 1024).toFixed(1)}MB)`
  }
  const accept = options?.accept
  if (accept?.length && !accept.includes(file.type)) {
    return `Định dạng không hỗ trợ — chỉ nhận ${accept.join(', ')}`
  }
  return null
}

/** Upload một file lên endpoint BE qua FormData, dùng Bearer token hiện tại. */
export async function uploadFileToBE<T = { url: string }>(
  endpoint: string,
  file: File
): Promise<T> {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  const token = useAuthStore.getState().accessToken
  const body = new FormData()
  body.append('file', file)
  const res = await fetch(`${base}${endpoint}`, {
    method: 'POST',
    body,
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Tải file thất bại — vui lòng thử lại')
  }
  return res.json() as Promise<T>
}
