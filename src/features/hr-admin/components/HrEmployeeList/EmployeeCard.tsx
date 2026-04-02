import type { EmployeeEntity } from '@/features/hr-admin/api'
import { CARD_ENTRANCE, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import {
  avatarClassForRole,
  initialsFromName,
  levelMeta,
  roleBadgeClass,
  roleShortLabel,
  shortId,
  statusDotClass,
  statusLabelVi,
} from './employeeListUtils'

function StarRow({ filled }: { filled: number }) {
  return (
    <div className="mt-1 flex items-center justify-center gap-0.5">
      {Array.from({ length: 6 }, (_, i) => {
        const full = i < Math.floor(filled)
        const partial = i === Math.floor(filled) && filled % 1 >= 0.5
        if (full) {
          return (
            <svg key={i} viewBox="0 0 24 24" width={15} height={15} className="shrink-0 text-star-gold drop-shadow-[0_1px_2px_rgba(180,120,0,0.35)]" aria-hidden>
              <path
                fill="currentColor"
                d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
              />
            </svg>
          )
        }
        if (partial) {
          return (
            <svg
              key={i}
              viewBox="0 0 24 24"
              width={15}
              height={15}
              className="shrink-0 text-star-gold-mid drop-shadow-[0_0_4px_rgba(212,160,23,0.45)]"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
              />
            </svg>
          )
        }
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width={15}
            height={15}
            className="shrink-0 text-star-gold-soft"
            aria-hidden
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
            />
          </svg>
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
  /** Stagger animation khi hiển thị dạng lưới thẻ */
  cardIndex?: number
}

export function EmployeeCard({ employee, selected, onSelect, onView, onEdit, cardIndex }: EmployeeCardProps) {
  const { tierClass, label: tierLabel } = levelMeta(employee.currentLevel)
  const inactive = employee.status === 'INACTIVE'
  const meta = initialsFromName(employee.name)
  const deptLine = `PB · ${shortId(employee.departmentId)}`

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
        'relative flex min-h-[288px] w-full cursor-pointer flex-col items-center overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-b from-card via-card to-primary/[0.04] px-3 pb-4 pt-4 text-center shadow-[var(--shadow-card)] ring-1 ring-primary/10 transition-all duration-300 sm:px-4 sm:pt-5',
        cardIndex !== undefined && CARD_ENTRANCE,
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-primary before:via-teal-500 before:to-violet-500 before:opacity-40 before:transition-opacity',
        'hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_12px_28px_-4px_hsl(var(--primary)/0.18)] hover:ring-primary/20 hover:before:opacity-100',
        selected && 'border-primary/50 shadow-[0_12px_32px_-6px_hsl(var(--primary)/0.22)] ring-primary/25 before:opacity-100',
        inactive && 'opacity-[0.55]'
      )}
      style={cardIndex !== undefined ? staggerStyle(Math.min(cardIndex, 16)) : undefined}
    >
      <div className="relative mb-2.5 inline-flex">
        <div
          className={cn(
            'flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-2xl text-[1.125rem] font-extrabold leading-tight shadow-md ring-2 ring-white/90 sm:h-[96px] sm:w-[96px] sm:text-[1.3rem]',
            avatarClassForRole(employee.role)
          )}
        >
          {meta}
        </div>
        <span
          className={cn(
            'absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm sm:h-3 sm:w-3',
            statusDotClass(employee.status)
          )}
        />
      </div>
      <div className={cn('mb-0.5 text-sm font-bold text-foreground md:text-base', inactive && 'text-muted-foreground')}>
        {employee.name}
      </div>
      <div className="mb-1.5 flex flex-wrap items-center justify-center gap-1 text-xs font-medium text-muted-foreground md:text-sm">
        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold md:text-sm', roleBadgeClass(employee.role))}>
          {roleShortLabel(employee.role)}
        </span>
        <span className="text-border">·</span>
        <span className="text-foreground/80">{deptLine}</span>
      </div>
      <div className="mb-1 h-px w-full shrink-0 bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="mb-1 flex w-full items-center justify-between gap-1">
        <span className="text-xs font-semibold text-muted-foreground md:text-sm">Cấp độ</span>
        <span className={cn('max-w-[58%] truncate rounded-full px-2 py-0.5 text-xs font-bold md:text-xs', tierClass)}>
          {tierLabel}
        </span>
      </div>
      <div className="min-h-[28px] w-full">
        {employee.currentStar > 0 ? (
          <StarRow filled={employee.currentStar} />
        ) : (
          <p className="mt-1.5 text-center text-xs italic text-muted-foreground md:text-sm">
            {inactive ? '—' : 'Chưa có sao — đang học'}
          </p>
        )}
      </div>
      <div className="mt-auto flex w-full gap-1.5 pt-2">
        {inactive ? (
          <>
            <button
              type="button"
              className="flex-1 rounded-[10px] border-[1.5px] border-primary/35 bg-transparent py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 md:text-sm"
              onClick={(e) => {
                e.stopPropagation()
                onView(e)
              }}
            >
              Xem lịch sử
            </button>
            <button
              type="button"
              className="flex-1 rounded-[10px] border-[1.5px] border-button bg-button py-2 text-xs font-semibold text-button-foreground md:text-sm"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              Khôi phục
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="flex-1 rounded-[10px] border-[1.5px] border-button bg-button py-2 text-xs font-semibold text-button-foreground transition-colors hover:opacity-90 md:text-sm"
              onClick={(e) => {
                e.stopPropagation()
                onView(e)
              }}
            >
              Xem hồ sơ
            </button>
            <button
              type="button"
              className="flex-1 rounded-[10px] border-[1.5px] border-primary/35 bg-transparent py-2 text-xs font-semibold text-primary hover:bg-primary/10 md:text-sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(e)
              }}
            >
              {employee.status === 'RESERVED' ? 'Hỗ trợ' : 'Sửa'}
            </button>
          </>
        )}
      </div>
      <span className="sr-only">Trạng thái: {statusLabelVi(employee.status)}</span>
    </div>
  )
}
