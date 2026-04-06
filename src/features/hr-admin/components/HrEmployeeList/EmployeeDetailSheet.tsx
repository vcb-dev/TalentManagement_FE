import type { EmployeeEntity } from '@/features/hr-admin/api'
import { Link } from '@tanstack/react-router'
import { CARD_ENTRANCE } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import {
  avatarClassForRole,
  initialsFromName,
  levelMeta,
  roleBadgeClass,
  roleShortLabel,
  shortId,
} from './employeeListUtils'

function statusBadge(status: EmployeeEntity['status']) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="inline-flex rounded-full bg-[#DCFCE7] px-2 py-0.5 text-xs font-bold text-[#166534]">
          ✅ Hoạt động
        </span>
      )
    case 'RESERVED':
    case 'PROBATION':
      return (
        <span className="inline-flex rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-bold text-[#92400E]">
          ⚠️ Bảo lưu / Chờ thi
        </span>
      )
    case 'INACTIVE':
      return (
        <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-muted-foreground">
          ⏸ Ngừng hoạt động
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
  variant?: 'hr' | 'team' | 'leader'
  /** Khi variant team — truyền team đang lọc để link hồ sơ đúng ngữ cảnh. */
  teamId?: string
}

export function EmployeeDetailSheet({
  employee,
  onClose,
  onDeactivate,
  variant = 'hr',
  teamId,
}: EmployeeDetailSheetProps) {
  if (!employee) return null

  const { tierClass, label: tierLabel } = levelMeta(employee.currentLevel)
  const xpPct = Math.min(100, Math.round((employee.currentStar / 6) * 100))
  const ini = initialsFromName(employee.name)

  return (
    <aside
      className={cn(
        'flex w-[320px] min-w-[320px] flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card shadow-[var(--shadow-card)]',
        CARD_ENTRANCE
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 pb-3.5 pt-5">
        <div className="text-sm font-bold text-foreground">Chi tiết nhân viên</div>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-muted text-base text-muted-foreground transition-colors hover:bg-muted/80"
          onClick={onClose}
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-5 text-center">
          <div
            className={cn(
              'mx-auto mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-[20px] text-2xl font-extrabold shadow-[0_4px_16px_rgba(55,48,163,.2)]',
              avatarClassForRole(employee.role)
            )}
          >
            {ini}
          </div>
          <div className="mb-1 text-lg font-extrabold text-foreground">{employee.name}</div>
          <div className="mb-2.5 text-xs text-muted-foreground">{employee.email}</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-bold',
                roleBadgeClass(employee.role)
              )}
            >
              {roleShortLabel(employee.role)}
            </span>
            {statusBadge(employee.status)}
            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-bold', tierClass)}>
              {tierLabel}
            </span>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-gradient-to-br from-primary/8 to-primary/15 px-3.5 py-3">
          <div className="mb-1.5 flex justify-between text-xs font-bold text-primary">
            <span>⚔️ Tiến độ cấp bậc</span>
          </div>
          <div className="mb-1.5 text-xs text-primary">
            {employee.currentStar}/6 sao · PB {shortId(employee.departmentId)}
          </div>
          <div className="h-2 overflow-hidden rounded bg-primary/20">
            <div
              className="h-full rounded bg-gradient-to-r from-primary via-sky-600 to-accent"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2.5 border-b-2 border-primary/25 pb-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            Thống kê
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[10px] bg-muted/80 px-3 py-2.5">
              <div className="mb-0.5 text-xs font-semibold text-muted-foreground">📋 Cấp sao</div>
              <div className="text-lg font-extrabold text-foreground">{employee.currentStar}/6</div>
            </div>
            <div className="rounded-[10px] bg-muted/80 px-3 py-2.5">
              <div className="mb-0.5 text-xs font-semibold text-muted-foreground">📅 Cập nhật</div>
              <div className="text-sm font-extrabold text-foreground">
                {new Date(employee.updatedAt).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2.5 border-b-2 border-primary/25 pb-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            Lịch sử gần nhất
          </div>
          <div className="flex gap-2.5 border-b border-border py-2 first:pt-0">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <div>
              <div className="text-xs font-semibold text-foreground">Cập nhật hồ sơ</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Hệ thống ghi nhận</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-border px-6 py-3.5">
        {variant === 'team' || variant === 'leader' ? (
          <Link
            to={variant === 'leader' ? '/leader/team/$employeeId' : '/manager/team/$employeeId'}
            params={{ employeeId: employee.id }}
            search={teamId ? { teamId } : {}}
            className="flex-1 rounded-xl border-0 bg-gradient-to-br from-primary to-accent py-2.5 text-center text-sm font-bold text-white shadow-[var(--shadow-card)] transition-opacity hover:opacity-90"
          >
            Xem hồ sơ đầy đủ
          </Link>
        ) : (
          <>
            <Link
              to="/hr-admin/$employeeId"
              params={{ employeeId: employee.id }}
              className="flex-1 rounded-xl border-0 bg-gradient-to-br from-primary to-accent py-2.5 text-center text-sm font-bold text-white shadow-[var(--shadow-card)] transition-opacity hover:opacity-90"
            >
              Xem hồ sơ đầy đủ
            </Link>
            <button
              type="button"
              className="flex-1 rounded-xl border-[1.5px] border-[#FCA5A5] bg-[#FEE2E2] py-2.5 text-sm font-bold text-[#991B1B]"
              onClick={() => onDeactivate(employee.id)}
            >
              Hủy HĐ
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
