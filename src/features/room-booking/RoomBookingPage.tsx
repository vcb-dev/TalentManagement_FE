import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useSearch } from '@tanstack/react-router'
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
  Loader2,
} from 'lucide-react'
import { CustomSelect } from '@/components/shared/CustomSelect'
import { DatePicker } from '@/components/ui/date-picker'
import { useAuthStore } from '@/stores/auth.store'
import {
  getBookings,
  getAvailability,
  createBooking,
  updateBooking,
  deleteBooking,
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

const PAGE_SIZE = 6

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

function BookingStatusBadge({ b }: { b: MeetingBooking }) {
  const { date: td, time: ct } = getVnNow()
  const isPast = b.date < td || (b.date === td && b.timeTo <= ct)

  if (b.status === 'approved' && isPast)
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-blue-700">
        ✓ Đã họp xong
      </span>
    )

  if (b.status === 'pending' && isPast)
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-slate-500">
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
  const isModified =
    b.status === 'pending' &&
    b.updatedAt &&
    new Date(b.updatedAt).getTime() > new Date(b.createdAt).getTime() + 5000

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight border ${map[b.status]}`}
      >
        {label[b.status]}
      </span>
      {isModified && (
        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-tighter text-indigo-700">
          Yêu cầu đổi lịch
        </span>
      )}
    </div>
  )
}

type BookingRowActionsProps = {
  b: MeetingBooking
  user: ReturnType<typeof useAuthStore.getState>['user']
  isPrivileged: boolean
  processingId: string | null
  handleApprove: (id: string) => void
  setRejectId: (id: string) => void
  handleEdit: (b: MeetingBooking) => void
  handleDelete: (id: string) => void
  variant?: 'table' | 'mobile'
}

function BookingRowActions({
  b,
  user,
  isPrivileged,
  processingId,
  handleApprove,
  setRejectId,
  handleEdit,
  handleDelete,
  variant = 'table',
}: BookingRowActionsProps) {
  const mobile = variant === 'mobile'
  const btnWrap = mobile ? 'w-full justify-center' : ''

  return (
    <div className={mobile ? 'flex w-full flex-col gap-2' : 'flex items-center justify-end gap-2'}>
      {isPrivileged && b.status === 'pending' && (
        <>
          <button
            type="button"
            onClick={() => handleApprove(b.id)}
            disabled={!!processingId}
            className={`group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 hover:shadow-emerald-500/40 active:scale-95 disabled:opacity-50 ${btnWrap}`}
          >
            {processingId === b.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            <span>DUYỆT</span>
          </button>
          <button
            type="button"
            onClick={() => setRejectId(b.id)}
            disabled={!!processingId}
            className={`group flex items-center gap-2 rounded-xl border-2 border-rose-100 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 transition-all hover:border-rose-200 hover:bg-rose-50 active:scale-95 disabled:opacity-50 ${btnWrap}`}
          >
            <X className="h-3 w-3" />
            <span>TỪ CHỐI</span>
          </button>
        </>
      )}
      {b.userId === user?.id && (
        <div className={mobile ? 'flex w-full flex-col gap-2' : 'flex gap-2'}>
          <button
            type="button"
            onClick={() => handleEdit(b)}
            disabled={!!processingId}
            className={`flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-white active:scale-95 disabled:opacity-50 ${btnWrap}`}
          >
            <span>ĐỔI LỊCH</span>
          </button>
          <button
            type="button"
            onClick={() => handleDelete(b.id)}
            disabled={!!processingId}
            className={`flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-600 hover:text-white active:scale-95 disabled:opacity-50 ${btnWrap}`}
          >
            {processingId === b.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
            <span>HỦY</span>
          </button>
        </div>
      )}
    </div>
  )
}

const BookingCardMobile = memo(
  ({
    b,
    user,
    isPrivileged,
    processingId,
    handleApprove,
    setRejectId,
    handleEdit,
    handleDelete,
  }: {
    b: MeetingBooking
    user: ReturnType<typeof useAuthStore.getState>['user']
    isPrivileged: boolean
    processingId: string | null
    handleApprove: (id: string) => void
    setRejectId: (id: string) => void
    handleEdit: (b: MeetingBooking) => void
    handleDelete: (id: string) => void
  }) => {
    return (
      <div className="space-y-3 border-b border-border/50 p-4 last:border-b-0">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Phòng
          </p>
          <p className="font-black text-foreground">{b.room}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Người đặt / Team
          </p>
          <span className="text-[11px] font-bold uppercase text-foreground">{b.userName}</span>
          <span className="mt-0.5 block text-[9px] font-medium uppercase text-muted-foreground">
            {b.team}
          </span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Ngày
            </p>
            <p className="text-sm text-muted-foreground">{b.date}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Giờ
            </p>
            <p className="text-sm font-bold text-primary">
              {b.timeFrom} – {b.timeTo}
            </p>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Lý do
          </p>
          <p className="break-words text-sm">{b.reason}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Trạng thái
          </p>
          <BookingStatusBadge b={b} />
        </div>
        <BookingRowActions
          b={b}
          user={user}
          isPrivileged={isPrivileged}
          processingId={processingId}
          handleApprove={handleApprove}
          setRejectId={setRejectId}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          variant="mobile"
        />
      </div>
    )
  }
)

const BookingRow = memo(
  ({
    b,
    user,
    isPrivileged,
    processingId,
    handleApprove,
    setRejectId,
    handleEdit,
    handleDelete,
  }: {
    b: MeetingBooking
    user: ReturnType<typeof useAuthStore.getState>['user']
    isPrivileged: boolean
    processingId: string | null
    handleApprove: (id: string) => void
    setRejectId: (id: string) => void
    handleEdit: (b: MeetingBooking) => void
    handleDelete: (id: string) => void
  }) => {
    return (
      <tr className="group hover:bg-primary/[0.02]">
        <td className="px-6 py-5 font-black">{b.room}</td>
        <td className="px-6 py-5">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase">{b.userName}</span>
            <span className="text-[9px] font-medium uppercase text-muted-foreground">{b.team}</span>
          </div>
        </td>
        <td className="px-6 py-5 text-muted-foreground">{b.date}</td>
        <td className="px-6 py-5 font-bold text-primary">
          {b.timeFrom} – {b.timeTo}
        </td>
        <td className="max-w-[200px] truncate px-6 py-5">{b.reason}</td>
        <td className="px-6 py-5">
          <BookingStatusBadge b={b} />
        </td>
        <td className="px-6 py-5 text-right">
          <BookingRowActions
            b={b}
            user={user}
            isPrivileged={isPrivileged}
            processingId={processingId}
            handleApprove={handleApprove}
            setRejectId={setRejectId}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            variant="table"
          />
        </td>
      </tr>
    )
  }
)

export default function RoomBookingPage() {
  const search = useSearch({ from: '/_protected/room-booking' }) as any
  const user = useAuthStore((s) => s.user)
  const isPrivileged = user?.role === 'HR' || user?.role === 'MANAGER' || user?.role === 'BOD'

  const [bookings, setBookings] = useState<MeetingBooking[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [room, setRoom] = useState('Tầng 5')
  const [date, setDate] = useState(() => getVnNow().date)
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([])

  const [filter, setFilter] = useState<'all' | 'today' | 'mine' | 'requests'>(
    search.tab === 'requests' ? 'requests' : 'all'
  )
  const [page, setPage] = useState(1)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (search.tab === 'requests') {
      setFilter('requests')
    } else {
      setFilter('all')
    }
    setPage(1)
  }, [search.tab])

  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const prevBookingsCount = useRef(0)
  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const data = await getBookings()

      // Nếu là silent update và có lịch mới (số lượng tăng lên)
      if (isSilent && data.length > prevBookingsCount.current) {
        showNotification('Lịch họp mới', `Có yêu cầu đặt phòng mới vừa được cập nhật.`)
      }

      setBookings(data)
      prevBookingsCount.current = data.length
    } catch {
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, []) // Không phụ thuộc vào bookings để tránh loop

  useEffect(() => {
    load(false)
    const interval = setInterval(() => load(true), 10000)

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (!showModal || !room || !date) return
    getAvailability(room, date)
      .then((r) => setBookedSlots(r.bookedSlots))
      .catch(() => setBookedSlots([]))
  }, [showModal, room, date])

  const filtered = useMemo(() => {
    const { date: todayDate, time: nowTime } = getVnNow()
    const isBookingCompleted = (b: MeetingBooking) =>
      b.status === 'approved' &&
      (b.date < todayDate || (b.date === todayDate && b.timeTo <= nowTime))

    return bookings.filter((b) => {
      if (filter === ('requests' as any)) return b.status === 'pending'
      if (filter === 'mine') return b.userId === user?.id
      if (filter === 'today') {
        if (b.userId === user?.id) return true
        const userTeam = (user?.team ?? '').trim().toLowerCase()
        const bookingTeam = (b.team ?? '').trim().toLowerCase()
        return (
          !!bookingTeam &&
          !!userTeam &&
          (bookingTeam === userTeam ||
            bookingTeam.includes(userTeam) ||
            userTeam.includes(bookingTeam))
        )
      }
      // Tab 'all' (Toàn bộ): ẩn các booking đã họp xong
      if (isBookingCompleted(b)) return false
      return true
    })
  }, [bookings, filter, user?.id, user?.team])

  const totalPages = useMemo(() => Math.ceil(filtered.length / PAGE_SIZE), [filtered.length])
  const pageData = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  function resetForm() {
    setEditingId(null)
    setRoom('Tầng 5')
    setDate(getVnNow().date)
    setTimeFrom('')
    setTimeTo('')
    setReason('')
    setNote('')
    setIsEmergency(false)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate Frontend
    if (!reason.trim()) {
      const m = 'Vui lòng nhập lý do đặt phòng'
      setError(m)
      speak(m)
      return
    }
    if (timeFrom >= timeTo) {
      const m = 'Giờ kết thúc phải sau giờ bắt đầu'
      setError(m)
      speak(m)
      return
    }
    const { date: vnDate, time: vnTime } = getVnNow()
    if (date < vnDate) {
      const m = 'Không thể đặt lịch trong quá khứ'
      setError(m)
      speak(m)
      return
    }
    if (date === vnDate && timeFrom < vnTime) {
      const m = 'Thời gian bắt đầu không thể ở quá khứ'
      setError(m)
      speak(m)
      return
    }

    setLoading(true)
    try {
      const payload = { room, date, timeFrom, timeTo, reason, note, isEmergency }
      if (editingId) {
        await updateBooking(editingId, payload)
        setSuccess('Cập nhật lịch họp thành công')
        speak('Đã cập nhật lịch họp')
      } else {
        await createBooking(payload)
        const msg = isEmergency
          ? 'Đặt phòng khẩn cấp thành công'
          : 'Đặt phòng thành công, vui lòng chờ duyệt'
        setSuccess(msg)
        speak(msg)
      }
      setShowModal(false)
      resetForm()
      load()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi hệ thống'
      setError(msg)
      speak(`Lỗi: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    setProcessingId(id)
    try {
      await approveBooking(id)
      speak('Đã duyệt lịch họp thành công')
      load()
    } catch {
      speak('Lỗi khi duyệt')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) {
      alert('Vui lòng nhập lý do')
      return
    }
    setProcessingId(rejectId)
    try {
      await rejectBooking(rejectId, rejectReason)
      setRejectId(null)
      speak('Đã từ chối lịch họp')
      load()
    } catch {
      speak('Lỗi khi từ chối')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bạn có chắc chắn muốn hủy lịch họp này?')) return
    setProcessingId(id)
    try {
      await deleteBooking(id)
      speak('Đã hủy lịch họp')
      load()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Lỗi khi hủy lịch')
    } finally {
      setProcessingId(null)
    }
  }

  function handleEdit(b: MeetingBooking) {
    setEditingId(b.id)
    setRoom(b.room)
    setDate(b.date)
    setTimeFrom(b.timeFrom)
    setTimeTo(b.timeTo)
    setReason(b.reason)
    setNote(b.note || '')
    setIsEmergency(b.isEmergency)
    setShowModal(true)
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
                resetForm()
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
            {search.tab === 'requests' ? (
              <div className="flex items-center gap-2">
                <div className="h-6 w-1 bg-rose-500 rounded-full" />
                <h2 className="text-sm font-black uppercase tracking-wider text-rose-600">
                  Duyệt yêu cầu đổi lịch
                </h2>
              </div>
            ) : (
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
                    {f === 'all' ? 'Toàn bộ' : f === 'today' ? 'Team mình' : 'Của tôi'}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Tổng: {filtered.length} bản ghi
              </span>
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-black tracking-tighter text-emerald-700 uppercase">
                  LIVE
                </span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border/50 bg-white/30 md:hidden">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-3 p-4">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-10 w-full rounded-xl bg-muted" />
                </div>
              ))
            ) : pageData.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-muted p-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Không tìm thấy lịch đặt nào
                  </p>
                </div>
              </div>
            ) : (
              pageData.map((b) => (
                <BookingCardMobile
                  key={b.id}
                  b={b}
                  user={user}
                  isPrivileged={isPrivileged}
                  processingId={processingId}
                  handleApprove={handleApprove}
                  setRejectId={setRejectId}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                />
              ))
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/30">
                <tr>
                  {['Phòng', 'Người đặt / Team', 'Ngày', 'Giờ', 'Lý do', 'Trạng thái', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-white/30">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-5">
                        <div className="h-4 w-20 rounded bg-muted" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-32 rounded bg-muted" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-24 rounded bg-muted" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-16 rounded bg-muted" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-40 rounded bg-muted" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-6 w-20 rounded-full bg-muted" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="ml-auto h-8 w-24 rounded-xl bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : pageData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-muted p-4">
                          <AlertCircle className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Không tìm thấy lịch đặt nào
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageData.map((b) => (
                    <BookingRow
                      key={b.id}
                      b={b}
                      user={user}
                      isPrivileged={isPrivileged}
                      processingId={processingId}
                      handleApprove={handleApprove}
                      setRejectId={setRejectId}
                      handleEdit={handleEdit}
                      handleDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 bg-muted/10 px-6 py-4">
              <div className="text-xs font-medium text-muted-foreground">
                Trang {page} / {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background transition-all hover:bg-secondary disabled:opacity-30"
                >
                  <Clock className="h-4 w-4 rotate-180" />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        page === p
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'border border-border bg-background hover:bg-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background transition-all hover:bg-secondary disabled:opacity-30"
                >
                  <Clock className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Đặt phòng */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => {
            setShowModal(false)
            resetForm()
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div
            className="relative w-full max-w-xl bg-card rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 w-full bg-primary" />
            <div className="p-8 sm:p-10">
              <div className="mb-8 flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase">
                  {editingId ? 'Đổi lịch họp' : 'Đặt phòng họp'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="p-2 hover:bg-secondary rounded-xl"
                >
                  <X />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-tight leading-tight">
                      {error}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase ml-1">Chọn phòng</label>
                    <CustomSelect
                      value={room}
                      onValueChange={(val) => setRoom(val)}
                      options={[
                        { label: 'Tầng 5', value: 'Tầng 5' },
                        { label: 'Tầng 6', value: 'Tầng 6' },
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase ml-1 flex items-center gap-1">
                      Ngày
                    </label>
                    <DatePicker
                      value={date}
                      onChange={setDate}
                      className="h-14 rounded-2xl bg-muted/40 font-black text-center tracking-widest"
                    />
                  </div>
                </div>
                {/* Hiển thị khung giờ khả dụng */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-black uppercase ml-1 flex items-center gap-2 text-primary">
                      <Clock className="h-4 w-4" />
                      Khung giờ trống còn lại
                    </label>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Click để chọn nhanh
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 py-2 min-h-[40px]">
                    {(() => {
                      const { date: today, time: nowTime } = getVnNow()
                      let startSearch = '08:00'
                      if (date === today) {
                        startSearch = nowTime > '08:00' ? nowTime : '08:00'
                      }

                      // Hàm chuẩn hóa thời gian về dạng 2 chữ số (VD: 9:30 -> 09:30) để so sánh chuỗi
                      const padTime = (t: string) => {
                        if (!t) return '00:00'
                        const [h, m] = t.split(':')
                        return `${(h || '0').padStart(2, '0')}:${(m || '0').padStart(2, '0')}`
                      }

                      // Tạo danh sách các khoảng trống
                      const sorted = [...bookedSlots]
                        .map((s) => ({
                          ...s,
                          timeFrom: padTime(s.timeFrom),
                          timeTo: padTime(s.timeTo),
                        }))
                        .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom))

                      const gaps: string[] = []
                      let lastEnd = padTime(startSearch)

                      for (const slot of sorted) {
                        if (slot.timeFrom > lastEnd) {
                          gaps.push(`${lastEnd} – ${slot.timeFrom}`)
                        }
                        if (slot.timeTo > lastEnd) {
                          lastEnd = slot.timeTo
                        }
                      }
                      if (lastEnd < '22:00') {
                        gaps.push(`${lastEnd} – 22:00`)
                      }

                      if (gaps.length === 0)
                        return (
                          <div className="m-auto flex flex-col items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-muted-foreground" />
                            <span className="text-xs font-black text-muted-foreground uppercase">
                              Hết lịch trống hôm nay
                            </span>
                          </div>
                        )

                      return gaps.map((g, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const parts = g.split(' – ')
                            const f = parts[0] || ''
                            const t = parts[1] || ''
                            setTimeFrom(f)
                            setTimeTo(t)
                          }}
                          className="px-5 py-3 bg-white border-2 border-primary/20 rounded-2xl text-sm font-black text-primary hover:bg-primary hover:text-white hover:border-primary transition-all shadow-md hover:shadow-primary/20 active:scale-95"
                        >
                          {g.replace(/:/g, 'h')}
                        </button>
                      ))
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase ml-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Từ
                    </label>
                    <div className="flex items-center justify-center w-full p-3.5 bg-muted/40 rounded-2xl border border-border focus-within:border-primary focus-within:bg-white transition-all shadow-sm">
                      <input
                        type="text"
                        placeholder="hh"
                        value={timeFrom ? timeFrom.split(':')[0] : ''}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 2)
                          if (parseInt(v) > 23) v = '23'
                          const m = timeFrom ? timeFrom.split(':')[1] || '' : ''
                          if (!v && !m) setTimeFrom('')
                          else setTimeFrom(`${v}:${m}`)
                          if (v.length === 2) {
                            document.getElementById('min-input-from')?.focus()
                          }
                        }}
                        onBlur={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 2)
                          if (v && v.length === 1) v = '0' + v
                          const m = timeFrom ? timeFrom.split(':')[1] || '' : ''
                          if (!v && !m) setTimeFrom('')
                          else setTimeFrom(`${v}:${m}`)
                        }}
                        className="w-12 text-right bg-transparent outline-none font-black text-foreground placeholder:text-muted-foreground/30 placeholder:font-bold text-lg"
                      />
                      <span className="font-black text-foreground mx-1 pb-1 text-xl">:</span>
                      <input
                        id="min-input-from"
                        type="text"
                        placeholder="mm"
                        value={timeFrom ? timeFrom.split(':')[1] || '' : ''}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 2)
                          if (parseInt(v) > 59) v = '59'
                          const h = timeFrom ? timeFrom.split(':')[0] || '00' : '00'
                          if (!h && !v) setTimeFrom('')
                          else setTimeFrom(`${h}:${v}`)
                        }}
                        onBlur={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 2)
                          if (v && v.length === 1) v = '0' + v
                          const h = timeFrom ? timeFrom.split(':')[0] || '00' : '00'
                          if (!h && !v) setTimeFrom('')
                          else setTimeFrom(`${h}:${v}`)
                        }}
                        className="w-12 text-left bg-transparent outline-none font-black text-foreground placeholder:text-muted-foreground/30 placeholder:font-bold text-lg"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase ml-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Đến
                    </label>
                    <div className="flex items-center justify-center w-full p-3.5 bg-muted/40 rounded-2xl border border-border focus-within:border-primary focus-within:bg-white transition-all shadow-sm">
                      <input
                        type="text"
                        placeholder="hh"
                        value={timeTo ? timeTo.split(':')[0] : ''}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 2)
                          if (parseInt(v) > 23) v = '23'
                          const m = timeTo ? timeTo.split(':')[1] || '' : ''
                          if (!v && !m) setTimeTo('')
                          else setTimeTo(`${v}:${m}`)
                          if (v.length === 2) {
                            document.getElementById('min-input-to')?.focus()
                          }
                        }}
                        onBlur={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 2)
                          if (v && v.length === 1) v = '0' + v
                          const m = timeTo ? timeTo.split(':')[1] || '' : ''
                          if (!v && !m) setTimeTo('')
                          else setTimeTo(`${v}:${m}`)
                        }}
                        className="w-12 text-right bg-transparent outline-none font-black text-foreground placeholder:text-muted-foreground/30 placeholder:font-bold text-lg"
                      />
                      <span className="font-black text-foreground mx-1 pb-1 text-xl">:</span>
                      <input
                        id="min-input-to"
                        type="text"
                        placeholder="mm"
                        value={timeTo ? timeTo.split(':')[1] || '' : ''}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 2)
                          if (parseInt(v) > 59) v = '59'
                          const h = timeTo ? timeTo.split(':')[0] || '00' : '00'
                          if (!h && !v) setTimeTo('')
                          else setTimeTo(`${h}:${v}`)
                        }}
                        onBlur={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 2)
                          if (v && v.length === 1) v = '0' + v
                          const h = timeTo ? timeTo.split(':')[0] || '00' : '00'
                          if (!h && !v) setTimeTo('')
                          else setTimeTo(`${h}:${v}`)
                        }}
                        className="w-12 text-left bg-transparent outline-none font-black text-foreground placeholder:text-muted-foreground/30 placeholder:font-bold text-lg"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase ml-1">Lý do</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={2}
                    className="w-full p-4 bg-muted/40 rounded-2xl border border-border font-medium outline-none resize-none focus:border-primary transition-all"
                  />
                </div>
                {(user?.role === 'MANAGER' || user?.role === 'BOD') && (
                  <label className="flex items-center gap-4 bg-amber-50 p-4 rounded-2xl cursor-pointer ring-1 ring-amber-100 hover:bg-amber-100 transition-all">
                    <input
                      type="checkbox"
                      checked={isEmergency}
                      onChange={(e) => setIsEmergency(e.target.checked)}
                      className="accent-amber-600 w-5 h-5"
                    />
                    <span className="text-[11px] font-black text-amber-700 uppercase">
                      🚨 Đặt khẩn cấp (Ghi đè lịch trùng)
                    </span>
                  </label>
                )}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="flex-1 py-4 font-bold uppercase text-muted-foreground hover:text-foreground transition-all"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-primary text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : editingId ? (
                      'Cập nhật'
                    ) : (
                      'Xác nhận'
                    )}
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
