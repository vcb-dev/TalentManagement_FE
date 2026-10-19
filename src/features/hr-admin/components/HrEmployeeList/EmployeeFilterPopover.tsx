import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EMPLOYEE_CARD_FILTER_NONE,
  EMPLOYEE_CARD_STATUS_LABEL,
  EMPLOYEE_CARD_STATUSES,
  type EmployeeCardColor,
  type EmployeeCardStatusFilter,
} from '@/features/hr-admin/employeeCard'
import { cn } from '@/lib/utils'
import {
  BriefcaseBusiness,
  Cake,
  CalendarDays,
  IdCard,
  Network,
  Palette,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'

export type EmployeeStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'probation'
  | 'reserved'
  | 'transferred'

export type EmployeeListFilterValue = {
  status: EmployeeStatusFilter
  teamId?: string
  startMonth?: number
  startYear?: number
  birthMonth?: number
  cardStatus?: EmployeeCardStatusFilter
  /** UUID màu thẻ hoặc `'none'` = chưa có màu. */
  cardColorId?: string
}

/** Key có mặt với giá trị `undefined` = bỏ lọc key đó. */
export type EmployeeListFilterPatch = Partial<EmployeeListFilterValue>

/** "Đặt lại" — ghi rõ từng key để bên áp dụng xoá hết giá trị cũ. */
export const RESET_EMPLOYEE_LIST_FILTER: EmployeeListFilterPatch = {
  status: 'active',
  teamId: undefined,
  startMonth: undefined,
  startYear: undefined,
  birthMonth: undefined,
  cardStatus: undefined,
  cardColorId: undefined,
}

export function countActiveEmployeeFilters(v: EmployeeListFilterValue): number {
  return [
    v.status !== 'active',
    v.teamId !== undefined,
    v.startMonth !== undefined,
    v.startYear !== undefined,
    v.birthMonth !== undefined,
    v.cardStatus !== undefined,
    v.cardColorId !== undefined,
  ].filter(Boolean).length
}

export type TeamOptionGroup = {
  value: string
  label: string
  teams: { value: string; label: string }[]
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)
/** Năm vào làm sớm nhất trong dữ liệu là 2016 — để dư vài năm. */
const START_YEAR_MIN = 2015

const fieldTriggerClass =
  'h-10 w-full border border-border bg-background px-3 text-sm font-medium shadow-none hover:bg-muted/50 focus:ring-primary/25 dark:border-border dark:bg-background [&>svg]:text-muted-foreground'

function FilterField({
  id,
  icon: Icon,
  label,
  children,
}: {
  id?: string
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
      >
        <Icon className="size-3.5 text-[#007A52]" aria-hidden />
        {label}
      </Label>
      {children}
    </div>
  )
}

const toSelectValue = (n: number | undefined) => (n === undefined ? 'all' : String(n))
const fromSelectValue = (v: string) => (v === 'all' ? undefined : Number(v))

export interface EmployeeFilterPopoverProps {
  value: EmployeeListFilterValue
  onChange: (patch: EmployeeListFilterPatch) => void
  teamGroups: TeamOptionGroup[]
  showTeamFilter: boolean
  /** Danh mục màu thẻ — gồm cả màu đã ẩn (vẫn có người đang mang). */
  cardColors: EmployeeCardColor[]
}

export function EmployeeFilterPopover({
  value,
  onChange,
  teamGroups,
  showTeamFilter,
  cardColors,
}: EmployeeFilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const ids = {
    status: useId(),
    team: useId(),
    start: useId(),
    birth: useId(),
    cardStatus: useId(),
    cardColor: useId(),
  }
  const activeCount = countActiveEmployeeFilters(value)

  const startYearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: current - START_YEAR_MIN + 1 }, (_, i) => current - i)
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={activeCount > 0 ? `Bộ lọc, đang dùng ${activeCount}` : 'Bộ lọc'}
          className={cn(
            'h-[42px] shrink-0 gap-2 rounded-xl border-border/80 bg-card/90 px-4 text-sm font-semibold shadow-sm ring-1 ring-border/60 backdrop-blur-sm hover:bg-muted',
            (open || activeCount > 0) &&
              'border-[#007A52]/40 bg-[#007A52]/10 text-[#006C49] ring-[#007A52]/20 hover:bg-[#007A52]/15 dark:text-emerald-300'
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Bộ lọc
          {activeCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#006C49] px-1.5 text-xs font-bold leading-5 text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Bộ lọc nhân sự</p>
            <p className="text-xs text-muted-foreground">
              Áp dụng cho danh sách và file Xuất Excel
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-mr-2 h-8 shrink-0 px-2 text-xs font-semibold text-muted-foreground hover:text-destructive"
            onClick={() => onChange(RESET_EMPLOYEE_LIST_FILTER)}
            disabled={activeCount === 0}
          >
            Đặt lại
          </Button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <FilterField id={ids.status} icon={BriefcaseBusiness} label="Trạng thái làm việc">
            <Select
              value={value.status}
              onValueChange={(v) => onChange({ status: v as EmployeeStatusFilter })}
            >
              <SelectTrigger id={ids.status} className={fieldTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Đang làm việc</SelectItem>
                <SelectItem value="inactive">Đã nghỉ việc</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          {showTeamFilter ? (
            <FilterField id={ids.team} icon={Network} label="Team">
              <Select
                value={value.teamId ?? 'all'}
                onValueChange={(v) => onChange({ teamId: v === 'all' ? undefined : v })}
              >
                <SelectTrigger id={ids.team} className={fieldTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">Tất cả team</SelectItem>
                  {teamGroups.map((g) => (
                    <SelectGroup key={g.value}>
                      <SelectLabel className="text-xs text-muted-foreground">{g.label}</SelectLabel>
                      {g.teams.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          ) : null}

          <FilterField id={ids.start} icon={CalendarDays} label="Thời gian vào làm">
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={toSelectValue(value.startMonth)}
                onValueChange={(v) => onChange({ startMonth: fromSelectValue(v) })}
              >
                <SelectTrigger
                  id={ids.start}
                  className={fieldTriggerClass}
                  aria-label="Tháng vào làm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi tháng</SelectItem>
                  {MONTH_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Tháng {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={toSelectValue(value.startYear)}
                onValueChange={(v) => onChange({ startYear: fromSelectValue(v) })}
              >
                <SelectTrigger className={fieldTriggerClass} aria-label="Năm vào làm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">Mọi năm</SelectItem>
                  {startYearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Năm {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FilterField>

          <FilterField id={ids.birth} icon={Cake} label="Tháng sinh">
            <Select
              value={toSelectValue(value.birthMonth)}
              onValueChange={(v) => onChange({ birthMonth: fromSelectValue(v) })}
            >
              <SelectTrigger id={ids.birth} className={fieldTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi tháng</SelectItem>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    Tháng {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <div className="grid grid-cols-2 gap-2">
            <FilterField id={ids.cardStatus} icon={IdCard} label="Tình trạng cấp thẻ">
              <Select
                value={value.cardStatus ?? 'all'}
                onValueChange={(v) =>
                  onChange({
                    cardStatus: v === 'all' ? undefined : (v as EmployeeCardStatusFilter),
                  })
                }
              >
                <SelectTrigger id={ids.cardStatus} className={fieldTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {EMPLOYEE_CARD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {EMPLOYEE_CARD_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                  <SelectItem value={EMPLOYEE_CARD_FILTER_NONE}>Chưa cập nhật</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField id={ids.cardColor} icon={Palette} label="Màu thẻ">
              <Select
                value={value.cardColorId ?? 'all'}
                onValueChange={(v) => onChange({ cardColorId: v === 'all' ? undefined : v })}
              >
                <SelectTrigger id={ids.cardColor} className={fieldTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">Tất cả màu</SelectItem>
                  {cardColors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.isActive ? c.name : `${c.name} (đã ẩn)`}
                    </SelectItem>
                  ))}
                  <SelectItem value={EMPLOYEE_CARD_FILTER_NONE}>Chưa có màu</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
