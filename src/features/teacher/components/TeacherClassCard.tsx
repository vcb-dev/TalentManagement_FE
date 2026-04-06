import { Link } from '@tanstack/react-router'
import { ArrowRight, Award, Presentation, School, TrendingUp, Users } from 'lucide-react'
import { CARD_ENTRANCE, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import type { TeacherClassRow } from './teacherClassTypes'

export interface TeacherClassCardProps {
  classRow: TeacherClassRow
  selected: boolean
  onSelect: () => void
  cardIndex?: number
}

export function TeacherClassCard({ classRow: c, selected, onSelect, cardIndex }: TeacherClassCardProps) {
  const IconMain = c.accent === 'primary' ? Presentation : Award
  const MetaIcon = c.metaIcon === 'trending' ? TrendingUp : School
  const iconWrap =
    c.accent === 'primary'
      ? 'bg-primary/15 text-primary ring-primary/20'
      : 'bg-amber-100 text-amber-800 ring-amber-200/80'
  const badgeWrap =
    c.accent === 'primary'
      ? 'bg-primary/10 text-primary'
      : 'bg-amber-100 text-amber-900'
  const progressPct = Math.min(100, Math.round((c.memberCount / 24) * 100))

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
      <div className="mb-5 flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-[5.25rem] w-[5.25rem] shrink-0 items-center justify-center rounded-2xl shadow-md ring-2 ring-background sm:h-[5.75rem] sm:w-[5.75rem]',
            iconWrap
          )}
        >
          <IconMain className="h-10 w-10 sm:h-11 sm:w-11" strokeWidth={2} aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col items-end gap-1.5">
          <span
            className={cn(
              'max-w-[10.5rem] truncate rounded-md px-2 py-0.5 text-center text-[10px] font-bold tracking-tight sm:max-w-[11rem] sm:text-[11px]',
              badgeWrap
            )}
          >
            {c.periodBadge}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Users className="size-3 shrink-0" strokeWidth={2} aria-hidden />
            {c.memberCount} HV
          </span>
        </div>
      </div>

      <div className="mb-5 min-w-0">
        <h3 className="text-base font-bold leading-snug text-foreground">{c.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Lớp phụ trách</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-bold text-foreground/90">
            <MetaIcon className="size-3 shrink-0" strokeWidth={2} aria-hidden />
            {c.track === 'tap_su' ? 'Tập sự' : 'Biết việc'}
          </span>
          <span className="text-border">·</span>
          <span className="line-clamp-2 text-foreground/80">{c.examLine}</span>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span
          className={cn(
            'shrink-0 tabular-nums text-[10px] font-bold sm:text-xs',
            progressPct > 0 ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {progressPct}%
        </span>
      </div>

      <div className="mt-auto flex gap-2">
        <Link
          to="/teacher/classes/$classId"
          params={{ classId: c.id }}
          className={cn(
            'flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition-colors',
            selected
              ? 'bg-primary/15 text-primary hover:bg-primary/20'
              : 'bg-muted/80 text-foreground hover:bg-muted'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          Xem chi tiết
          <ArrowRight className="size-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
        </Link>
        <span className="sr-only">Lớp: {c.title}</span>
      </div>
    </div>
  )
}
