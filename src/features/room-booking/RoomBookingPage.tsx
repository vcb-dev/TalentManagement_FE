import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  finishBooking,
  type MeetingBooking,
  type BookedSlot,
} from './api'
import { useVnTime, getVnNow } from '@/hooks/useVnTime'

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

function BookingStatusBadge({
  b,
  vnTime,
}: {
  b: MeetingBooking
  vnTime: { date: string; time: string }
}) {
  const { date: td, time: ct } = vnTime
  const isPast = b.date < td || (b.date === td && b.timeTo <= ct)

  if (b.status === 'approved' && b.timeStatus === 'ongoing')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-indigo-700 animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
        Đang họp
      </span>
    )

  if (b.status === 'approved' && (isPast || b.timeStatus === 'done'))
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-blue-700">
        ✓ Đã họp xong
      </span>
    )

  if (b.status === 'pending' && (isPast || b.timeStatus === 'done'))
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
  handleRejectId: (id: string) => void
  handleEdit: (b: MeetingBooking) => void
  handleDelete: (id: string) => void
  handleFinish: (id: string) => void
  variant?: 'table' | 'mobile'
  vnTime: { date: string; time: string }
}

function BookingRowActions({
  b,
  user,
  isPrivileged,
  processingId,
  handleApprove,
  handleRejectId,
  handleEdit,
  handleDelete,
  handleFinish,
  variant = 'table',
  vnTime,
}: BookingRowActionsProps) {
  const mobile = variant === 'mobile'
  const btnWrap = mobile ? 'w-full justify-center' : ''
  const isOwner = b.userId === user?.id

  // 1. TÍNH TOÁN TRẠNG THÁI QUÁ HẠN (GIỐNG BADGE)
  const { date: td, time: ct } = vnTime
  const isPast = b.date < td || (b.date === td && b.timeTo <= ct)
  const isOverdueOrDone = isPast || b.timeStatus === 'done'

  // QUÁ HẠN THÌ TUYỆT ĐỐI KHÔNG HIỂN THỊ NÚT NÀO
  if (isOverdueOrDone) {
    return null
  }

  return (
    <div className={mobile ? 'flex w-full flex-col gap-2' : 'flex items-center justify-end gap-2'}>
      {/* NÚT ĐÃ HỌP XONG: Chỉ hiện khi ĐANG HỌP và là lịch ĐÃ DUYỆT */}
      {b.status === 'approved' && b.timeStatus === 'ongoing' && (isOwner || isPrivileged) && (
        <button
          type="button"
          onClick={() => handleFinish(b.id)}
          disabled={!!processingId}
          className={`flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50 ${btnWrap}`}
        >
          {processingId === b.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          <span>ĐÃ HỌP XONG</span>
        </button>
      )}

      {/* NÚT DUYỆT/TỪ CHỐI DÀNH CHO ADMIN: Chỉ hiện khi CHỜ DUYỆT và CHƯA HỌP */}
      {isPrivileged && b.status === 'pending' && b.timeStatus !== 'ongoing' && (
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
            onClick={() => handleRejectId(b.id)}
            disabled={!!processingId}
            className={`group flex items-center gap-2 rounded-xl border-2 border-rose-100 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 transition-all hover:border-rose-200 hover:bg-rose-50 active:scale-95 disabled:opacity-50 ${btnWrap}`}
          >
            <X className="h-3 w-3" />
            <span>TỪ CHỐI</span>
          </button>
        </>
      )}

      {/* NÚT ĐỔI LỊCH & HỦY DÀNH CHO CHỦ SỞ HỮU: Chỉ hiện khi CHƯA HỌP và trạng thái CHƯA KẾT THÚC */}
      {isOwner &&
        b.timeStatus !== 'ongoing' &&
        (b.status === 'approved' || b.status === 'pending' || b.status === 'rejected') && (
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
    handleRejectId,
    handleEdit,
    handleDelete,
    handleFinish,
    vnTime,
  }: {
    b: MeetingBooking
    user: ReturnType<typeof useAuthStore.getState>['user']
    isPrivileged: boolean
    processingId: string | null
    handleApprove: (id: string) => void
    handleRejectId: (id: string) => void
    handleEdit: (b: MeetingBooking) => void
    handleDelete: (id: string) => void
    handleFinish: (id: string) => void
    variant?: 'table' | 'mobile'
    vnTime: { date: string; time: string }
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
          <BookingStatusBadge b={b} vnTime={vnTime} />
        </div>
        <BookingRowActions
          b={b}
          user={user}
          isPrivileged={isPrivileged}
          processingId={processingId}
          handleApprove={handleApprove}
          handleRejectId={handleRejectId}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          handleFinish={handleFinish}
          variant="mobile"
          vnTime={vnTime}
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
    handleRejectId,
    handleEdit,
    handleDelete,
    handleFinish,
    vnTime,
  }: {
    b: MeetingBooking
    user: ReturnType<typeof useAuthStore.getState>['user']
    isPrivileged: boolean
    processingId: string | null
    handleApprove: (id: string) => void
    handleRejectId: (id: string) => void
    handleEdit: (b: MeetingBooking) => void
    handleDelete: (id: string) => void
    handleFinish: (id: string) => void
    variant?: 'table' | 'mobile'
    vnTime: { date: string; time: string }
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
        <td className="whitespace-nowrap px-6 py-4">
          <BookingStatusBadge b={b} vnTime={vnTime} />
        </td>
        <td className="px-6 py-5 text-right">
          <BookingRowActions
            b={b}
            user={user}
            isPrivileged={isPrivileged}
            processingId={processingId}
            handleApprove={handleApprove}
            handleRejectId={handleRejectId}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            handleFinish={handleFinish}
            variant="table"
            vnTime={vnTime}
          />
        </td>
      </tr>
    )
  }
)

export default function RoomBookingPage() {
  const queryClient = useQueryClient()
  const vnTime = useVnTime()
  const search = useSearch({ from: '/_protected/room-booking' }) as any
  const user = useAuthStore((s) => s.user)
  const isPrivileged = user?.role === 'HR' || user?.role === 'MANAGER' || user?.role === 'BOD'

  const [showModal, setShowModal] = useState(false)
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

  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'team' | 'mine' | 'requests'>('today')
  const [selectedRoom, setSelectedRoom] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [finishConfirmId, setFinishConfirmId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const prevBookingsCount = useRef(0)

  // Query Data
  const { data: bookings = [], isLoading: isFetching } = useQuery({
    queryKey: ['room-bookings'],
    queryFn: getBookings,
    refetchInterval: 10000,
    meta: {
      onSuccess: (data: MeetingBooking[]) => {
        if (data.length > prevBookingsCount.current && prevBookingsCount.current > 0) {
          showNotification('Lịch họp mới', `Có yêu cầu đặt phòng mới vừa được cập nhật.`)
        }
        prevBookingsCount.current = data.length
      },
    },
  })

  // Mutations
  const createMut = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] })
      setShowModal(false)
      resetForm()
      const msg = isEmergency
        ? 'Đặt phòng khẩn cấp thành công'
        : 'Đặt phòng thành công, vui lòng chờ duyệt'
      setSuccess(msg)
      speak(msg)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi hệ thống'
      setError(msg)
      speak(`Lỗi: ${msg}`)
    },
  })

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: any }) => updateBooking(vars.id, vars.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] })
      setShowModal(false)
      resetForm()
      setSuccess('Cập nhật lịch họp thành công')
      speak('Đã cập nhật lịch họp')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi hệ thống'
      setError(msg)
      speak(`Lỗi: ${msg}`)
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteBooking,
    onMutate: (id) => setProcessingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] })
      speak('Đã hủy lịch họp')
    },
    onSettled: () => setProcessingId(null),
  })

  const approveMut = useMutation({
    mutationFn: approveBooking,
    onMutate: (id) => setProcessingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] })
      speak('Đã duyệt lịch họp thành công')
    },
    onSettled: () => setProcessingId(null),
  })

  const rejectMut = useMutation({
    mutationFn: (vars: { id: string; reason: string }) => rejectBooking(vars.id, vars.reason),
    onMutate: (vars) => setProcessingId(vars.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] })
      setRejectId(null)
      speak('Đã từ chối lịch họp')
    },
    onSettled: () => setProcessingId(null),
  })

  const finishMut = useMutation({
    mutationFn: finishBooking,
    onMutate: (id) => setProcessingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi hệ thống'
      setError(msg)
    },
    onSettled: () => setProcessingId(null),
  })

  useEffect(() => {
    if (search.tab === 'requests') {
      setFilter('requests')
    } else {
      setFilter('today')
    }
    setPage(1)
  }, [search.tab])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!showModal || !room || !date) return
    getAvailability(room, date)
      .then((r) => setBookedSlots(r.bookedSlots))
      .catch(() => setBookedSlots([]))
  }, [showModal, room, date])

  const filtered = useMemo(() => {
    const { date: todayDate } = vnTime

    // Calculate Tomorrow Date
    const tomorrow = new Date(todayDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]

    let result = bookings.filter((b) => {
      // Step 1: Base tab filters
      if (filter === 'requests') return b.status === 'pending'
      if (filter === 'mine') return b.userId === user?.id
      if (filter === 'today') return b.date === todayDate
      if (filter === 'tomorrow') return b.date === tomorrowDate
      if (filter === 'team') {
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
      return true
    })

    // Step 2: Room filter
    if (selectedRoom !== 'all') {
      result = result.filter((b) => b.room === selectedRoom)
    }

    // Step 3: Sorting (Time from small to large)
    return result.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.timeFrom.localeCompare(b.timeFrom)
    })
  }, [bookings, filter, selectedRoom, user?.id, user?.team, vnTime])

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
    const { date: vnDate, time: vnTimeStr } = vnTime
    if (date < vnDate) {
      const m = 'Không thể đặt lịch trong quá khứ'
      setError(m)
      speak(m)
      return
    }
    if (date === vnDate && timeFrom < vnTimeStr) {
      const m = 'Thời gian bắt đầu không thể ở quá khứ'
      setError(m)
      speak(m)
      return
    }

    const payload = { room, date, timeFrom, timeTo, reason, note, isEmergency }
    if (editingId) {
      updateMut.mutate({ id: editingId, payload })
    } else {
      createMut.mutate(payload)
    }
  }

  async function handleApprove(id: string) {
    approveMut.mutate(id)
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) {
      alert('Vui lòng nhập lý do')
      return
    }
    rejectMut.mutate({ id: rejectId, reason: rejectReason })
  }

  async function handleDelete(id: string) {
    setDeleteConfirmId(id)
  }

  async function executeDelete() {
    if (!deleteConfirmId) return
    deleteMut.mutate(deleteConfirmId)
    setDeleteConfirmId(null)
  }

  async function handleFinish(id: string) {
    setFinishConfirmId(id)
  }

  async function executeFinish() {
    if (!finishConfirmId) return
    finishMut.mutate(finishConfirmId)
    setFinishConfirmId(null)
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
          <div className="flex flex-wrap items-center gap-3">
            {(createMut.isPending || updateMut.isPending || isFetching) && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider">Đang cập nhật...</span>
              </div>
            )}
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
          <div className="flex flex-col gap-6 border-b border-border/50 p-6 bg-muted/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {search.tab === 'requests' ? (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-1 bg-rose-500 rounded-full" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-rose-600">
                    Duyệt yêu cầu đổi lịch
                  </h2>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-background/50 border border-border/40 w-fit">
                  {(['today', 'tomorrow', 'team', 'mine'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFilter(f)
                        setPage(1)
                      }}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${filter === f ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-secondary'}`}
                    >
                      {f === 'today'
                        ? 'Hôm nay'
                        : f === 'tomorrow'
                          ? 'Ngày mai'
                          : f === 'team'
                            ? 'Team mình'
                            : 'Của tôi'}
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

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                Lọc theo phòng:
              </span>
              <div className="w-64">
                <CustomSelect
                  value={selectedRoom}
                  onValueChange={setSelectedRoom}
                  options={[
                    { value: 'all', label: 'Tất cả các phòng' },
                    ...ROOMS.map((r) => ({ value: r.id, label: r.name })),
                  ]}
                  placeholder="Chọn phòng..."
                />
              </div>
            </div>
          </div>

          {/* Table */}
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
                {isFetching && bookings.length === 0 ? (
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
                      handleRejectId={setRejectId}
                      handleEdit={handleEdit}
                      handleDelete={handleDelete}
                      handleFinish={handleFinish}
                      vnTime={vnTime}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-border/50 bg-card sm:hidden">
            {isFetching && bookings.length === 0 ? (
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
                  handleRejectId={setRejectId}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  handleFinish={handleFinish}
                  vnTime={vnTime}
                />
              ))
            )}
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
                    disabled={createMut.isPending || updateMut.isPending}
                    className="flex-1 py-4 bg-primary text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {createMut.isPending || updateMut.isPending ? (
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

      {finishConfirmId && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={() => setFinishConfirmId(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div
            className="relative w-full max-w-md bg-card p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">
                  Kết thúc họp sớm
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed px-4">
                  Bạn xác nhận đã họp xong và muốn giải phóng phòng cho người khác?
                </p>
              </div>
              <div className="flex w-full gap-4 pt-4">
                <button
                  onClick={() => setFinishConfirmId(null)}
                  className="flex-1 py-4 font-bold text-muted-foreground uppercase hover:bg-muted/50 rounded-2xl transition-all"
                >
                  Quay lại
                </button>
                <button
                  onClick={executeFinish}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  XÁC NHẬN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div
            className="relative w-full max-w-md bg-card p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-rose-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Hủy lịch họp</h3>
                <p className="text-muted-foreground text-sm leading-relaxed px-4">
                  Bạn có chắc chắn muốn hủy lịch họp này không? Hành động này không thể khôi phục.
                </p>
              </div>
              <div className="flex w-full gap-4 pt-4">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-4 font-bold text-muted-foreground uppercase hover:bg-muted/50 rounded-2xl transition-all"
                >
                  Quay lại
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl uppercase shadow-lg shadow-rose-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  XÁC NHẬN HỦY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
