const TECHNICAL_PATTERNS: RegExp[] = [
  /prisma/i,
  /invocation/i,
  /can't reach database/i,
  /database server/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /Invalid `/,
  /Internal Server Error/i,
  /Network Error/i,
  /Request failed with status code/i,
  /at .*\.tsx?:\d+/,
  /fbtrace_id/i,
]

function isTechnical(message: string): boolean {
  const msg = message.trim()
  if (!msg) return false
  return TECHNICAL_PATTERNS.some((re) => re.test(msg))
}

/** Lỗi hạ tầng tạm thời (DB/mạng) — thường hết sau khi server khởi động xong. */
export function isTransientInfraError(raw: string | null | undefined): boolean {
  const msg = (raw ?? '').trim()
  if (!msg) return false
  const lower = msg.toLowerCase()
  return (
    lower.includes("can't reach database") ||
    /prisma/i.test(msg) ||
    /econnrefused|etimedout|enotfound|network error/i.test(lower)
  )
}

/** Ẩn lỗi kỹ thuật — chỉ hiện câu dễ hiểu cho người dùng CSKH. */
export function toUserFacingError(raw: string | null | undefined): string {
  const msg = (raw ?? '').trim()
  if (!msg) return ''

  const lower = msg.toLowerCase()

  if (lower.includes("can't reach database") || /prisma/i.test(msg)) {
    return 'Hệ thống không kết nối được cơ sở dữ liệu. Vui lòng thử lại sau vài phút.'
  }
  if (/network error|econnrefused|etimedout|enotfound/i.test(lower)) {
    return 'Mất kết nối tới máy chủ. Kiểm tra mạng và thử lại.'
  }
  if (/deepseek|ai service|fetch failed/i.test(lower)) {
    return 'Dịch vụ AI tạm thời không phản hồi. Vui lòng thử lại sau.'
  }
  if (isTechnical(msg)) {
    return 'Đã có lỗi hệ thống. Vui lòng thử lại sau.'
  }
  if (msg.length > 220) {
    return 'Đã có lỗi hệ thống. Vui lòng thử lại sau.'
  }

  return msg
}
