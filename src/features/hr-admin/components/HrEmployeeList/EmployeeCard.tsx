import { CircleHelp, Pencil } from 'lucide-react'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { CARD_ENTRANCE, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { StarEmblem } from '@/components/icons/StarEmblem'
import {
  avatarClassForRole,
  initialsFromName,
  levelPillText,
  memberStarRank,
  roleBadgeClass,
  roleShortLabel,
  shortId,
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
}

export function EmployeeCard({
  employee,
  selected,
  onSelect,
  onView,
  onEdit,
  cardIndex,
  variant = 'hr',
}: EmployeeCardProps) {
  const tierLine = levelPillText(employee.currentLevel)
  const rank = memberStarRank(employee.currentStar)
  const inactive = employee.status === 'INACTIVE'
  const meta = initialsFromName(employee.name)
  const deptLine = `PB · ${shortId(employee.departmentId)}`
  const positionLabel = ROLE_LABEL_VI[employee.role]
  const starProgressPct = Math.min(100, Math.round((employee.currentStar / 6) * 100))

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
        'group relative flex w-full cursor-pointer flex-col rounded-2xl border bg-card p-5 text-left shadow-sm',
        cardIndex !== undefined && CARD_ENTRANCE,
        selected ? 'border-2 border-primary shadow-md ring-1 ring-primary/15' : 'border-border',
        inactive && 'opacity-[0.55]'
      )}
      style={cardIndex !== undefined ? staggerStyle(Math.min(cardIndex, 16)) : undefined}
    >
      {/* Hàng 1: avatar | cấp + sao (theo mock HTML) */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="relative shrink-0">
          <div
            className={cn(
              'flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-2xl text-xl font-extrabold leading-tight shadow-md ring-2 ring-background sm:h-[5.75rem] sm:w-[5.75rem] sm:text-2xl',
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
        <div className="flex min-w-0 flex-col items-end gap-1.5">
          <span
            className={cn(
              'max-w-[10.5rem] truncate rounded-md px-2 py-0.5 text-center text-[10px] font-bold tracking-tight sm:max-w-[11rem] sm:text-[11px]',
              rank.badgeClass
            )}
            title={rank.label}
          >
            {rank.label}
          </span>
          <span
            className="max-w-[9rem] truncate rounded-md bg-primary/10 px-2 py-0.5 text-center text-[10px] font-bold tracking-tight text-primary sm:max-w-[10rem]"
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
      <div className="mb-5 min-w-0">
        <h3
          className={cn(
            'text-base font-bold leading-snug text-foreground',
            inactive && 'text-muted-foreground'
          )}
        >
          {employee.name}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{positionLabel}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold',
              roleBadgeClass(employee.role)
            )}
          >
            {roleShortLabel(employee.role)}
          </span>
          <span className="text-border">·</span>
          <span className="text-foreground/80">{deptLine}</span>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${starProgressPct}%` }}
          />
        </div>
        <span
          className={cn(
            'shrink-0 tabular-nums text-[10px] font-bold sm:text-xs',
            starProgressPct > 0 ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {starProgressPct}%
        </span>
      </div>

      <div className="mt-auto flex gap-2">
        {inactive ? (
          <>
            <button
              type="button"
              className={cn(
                'flex min-h-9 flex-1 items-center justify-center rounded-lg py-2 text-xs font-bold transition-colors',
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
            </button>
            {variant === 'hr' ? (
              <button
                type="button"
                className="min-h-9 min-w-0 flex-1 rounded-lg border-[1.5px] border-button bg-button py-2 text-xs font-semibold text-button-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                Khôi phục
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              className={cn(
                'flex min-h-9 flex-1 items-center justify-center rounded-lg py-2 text-xs font-bold transition-colors',
                selected
                  ? 'bg-primary/15 text-primary hover:bg-primary/20'
                  : 'bg-muted/80 text-foreground hover:bg-muted'
              )}
              onClick={(e) => {
                e.stopPropagation()
                onView(e)
              }}
            >
              Xem hồ sơ
            </button>
            {variant === 'hr' ? (
              <button
                type="button"
                className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card px-2.5 py-2 text-primary transition-colors hover:bg-muted"
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
              </button>
            ) : null}
          </>
        )}
      </div>
      <span className="sr-only">Trạng thái: {statusLabelVi(employee.status)}</span>
    </div>
  )
}
