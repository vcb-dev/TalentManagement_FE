import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'

export async function fetchCompanyLandingPublic(): Promise<Record<string, unknown> | null> {
  const res = await apiClient.get<{ content: Record<string, unknown> | null }>(
    '/company-landing/public'
  )
  return res.data.content ?? null
}

export async function putCompanyLandingContent(
  content: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await apiClient.put<{ content: Record<string, unknown> }>('/company-landing', {
    content,
  })
  return res.data.content
}

/** Ảnh landing — `multipart/form-data`, field `file`. Trả về đường dẫn `/uploads/company-landing/...`. */
export async function uploadCompanyLandingImage(file: File): Promise<{ url: string }> {
  if (isMockApiEnabled()) {
    await new Promise((r) => setTimeout(r, 350))
    return { url: '/uploads/company-landing/mock.jpg' }
  }
  const body = new FormData()
  body.append('file', file)
  const res = await apiClient.post<unknown>('/company-landing/upload-image', body, {
    transformRequest: [
      (data, headers) => {
        if (data instanceof FormData) {
          const h = headers as Record<string, string | undefined>
          delete h['Content-Type']
        }
        return data
      },
    ],
  })
  const url = pickCompanyLandingUploadUrl(res.data)
  if (!url.startsWith('/uploads/company-landing/')) {
    throw new Error('Phản hồi upload không hợp lệ — thiếu URL trong /uploads/company-landing/')
  }
  const leaf = url.split('/').pop() ?? ''
  if (!/\.(jpe?g|png|gif|webp)$/i.test(leaf)) {
    throw new Error(
      'URL ảnh từ máy chủ không đầy đủ (thiếu phần mở rộng). Mở DevTools → Network → upload-image → xem Response.'
    )
  }
  return { url }
}

/** Hỗ trợ body phẳng hoặc lồng `{ data: { url } }`. */
function pickCompanyLandingUploadUrl(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const o = payload as Record<string, unknown>
  if (typeof o.url === 'string') return o.url.trim()
  if (o.data !== null && typeof o.data === 'object') {
    const inner = (o.data as { url?: unknown }).url
    if (typeof inner === 'string') return inner.trim()
  }
  return ''
}
