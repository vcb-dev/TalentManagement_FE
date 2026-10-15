import { BriefcaseBusiness, CircleHelp, Pencil, UsersRound } from 'lucide-react'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { CARD_ENTRANCE, staggerStyle } from '@/lib/cardMotion'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StarEmblem } from '@/components/icons/StarEmblem'
import {
  employeePortraitUrl,
  employeeTeamsDisplay,
  levelPillText,
  statusDotClass,
  statusLabelVi,
} from './employeeListUtils'

function StarRow({
  filled,
  align = 'center',
  compact,
}: {
  filled: number
  align?: 'center' | 'end'
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-px',
        align === 'end' ? 'justify-end' : 'justify-center',
        compact ? '' : 'mt-1'
      )}
    >
      {Array.from({ length: 6 }, (_, i) => {
        const full = i < Math.floor(filled)
        const partial = i === Math.floor(filled) && filled % 1 >= 0.5
        const variant = full ? 'filled' : partial ? 'current' : 'empty'
        return (
          <StarEmblem
            key={i}
            variant={variant}
            className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-[15px] w-[15px]')}
            aria-hidden
          />
        )
      })}
    </div>
  )
}

export interface EmployeeCardProps {
  employee: EmployeeEntity
  selected: boolean
  onSelect: () => void
  onView: (e: React.MouseEvent) => void
  onEdit: (e: React.MouseEvent) => void
  cardIndex?: number
  variant?: 'hr' | 'team'
  /** Thu nhỏ padding/avatar — dùng lưới 2 cột trên mobile. */
  compact?: boolean
}

