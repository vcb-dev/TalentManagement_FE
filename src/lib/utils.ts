import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { z } from 'zod'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function safeParse<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  data: unknown,
  context: string
): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error(`[API Contract Violation] ${context}`, result.error.flatten())
    if (import.meta.env.PROD) {
      // Sentry.captureException(result.error, { extra: { context } })
    }
    throw new Error(`Invalid API response shape: ${context}`)
  }
  return result.data
}

export function getFileViewerUrl(url: string | null | undefined): string {
  if (!url) return ''
  const cleanUrl = url.trim()
  const lowerUrl = cleanUrl.toLowerCase()
  if (
    lowerUrl.endsWith('.docx') ||
    lowerUrl.endsWith('.doc') ||
    lowerUrl.endsWith('.xlsx') ||
    lowerUrl.endsWith('.xls') ||
    lowerUrl.endsWith('.pptx') ||
    lowerUrl.endsWith('.ppt')
  ) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(cleanUrl)}`
  }
  return cleanUrl
}
