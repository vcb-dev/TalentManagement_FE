import { CircleHelp, Pencil } from 'lucide-react'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { CARD_ENTRANCE, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { StarEmblem } from '@/components/icons/StarEmblem'
import {
  avatarClassForRole,
  employeeDeptDisplay,
  employeeTeamsDisplay,
  initialsFromName,
  levelPillText,
  roleBadgeClass,
  roleShortLabel,
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
  const meta = initialsFromName(employee.name)
  const deptLine = employeeDeptDisplay(employee)
  const teamLine = employeeTeamsDisplay(employee)
  const positionLabel = ROLE_LABEL_VI[employee.role]
  const toneByRole: Record<
    EmployeeEntity['role'],
    { cardBg: string; glow: string; chip: string; cta: string }
  > = {
    MEMBER: {
      cardBg:
        'from-emerald-100/65 via-slate-50/95 to-teal-100/50 dark:from-emerald-900/35 dark:via-slate-900 dark:to-teal-900/30',
      glow: 'bg-emerald-400/20',
      chip: 'bg-emerald-100/90 text-emerald-800',
      cta: 'from-emerald-500 to-teal-500',
    },
    LEADER: {
      cardBg:
        'from-sky-100/65 via-slate-50/95 to-indigo-100/50 dark:from-sky-900/35 dark:via-slate-900 dark:to-indigo-900/30',
      glow: 'bg-sky-400/20',
      chip: 'bg-sky-100/90 text-sky-800',
      cta: 'from-sky-500 to-indigo-500',
    },
    MANAGER: {
      cardBg:
        'from-amber-100/65 via-slate-50/95 to-orange-100/55 dark:from-amber-900/35 dark:via-slate-900 dark:to-orange-900/30',
      glow: 'bg-amber-400/20',
      chip: 'bg-amber-100/90 text-amber-800',
      cta: 'from-amber-500 to-orange-500',
    },
    HR: {
      cardBg:
        'from-violet-100/70 via-slate-50/95 to-fuchsia-100/55 dark:from-violet-900/35 dark:via-slate-900 dark:to-fuchsia-900/30',
      glow: 'bg-violet-400/20',
      chip: 'bg-violet-100/90 text-violet-800',
      cta: 'from-violet-500 to-fuchsia-500',
    },
    TEACHER: {
      cardBg:
        'from-cyan-100/70 via-slate-50/95 to-blue-100/55 dark:from-cyan-900/35 dark:via-slate-900 dark:to-blue-900/30',
      glow: 'bg-cyan-400/20',
      chip: 'bg-cyan-100/90 text-cyan-800',
      cta: 'from-cyan-500 to-blue-500',
    },
    BOD: {
      cardBg:
        'from-rose-100/65 via-slate-50/95 to-pink-100/50 dark:from-rose-900/35 dark:via-slate-900 dark:to-pink-900/30',
      glow: 'bg-rose-400/20',
      chip: 'bg-rose-100/90 text-rose-800',
      cta: 'from-rose-500 to-pink-500',
    },
  }
  const tone = toneByRole[employee.role]

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
        'group relative flex w-full cursor-pointer flex-col rounded-2xl border border-slate-200/80 bg-gradient-to-br text-left shadow-[0_10px_24px_-14px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/60 backdrop-blur-[1px] dark:border-slate-800 dark:ring-slate-800/70',
        compact ? 'p-3 sm:p-5' : 'p-5',
        tone.cardBg,
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        'hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_14px_32px_-14px_rgba(37,99,235,0.45)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        cardIndex !== undefined && CARD_ENTRANCE,
        selected ? 'border-2 border-primary shadow-md ring-1 ring-primary/20' : '',
        inactive && 'opacity-[0.55]'
      )}
      style={cardIndex !== undefined ? staggerStyle(Math.min(cardIndex, 16)) : undefined}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity duration-200 group-hover:opacity-100',
          tone.glow,
          'opacity-70'
        )}
        aria-hidden
      />
      {/* Hàng 1: avatar | cấp + sao (theo mock HTML) */}
      <div
        className={cn('mb-5 flex items-start justify-between gap-2 sm:gap-3', compact && 'mb-3')}
      >
        <div className="relative shrink-0">
          <div
            className={cn(
              'flex items-center justify-center rounded-2xl font-extrabold leading-tight shadow-md ring-2 ring-background',
              compact
                ? 'h-[3.75rem] w-[3.75rem] text-base sm:h-[5.25rem] sm:w-[5.25rem] sm:text-xl md:h-[5.75rem] md:w-[5.75rem] md:text-2xl'
                : 'h-[5.25rem] w-[5.25rem] text-xl sm:h-[5.75rem] sm:w-[5.75rem] sm:text-2xl',
              avatarClassForRole(employee.role),
              inactive && 'grayscale-[0.35]'
            )}
          >
            {meta}
          </div>
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-card shadow-sm',
              statusDotClass(employee.status)
            )}
          />
        </div>
        <div className="flex min-w-0 flex-col items-end gap-1 sm:gap-1.5">
          <span
            className={cn(
              'max-w-[6rem] truncate rounded-md px-1.5 py-0.5 text-center text-[9px] font-bold tracking-tight sm:max-w-[9rem] sm:px-2 sm:text-[10px] md:max-w-[10rem]',
              tone.chip
            )}
            title={tierLine}
          >
            {tierLine}
          </span>
          <div className="min-w-[4.5rem]">
            {employee.currentStar > 0 ? (
              <StarRow filled={employee.currentStar} align="end" compact />
            ) : (
              <p className="text-right text-[10px] italic text-muted-foreground">
                {inactive ? '—' : 'Chưa có sao'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hàng 2: tên + vị trí + PB */}
      <div className={cn('mb-5 min-w-0', compact && 'mb-3')}>
        <h3
          className={cn(
            'font-bold leading-snug text-foreground',
            compact ? 'text-xs sm:text-base' : 'text-base',
            inactive && 'text-muted-foreground'
          )}
        >
          {employee.name}
        </h3>
        <p
          className={cn(
            'mt-0.5 font-semibold text-foreground/80',
            compact ? 'text-[10px] sm:text-xs' : 'text-xs'
          )}
        >
          {positionLabel}
        </p>
        <div
          className={cn(
            'mt-1.5 flex flex-wrap items-center gap-1 sm:gap-1.5',
            compact ? 'text-[9px] sm:text-[11px]' : 'text-[11px]'
          )}
        >
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold',
              roleBadgeClass(employee.role)
            )}
          >
            {roleShortLabel(employee.role)}
          </span>
          <span className="inline-flex rounded-full bg-foreground/[0.06] px-2 py-0.5 font-semibold text-foreground">
            {deptLine}
          </span>
          <span className="inline-flex rounded-full bg-primary/[0.08] px-2 py-0.5 font-semibold text-primary-700">
            {teamLine}
          </span>
        </div>
      </div>

      {!compact ? (
        <div className="mb-5 px-1 py-1">
          {employee.currentStar > 0 ? <StarRow filled={employee.currentStar} /> : null}
        </div>
      ) : null}

      <div className="mt-auto flex gap-2">
        {inactive ? (
          <>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'flex h-auto min-h-9 flex-1 items-center justify-center rounded-lg py-2 text-xs font-bold',
                selected
                  ? 'bg-primary/15 text-primary hover:bg-primary/20'
                  : 'bg-muted/80 text-foreground hover:bg-muted'
              )}
              onClick={(e) => {
                e.stopPropagation()
                onView(e)
              }}
            >
              Xem lịch sử
            </Button>
            {variant === 'hr' ? (
              <Button
                type="button"
                className="h-auto min-h-9 min-w-0 flex-1 rounded-lg border-[1.5px] border-button bg-button py-2 text-xs font-semibold text-button-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                Khôi phục
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button
              type="button"
              className={cn(
                'flex h-auto min-h-9 flex-1 items-center justify-center rounded-lg py-2 text-xs font-bold text-white shadow-sm hover:opacity-95',
                'bg-gradient-to-r',
                tone.cta,
                selected ? 'ring-1 ring-primary/30' : ''
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
                className="inline-flex h-auto min-h-9 shrink-0 rounded-lg border-border bg-card px-2.5 py-2 text-primary hover:bg-muted"
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
      {!inactive && !compact ? (
        <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Bấm để xem thông tin tóm tắt
        </p>
      ) : null}
      <span className="sr-only">Trạng thái: {statusLabelVi(employee.status)}</span>
    </div>
  )
}
