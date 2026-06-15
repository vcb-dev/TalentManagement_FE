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

function timeToMinutes(t: string): number {
  const parts = t.split(':')
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  return h * 60 + m
}

// Chị Google nói
function speak(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel() // Stop any ongoing speech before speaking
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
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
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
      if (r.alertType === 'warning_5m') notifiedRef.current.add(r.id + '_warning_5m')
      if (r.alertType === 'warning_starting_1m') notifiedRef.current.add(r.id + '_starting_1m')
    })
    saveNotified()
    setExpiredRooms([])
  }

  useEffect(() => {
    if (!user) return

    const check = async () => {
      // 0. Đồng bộ từ localStorage trước để tránh lệch tab/thiết bị
      const saved = localStorage.getItem('vcb_notified_ids')
      let currentNotified = notifiedRef.current
      if (saved) {
        try {
          const arr = JSON.parse(saved)
          if (Array.isArray(arr)) {
            currentNotified = new Set(arr)
            notifiedRef.current = currentNotified
          }
        } catch (e) {
          console.error('Failed to reload notified ids:', e)
        }
      }

      // Tự động tắt cảnh báo đã được tắt ở tab khác
      setExpiredRooms((prev) =>
        prev.filter((r) => {
          const keyMap: Record<string, string> = {
            my_end: '_ended',
            someone_else_start: '_remind_me',
            overridden: '_overridden',
            warning_5m: '_warning_5m',
            warning_starting_1m: '_starting_1m',
          }
          const suffix = keyMap[r.alertType]
          return suffix ? !currentNotified.has(r.id + suffix) : true
        })
      )

      try {
        const fresh = await getBookings()
        bookingsRef.current = fresh
      } catch (err) {
        console.error('Global check failed:', err)
      }

      const vnNow = getVnNow()
      const td = vnNow.date
      const currentMins = timeToMinutes(vnNow.time)

      const emailLower = (user.email || '').trim().toLowerCase()
      const parts = emailLower.split('@')
      if (parts.length === 2 && parts[1] === 'gmail.com') {
        parts[0] = parts[0].replace(/\./g, '')
      }
      const emailClean = parts.join('@')
      const isRoomAccount =
        emailClean === 'vienchibaodev@gmail.com' || emailClean === 'vienibaodev@gmail.com'
      const isAdmin = ['MANAGER', 'HR', 'BOD'].includes(user.role || '')
      if (isAdmin && !isRoomAccount) return
      const urlParams = new URLSearchParams(window.location.search)
      const roomParam = urlParams.get('room') // Ví dụ: "Tầng 5" hoặc "Tầng 6"

      // Lấy phòng họp được cấu hình cho thiết bị (ưu tiên từ URL query, sau đó đến localStorage)
      const getTargetRoom = () => {
        if (roomParam) {
          localStorage.setItem('vcb_selected_room', roomParam)
          return roomParam
        }
        const saved = localStorage.getItem('vcb_selected_room')
        if (saved) return saved

        if (emailClean === 'vienchibaodev@gmail.com') {
          return 'Tầng 6'
        }
        if (emailClean === 'vienibaodev@gmail.com') {
          return 'Tầng 5'
        }
        return 'Tầng 5'
      }
      const targetRoom = getTargetRoom()

      // Hàm helper kiểm tra xem phòng họp có thuộc phạm vi cảnh báo của tài khoản này không
      const isTargetBooking = (b: MeetingBooking) => {
        if (isRoomAccount) {
          return b.room.toLowerCase() === targetRoom.toLowerCase()
        }
        return b.userId === user.id
      }

      // 1. Kiểm tra bị ghi đè (chỉ áp dụng đối với người đặt phòng thông thường)
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
        if (!isTargetBooking(b)) return false
        const isMyPending = b.status === 'pending'
        const isRelevant = b.status === 'approved' || isMyPending
        if (!isRelevant || b.date !== td || notifiedRef.current.has(b.id + '_ended')) return false

        const endMins = timeToMinutes(b.timeTo)
        return currentMins >= endMins && currentMins < endMins + 5
      })

      if (newlyExpired.length > 0) {
        newlyExpired.forEach((b) => {
          notifiedRef.current.add(b.id + '_ended')

          // Tìm ca tiếp theo trong ngày
          const upcomingBookings = bookingsRef.current
            .filter(
              (other) =>
                other.room === b.room &&
                other.date === b.date &&
                other.timeFrom >= b.timeTo &&
                other.status === 'approved' &&
                other.id !== b.id
            )
            .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom))

          const nextBooking = upcomingBookings[0]
          let msg = ''
          if (nextBooking) {
            if (nextBooking.timeFrom === b.timeTo) {
              msg = `Đã hết giờ ca họp tại phòng ${b.room}. Vui lòng dọn đồ đạc và nhường phòng cho ca sau bắt đầu ngay bây giờ.`
            } else {
              msg = `Đã hết giờ ca họp tại phòng ${b.room}. Hiện tại chưa có ca tiếp theo ngay lập tức. Ca tiếp theo sẽ bắt đầu lúc ${nextBooking.timeFrom}. Bạn có thể tạm thời tiếp tục sử dụng phòng cho đến lúc đó.`
            }
          } else {
            msg = `Đã hết giờ ca họp tại phòng ${b.room}. Hiện tại không còn ca tiếp theo trong ngày hôm nay, bạn có thể tiếp tục sử dụng phòng nếu cần.`
          }

          speak(msg)
          showNotification('Thông báo phòng họp', msg)
        })
        saveNotified()
        setExpiredRooms((prev) => [
          ...prev,
          ...newlyExpired.map((b) => ({ ...b, alertType: 'my_end' })),
        ])
      }

      // 3. Kiểm tra ca họp của NGƯỜIS KHÁC bắt đầu
      const othersStarting = bookingsRef.current.filter((other) => {
        if (other.status !== 'approved' || other.date !== td) return false
        if (notifiedRef.current.has(other.id + '_remind_me')) return false

        // Nếu là tài khoản phòng họp, hoặc người dùng thông thường có ca họp kết thúc trước đó
        const isRelevantForUser = isRoomAccount
          ? targetRoom.toLowerCase() === other.room.toLowerCase()
          : bookingsRef.current.some(
              (myOld) =>
                myOld.userId === user.id &&
                myOld.room === other.room &&
                myOld.date === other.date &&
                myOld.timeTo <= other.timeFrom
            )

        if (!isRelevantForUser) return false

        const startMins = timeToMinutes(other.timeFrom)
        return currentMins >= startMins && currentMins < startMins + 1
      })

      othersStarting.forEach((nextBooking) => {
        const msg = `Phòng ${nextBooking.room} hiện đã có ca họp tiếp theo của đồng nghiệp bắt đầu. Vui lòng dọn đồ đạc và nhường phòng.`
        speak(msg)
        showNotification('Yêu cầu nhường phòng', msg)
        setExpiredRooms((prev) => [...prev, { ...nextBooking, alertType: 'someone_else_start' }])
        notifiedRef.current.add(nextBooking.id + '_remind_me')
        saveNotified()
      })

      // 4. Kiểm tra Sắp hết giờ ca họp (cảnh báo trước 5 phút)
      const newlyWarning = bookingsRef.current.filter((b) => {
        if (!isTargetBooking(b)) return false
        const isMyPending = b.status === 'pending'
        const isRelevant = b.status === 'approved' || isMyPending
        if (!isRelevant || b.date !== td || notifiedRef.current.has(b.id + '_warning_5m'))
          return false

        const endMins = timeToMinutes(b.timeTo)
        const warnStartMins = endMins - 5
        return currentMins >= warnStartMins && currentMins < warnStartMins + 1
      })

      if (newlyWarning.length > 0) {
        newlyWarning.forEach((b) => {
          notifiedRef.current.add(b.id + '_warning_5m')

          // Tìm ca tiếp theo trong ngày
          const upcomingBookings = bookingsRef.current
            .filter(
              (other) =>
                other.room === b.room &&
                other.date === b.date &&
                other.timeFrom >= b.timeTo &&
                other.status === 'approved' &&
                other.id !== b.id
            )
            .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom))

          const nextBooking = upcomingBookings[0]
          let msg = `Ca họp tại phòng ${b.room} chỉ còn 5 phút nữa là kết thúc.`
          if (nextBooking) {
            if (nextBooking.timeFrom === b.timeTo) {
              msg += ` Có ca họp tiếp theo bắt đầu ngay sau đó lúc ${nextBooking.timeFrom}. Vui lòng dọn dẹp.`
            } else {
              msg += ` Ca họp tiếp theo sẽ bắt đầu lúc ${nextBooking.timeFrom}.`
            }
          } else {
            msg += ` Hiện tại không còn ca họp nào tiếp theo trong hôm nay.`
          }

          speak(msg)
          showNotification('Sắp hết giờ họp', msg)
        })
        saveNotified()
        setExpiredRooms((prev) => [
          ...prev,
          ...newlyWarning.map((b) => ({ ...b, alertType: 'warning_5m' })),
        ])
      }

      // 5. Kiểm tra Sắp có ca họp mới bắt đầu (cảnh báo trước 1 phút)
      const upcomingWarning = bookingsRef.current.filter((b) => {
        if (!isTargetBooking(b)) return false
        if (
          b.status !== 'approved' ||
          b.date !== td ||
          notifiedRef.current.has(b.id + '_starting_1m')
        )
          return false

        // Không cảnh báo bắt đầu nếu có một ca họp khác vừa kết thúc ngay trước đó (vì ca trước đã cảnh báo kết thúc kèm thông báo ca sau rồi)
        const hasPredecessor = bookingsRef.current.some(
          (other) =>
            other.room === b.room &&
            other.date === b.date &&
            other.timeTo === b.timeFrom &&
            other.status === 'approved'
        )
        if (hasPredecessor) return false

        const startMins = timeToMinutes(b.timeFrom)
        const warnStartMins = startMins - 1
        return currentMins >= warnStartMins && currentMins < warnStartMins + 1
      })

      if (upcomingWarning.length > 0) {
        upcomingWarning.forEach((b) => {
          notifiedRef.current.add(b.id + '_starting_1m')
          const msg = `Phòng ${b.room} sắp có ca họp tiếp theo bắt đầu lúc ${b.timeFrom}. Vui lòng chuẩn bị để nhận phòng hoặc dọn dẹp nhường phòng.`
          speak(msg)
          showNotification('Sắp có ca họp mới', msg)
        })
        saveNotified()
        setExpiredRooms((prev) => [
          ...prev,
          ...upcomingWarning.map((b) => ({ ...b, alertType: 'warning_starting_1m' })),
        ])
      }
    }

    check()
    const timer = setInterval(check, 10000)

    const token = useAuthStore.getState().accessToken
    let eventSource: EventSource | null = null

    if (token) {
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const url = `${baseUrl.replace(/\/$/, '')}/room-booking/live?token=${token}`
      try {
        eventSource = new EventSource(url)
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.event === 'changed') {
              check()
            }
          } catch (e) {
            console.error('SSE parse error:', e)
          }
        }
        eventSource.onerror = (e) => {
          console.error('SSE error:', e)
        }
      } catch (err) {
        console.error('Failed to init SSE in global listener:', err)
      }
    }

    return () => {
      clearInterval(timer)
      eventSource?.close()
    }
  }, [user, saveNotified])

  if (expiredRooms.length === 0) return null

  const isHighPriority = expiredRooms.some(
    (r) => r.alertType === 'someone_else_start' || r.alertType === 'overridden'
  )
  const hasWarning = expiredRooms.some(
    (r) => r.alertType === 'warning_5m' || r.alertType === 'warning_starting_1m'
  )
  const titleText = isHighPriority
    ? 'Yêu cầu nhường phòng'
    : hasWarning
      ? expiredRooms.some((r) => r.alertType === 'warning_starting_1m')
        ? 'Sắp có ca họp mới'
        : 'Sắp hết giờ họp'
      : 'Thông báo kết thúc'

  const subtitleText = isHighPriority
    ? 'Ca họp của đồng nghiệp đã bắt đầu'
    : hasWarning
      ? 'Vui lòng lưu ý thời gian'
      : 'Phiên họp của bạn đã hoàn thành'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div
          className={cn(
            'px-8 py-6 flex items-center gap-4 text-white',
            isHighPriority
              ? 'bg-gradient-to-r from-red-600 to-orange-500'
              : hasWarning
                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                : 'bg-gradient-to-r from-blue-600 to-indigo-500'
          )}
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight">{titleText}</h2>
            <p className="text-white/80 text-sm mt-1">{subtitleText}</p>
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
                    : r.alertType === 'warning_5m' || r.alertType === 'warning_starting_1m'
                      ? 'bg-amber-50 border-amber-100'
                      : 'bg-blue-50 border-blue-100'
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide',
                        r.alertType === 'someone_else_start'
                          ? 'text-red-400'
                          : r.alertType === 'warning_5m' || r.alertType === 'warning_starting_1m'
                            ? 'text-amber-500'
                            : 'text-blue-400'
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
                        r.alertType === 'someone_else_start'
                          ? 'text-red-400'
                          : r.alertType === 'warning_5m' || r.alertType === 'warning_starting_1m'
                            ? 'text-amber-500'
                            : 'text-blue-400'
                      )}
                    >
                      {r.alertType === 'someone_else_start'
                        ? 'Ca bắt đầu'
                        : r.alertType === 'warning_5m'
                          ? 'Sắp hết giờ'
                          : r.alertType === 'warning_starting_1m'
                            ? 'Sắp bắt đầu'
                            : 'Giờ kết thúc'}
                    </p>
                    <p
                      className={cn(
                        'text-lg font-bold',
                        r.alertType === 'someone_else_start'
                          ? 'text-red-600'
                          : r.alertType === 'warning_5m' || r.alertType === 'warning_starting_1m'
                            ? 'text-amber-600'
                            : 'text-blue-600'
                      )}
                    >
                      {r.alertType === 'someone_else_start' || r.alertType === 'warning_starting_1m'
                        ? r.timeFrom
                        : r.timeTo}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-black/5">
                  <p
                    className={cn(
                      'text-sm font-medium italic',
                      r.alertType === 'someone_else_start'
                        ? 'text-red-700'
                        : r.alertType === 'warning_5m' || r.alertType === 'warning_starting_1m'
                          ? 'text-amber-700'
                          : 'text-blue-700'
                    )}
                  >
                    {r.alertType === 'someone_else_start'
                      ? '⚠️ Đồng nghiệp đang đợi. Vui lòng nhường phòng ngay!'
                      : r.alertType === 'warning_5m'
                        ? '⚠️ Phiên họp sắp kết thúc. Vui lòng dọn dẹp đồ đạc!'
                        : r.alertType === 'warning_starting_1m'
                          ? '⚠️ Ca họp tiếp theo sắp bắt đầu. Vui lòng chuẩn bị nhận phòng!'
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
