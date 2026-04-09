import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { DayPicker } from 'react-day-picker'
import { vi as localeVi } from 'date-fns/locale'
import { format, isSameMonth } from 'date-fns'
import { CalendarDays, Clock, MapPin, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import 'react-day-picker/style.css'

type ClassOperationalStatus = 'dang_hoat_dong' | 'da_ngung'

type ClassScheduleSlot = {
  id: string
  dateIso: string
  start: string
  end: string
  topic: string
  location: string
}

type ClassMemberRow = {
  id: string
  fullName: string
  email: string
  position: string
}

export type StaffEnrolledClassMock = {
  id: string
  /** Một member chỉ có một lớp trong kỳ — nhãn kỳ (vd. Q2/2026) */
  periodLabel: string
  name: string
  teacherName: string
  startAt: string
  endAt: string
  status: ClassOperationalStatus
  scheduleSlots: ClassScheduleSlot[]
  members: ClassMemberRow[]
}

/**
 * Mock: đúng một lớp trong kỳ hiện tại — thay bằng API (vd. GET /me/classes/current-period).
 */
export const MOCK_MEMBER_CLASS_THIS_PERIOD: StaffEnrolledClassMock = {
  id: 'cls-current',
  periodLabel: 'Q2/2026',
  name: 'Lớp Tập sự – Nhóm Alpha',
  teacherName: 'Trần Thu Hà',
  startAt: '2026-04-01',
  endAt: '2026-06-30',
  status: 'dang_hoat_dong',
  scheduleSlots: [
    {
      id: 'cls-current-s1',
      dateIso: '2026-04-10',
      start: '09:00',
      end: '11:30',
      topic: 'Tư duy & văn hóa VCB',
      location: 'Phòng đào tạo tầng 3 — HO',
    },
    {
      id: 'cls-current-s2',
      dateIso: '2026-04-10',
      start: '14:00',
      end: '16:00',
      topic: 'Quy trình nghiệp vụ cốt lõi',
      location: 'Microsoft Teams',
    },
    {
      id: 'cls-current-s3',
      dateIso: '2026-04-17',
      start: '08:30',
      end: '12:00',
      topic: 'Kiểm tra giữa khóa',
      location: 'Phòng đào tạo tầng 3 — HO',
    },
    {
      id: 'cls-current-s4',
      dateIso: '2026-05-08',
      start: '08:00',
      end: '11:00',
      topic: 'Kỹ năng chuyên môn nâng cao',
      location: 'Trung tâm đào tạo VCB',
    },
  ],
  members: [
    {
      id: 'm1',
      fullName: 'Trần Trung Hiếu',
      email: 'hieu.tran@vcb.demo',
      position: 'Tập sự — Khối KHDN',
    },
    {
      id: 'm2',
      fullName: 'Nguyễn Thị Mai',
      email: 'mai.nguyen@vcb.demo',
      position: 'Tập sự — Chi nhánh HN',
    },
    {
      id: 'm3',
      fullName: 'Phạm Quốc Anh',
      email: 'anh.pham@vcb.demo',
      position: 'Tập sự — Khối Cá nhân',
    },
    { id: 'm4', fullName: 'Lê Hoàng Yến', email: 'yen.le@vcb.demo', position: 'Tập sự — Hội sở' },
  ],
}

function formatDateVi(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('vi-VN')
}

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  contentWidth = 'default',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** `wide`: chỗ hiển thị lịch tháng */
  contentWidth?: 'default' | 'wide'
}) {
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative z-[1] flex max-h-[min(92vh,860px)] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-[var(--shadow-card)] sm:rounded-2xl',
          contentWidth === 'wide' ? 'sm:max-w-2xl' : 'sm:max-w-xl'
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 space-y-1">
            <h2 id={titleId} className="text-lg font-bold text-foreground">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

function ClassScheduleContent({ slots }: { slots: ClassScheduleSlot[] }) {
  const defaultMonth = useMemo(() => {
    if (slots.length === 0) return new Date()
    const first = [...slots].sort((a, b) => a.dateIso.localeCompare(b.dateIso))[0]!
    return new Date(`${first.dateIso}T12:00:00`)
  }, [slots])

  const [month, setMonth] = useState<Date>(defaultMonth)
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)

  const sessionDates = useMemo(() => {
    const keys = new Set(slots.map((s) => s.dateIso))
    return [...keys].map((iso) => new Date(`${iso}T12:00:00`))
  }, [slots])

  const slotsInMonth = useMemo(() => {
    return slots
      .filter((s) => isSameMonth(new Date(`${s.dateIso}T12:00:00`), month))
      .sort((a, b) => `${a.dateIso} ${a.start}`.localeCompare(`${b.dateIso} ${b.start}`))
  }, [slots, month])

  const displayedSlots = useMemo(() => {
    if (!selectedDay) return slotsInMonth
    const key = format(selectedDay, 'yyyy-MM-dd')
    return slotsInMonth.filter((s) => s.dateIso === key)
  }, [slotsInMonth, selectedDay])

  if (slots.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Chưa có buổi học trong lịch.</p>
    )
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'rounded-xl border border-border bg-muted/15 p-3 sm:p-4',
          '[&_.rdp-root]:mx-auto [&_.rdp-root]:w-full',
          '[&_.rdp-months]:mx-auto [&_.rdp-month]:w-full',
          '[&_.rdp-weekday]:text-muted-foreground [&_.rdp-caption_label]:text-foreground',
          '[&_.rdp-button]:text-foreground [&_.rdp-day_button]:min-h-9 [&_.rdp-day_button]:text-sm',
          '[&_.rdp-selected]:!bg-primary [&_.rdp-selected]:!text-primary-foreground'
        )}
      >
        <DayPicker
          locale={localeVi}
          month={month}
          onMonthChange={setMonth}
          mode="single"
          selected={selectedDay}
          onSelect={setSelectedDay}
          showOutsideDays
          fixedWeeks
          modifiers={{ hasSession: sessionDates }}
          modifiersClassNames={{
            hasSession: cn(
              'font-semibold text-primary',
              'relative rounded-md bg-primary/12',
              'data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground'
            ),
          }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Chọn ngày trên lịch để lọc buổi học; đổi tháng bằng mũi tên. Có chấm nền là ngày có lịch.
      </p>

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-primary-700">
          {selectedDay
            ? `Buổi học ngày ${format(selectedDay, 'dd/MM/yyyy', { locale: localeVi })}`
            : `Buổi học trong tháng ${format(month, 'MMMM yyyy', { locale: localeVi })}`}
        </h3>
        {displayedSlots.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/10 py-6 text-center text-sm text-muted-foreground">
            Không có buổi học{selectedDay ? ' vào ngày đã chọn' : ''} trong tháng này.
          </p>
        ) : (
          <ul className="space-y-3">
            {displayedSlots.map((row) => (
              <li key={row.id}>
                <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {format(new Date(`${row.dateIso}T12:00:00`), 'EEEE, dd/MM/yyyy', {
                      locale: localeVi,
                    })}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock
                      className="h-4 w-4 shrink-0 text-primary-600"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <time dateTime={`${row.dateIso}T${row.start}:00`}>
                      {row.start} – {row.end}
                    </time>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">{row.topic}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {row.location}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function statusLabel(status: ClassOperationalStatus) {
  return status === 'dang_hoat_dong' ? 'Đang hoạt động' : 'Đã ngừng'
}

function statusBadgeClass(status: ClassOperationalStatus) {
  return status === 'dang_hoat_dong'
    ? 'bg-emerald-100 text-emerald-900'
    : 'bg-muted text-muted-foreground'
}

export function MemberClassesPanel() {
  const cls = MOCK_MEMBER_CLASS_THIS_PERIOD
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)

  const closeSchedule = useCallback(() => setScheduleOpen(false), [])
  const closeMembers = useCallback(() => setMembersOpen(false), [])

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Kỳ hiện tại: <span className="font-semibold text-foreground">{cls.periodLabel}</span>
        <span className="text-muted-foreground"> — mỗi nhân sự chỉ được xếp một lớp trong kỳ.</span>
      </p>

      <div className="overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-primary/12 via-teal-500/8 to-violet-500/8">
                <th className="px-4 py-3 font-semibold">Kỳ</th>
                <th className="px-4 py-3 font-semibold">Tên lớp</th>
                <th className="px-4 py-3 font-semibold">Giáo viên</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Bắt đầu</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Kết thúc</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/80 bg-card transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 align-middle">
                  <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                    {cls.periodLabel}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle font-semibold text-foreground">{cls.name}</td>
                <td className="px-4 py-3 align-middle text-foreground">{cls.teacherName}</td>
                <td className="px-4 py-3 align-middle tabular-nums text-muted-foreground">
                  {formatDateVi(cls.startAt)}
                </td>
                <td className="px-4 py-3 align-middle tabular-nums text-muted-foreground">
                  {formatDateVi(cls.endAt)}
                </td>
                <td className="px-4 py-3 align-middle">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                      statusBadgeClass(cls.status)
                    )}
                  >
                    {statusLabel(cls.status)}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-semibold"
                      onClick={() => setScheduleOpen(true)}
                    >
                      <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Lịch học
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="font-semibold"
                      onClick={() => setMembersOpen(true)}
                    >
                      <Users className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Thành viên
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>1 lớp trong kỳ {cls.periodLabel}</span>
        </div>
      </div>

      <Modal
        open={scheduleOpen}
        onClose={closeSchedule}
        title="Lịch học"
        description={cls.name}
        contentWidth="wide"
      >
        <ClassScheduleContent slots={cls.scheduleSlots} />
      </Modal>

      <Modal
        open={membersOpen}
        onClose={closeMembers}
        title="Danh sách thành viên"
        description={cls.name}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Vị trí</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cls.members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.fullName}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  {m.email}
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">{m.position}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Modal>
    </>
  )
}
