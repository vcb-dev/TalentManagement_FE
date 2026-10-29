import { useState } from 'react'
import {
  CalendarClock,
  CalendarRange,
  ChevronDown,
  GraduationCap,
  Lock,
  LockOpen,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ManagerClass } from '@/features/manager/types'

type ClassStatus = 'open' | 'full' | 'closed'

const STATUS: Record<ClassStatus, { label: string; className: string; dot: string }> = {
  open: { label: 'Đang mở', className: 'bg-success-muted text-success', dot: 'bg-success' },
  full: { label: 'Đủ chỗ', className: 'bg-warning-muted text-warning', dot: 'bg-warning' },
  closed: {
    label: 'Đã đóng',
    className: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
}

const LEVEL_LABELS: Record<string, string> = {
  tap_su: 'Tập sự',
  biet_viec: 'Biết việc',
  duoc_viec: 'Được việc',
  dong_gop_ket_qua: 'Đóng góp kết quả',
  tuong: 'Tướng',
}

const DEFAULT_CAPACITY = 25

function toViDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('vi-VN')
}

/** Buổi thi sắp tới gần nhất; hết buổi sắp tới thì lấy buổi gần nhất đã qua; không có thì ngày thi dự kiến. */
function examLine(row: ManagerClass): string | null {
  const exams = (row.schedules ?? [])
    .filter((s) => s.isExam)
    .sort((a, b) => `${a.dateIso} ${a.startTime}`.localeCompare(`${b.dateIso} ${b.startTime}`))
  const today = new Date().toLocaleDateString('sv-SE')
  const pick = exams.find((s) => s.dateIso >= today) ?? exams[exams.length - 1]
  if (pick) return `${toViDate(pick.dateIso)} · ${pick.startTime}`
  return row.examDate ? toViDate(row.examDate) : null
}

function classPeriodLine(row: ManagerClass): string | null {
  if (row.startDate && row.endDate) {
    return `${toViDate(row.startDate)} – ${toViDate(row.endDate)}`
  }
  if (row.startDate) return `Từ ${toViDate(row.startDate)}`
  if (row.endDate) return `Đến ${toViDate(row.endDate)}`
  return null
}

interface ClassCardProps {
  row: ManagerClass
  /** Bỏ trống cả hai → thẻ chỉ xem (ẩn nút Sửa/Xoá), vd. HR có `hr.classes.view`. */
  onEdit?: (row: ManagerClass) => void
  onDelete?: (id: string) => void
  /** Đóng lớp (ngừng nhận đăng ký) hoặc mở lại. Bỏ trống → ẩn nút. */
  onToggleStatus?: (row: ManagerClass) => void
}

export function ClassCard({ row, onEdit, onDelete, onToggleStatus }: ClassCardProps) {
  const [membersOpen, setMembersOpen] = useState(false)

  const status = STATUS[row.status] ?? STATUS.open
  const isClosed = row.status === 'closed'
  const capacity = row.capacity ?? DEFAULT_CAPACITY
  const fillPct = Math.min(100, Math.round((row.memberCount / Math.max(capacity, 1)) * 100))
  const exam = examLine(row)
  const classPeriod = classPeriodLine(row)
  const isKnowledgeWork = row.isKnowledgeWork !== false
  const isEditor = row.kind === 'EDITOR'
  const members = row.members ?? []
  const membersId = `class-members-${row.id}`

  return (
    <article className="flex flex-col rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[0_8px_24px_-12px_rgb(15_23_42/0.18)]">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              status.className
            )}
          >
            <span className={cn('size-1.5 rounded-full', status.dot)} aria-hidden />
            {status.label}
          </span>
          {isKnowledgeWork ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-button/10 px-2.5 py-0.5 text-xs font-semibold text-button">
              <GraduationCap className="size-3.5" aria-hidden />
              {LEVEL_LABELS[row.levelFrom]} → {LEVEL_LABELS[row.levelTo]}
            </span>
          ) : isEditor ? (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              Editor · tự đồng bộ
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <h3
            className="line-clamp-2 text-base font-bold leading-snug text-foreground"
            title={row.name}
          >
            {row.name}
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            Giáo viên:{' '}
            <span className={cn('font-medium', row.teacher ? 'text-foreground' : 'italic')}>
              {row.teacher?.name ?? 'Chưa gán'}
            </span>
          </p>
        </div>

        <div className="mt-auto space-y-3">
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-muted-foreground">Sĩ số</span>
              <span className="font-semibold tabular-nums text-foreground">
                {row.memberCount}
                <span className="font-normal text-muted-foreground">/{capacity}</span>
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Sĩ số lớp"
              aria-valuenow={row.memberCount}
              aria-valuemin={0}
              aria-valuemax={capacity}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500 ease-out',
                  fillPct >= 100 ? 'bg-warning' : 'bg-button'
                )}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
          {classPeriod ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarRange className="size-3.5 shrink-0" aria-hidden />
              Thời gian:{' '}
              <span className="font-medium tabular-nums text-foreground">{classPeriod}</span>
            </p>
          ) : null}
          {exam ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5 shrink-0" aria-hidden />
              Lịch thi: <span className="font-medium tabular-nums text-foreground">{exam}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-border/70">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none disabled:cursor-default disabled:text-muted-foreground disabled:hover:bg-transparent"
          aria-expanded={membersOpen}
          aria-controls={membersId}
          disabled={members.length === 0}
          onClick={() => setMembersOpen((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" aria-hidden />
            {members.length === 0 ? 'Chưa có học viên' : `${members.length} học viên`}
          </span>
          {members.length > 0 ? (
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform duration-200',
                membersOpen && 'rotate-180'
              )}
              aria-hidden
            />
          ) : null}
        </button>
        {membersOpen ? (
          <ul id={membersId} className="max-h-64 space-y-0.5 overflow-y-auto px-3 pb-3">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/50"
              >
                <EmployeeAvatar
                  name={m.name}
                  className="size-7 shadow-none ring-0"
                  fallbackClassName="bg-button/10 text-button"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {onEdit || onDelete || onToggleStatus ? (
        <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border/70 px-3 py-2">
          {onToggleStatus ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'mr-auto h-8 min-h-8 gap-1.5 rounded-lg px-3 text-muted-foreground',
                isClosed
                  ? 'hover:bg-success-muted hover:text-success'
                  : 'hover:bg-warning-muted hover:text-warning'
              )}
              onClick={() => onToggleStatus(row)}
            >
              {isClosed ? (
                <LockOpen className="size-3.5" aria-hidden />
              ) : (
                <Lock className="size-3.5" aria-hidden />
              )}
              {isClosed ? 'Mở lại lớp' : 'Đóng lớp'}
            </Button>
          ) : null}
          {onEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 min-h-8 gap-1.5 rounded-lg px-3 text-muted-foreground hover:bg-button/10 hover:text-button"
              onClick={() => onEdit(row)}
            >
              <Pencil className="size-3.5" aria-hidden />
              Chỉnh sửa
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 min-h-8 gap-1.5 rounded-lg px-3 text-muted-foreground hover:bg-danger-muted hover:text-danger"
              onClick={() => onDelete(row.id)}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Xóa lớp
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
