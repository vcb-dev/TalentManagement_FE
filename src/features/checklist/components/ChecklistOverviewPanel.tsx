import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  ListChecks,
  ListFilter,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { personName } from '../checklistAnswers'
import {
  countUpdatedSince,
  filterOverviewRows,
  leaderKey,
  OVERVIEW_NONE,
  overviewGroups,
  overviewRows,
  overviewSections,
  pct,
  startFilterLabel,
  startMonthCounts,
  startYears,
  teamKey,
  type OverviewRow,
  type QuestionStat,
} from '../checklistOverview'
import { downloadChecklistResponsesExcel } from '../exportChecklistResponses'
import { useChecklistTemplateResponses, useChecklistTemplates } from '../hooks'
import {
  CHECKLIST_KIND_LABEL,
  type ChecklistTemplate,
  type ChecklistTemplateResponses,
} from '../types'
import {
  QuestionPanel,
  TextAnswersPanel,
  type OverviewPeopleTarget,
} from './ChecklistOverviewCharts'
import { ChecklistPeopleDialog } from './ChecklistPeopleDialog'
import {
  ChecklistResponseDialog,
  type ChecklistResponseDialogTarget,
} from './ChecklistResponseDialog'

const ALL = 'all'
const RECENT_DAYS = 7

/** Ô lọc: nhãn mờ đứng trước giá trị; đang lọc thì viền + nền xanh nhạt để nhìn là biết. */
const FILTER_TRIGGER =
  'h-9 w-full justify-between gap-2 rounded-lg border border-border bg-card px-3 text-sm font-normal text-foreground shadow-none transition-colors hover:bg-muted/50 dark:border-border dark:bg-card sm:w-auto sm:max-w-[18rem]'
const FILTER_ACTIVE =
  'border-button/45 bg-button/5 hover:bg-button/10 dark:border-button/50 dark:bg-button/15'
const CHOICE = 'border transition-colors disabled:cursor-default disabled:opacity-40'
const CHOICE_ON = 'border-button bg-button text-button-foreground'
const CHOICE_OFF = 'border-border/80 text-foreground/85 hover:bg-muted/70'

/** Một chỉ số phụ trong thẻ tiến độ; có `onClick` thì bấm được (mở danh sách / lọc). */
function SummaryStat({
  value,
  label,
  onClick,
}: {
  value: number
  label: string
  onClick?: () => void
}) {
  const body = (
    <>
      <span className="font-semibold tabular-nums text-foreground">{value}</span> {label}
    </>
  )
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
    >
      <span>{body}</span>
      <ChevronRight className="size-3.5" aria-hidden />
    </button>
  ) : (
    <span>{body}</span>
  )
}

/** Tầng trên: chọn checklist + nút thao tác; tầng dưới: các ô lọc. */
function FilterBar({
  source,
  actions,
  children,
}: {
  source: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 sm:max-w-xl sm:flex-1">{source}</div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? (
        <div className="flex flex-col gap-2 border-t border-border/70 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="hidden items-center gap-1.5 pr-1 text-xs font-medium text-muted-foreground sm:inline-flex">
            <ListFilter className="size-3.5" aria-hidden />
            Lọc
          </span>
          {children}
        </div>
      ) : null}
    </div>
  )
}

