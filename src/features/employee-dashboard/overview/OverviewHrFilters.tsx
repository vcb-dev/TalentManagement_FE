import { RotateCcw } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DEFAULT_OVERVIEW_HR_FILTER,
  OVERVIEW_CONTRACT_KEYS,
  OVERVIEW_LEVEL_KEYS,
  type OverviewHrFilter,
  type OverviewSummary,
} from '@/features/dashboard/api'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import {
  CONTRACT_META,
  countActiveHrFilters,
  LEVEL_LABEL,
  ROLE_ORDER,
  STATUS_FILTER_LABEL,
} from './overviewModel'

type FilterOptions = OverviewSummary['hr']['filterOptions']
type StatusCounts = OverviewSummary['hr']['byStatus']

const ALL = 'all'

/** Trạng thái hiếm (thử việc chờ, bảo lưu, điều chuyển) chỉ hiện khi có người hoặc đang chọn. */
const RARE_STATUSES = [
  { value: 'transferred', key: 'TRANSFERRED' },
  { value: 'reserved', key: 'RESERVED' },
  { value: 'probation', key: 'PROBATION' },
] as const

function FilterSelect({
  label,
  value,
  isDefault,
  onChange,
  children,
  className,
}: {
  label: string
  value: string
  isDefault: boolean
  onChange: (v: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          'h-9 w-full min-w-0 gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium shadow-none sm:w-auto sm:max-w-[16rem] dark:bg-card [&>svg]:text-muted-foreground',
          isDefault
            ? 'border-border hover:bg-muted/50'
            : 'border-button/45 bg-button/5 dark:bg-button/10',
          className
        )}
      >
        <span className="shrink-0 text-muted-foreground">{label}:</span>
        <span className="min-w-0 flex-1 truncate text-left">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-80">{children}</SelectContent>
    </Select>
  )
}

/**
 * Bộ lọc phần Nhân sự (một hàng, xuống dòng khi hẹp). Trạng thái chỉ áp cho phần cơ cấu; các bộ lọc
 * còn lại áp cho mọi số liệu nhân sự.
 */
export function OverviewHrFilters({
  value,
  onChange,
  options,
  statusCounts,
}: {
  value: OverviewHrFilter
  onChange: (next: OverviewHrFilter) => void
  options: FilterOptions | undefined
  statusCounts: StatusCounts | undefined
}) {
  const active = countActiveHrFilters(value)

  const teamGroups = useMemo(() => {
    const divisions = options?.divisions ?? []
    const known = new Set(divisions.map((d) => d.id))
    // Khối vẫn hiện dù chưa có team (lọc cả khối theo khối của nhân sự).
    const groups = divisions.map((d) => ({
      id: d.id,
      name: d.name,
      teams: (options?.teams ?? []).filter((t) => t.divisionId === d.id),
    }))
    const orphan = (options?.teams ?? []).filter((t) => !t.divisionId || !known.has(t.divisionId))
    return { groups, orphan }
  }, [options])

  const orgValue = value.teamId
    ? `team:${value.teamId}`
    : value.divisionId
      ? `div:${value.divisionId}`
      : ALL
  const setOrg = (v: string) => {
    const [kind, id] = v.split(':') as [string, string | undefined]
    onChange({
      ...value,
      teamId: kind === 'team' ? id : undefined,
      divisionId: kind === 'div' ? id : undefined,
    })
  }

  const statusOptions = useMemo(() => {
    const present = new Set((statusCounts ?? []).filter((s) => s.count > 0).map((s) => s.key))
    const rare = RARE_STATUSES.filter((s) => present.has(s.key) || value.status === s.value)
    return ['active', 'inactive', ...rare.map((s) => s.value), 'all'] as Array<
      OverviewHrFilter['status']
    >
  }, [statusCounts, value.status])

  return (
    <div
      className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center"
      role="group"
      aria-label="Bộ lọc nhân sự"
    >
      <FilterSelect
        label="Khối / Team"
        value={orgValue}
        isDefault={orgValue === ALL}
        onChange={setOrg}
      >
        <SelectItem value={ALL}>Tất cả</SelectItem>
        {teamGroups.groups.map((g) => (
          <SelectGroup key={g.id}>
            <SelectSeparator />
            <SelectLabel className="text-xs text-muted-foreground">{g.name}</SelectLabel>
            <SelectItem value={`div:${g.id}`}>Cả khối {g.name}</SelectItem>
            {g.teams.map((t) => (
              <SelectItem key={t.id} value={`team:${t.id}`} className="pl-6">
                {t.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        {teamGroups.orphan.length > 0 ? (
          <SelectGroup>
            <SelectSeparator />
            <SelectLabel className="text-xs text-muted-foreground">Chưa gắn khối</SelectLabel>
            {teamGroups.orphan.map((t) => (
              <SelectItem key={t.id} value={`team:${t.id}`} className="pl-6">
                {t.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
      </FilterSelect>

      <FilterSelect
        label="Trạng thái"
        value={value.status}
        isDefault={value.status === DEFAULT_OVERVIEW_HR_FILTER.status}
        onChange={(v) => onChange({ ...value, status: v as OverviewHrFilter['status'] })}
      >
        {statusOptions.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_FILTER_LABEL[s]}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Loại hợp đồng"
        value={value.contract ?? ALL}
        isDefault={value.contract === undefined}
        onChange={(v) =>
          onChange({
            ...value,
            contract: v === ALL ? undefined : (v as OverviewHrFilter['contract']),
          })
        }
      >
        <SelectItem value={ALL}>Tất cả</SelectItem>
        {OVERVIEW_CONTRACT_KEYS.map((k) => (
          <SelectItem key={k} value={k}>
            {CONTRACT_META[k].label}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Cấp độ"
        value={value.level ?? ALL}
        isDefault={value.level === undefined}
        onChange={(v) =>
          onChange({ ...value, level: v === ALL ? undefined : (v as OverviewHrFilter['level']) })
        }
      >
        <SelectItem value={ALL}>Tất cả</SelectItem>
        {OVERVIEW_LEVEL_KEYS.map((k) => (
          <SelectItem key={k} value={k}>
            {LEVEL_LABEL[k]}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Chức vụ"
        value={value.role ?? ALL}
        isDefault={value.role === undefined}
        onChange={(v) =>
          onChange({ ...value, role: v === ALL ? undefined : (v as OverviewHrFilter['role']) })
        }
      >
        <SelectItem value={ALL}>Tất cả</SelectItem>
        {ROLE_ORDER.map((k) => (
          <SelectItem key={k} value={k}>
            {ROLE_LABEL_VI[k]}
          </SelectItem>
        ))}
      </FilterSelect>

      {active > 0 ? (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_OVERVIEW_HR_FILTER)}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button/40"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Đặt lại ({active})
        </button>
      ) : null}
    </div>
  )
}