export function EmployeeCard({
  employee,
  selected,
  onSelect,
  onView,
  onEdit,
  cardIndex,
  variant = 'hr',
  compact = false,
}: EmployeeCardProps) {
  const tierLine = levelPillText(employee.currentLevel)
  const inactive = employee.status === 'INACTIVE'
  const portraitUrl = employeePortraitUrl(employee.avatarUrl)
  const teamLine = employeeTeamsDisplay(employee)
  const employeeCode = employee.employeeCodePrimary?.trim() || 'Chưa cấp'
  const positionLabel = employee.role === 'BOD' ? 'BOD' : ROLE_LABEL_VI[employee.role]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[1.25rem] border border-slate-200/90 bg-card text-left shadow-[0_12px_30px_-22px_rgba(0,68,49,0.55)] dark:border-slate-800',
        compact ? 'p-3 sm:p-4' : 'p-4',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        'hover:-translate-y-1 hover:border-[#008b64]/50 hover:shadow-[0_18px_38px_-22px_rgba(0,108,73,0.55)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008b64]/30',
        cardIndex !== undefined && CARD_ENTRANCE,
        selected
          ? 'border-[#008b64] shadow-[0_16px_34px_-20px_rgba(0,108,73,0.65)] ring-2 ring-[#008b64]/15'
          : '',
        inactive && 'opacity-[0.55]'
      )}
      style={cardIndex !== undefined ? staggerStyle(Math.min(cardIndex, 16)) : undefined}
    >
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-1 bg-[#008b64] transition-[height] duration-200 group-hover:h-1.5',
          selected && 'h-1.5'
        )}
        aria-hidden
      />

      <div
        className={cn(
          'mb-4 flex items-start justify-between gap-2 pt-1 sm:gap-3',
          compact && 'mb-3'
        )}
      >
        <div className="relative shrink-0">
          <EmployeeAvatar
            name={employee.name}
            photoUrl={portraitUrl}
            fallbackClassName="bg-emerald-50 font-extrabold leading-tight text-[#006c49] dark:bg-emerald-950/70 dark:text-emerald-200"
            className={cn(
              'rounded-[1.1rem] border border-slate-200/80 font-extrabold shadow-[0_8px_22px_-14px_rgba(15,23,42,0.6)] ring-2 ring-background dark:border-slate-700',
              compact
                ? 'h-14 w-14 text-base sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl'
                : 'h-[4.5rem] w-[4.5rem] text-xl',
              inactive && 'grayscale-[0.35]'
            )}
          />
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-card shadow-sm',
              statusDotClass(employee.status)
            )}
          />
        </div>
        <div className="flex min-w-0 flex-col items-end gap-1.5">
          <span
            className={cn(
              'max-w-[6rem] truncate rounded-lg border border-emerald-200/80 bg-emerald-50 px-2 py-1 text-center text-[11px] font-bold tracking-tight text-[#006c49] dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 sm:max-w-[9rem]',
              compact && 'max-w-[5.5rem] px-1.5 sm:max-w-[9rem] sm:px-2'
            )}
            title={tierLine}
          >
            {tierLine}
          </span>
          <div className="min-w-[4.5rem]">
            {employee.currentStar > 0 ? (
              <StarRow filled={employee.currentStar} align="end" compact />
            ) : (
              <p className="text-right text-[11px] font-medium text-muted-foreground">
                {inactive ? '—' : 'Chưa có sao'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={cn('mb-4 min-w-0', compact && 'mb-3')}>
        <h3
          className={cn(
            'line-clamp-2 font-bold leading-snug tracking-[-0.01em] text-foreground',
            compact ? 'text-sm sm:text-base' : 'text-base',
            inactive && 'text-muted-foreground'
          )}
          title={employee.name}
        >
          {employee.name}
        </h3>
        <div className="mt-2.5 flex min-w-0 items-start gap-2 px-0.5">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <BriefcaseBusiness className="size-3.5" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Chức vụ
            </p>
            <p
              className={cn('line-clamp-2 text-xs font-semibold leading-4 text-foreground/85')}
              title={positionLabel}
            >
              {positionLabel}
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-slate-50/90 p-2.5 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-900/60 dark:ring-slate-800">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Mã nhân viên
          </p>
          <p
            className={cn(
              'mt-0.5 truncate font-mono text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100',
              employeeCode === 'Chưa cấp' && 'font-sans font-medium text-muted-foreground'
            )}
            title={employeeCode}
          >
            {employeeCode}
          </p>
        </div>
        <div className="mt-2.5 flex min-w-0 items-start gap-2 px-0.5">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[#007a55] dark:bg-emerald-950/60 dark:text-emerald-300">
            <UsersRound className="size-3.5" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Team
            </p>
            {/* Một dòng — tên team dài không đẩy card cao lên; xem đủ qua title. */}
            <p
              className="truncate text-xs font-semibold leading-4 text-foreground/85"
              title={teamLine}
            >
              {teamLine === 'Không có' ? 'Chưa phân team' : teamLine}
            </p>
          </div>
        </div>
        {inactive ? (
          <p className="mt-2 text-[11px] font-semibold text-slate-500">Đã nghỉ việc</p>
        ) : null}
      </div>

      <div
        className={cn(
          'mt-auto flex border-t border-slate-200/80 pt-3 dark:border-slate-800',
          compact ? 'gap-1.5 sm:gap-2' : 'gap-2'
        )}
      >
        {inactive ? (
          <Button
            type="button"
            variant="ghost"
            className={cn(
              'flex h-auto min-h-9 w-full items-center justify-center rounded-xl py-2 text-xs font-bold',
              selected
                ? 'bg-emerald-100 text-[#006c49] hover:bg-emerald-200'
                : 'bg-muted/80 text-foreground hover:bg-muted'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onView(e)
            }}
          >
            Xem lịch sử
          </Button>
        ) : (
          <>
            <Button
              type="button"
              className={cn(
                'flex h-auto min-h-9 flex-1 items-center justify-center rounded-xl bg-[#008b64] py-2 text-xs font-bold text-white shadow-[0_8px_18px_-10px_rgba(0,108,73,0.8)] hover:bg-[#007a55] active:translate-y-px',
                compact && 'px-2 sm:px-4'
              )}
              onClick={(e) => {
                e.stopPropagation()
                onView(e)
              }}
            >
              Xem hồ sơ
            </Button>
            {variant === 'hr' ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  'inline-flex h-auto min-h-9 shrink-0 rounded-xl border-slate-200 bg-card px-2.5 py-2 text-[#007a55] hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:hover:bg-emerald-950/50',
                  compact && 'w-9 px-2 sm:w-11 sm:px-2.5'
                )}
                title={employee.status === 'RESERVED' ? 'Hỗ trợ' : 'Sửa'}
                aria-label={employee.status === 'RESERVED' ? 'Hỗ trợ' : 'Sửa'}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(e)
                }}
              >
                {employee.status === 'RESERVED' ? (
                  <CircleHelp className="size-[18px] shrink-0" strokeWidth={2.25} aria-hidden />
                ) : (
                  <Pencil className="size-[18px] shrink-0" strokeWidth={2.25} aria-hidden />
                )}
              </Button>
            ) : null}
          </>
        )}
      </div>
      <span className="sr-only">Trạng thái: {statusLabelVi(employee.status)}</span>
    </div>
  )
}
