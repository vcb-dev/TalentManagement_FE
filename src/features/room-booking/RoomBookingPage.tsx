import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Plus,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Bell,
  Info,
  Volume2,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import {
  getBookings,
  getAvailability,
  createBooking,
  approveBooking,
  rejectBooking,
  type MeetingBooking,
  type BookedSlot,
} from './api'

const ROOMS = [
  {
    id: 'Tầng 5',
    name: 'Phòng họp Tầng 5',
    floor: 'Phòng lớn - Sức chứa 20 người',
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'Tầng 6',
    name: 'Phòng họp Tầng 6',
    floor: 'Phòng nhỏ - Sức chứa 8 người',
    color: 'from-teal-400 to-emerald-500',
  },
]

const PAGE_SIZE = 8

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
  msg.lang = 'vi-VN'
  msg.rate = 0.9
  window.speechSynthesis.speak(msg)
}

function showNotification(title: string, body: string) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' })
  }
}

export default function RoomBookingPage() {
  const user = useAuthStore((s) => s.user)
  const isPrivileged = user?.role === 'HR' || user?.role === 'MANAGER' || user?.role === 'BOD'

  const [bookings, setBookings] = useState<MeetingBooking[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [room, setRoom] = useState('Tầng 5')
  const [date, setDate] = useState(() => getVnNow().date)
  const [timeFrom, setTimeFrom] = useState('08:00')
  const [timeTo, setTimeTo] = useState('09:00')
  const [reason, setReason] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([])

  const [filter, setFilter] = useState<'all' | 'today' | 'mine'>('all')
  const [page, setPage] = useState(1)

  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    try {
      setBookings(await getBookings())
    } catch {}
  }, [])

  useEffect(() => {
    load()
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [load])

  useEffect(() => {
    if (!showModal || !room || !date) return
    getAvailability(room, date)
      .then((r) => setBookedSlots(r.bookedSlots))
      .catch(() => setBookedSlots([]))
  }, [showModal, room, date])

  const filtered = useMemo(() => {
    const today = getVnNow().date
    return bookings.filter((b) => {
      if (filter === 'mine') return b.userId === user?.id
      if (filter === 'today') return b.date === today
      return true
    })
  }, [bookings, filter, user?.id])

  const totalPages = useMemo(() => Math.ceil(filtered.length / PAGE_SIZE), [filtered.length])
  const pageData = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createBooking({ room, date, timeFrom, timeTo, reason, isEmergency })
      const msg = isEmergency
        ? 'Đặt phòng khẩn cấp thành công'
        : 'Đặt phòng thành công, vui lòng chờ duyệt'
      setSuccess(msg)
      speak(msg)
      setShowModal(false)
      load()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi hệ thống')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveBooking(id)
      speak('Đã duyệt lịch họp thành công')
      load()
    } catch {
      speak('Lỗi khi duyệt')
    }
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) {
      alert('Vui lòng nhập lý do')
      return
    }
    try {
      await rejectBooking(rejectId, rejectReason)
      setRejectId(null)
      speak('Đã từ chối lịch họp')
      load()
    } catch {
      speak('Lỗi khi từ chối')
    }
  }

  const statusBadge = (b: MeetingBooking) => {
    const { date: td, time: ct } = getVnNow()
    const isPast = b.date < td || (b.date === td && b.timeTo <= ct)
    if (b.status === 'pending' && isPast)
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-slate-500 border border-slate-200">
          Quá hạn
        </span>
      )
    const map = {
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-rose-50 text-rose-700 border-rose-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
    }
    const label = {
      approved: 'Đã duyệt',
      rejected: b.isOverridden ? 'Bị ghi đè' : 'Từ chối',
      pending: 'Chờ duyệt',
    }
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight border ${map[b.status]}`}
      >
        {label[b.status]}
      </span>
    )
  }

  return (
    <div className="animate-page-entrance min-h-screen bg-background pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col gap-6 pt-8 sm:flex-row sm:items-end sm:justify-between border-b border-border/40 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-8 rounded-full bg-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                VCB Booking
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              Phòng họp
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Lịch đặt và quản lý tài nguyên phòng họp tại Lumina.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => speak('Hệ thống đặt phòng Lumina xin chào bạn')}
              className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition shadow-sm"
            >
              <Volume2 className="h-5 w-5 text-primary" />
            </button>
            <button
              onClick={() => {
                setError('')
                setShowModal(true)
              }}
              className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5" /> Đặt phòng ngay
            </button>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-700">{success}</p>
            </div>
          </div>
        )}

        {/* Bảng lịch họp */}
        <div className="rounded-[2.5rem] border border-border bg-card/50 shadow-sm backdrop-blur-xl overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border/50 p-6 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-background/50 border border-border/40 w-fit">
              {(['all', 'today', 'mine'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f)
                    setPage(1)
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${filter === f ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-secondary'}`}
                >
                  {f === 'all' ? 'Toàn bộ' : f === 'today' ? 'Hôm nay' : 'Của tôi'}
                </button>
              ))}
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Tổng: {filtered.length} bản ghi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30">
                <tr>
                  {[
                    'Phòng',
                    'Người đặt',
                    'Ngày',
                    'Giờ',
                    'Lý do',
                    'Trạng thái',
                    ...(isPrivileged ? [''] : []),
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground">
                      Chưa có lịch họp nào.
                    </td>
                  </tr>
                ) : (
                  pageData.map((b) => (
                    <tr key={b.id} className="group hover:bg-primary/[0.02]">
                      <td className="px-6 py-5 font-black">{b.room}</td>
                      <td className="px-6 py-5 uppercase font-bold text-[11px]">{b.userName}</td>
                      <td className="px-6 py-5 text-muted-foreground">{b.date}</td>
                      <td className="px-6 py-5 font-bold text-primary">
                        {b.timeFrom} – {b.timeTo}
                      </td>
                      <td className="px-6 py-5 max-w-[200px] truncate">{b.reason}</td>
                      <td className="px-6 py-5">{statusBadge(b)}</td>
                      {isPrivileged && b.status === 'pending' && (
                        <td className="px-6 py-5 text-right space-x-2">
                          <button
                            onClick={() => handleApprove(b.id)}
                            className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold"
                          >
                            DUYỆT
                          </button>
                          <button
                            onClick={() => {
                              setRejectId(b.id)
                              setRejectReason('')
                            }}
                            className="bg-rose-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold"
                          >
                            HỦY
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CẢNH BÁO ĐỎ - ĐÚNG CHẤT DỰ ÁN CŨ */}

      {/* Form Đặt phòng */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div
            className="relative w-full max-w-xl bg-card rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 w-full bg-primary" />
            <div className="p-8 sm:p-10">
              <div className="mb-8 flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase">Đặt phòng họp</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-secondary rounded-xl"
                >
                  <X />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase ml-1">Chọn phòng</label>
                    <select
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className="w-full p-4 bg-muted/40 rounded-2xl border border-border font-bold outline-none"
                    >
                      <option value="Tầng 5">Tầng 5</option>
                      <option value="Tầng 6">Tầng 6</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase ml-1">Ngày</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-4 bg-muted/40 rounded-2xl border border-border font-bold outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase ml-1">Từ</label>
                    <input
                      type="time"
                      value={timeFrom}
                      onChange={(e) => setTimeFrom(e.target.value)}
                      required
                      className="w-full p-4 bg-muted/40 rounded-2xl border border-border font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase ml-1">Đến</label>
                    <input
                      type="time"
                      value={timeTo}
                      onChange={(e) => setTimeTo(e.target.value)}
                      required
                      className="w-full p-4 bg-muted/40 rounded-2xl border border-border font-bold outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase ml-1">Lý do</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={2}
                    className="w-full p-4 bg-muted/40 rounded-2xl border border-border font-medium outline-none resize-none"
                  />
                </div>
                {(user?.role === 'MANAGER' || user?.role === 'BOD') && (
                  <label className="flex items-center gap-4 bg-amber-50 p-4 rounded-2xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEmergency}
                      onChange={(e) => setIsEmergency(e.target.checked)}
                      className="accent-amber-600 w-5 h-5"
                    />
                    <span className="text-[11px] font-black text-amber-700 uppercase">
                      🚨 Đặt khẩn cấp (Ghi đè)
                    </span>
                  </label>
                )}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 font-bold uppercase text-muted-foreground"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl uppercase tracking-widest"
                  >
                    {loading ? '...' : 'Xác nhận'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {rejectId && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={() => setRejectId(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div
            className="relative w-full max-w-md bg-card p-8 rounded-[2.5rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-black uppercase mb-4">Từ chối lịch</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Lý do..."
              className="w-full p-4 bg-muted/40 border border-border rounded-2xl outline-none resize-none mb-6"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setRejectId(null)}
                className="flex-1 font-bold text-muted-foreground uppercase"
              >
                Quay lại
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-4 bg-rose-500 text-white font-bold rounded-2xl uppercase"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
