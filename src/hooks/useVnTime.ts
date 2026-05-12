import { useState, useEffect } from 'react'

export function getVnNow() {
  const now = new Date()
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = f.formatToParts(now)
  const m = new Map(parts.map((p) => [p.type, p.value]))
  return {
    date: `${m.get('year')}-${m.get('month')}-${m.get('day')}`,
    time: `${m.get('hour')}:${m.get('minute')}`,
    raw: now,
  }
}

/**
 * Hook trả về thời gian hiện tại theo múi giờ Việt Nam,
 * cập nhật mỗi phút để tối ưu hiệu năng (tránh re-render liên tục).
 */
export function useVnTime() {
  const [now, setNow] = useState(getVnNow())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(getVnNow())
    }, 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  return now
}