function FilterLabel({
  label,
  value,
  active,
}: {
  label: string
  value: ReactNode
  active: boolean
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('truncate', active && 'font-medium')}>{value}</span>
    </span>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  /** [giá trị, chữ hiển thị] — chưa gồm mục "Tất cả". */
  options: [string, string][]
}) {
  const active = value !== ALL
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={`Lọc theo ${label.toLowerCase()}`}
        className={cn(FILTER_TRIGGER, active && FILTER_ACTIVE)}
      >
        <FilterLabel label={label} value={<SelectValue />} active={active} />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value={ALL}>Tất cả</SelectItem>
        {options.map(([v, text]) => (
          <SelectItem key={v} value={v}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Một ô "Vào làm": chọn năm (hoặc mọi năm) + lưới 12 tháng kèm số nhân sự vào làm mỗi tháng —
 * tháng / năm lọc độc lập như bộ lọc "Thời gian vào làm" ở danh sách nhân viên.
 */
function StartDateFilter({
  month,
  year,
  rows,
  onChange,
}: {
  month: number | null
  year: number | null
  /** Nhân sự sau các bộ lọc khác — để đếm số người từng tháng. */
  rows: OverviewRow[]
  onChange: (month: number | null, year: number | null) => void
}) {
  const active = month !== null || year !== null
  const years = useMemo(() => {
    const ys = startYears(rows)
    return year !== null && !ys.includes(year) ? [year, ...ys] : ys
  }, [rows, year])
  const counts = useMemo(() => startMonthCounts(rows, year), [rows, year])
  const matched = month === null ? counts.reduce((a, b) => a + b, 0) : counts[month - 1]!

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Lọc theo thời gian vào làm"
          className={cn(FILTER_TRIGGER, 'inline-flex items-center', active && FILTER_ACTIVE)}
        >
          <FilterLabel label="Vào làm" value={startFilterLabel(month, year)} active={active} />
          <ChevronDown className="size-4 shrink-0 text-primary opacity-90" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[20rem] p-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Năm vào làm</p>
        <div className="flex flex-wrap gap-1.5">
          {[null, ...years].map((y) => (
            <button
              key={y ?? ALL}
              type="button"
              aria-pressed={year === y}
              onClick={() => onChange(month, y)}
              className={cn(
                CHOICE,
                'h-7 rounded-full px-2.5 text-xs tabular-nums',
                year === y ? CHOICE_ON : CHOICE_OFF
              )}
            >
              {y ?? 'Mọi năm'}
            </button>
          ))}
        </div>

        <div className="mb-1.5 mt-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Tháng · số người vào làm</p>
          <button
            type="button"
            aria-pressed={month === null}
            onClick={() => onChange(null, year)}
            className={cn(
              CHOICE,
              'h-7 rounded-full px-2.5 text-xs',
              month === null ? CHOICE_ON : CHOICE_OFF
            )}
          >
            {year === null ? 'Mọi tháng' : 'Cả năm'}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {counts.map((n, i) => {
            const m = i + 1
            const on = month === m
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                aria-label={`Tháng ${m}: ${n} người vào làm`}
                disabled={n === 0 && !on}
                onClick={() => onChange(on ? null : m, year)}
                className={cn(
                  CHOICE,
                  'flex flex-col items-center rounded-lg py-1.5',
                  on ? CHOICE_ON : CHOICE_OFF
                )}
              >
                <span className="text-sm font-medium">T{m}</span>
                <span
                  className={cn(
                    'text-[11px] tabular-nums',
                    on ? 'text-button-foreground/85' : 'text-muted-foreground'
                  )}
                >
                  {n}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5">
          <p className="text-xs text-muted-foreground">
            {active ? `${matched} nhân sự khớp` : 'Chọn năm, tháng hoặc cả hai'}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={!active}
            onClick={() => onChange(null, null)}
          >
            Xoá lọc
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TemplateSelect({
  templates,
  value,
  onChange,
}: {
  templates: ChecklistTemplate[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-10 w-full gap-2 rounded-lg border border-border bg-muted/30 px-3 text-sm font-semibold shadow-none dark:border-border dark:bg-muted/20"
        aria-label="Checklist"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ClipboardList className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">
            <SelectValue />
          </span>
        </span>
      </SelectTrigger>
      <SelectContent>
        {templates.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.title}
            {t.isActive ? '' : ' (ngừng dùng)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Một thẻ tiến độ: tổng đã điền + chỉ số phụ, bên dưới là từng team / trưởng nhóm dạng chip (bấm
 * để lọc cả trang). Chỉ hiện nhóm chưa điền đủ; nhóm đã đủ gom lại sau một nút "xem thêm".
 */
function ProgressSummary({
  rows,
  badges,
  note,
  stats,
  onPick,
}: {
  rows: OverviewRow[]
  badges: ReactNode
  note: string
  stats: ReactNode
  onPick: (by: 'team' | 'leader', key: string) => void
}) {
  const [by, setBy] = useState<'team' | 'leader'>('team')
  const [showComplete, setShowComplete] = useState(false)
  const groups = useMemo(() => overviewGroups(rows, by), [rows, by])
  const canGroup = useMemo(
    () => overviewGroups(rows, 'team').length > 1 || overviewGroups(rows, 'leader').length > 1,
    [rows]
  )
  const total = rows.length
  const done = rows.filter((r) => r.response).length
  const ratio = pct(done, total)
  const unit = by === 'team' ? 'team' : 'trưởng nhóm'
  const completeCount = groups.filter((g) => g.done === g.total).length
  const incompleteCount = groups.length - completeCount
  const shownGroups = showComplete ? groups : groups.filter((g) => g.done < g.total)
  const completeToggle = (
    <button
      type="button"
      onClick={() => setShowComplete((v) => !v)}
      className="inline-flex items-center gap-1 text-xs font-medium text-button hover:underline"
    >
      {showComplete
        ? `Ẩn ${completeCount} ${unit} đã điền đủ`
        : incompleteCount > 0
          ? `Xem thêm ${completeCount} ${unit} đã điền đủ`
          : `Xem từng ${unit}`}
      <ChevronDown
        className={cn('size-3.5 transition-transform', showComplete && 'rotate-180')}
        aria-hidden
      />
    </button>
  )

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">Đã điền checklist</p>
        {badges}
      </div>
      <div className="mt-1 flex flex-col gap-x-10 gap-y-1.5 lg:flex-row lg:items-center">
        <p className="flex flex-wrap items-center gap-x-2 text-foreground">
          <span className="text-3xl font-bold tracking-tight tabular-nums">{done}</span>
          <span className="text-base text-muted-foreground">/ {total} nhân sự</span>
          <span className="rounded-full bg-button/10 px-2 py-0.5 text-sm font-semibold tabular-nums text-button">
            {ratio}%
          </span>
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">{stats}</div>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>

      {canGroup ? (
        <div className="mt-4 border-t border-border/70 pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div
              className="flex w-fit gap-1 rounded-lg bg-muted/60 p-0.5"
              role="tablist"
              aria-label="Xem tiến độ theo"
            >
              {(['team', 'leader'] as const).map((v) => (
                <Button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={by === v}
                  variant={by === v ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-7 rounded-md px-2.5 text-xs',
                    by !== v && 'text-muted-foreground'
                  )}
                  onClick={() => setBy(v)}
                >
                  {v === 'team' ? 'Theo team' : 'Theo trưởng nhóm'}
                </Button>
              ))}
            </div>
            {shownGroups.length > 0 ? (
              <p className="text-xs text-muted-foreground">Bấm để lọc cả trang</p>
            ) : null}
          </div>
          {incompleteCount === 0 && !showComplete ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-button" aria-hidden />
                Cả {completeCount} {unit} đã điền đủ.
              </span>
              {completeToggle}
            </p>
          ) : (
            <>
              <ul className="flex flex-wrap gap-1.5">
                {shownGroups.map((g) => {
                  const complete = g.done === g.total
                  return (
                    <li key={g.key} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onPick(by, g.key)}
                        title={`${g.label}: ${g.done}/${g.total} đã điền`}
                        className={cn(
                          'inline-flex max-w-[18rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                          complete
                            ? 'border-border/80 text-muted-foreground hover:bg-muted/70'
                            : 'border-warning/40 bg-warning/10 text-foreground hover:bg-warning/15'
                        )}
                      >
                        <span className="truncate">{g.label}</span>
                        <span
                          className={cn(
                            'shrink-0 font-semibold tabular-nums',
                            complete ? 'text-foreground/70' : 'text-warning'
                          )}
                        >
                          {g.done}/{g.total}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {completeCount > 0 ? <div className="mt-2.5">{completeToggle}</div> : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}

function questionRange(stats: QuestionStat[]): string {
  const first = stats[0]!.number
  const last = stats[stats.length - 1]!.number
  return first === last ? `Câu ${first}` : `Câu ${first}–${last}`
}

function OverviewBody({
  data,
  templateSelect,
  onOpenResponses,
}: {
  data: ChecklistTemplateResponses
  templateSelect: ReactNode
  onOpenResponses: () => void
}) {
  const { template } = data
  const isLeaderKind = template.kind === 'LEADER'
  const [team, setTeam] = useState<string>(ALL)
  const [leader, setLeader] = useState<string>(ALL)
  const [startMonth, setStartMonth] = useState<number | null>(null)
  const [startYear, setStartYear] = useState<number | null>(null)
  const [people, setPeople] = useState<OverviewPeopleTarget | null>(null)
  const [viewing, setViewing] = useState<ChecklistResponseDialogTarget | null>(null)
  const [exporting, setExporting] = useState(false)

  const allRows = useMemo(() => overviewRows(data), [data])
  // Lọc team / trưởng nhóm trước — ô "Vào làm" đếm số người từng tháng trên kết quả này.
  const scopedRows = useMemo(
    () =>
      filterOverviewRows(allRows, {
        team: team === ALL ? null : team,
        leader: leader === ALL ? null : leader,
      }),
    [allRows, team, leader]
  )
  const rows = useMemo(
    () => filterOverviewRows(scopedRows, { team: null, leader: null, startMonth, startYear }),
    [scopedRows, startMonth, startYear]
  )
  const rowsById = useMemo(() => new Map(rows.map((r) => [r.subject.id, r])), [rows])
  const sections = useMemo(() => overviewSections(template.questions, rows), [template, rows])

  const teamOptions = useMemo(() => {
    const names = new Set(allRows.map((r) => teamKey(r.subject)))
    return [...names].sort((a, b) =>
      a === OVERVIEW_NONE ? 1 : b === OVERVIEW_NONE ? -1 : a.localeCompare(b, 'vi')
    )
  }, [allRows])
  const leaderOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const r of allRows) {
      byId.set(leaderKey(r.subject), r.subject.teamLeader ? personName(r.subject.teamLeader) : '')
    }
    return [...byId.entries()].sort(([a, x], [b, y]) =>
      a === OVERVIEW_NONE ? 1 : b === OVERVIEW_NONE ? -1 : x.localeCompare(y, 'vi')
    )
  }, [allRows])

  const total = rows.length
  const done = rows.filter((r) => r.response).length
  const pending = total - done
  const noLeader = rows.filter((r) => !r.subject.teamLeader).length
  const recent = countUpdatedSince(rows, RECENT_DAYS)
  const teamCount = new Set(rows.map((r) => teamKey(r.subject))).size
  const filtered = team !== ALL || leader !== ALL || startMonth !== null || startYear !== null

  const showPending = () =>
    setPeople({
      title: 'Chưa điền checklist',
      description: template.title,
      subjectIds: rows.filter((r) => !r.response).map((r) => r.subject.id),
    })

  const viewRow = (row: OverviewRow) => {
    if (!row.response) return
    setViewing({
      title: template.title,
      questions: template.questions,
      subject: row.subject,
      response: row.response,
    })
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      await downloadChecklistResponsesExcel({
        ...data,
        rows: data.rows.filter((r) => rowsById.has(r.subject.id)),
      })
    } catch {
      toast.error('Không thể xuất file Excel')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <FilterBar
        source={templateSelect}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onOpenResponses}
            >
              <ListChecks className="size-4" aria-hidden />
              Câu trả lời
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void exportExcel()}
              disabled={exporting || done === 0}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              Xuất Excel
            </Button>
          </>
        }
      >
        <FilterSelect
          label="Team"
          value={team}
          onChange={setTeam}
          options={teamOptions.map((t) => [t, t === OVERVIEW_NONE ? 'Chưa có team' : t])}
        />
        <FilterSelect
          label="Trưởng nhóm"
          value={leader}
          onChange={setLeader}
          options={leaderOptions.map(([id, name]) => [
            id,
            id === OVERVIEW_NONE ? 'Chưa gán trưởng nhóm' : name,
          ])}
        />
        <StartDateFilter
          month={startMonth}
          year={startYear}
          rows={scopedRows}
          onChange={(m, y) => {
            setStartMonth(m)
            setStartYear(y)
          }}
        />
        {filtered ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-fit text-muted-foreground"
            onClick={() => {
              setTeam(ALL)
              setLeader(ALL)
              setStartMonth(null)
              setStartYear(null)
            }}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Đặt lại
          </Button>
        ) : null}
      </FilterBar>

      <ProgressSummary
        rows={rows}
        badges={
          <>
            <Badge variant={isLeaderKind ? 'warning' : 'success'} className="px-2 py-0.5 text-xs">
              {CHECKLIST_KIND_LABEL[template.kind]}
            </Badge>
            {template.isActive ? null : (
              <Badge variant="muted" className="px-2 py-0.5 text-xs">
                Ngừng sử dụng
              </Badge>
            )}
          </>
        }
        note={
          template.isActive
            ? 'Tính trên bản trả lời mới nhất của nhân sự đang thuộc team áp dụng.'
            : 'Checklist đã ngừng dùng — chỉ tính những nhân sự đã có câu trả lời.'
        }
        onPick={(by, key) => (by === 'team' ? setTeam(key) : setLeader(key))}
        stats={
          <>
            <SummaryStat value={teamCount} label="team" />
            <SummaryStat
              value={pending}
              label="chưa điền"
              onClick={pending > 0 ? showPending : undefined}
            />
            {isLeaderKind ? (
              noLeader > 0 ? (
                <SummaryStat
                  value={noLeader}
                  label="chưa gán trưởng nhóm"
                  onClick={leader !== OVERVIEW_NONE ? () => setLeader(OVERVIEW_NONE) : undefined}
                />
              ) : null
            ) : (
              <SummaryStat value={recent} label={`cập nhật trong ${RECENT_DAYS} ngày qua`} />
            )}
          </>
        }
      />

      {done === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card">
          <EmptyState
            icon={<ClipboardList className="size-6" aria-hidden />}
            title="Chưa có câu trả lời nào"
            description={
              filtered
                ? 'Không có bản trả lời nào trong phạm vi lọc.'
                : 'Biểu đồ từng câu hỏi sẽ hiện khi có nhân sự điền checklist.'
            }
          />
        </div>
      ) : (
        (() => {
          let titled = 0
          return sections.map((s) => {
            // Số thứ tự phần khớp thứ tự trong form; để mờ cho tên phần nổi hơn.
            const number = s.title ? String(++titled).padStart(2, '0') : null
            return (
              <section key={s.id} className="space-y-3 pt-4">
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <h2 className="text-base font-semibold text-foreground">
                      {number ? (
                        <span className="mr-2 tabular-nums text-muted-foreground">{number}</span>
                      ) : null}
                      {s.title ?? 'Câu hỏi chung'}
                    </h2>
                    <span className="text-xs text-muted-foreground">{questionRange(s.stats)}</span>
                  </div>
                  {s.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-4">
                  {s.stats.map((st) =>
                    st.kind === 'text' ? (
                      <TextAnswersPanel
                        key={st.question.id}
                        stat={st}
                        base={done}
                        rowsById={rowsById}
                        onPeople={setPeople}
                      />
                    ) : (
                      <QuestionPanel
                        key={st.question.id}
                        stat={st}
                        base={done}
                        onPeople={setPeople}
                      />
                    )
                  )}
                </div>
              </section>
            )
          })
        })()
      )}

      <button
        type="button"
        onClick={onOpenResponses}
        className="inline-flex items-center gap-1 px-1 text-sm font-medium text-button hover:underline"
      >
        Xem danh sách nhân sự và từng câu trả lời
        <ArrowRight className="size-4" aria-hidden />
      </button>

      <ChecklistPeopleDialog
        target={people}
        rowsById={rowsById}
        onClose={() => setPeople(null)}
        onView={viewRow}
      />
      <ChecklistResponseDialog target={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

/** Admin (`checklist.manage`): trang tổng quan số liệu của một checklist. */
export function ChecklistOverviewPanel({
  templateId,
  onTemplateChange,
  onOpenResponses,
}: {
  templateId: string | undefined
  onTemplateChange: (templateId: string) => void
  onOpenResponses: (templateId: string) => void
}) {
  const { data: templates = [], isLoading } = useChecklistTemplates()
  const selected = templates.find((t) => t.id === templateId) ?? templates[0]
  const { data } = useChecklistTemplateResponses(selected?.id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  if (!selected) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card">
        <EmptyState
          icon={<ClipboardList className="size-6" aria-hidden />}
          title="Chưa có checklist nào"
          description="Tạo checklist ở tab Quản lý checklist, số liệu tổng quan sẽ hiện ở đây."
        />
      </div>
    )
  }

  const templateSelect = (
    <TemplateSelect templates={templates} value={selected.id} onChange={onTemplateChange} />
  )

  if (!data || data.template.id !== selected.id) {
    return (
      <div className="space-y-5">
        <FilterBar source={templateSelect} />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <OverviewBody
      key={selected.id}
      data={data}
      templateSelect={templateSelect}
      onOpenResponses={() => onOpenResponses(selected.id)}
    />
  )
}
