import { Link } from '@tanstack/react-router'
import { MoreHorizontal, Plus, X } from 'lucide-react'
import { Award, Calendar, GraduationCap } from '@/components/icons'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { toast } from 'sonner'
import { CARD_ENTRANCE } from '@/lib/cardMotion'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import {
  avatarClassForRole,
  initialsFromName,
  levelPillText,
  roleBadgeClass,
  roleShortLabel,
  employeeDeptDisplay,
  shortId,
  statusDotClass,
} from './employeeListUtils'

function statusBadge(status: EmployeeEntity['status']) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
          Hoạt động
        </span>
      )
    case 'RESERVED':
    case 'PROBATION':
      return (
        <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-900 dark:text-amber-200">
          Bảo lưu / Thử việc
        </span>
      )
    case 'INACTIVE':
      return (
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
          Ngừng HĐ
        </span>
      )
    default:
      return null
  }
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
  const ini = initialsFromName(employee.name)
  const tierLine = levelPillText(employee.currentLevel)
  const positionLabel = ROLE_LABEL_VI[employee.role]
  const idShort = shortId(employee.id)

  return (
    <aside
      className={cn(
        'flex w-[min(100vw-1rem,380px)] min-w-[280px] max-w-[420px] flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card shadow-[var(--shadow-card)]',
        CARD_ENTRANCE
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 pb-4 pt-6">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Chi tiết nhân sự</h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Thao tác khác"
            onClick={() => toast.info('Menu thao tác sẽ được bổ sung.')}
          >
            <MoreHorizontal className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div
              className={cn(
                'flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-primary/20 text-3xl font-extrabold shadow-lg ring-2 ring-background',
                avatarClassForRole(employee.role)
              )}
            >
              {ini}
            </div>
            <span
              className={cn(
                'absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-4 border-card shadow-sm',
                statusDotClass(employee.status)
              )}
            />
          </div>
          <h3 className="mb-1 text-xl font-bold text-foreground">{employee.name}</h3>
          <p className="mb-3 text-sm font-medium text-primary">{positionLabel}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-tight text-primary">
              {tierLine}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold text-muted-foreground">
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
                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold',
                roleBadgeClass(employee.role)
              )}
            >
              {roleShortLabel(employee.role)}
            </span>
            <span
              className="max-w-[140px] truncate text-[10px] text-muted-foreground"
              title={employeeDeptDisplay(employee)}
            >
              {employeeDeptDisplay(employee)}
            </span>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Cấp sao
            </span>
            <span className="text-xl font-bold text-primary">{employee.currentStar}/6</span>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tiến độ
            </span>
            <span className="text-xl font-bold text-primary">{xpPct}%</span>
          </div>
        </div>

        <div className="mb-8">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Thành tích (demo)
          </h4>
          <div className="flex flex-wrap gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary"
              title="Cấp bậc"
            >
              <Award className="size-5 shrink-0" strokeWidth={2} aria-hidden />
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
              title="Tham gia"
            >
              <Calendar className="size-5 shrink-0" strokeWidth={2} aria-hidden />
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
              title="Học tập"
            >
              <GraduationCap className="size-5 shrink-0" strokeWidth={2} aria-hidden />
            </div>
            <div
              className="flex h-10 items-center justify-center gap-0.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 text-xs font-bold text-primary"
              title="Thêm thành tích (demo)"
            >
              <Plus className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
              <span>3</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
                <p className="text-[10px] text-muted-foreground">
                  {new Date(employee.updatedAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40"
                aria-hidden
              />
              <div>
                <p className="text-xs font-medium text-foreground">Đồng bộ từ hệ thống HRM</p>
                <p className="text-[10px] text-muted-foreground">Theo dữ liệu API</p>
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
          <button
            type="button"
            className="w-full rounded-xl border border-primary/30 bg-primary/10 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/15"
            onClick={() => onReactivate(employee.id)}
          >
            Kích hoạt lại
          </button>
        ) : null}
        {employee.status !== 'INACTIVE' && canDeactivate ? (
          <button
            type="button"
            className="w-full rounded-xl border border-destructive/40 bg-destructive/10 py-3 text-sm font-bold text-destructive transition-colors hover:bg-destructive/15"
            onClick={() => onDeactivate(employee.id)}
          >
            Hủy hoạt động
          </button>
        ) : null}
      </div>
    </aside>
  )
}
