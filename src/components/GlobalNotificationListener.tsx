import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { getBookings, type MeetingBooking } from '@/features/room-booking/api'

// Hàm lấy thời gian VN
function getVnNow() {
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
  }
}

// Chị Google nói
function speak(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const msg = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  const vnVoice = voices.find((v) => v.lang.includes('vi') || v.lang.includes('VN'))
  if (vnVoice) msg.voice = vnVoice
  msg.lang = 'vi-VN'
  msg.rate = 0.9
  window.speechSynthesis.speak(msg)
}

function showNotification(title: string, body: string) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

export default function GlobalNotificationListener() {
  const user = useAuthStore((s) => s.user)
  const [expiredRooms, setExpiredRooms] = useState<any[]>([])
  const notifiedRef = useRef<Set<string>>(new Set())
  const bookingsRef = useRef<MeetingBooking[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('vcb_notified_ids')
    if (saved) {
      try {
        const arr = JSON.parse(saved)
        if (Array.isArray(arr)) notifiedRef.current = new Set(arr)
      } catch (e) {
        console.error('Failed to load notified ids', e)
      }
    }
  }, [])

  const saveNotified = useCallback(() => {
    localStorage.setItem('vcb_notified_ids', JSON.stringify(Array.from(notifiedRef.current)))
  }, [])

  const handleDismiss = () => {
    window.speechSynthesis.cancel()
    expiredRooms.forEach((r) => {
      if (r.alertType === 'my_end') notifiedRef.current.add(r.id + '_ended')
      if (r.alertType === 'someone_else_start') notifiedRef.current.add(r.id + '_remind_me')
      if (r.alertType === 'overridden') notifiedRef.current.add(r.id + '_overridden')
    })
    saveNotified()
    setExpiredRooms([])
  }

  useEffect(() => {
    if (!user) return

    const check = async () => {
      try {
        const fresh = await getBookings()
        bookingsRef.current = fresh
      } catch (err) {
        console.error('Global check failed:', err)
      }

      const now = new Date()
      const nowTs = now.getTime()
      const td = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })

      const isAdmin = ['MANAGER', 'HR', 'BOD'].includes(user.role || '')
      if (isAdmin) return

      // 1. Kiểm tra bị ghi đè
      const overridden = bookingsRef.current.filter(
        (b) =>
          b.userId === user.id &&
          b.isOverridden &&
          b.status === 'rejected' &&
          !notifiedRef.current.has(b.id + '_overridden')
      )

      if (overridden.length > 0) {
        const roomNames = overridden.map((b) => b.room).join(' và ')
        const msg = `Cảnh báo! Lịch họp tại ${roomNames} của bạn đã bị ghi đè. Vui lòng kiểm tra ngay.`
        speak(msg)
        overridden.forEach((b) => notifiedRef.current.add(b.id + '_overridden'))
        saveNotified()
        setExpiredRooms(overridden.map((b) => ({ ...b, alertType: 'overridden' })))
        return
      }

      // 2. Kiểm tra Kết thúc ca họp
      const newlyExpired = bookingsRef.current.filter((b) => {
        if (b.userId !== user.id) return false
        const isMyPending = b.status === 'pending'
        const isRelevant = b.status === 'approved' || isMyPending
        if (!isRelevant || b.date !== td || notifiedRef.current.has(b.id + '_ended')) return false

        const endTs = new Date(`${b.date}T${b.timeTo}:00+07:00`).getTime()
        return nowTs >= endTs && nowTs < endTs + 300000
      })

      if (newlyExpired.length > 0) {
        newlyExpired.forEach((b) => {
          notifiedRef.current.add(b.id + '_ended')
          const hasNextBooking = bookingsRef.current.some(
            (other) =>
              other.room === b.room &&
              other.date === b.date &&
              other.timeFrom === b.timeTo &&
              other.status === 'approved'
          )
          const msg = hasNextBooking
            ? `Đã hết giờ phòng họp ${b.room}. Vui lòng dọn đồ đạc và nhường phòng cho ca sau.`
            : `Đã hết giờ ca họp của bạn tại phòng ${b.room}. Hiện tại không có ca tiếp theo, bạn có thể tiếp tục sử dụng phòng nếu cần.`
          speak(msg)
          showNotification('Thông báo phòng họp', msg)
        })
        saveNotified()
        setExpiredRooms((prev) => [
          ...prev,
          ...newlyExpired.map((b) => ({ ...b, alertType: 'my_end' })),
        ])
      }

      // 3. Kiểm tra ca họp của NGƯỜI KHÁC bắt đầu
      const othersStarting = bookingsRef.current.filter((other) => {
        if (other.userId === user.id || other.status !== 'approved' || other.date !== td)
          return false
        if (notifiedRef.current.has(other.id + '_remind_me')) return false
        const startTs = new Date(`${other.date}T${other.timeFrom}:00+07:00`).getTime()
        return nowTs >= startTs && nowTs < startTs + 60000
      })

      othersStarting.forEach((nextBooking) => {
        const iHadMeetingHere = bookingsRef.current.some(
          (myOld) =>
            myOld.userId === user.id &&
            myOld.room === nextBooking.room &&
            myOld.date === nextBooking.date &&
            myOld.timeTo <= nextBooking.timeFrom
        )
        if (iHadMeetingHere) {
          const msg = `Phòng ${nextBooking.room} hiện đã có ca họp tiếp theo của đồng nghiệp bắt đầu. Vui lòng dọn đồ đạc và nhường phòng.`
          speak(msg)
          showNotification('Yêu cầu nhường phòng', msg)
          setExpiredRooms((prev) => [...prev, { ...nextBooking, alertType: 'someone_else_start' }])
        }
        notifiedRef.current.add(nextBooking.id + '_remind_me')
        saveNotified()
      })
    }

    check()
    const timer = setInterval(check, 10000)
    return () => clearInterval(timer)
  }, [user, saveNotified])

  if (expiredRooms.length === 0) return null

  const isHighPriority = expiredRooms.some(
    (r) => r.alertType === 'someone_else_start' || r.alertType === 'overridden'
  )

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div
          className={cn(
            'px-8 py-6 flex items-center gap-4 text-white',
            isHighPriority
              ? 'bg-gradient-to-r from-red-600 to-orange-500'
              : 'bg-gradient-to-r from-blue-600 to-indigo-500'
          )}
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight">
              {isHighPriority ? 'Yêu cầu nhường phòng' : 'Thông báo kết thúc'}
            </h2>
            <p className="text-white/80 text-sm mt-1">
              {isHighPriority
                ? 'Ca họp của đồng nghiệp đã bắt đầu'
                : 'Phiên họp của bạn đã hoàn thành'}
            </p>
          </div>
        </div>
        <div className="p-8">
          <div className="space-y-4 mb-8">
            {expiredRooms.map((r, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-2xl p-5 border flex flex-col gap-2',
                  r.alertType === 'someone_else_start'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-blue-50 border-blue-100'
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide',
                        r.alertType === 'someone_else_start' ? 'text-red-400' : 'text-blue-400'
                      )}
                    >
                      Phòng họp
                    </p>
                    <p className="text-xl font-black text-slate-800">{r.room}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide',
                        r.alertType === 'someone_else_start' ? 'text-red-400' : 'text-blue-400'
                      )}
                    >
                      {r.alertType === 'someone_else_start' ? 'Ca bắt đầu' : 'Giờ kết thúc'}
                    </p>
                    <p
                      className={cn(
                        'text-lg font-bold',
                        r.alertType === 'someone_else_start' ? 'text-red-600' : 'text-blue-600'
                      )}
                    >
                      {r.alertType === 'someone_else_start' ? r.timeFrom : r.timeTo}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-black/5">
                  <p
                    className={cn(
                      'text-sm font-medium italic',
                      r.alertType === 'someone_else_start' ? 'text-red-700' : 'text-blue-700'
                    )}
                  >
                    {r.alertType === 'someone_else_start'
                      ? '⚠️ Đồng nghiệp đang đợi. Vui lòng nhường phòng ngay!'
                      : bookingsRef.current.some(
                            (o) =>
                              o.room === r.room &&
                              o.date === r.date &&
                              o.timeFrom === r.timeTo &&
                              o.status === 'approved'
                          )
                        ? '⚠️ Có ca sau ngay lập tức. Vui lòng dọn dẹp!'
                        : '✅ Hiện tại phòng trống. Bạn có thể nán lại nếu cần.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleDismiss}
            className={cn(
              'w-full py-4 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest',
              isHighPriority
                ? 'bg-red-600 shadow-red-600/30 hover:bg-red-700'
                : 'bg-blue-600 shadow-blue-600/30 hover:bg-blue-700'
            )}
          >
            Tôi đã hiểu
          </button>
        </div>
      </div>
    </div>
  )
}
