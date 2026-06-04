import { Link } from '@tanstack/react-router'
import { MoreHorizontal, X } from 'lucide-react'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { toast } from 'sonner'
import { CARD_ENTRANCE } from '@/lib/cardMotion'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import {
  avatarClassForRole,
  employeePortraitUrl,
  levelPillText,
  roleBadgeClass,
  roleShortLabel,
  employeeDeptDisplay,
  employeeTeamsDisplay,
  shortId,
  statusLabelVi,
  statusDotClass,
} from './employeeListUtils'

function statusBadge(status: EmployeeEntity['status']) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          Hoạt động
        </span>
      )
    case 'RESERVED':
    case 'PROBATION':
      return (
        <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-900 dark:text-amber-200">
          Bảo lưu / Thử việc
        </span>
      )
    case 'INACTIVE':
      return (
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
          Ngừng HĐ
        </span>
      )
    default:
      return null
  }
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('vi-VN')
}

function fmtDate(value: string | null | undefined): string {
  if (!value?.trim()) return '—'
  const v = value.trim()
  // Ho tro du lieu cu dang Unix timestamp (seconds/ms) de tranh hien thi so tho.
  if (/^\d{10,13}$/.test(v)) {
    const raw = Number(v)
    if (!Number.isNaN(raw)) {
      const ts = v.length === 10 ? raw * 1000 : raw
      const d = new Date(ts)
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('vi-VN')
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(`${v}T12:00:00`).toLocaleDateString('vi-VN')
  }
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString('vi-VN')
}

export interface EmployeeDetailSheetProps {
  employee: EmployeeEntity | null
  onClose: () => void
  onDeactivate: (id: string) => void
  onReactivate?: (id: string) => void
  canDeactivate?: boolean
  canReactivate?: boolean
}

export function EmployeeDetailSheet({
  employee,
  onClose,
  onDeactivate,
  onReactivate,
  canDeactivate = true,
  canReactivate = true,
}: EmployeeDetailSheetProps) {
  if (!employee) return null

  const xpPct = Math.min(100, Math.round((employee.currentStar / 6) * 100))
  const portraitUrl = employeePortraitUrl(employee.avatarUrl)
  const tierLine = levelPillText(employee.currentLevel)
  const positionLabel = ROLE_LABEL_VI[employee.role]
  const idShort = shortId(employee.id)
  const teamLine = employeeTeamsDisplay(employee)

  return (
    <aside
      className={cn(
        'fixed bottom-0 right-0 top-16 z-40 flex w-[min(100vw,380px)] min-w-[280px] max-w-[420px] flex-shrink-0 flex-col overflow-hidden border-l border-primary/20 bg-gradient-to-b from-indigo-50/50 via-card to-cyan-50/40 shadow-[var(--shadow-card)]',
        CARD_ENTRANCE
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-primary/15 bg-gradient-to-r from-white via-indigo-50/60 to-cyan-50/50 px-6 pb-4 pt-6">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Chi tiết nhân sự</h2>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Thao tác khác"
            onClick={() => toast.info('Menu thao tác sẽ được bổ sung.')}
          >
            <MoreHorizontal className="size-5" strokeWidth={2} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="size-5" strokeWidth={2} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div
              className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-br from-primary/20 to-cyan-400/20 blur-xl"
              aria-hidden
            />
            <EmployeeAvatar
              name={employee.name}
              photoUrl={portraitUrl}
              fallbackClassName={cn('font-extrabold', avatarClassForRole(employee.role))}
              className="relative h-24 w-24 rounded-2xl border-4 border-primary/20 text-3xl font-extrabold shadow-lg ring-2 ring-background"
            />
            <span
              className={cn(
                'absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-4 border-card shadow-sm',
                statusDotClass(employee.status)
              )}
            />
          </div>
          <h3 className="mb-1 text-xl font-bold text-foreground">{employee.name}</h3>
          <p className="mb-3 text-sm font-semibold text-indigo-600">{positionLabel}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-indigo-300/40 bg-indigo-500/12 px-3 py-1 text-xs font-bold tracking-tight text-indigo-700">
              {tierLine}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              ID: {idShort.toUpperCase()}
            </span>
            {statusBadge(employee.status)}
          </div>
          <p className="mt-3 max-w-full break-all text-xs text-muted-foreground">
            {employee.email}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-bold',
                roleBadgeClass(employee.role)
              )}
            >
              {roleShortLabel(employee.role)}
            </span>
            <span
              className="max-w-[150px] truncate rounded-full bg-primary/[0.08] px-2 py-0.5 text-xs font-semibold text-primary-700"
              title={employeeDeptDisplay(employee)}
            >
              {employeeDeptDisplay(employee)}
            </span>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-indigo-500/[0.06] p-4">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Cấp sao
            </span>
            <span className="text-xl font-bold text-indigo-600">{employee.currentStar}/6</span>
          </div>
          <div className="rounded-xl border border-cyan-300/35 bg-gradient-to-br from-cyan-500/[0.08] to-blue-500/[0.06] p-4">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Tiến độ
            </span>
            <span className="text-xl font-bold text-cyan-700">{xpPct}%</span>
          </div>
        </div>

        <div className="mb-8">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-700/80">
            Thông tin từ API
          </h4>
          <div className="grid grid-cols-1 gap-2.5">
            <div className="rounded-lg border border-indigo-200/70 bg-white/85 px-3 py-2 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Phòng ban</p>
              <p className="text-xs font-semibold text-foreground">
                {employeeDeptDisplay(employee)}
              </p>
            </div>
            <div className="rounded-lg border border-cyan-200/70 bg-white/85 px-3 py-2 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Team</p>
              <p className="text-xs font-semibold text-foreground">{teamLine}</p>
            </div>
            <div className="rounded-lg border border-emerald-200/70 bg-white/85 px-3 py-2 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Số điện thoại</p>
              <p className="text-xs font-semibold text-foreground">{employee.phone || '—'}</p>
            </div>
            <div className="rounded-lg border border-violet-200/70 bg-white/85 px-3 py-2 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ngày sinh</p>
              <p className="text-xs font-semibold text-foreground">{fmtDate(employee.birthDate)}</p>
            </div>
            <div className="rounded-lg border border-amber-200/75 bg-white/85 px-3 py-2 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ngày bắt đầu</p>
              <p className="text-xs font-semibold text-foreground">{fmtDate(employee.startDate)}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Hoạt động gần đây
          </h4>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
                aria-hidden
              />
              <div>
                <p className="text-xs font-bold text-foreground">Cập nhật hồ sơ</p>
                <p className="text-xs text-muted-foreground">{fmtDateTime(employee.updatedAt)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40"
                aria-hidden
              />
              <div>
                <p className="text-xs font-medium text-foreground">Tạo hồ sơ</p>
                <p className="text-xs text-muted-foreground">{fmtDateTime(employee.createdAt)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40"
                aria-hidden
              />
              <div>
                <p className="text-xs font-medium text-foreground">Trạng thái hiện tại</p>
                <p className="text-xs text-muted-foreground">{statusLabelVi(employee.status)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border px-6 py-4">
        <Link
          to="/hr-admin/$employeeId"
          params={{ employeeId: employee.id }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md transition-opacity hover:opacity-90"
        >
          Xem hồ sơ đầy đủ
        </Link>
        {employee.status === 'INACTIVE' && onReactivate && canReactivate ? (
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full rounded-xl border-primary/30 bg-primary/10 py-3 text-sm font-bold text-primary hover:bg-primary/15"
            onClick={() => onReactivate(employee.id)}
          >
            Kích hoạt lại
          </Button>
        ) : null}
        {employee.status !== 'INACTIVE' && canDeactivate ? (
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full rounded-xl border-destructive/40 bg-destructive/10 py-3 text-sm font-bold text-destructive hover:bg-destructive/15"
            onClick={() => onDeactivate(employee.id)}
          >
            Hủy hoạt động
          </Button>
        ) : null}
      </div>
    </aside>
  )
}
