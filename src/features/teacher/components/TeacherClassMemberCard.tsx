import { Mail } from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { CARD_ENTRANCE, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import type { ClassMemberRow } from './teacherClassMemberTypes'

export interface TeacherClassMemberCardProps {
  member: ClassMemberRow
  selected: boolean
  onSelect: () => void
  cardIndex?: number
  onViewDetail: () => void
}

export function TeacherClassMemberCard({
  member,
  selected,
  onSelect,
  cardIndex,
  onViewDetail,
}: TeacherClassMemberCardProps) {
  const hasResult = member.examResult != null && member.examResult.length > 0

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
        selected ? 'border-2 border-primary shadow-md ring-1 ring-primary/15' : 'border-border'
      )}
      style={cardIndex !== undefined ? staggerStyle(Math.min(cardIndex, 16)) : undefined}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="relative shrink-0">
          <EmployeeAvatar name={member.name} className="h-[4.5rem] w-[4.5rem] text-base font-bold sm:h-[5rem] sm:w-[5rem]" />
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-card shadow-sm',
              hasResult ? 'bg-emerald-500' : 'bg-amber-400'
            )}
            title={hasResult ? 'Đã có kết quả' : 'Chưa có KQ'}
            aria-hidden
          />
        </div>
        <span
          className={cn(
            'max-w-[9rem] truncate rounded-md px-2 py-0.5 text-center text-[10px] font-bold sm:text-[11px]',
            hasResult
              ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {hasResult ? member.examResult : 'Chưa có KQ'}
        </span>
      </div>

      <div className="mb-4 min-w-0">
        <h3 className="text-base font-bold leading-snug text-foreground">{member.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="size-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
          <span className="truncate">{member.email}</span>
        </p>
      </div>

      <div className="mt-auto flex gap-2">
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
            onViewDetail()
          }}
        >
          Xem lịch sử thi
        </button>
      </div>
    </div>
  )
}
