import { useState, type ReactNode } from 'react'
import { ArrowRight, ChevronDown, ChevronUp, PieChart, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatChecklistAnswer, personName } from '../checklistAnswers'
import {
  byCountDesc,
  DONUT_MAX_OPTIONS,
  LONG_LIST_MAX,
  LONG_LIST_PREVIEW,
  pct,
  prefersColumns,
  REMOVED_OPTION_ID,
  type OptionStat,
  type OverviewRow,
  type QuestionStat,
} from '../checklistOverview'
import { CHECKLIST_QUESTION_TYPE_LABEL, type ChecklistQuestion } from '../types'
import { CountBarChart, DonutChart, type ChartSlice } from './ChecklistCharts'

/** Danh sách người cần mở khi bấm vào một con số. `detail` = câu tự luận cần hiện nội dung. */
export type OverviewPeopleTarget = {
  title: string
  description: string
  subjectIds: string[]
  detail?: ChecklistQuestion
}

type OnPeople = (target: OverviewPeopleTarget) => void

/**
 * Màu theo thứ tự lựa chọn trong form (không theo thứ hạng) — lọc lại vẫn giữ màu. Tối đa 8 màu,
 * không lặp lại: lưới nhiều cột hơn thì chỉ xem dạng bảng.
 */
const CATEGORY_COLORS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--viz-cat-${i})`)
/** "Bỏ trống" = xám nhạt; "(đã xoá / ngoài thang)" = xám đậm hơn để không lẫn khi đứng cạnh nhau. */
const NONE_COLOR = 'var(--viz-none)'
const REMOVED_COLOR = 'var(--viz-removed)'

function optionSlices(options: OptionStat[]): ChartSlice[] {
  return options.map((o, i) => {
    const removed = o.id === REMOVED_OPTION_ID
    return {
      key: o.id,
      label: o.label,
      count: o.count,
      color: removed ? REMOVED_COLOR : CATEGORY_COLORS[i]!,
      neutral: removed,
    }
  })
}

/** Thay cho biểu đồ toàn số 0 khi chưa ai trả lời câu (người đã điền đều bỏ trống). */
function NoAnswers({ base }: { base: number }) {
  return (
    <p className="rounded-lg bg-muted/40 px-3 py-5 text-center text-sm text-muted-foreground">
      Chưa có ai trả lời câu này
      {base > 0 ? ` — ${base} bản đã điền đều bỏ trống.` : '.'}
    </p>
  )
}

function Swatch({ color }: { color: string }) {
  return (
    <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} aria-hidden />
  )
}

/** Dòng phụ dưới tên câu: "Câu 3 · Chọn một · 270/272 đã trả lời" — loại câu nằm ở đây, không thành nhãn riêng. */
function metaLine(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' · ')
}

function PanelShell({
  title,
  meta,
  actions,
  className,
  children,
}: {
  title: string
  meta: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    // Thẻ giãn theo flex: lẻ một mình cuối hàng thì tự kéo hết chiều ngang; `@container` để nội dung
    // bên trong tự xếp theo bề rộng thẻ.
    <article
      className={cn(
        '@container min-w-0 grow basis-full rounded-2xl border border-border/80 bg-card p-5 shadow-sm lg:basis-[calc(50%-0.5rem)]',
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-foreground">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </article>
  )
}

function CountRow({
  color,
  label,
  count,
  total,
  onClick,
}: {
  color: string
  label: string
  count: number
  total: number
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        disabled={count === 0}
        onClick={onClick}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/70 disabled:cursor-default disabled:hover:bg-transparent"
      >
        <Swatch color={color} />
        <span className="min-w-0 flex-1 leading-snug text-foreground/85">{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{count}</span>
        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
          {pct(count, total)}%
        </span>
      </button>
    </li>
  )
}

const SKIPPED_KEY = '__skipped'

/** Chọn một (≤ 6 lựa chọn): biểu đồ tròn + danh sách số liệu từng lựa chọn (bấm để xem người). */
function DonutPanel({
  stat,
  base,
  onPeople,
}: {
  stat: Extract<QuestionStat, { kind: 'choice' }>
  base: number
  onPeople: OnPeople
}) {
  const title = stat.question.title
  const slices = optionSlices(stat.options)
  if (stat.skippedIds.length > 0) {
    slices.push({
      key: SKIPPED_KEY,
      label: 'Bỏ trống',
      count: stat.skippedIds.length,
      color: NONE_COLOR,
      neutral: true,
    })
  }
  const open = (key: string) => {
    const option = stat.options.find((o) => o.id === key)
    onPeople({
      title: option ? option.label : 'Bỏ trống câu này',
      description: `Câu ${stat.number}: ${title}`,
      subjectIds: option ? option.subjectIds : stat.skippedIds,
    })
  }
  return (
    <PanelShell
      title={title}
      meta={metaLine(
        `Câu ${stat.number}`,
        CHECKLIST_QUESTION_TYPE_LABEL[stat.question.type],
        `${stat.answered}/${base} đã trả lời`
      )}
    >
      {stat.answered === 0 ? (
        <NoAnswers base={base} />
      ) : (
        <div className="flex flex-col items-center gap-4 @md:flex-row @md:gap-8">
          <DonutChart slices={slices} total={base} label={title} onSelect={open} />
          {/* Giới hạn bề rộng để số luôn đứng sát nhãn, kể cả khi thẻ giãn hết hàng. */}
          <ul className="grid w-full min-w-0 max-w-sm flex-1 gap-y-0.5">
            {slices.map((s) => (
              <CountRow
                key={s.key}
                color={s.color}
                label={s.label}
                count={s.count}
                total={base}
                onClick={() => open(s.key)}
              />
            ))}
          </ul>
        </div>
      )}
    </PanelShell>
  )
}

/**
 * Chọn nhiều / thang điểm / chọn một quá nhiều lựa chọn: biểu đồ cột ghi số người. 3–5 đáp án → cột
 * dọc, 1–2 hoặc nhiều đáp án → cột ngang (`prefersColumns`); thẻ quá hẹp cũng tự về cột ngang.
 */
function OptionsPanel({
  stat,
  base,
  onPeople,
}: {
  stat: Extract<QuestionStat, { kind: 'choice' | 'scale' }>
  base: number
  onPeople: OnPeople
}) {
  const [showAll, setShowAll] = useState(false)
  const title = stat.question.title
  const multiple = stat.kind === 'choice' && stat.multiple
  const columns = prefersColumns(stat)
  // Danh sách dài (vd. 50 cửa hàng): xếp theo số người, mặc định chỉ hiện nhóm đầu.
  const long = stat.options.length > LONG_LIST_MAX
  const options = long ? byCountDesc(stat.options) : stat.options
  const shown = long && !showAll ? options.slice(0, LONG_LIST_PREVIEW) : options
  const meta = metaLine(
    `Câu ${stat.number}`,
    CHECKLIST_QUESTION_TYPE_LABEL[stat.question.type],
    multiple ? `${stat.answered}/${base} có chọn` : `${stat.answered}/${base} đã trả lời`,
    long && 'xếp theo số người'
  )
  const scoredNote =
    stat.kind === 'scale' && stat.scored < stat.answered
      ? ` · tính trên ${stat.scored} câu trả lời trong thang`
      : ''
  return (
    <PanelShell
      title={title}
      meta={meta}
      // Thang nhiều mức (vd. 0–10) cần cả hàng mới đủ chỗ cho cột dọc.
      className={cn(columns && stat.options.length > 6 && 'lg:basis-full')}
    >
      {stat.answered === 0 ? (
        <NoAnswers base={base} />
      ) : (
        <>
          {stat.kind === 'scale' && stat.average !== null ? (
            <p className="mb-3 text-sm text-muted-foreground">
              Điểm trung bình{' '}
              <span className="text-lg font-bold text-foreground">
                {stat.average.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
              </span>{' '}
              / {stat.question.scale?.max ?? 5}
              {scoredNote}
            </p>
          ) : null}
          <CountBarChart
            items={shown.map((o) => ({
              key: o.id,
              label: o.label,
              count: o.count,
              muted: o.id === REMOVED_OPTION_ID,
            }))}
            base={base}
            columns={columns}
            onSelect={(key) => {
              const o = stat.options.find((x) => x.id === key)
              if (o) {
                onPeople({
                  title: o.label,
                  description: `Câu ${stat.number}: ${title}`,
                  subjectIds: o.subjectIds,
                })
              }
            }}
          />
          {long ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-8 gap-1"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? (
                <ChevronUp className="size-3.5" aria-hidden />
              ) : (
                <ChevronDown className="size-3.5" aria-hidden />
              )}
              {showAll
                ? `Thu gọn — chỉ hiện ${LONG_LIST_PREVIEW} lựa chọn nhiều người nhất`
                : `Xem tất cả ${options.length} lựa chọn`}
            </Button>
          ) : null}
        </>
      )}
    </PanelShell>
  )
}

/**
 * Lưới chọn: mỗi nội dung (dòng của lưới) một biểu đồ tròn, chung một chú thích màu theo cột của
 * lưới. Nút bên phải đổi sang bảng số người + tỷ lệ cho ai cần con số chính xác.
 */
function GridPanel({
  stat,
  base,
  onPeople,
}: {
  stat: Extract<QuestionStat, { kind: 'grid' }>
  base: number
  onPeople: OnPeople
}) {
  const [picked, setView] = useState<'chart' | 'table'>('chart')
  // Hết màu phân loại (không lặp màu) → chỉ xem dạng bảng.
  const chartable = stat.columns.length <= CATEGORY_COLORS.length
  const view = chartable ? picked : 'table'
  const empty = stat.rows.every((r) => r.answered === 0)
  const title = stat.question.title
  const hasRemoved = stat.rows.some((r) => r.options.some((o) => o.id === REMOVED_OPTION_ID))
  const columns = hasRemoved
    ? [...stat.columns, { id: REMOVED_OPTION_ID, label: '(lựa chọn đã xoá)' }]
    : stat.columns
  const series = columns.map((c, i) => ({
    key: c.id,
    label: c.label,
    color: c.id === REMOVED_OPTION_ID ? REMOVED_COLOR : (CATEGORY_COLORS[i] ?? REMOVED_COLOR),
  }))
  if (stat.rows.some((r) => r.answered < base)) {
    series.push({ key: SKIPPED_KEY, label: 'Bỏ trống', color: NONE_COLOR })
  }
  const rows = stat.rows.map((row) => {
    const byId = new Map(row.options.map((o) => [o.id, o]))
    return {
      key: row.id,
      label: row.label,
      byId,
      counts: Object.fromEntries(
        series.map((s) => [
          s.key,
          s.key === SKIPPED_KEY ? base - row.answered : (byId.get(s.key)?.count ?? 0),
        ])
      ),
    }
  })
  const open = (rowKey: string, seriesKey: string) => {
    const row = rows.find((r) => r.key === rowKey)
    const o = row?.byId.get(seriesKey)
    if (!row || !o || o.count === 0) return
    onPeople({
      title: `${row.label}: ${o.label}`,
      description: `Câu ${stat.number}: ${title}`,
      subjectIds: o.subjectIds,
    })
  }

  return (
    <PanelShell
      title={title}
      meta={metaLine(
        `Câu ${stat.number}`,
        CHECKLIST_QUESTION_TYPE_LABEL.GRID,
        `${stat.rows.length} nội dung`
      )}
      className="lg:basis-full"
      actions={
        !chartable || empty ? null : (
          <div
            className="flex gap-0.5 rounded-md bg-muted/60 p-0.5"
            role="tablist"
            aria-label="Dạng xem"
          >
            {(
              [
                ['chart', PieChart, 'Biểu đồ'],
                ['table', Table2, 'Bảng số'],
              ] as const
            ).map(([v, Icon, label]) => (
              <Button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                aria-label={label}
                title={label}
                variant={view === v ? 'default' : 'ghost'}
                size="sm"
                className={cn('size-7 rounded p-0', view !== v && 'text-muted-foreground')}
                onClick={() => setView(v)}
              >
                <Icon className="size-3.5" aria-hidden />
              </Button>
            ))}
          </div>
        )
      }
    >
      {empty ? (
        <NoAnswers base={base} />
      ) : view === 'chart' ? (
        <>
          <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {series.map((s) => (
              <li key={s.key} className="inline-flex items-center gap-1.5">
                <Swatch color={s.color} />
                {s.label}
              </li>
            ))}
          </ul>
          {/* auto-fit: ít nội dung thì các vòng dàn đều cả hàng, nhiều thì tự xuống dòng. */}
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-x-4 gap-y-6 pt-2">
            {rows.map((row) => (
              <li key={row.key} className="flex flex-col items-center gap-2.5">
                <DonutChart
                  slices={series.map((s) => ({
                    key: s.key,
                    label: s.label,
                    count: row.counts[s.key] ?? 0,
                    color: s.color,
                    neutral: s.key === SKIPPED_KEY || s.key === REMOVED_OPTION_ID,
                  }))}
                  total={base}
                  label={row.label}
                  onSelect={(key) => open(row.key, key)}
                />
                <p className="max-w-[12rem] text-center text-sm leading-snug text-foreground/85">
                  {row.label}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          {chartable ? null : (
            <p className="mb-2 px-1 text-xs text-muted-foreground">
              Lưới có {stat.columns.length} cột — nhiều hơn {CATEGORY_COLORS.length} màu phân biệt
              được nên chỉ xem dạng bảng.
            </p>
          )}
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="pb-2 pr-3 text-left font-medium">Nội dung</th>
                {series.map((s) => (
                  <th key={s.key} className="px-2 pb-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-border/60">
                  <td className="py-2 pr-3 leading-snug text-foreground/85">{row.label}</td>
                  {series.map((s) => {
                    const count = row.counts[s.key] ?? 0
                    const clickable = s.key !== SKIPPED_KEY && count > 0
                    return (
                      <td key={s.key} className="px-1 py-2 text-right">
                        <button
                          type="button"
                          disabled={!clickable}
                          onClick={() => open(row.key, s.key)}
                          className="rounded-md px-1.5 py-1 tabular-nums transition-colors hover:bg-muted/70 disabled:cursor-default disabled:hover:bg-transparent"
                        >
                          <span className="font-semibold text-foreground">{count}</span>{' '}
                          <span className="text-xs text-muted-foreground">{pct(count, base)}%</span>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  )
}

/** Số câu trả lời hiện sẵn trên thẻ câu tự luận. */
const TEXT_PREVIEW = 3

/**
 * Câu tự luận / ngày: không thống kê nội dung, hiện sẵn vài câu trả lời mới nhất (mỗi câu tối đa 3
 * dòng). Bấm vào câu trả lời hoặc "Xem tất cả" → danh sách đầy đủ, cùng thứ tự mới nhất trước.
 */
export function TextAnswersPanel({
  stat,
  base,
  rowsById,
  onPeople,
}: {
  stat: Extract<QuestionStat, { kind: 'text' }>
  base: number
  rowsById: Map<string, OverviewRow>
  onPeople: OnPeople
}) {
  const q = stat.question
  const openAll = () =>
    onPeople({
      title: q.title,
      description: `Câu ${stat.number} · ${stat.answered} câu trả lời`,
      subjectIds: stat.subjectIds,
      detail: q,
    })
  const preview = stat.subjectIds.slice(0, TEXT_PREVIEW).flatMap((id) => {
    const row = rowsById.get(id)
    const text = row?.response ? formatChecklistAnswer(q, row.response.answers[q.id]) : ''
    return row && text ? [{ row, text }] : []
  })
  return (
    <PanelShell
      title={q.title}
      meta={metaLine(
        `Câu ${stat.number}`,
        CHECKLIST_QUESTION_TYPE_LABEL[q.type],
        `${stat.answered}/${base} đã trả lời`
      )}
    >
      {stat.answered === 0 ? (
        <NoAnswers base={base} />
      ) : (
        <>
          <ul className="grid gap-2">
            {preview.map(({ row, text }) => (
              <li key={row.subject.id}>
                <button
                  type="button"
                  onClick={openAll}
                  className="w-full rounded-lg bg-muted/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/80"
                >
                  <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                    {text}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[personName(row.subject), row.subject.teamName].filter(Boolean).join(' · ')}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={openAll}
            className="mt-3 inline-flex items-center gap-1 px-1 text-sm font-medium text-button hover:underline"
          >
            {stat.answered > preview.length
              ? `Xem tất cả ${stat.answered} câu trả lời`
              : 'Xem đầy đủ'}
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        </>
      )}
    </PanelShell>
  )
}

/** Thẻ thống kê một câu hỏi có lựa chọn (câu tự luận dùng `TextAnswersPanel`). */
export function QuestionPanel({
  stat,
  base,
  onPeople,
}: {
  stat: Exclude<QuestionStat, { kind: 'text' }>
  base: number
  onPeople: OnPeople
}) {
  if (stat.kind === 'grid') return <GridPanel stat={stat} base={base} onPeople={onPeople} />
  if (stat.kind === 'choice' && !stat.multiple) {
    return stat.options.length <= DONUT_MAX_OPTIONS ? (
      <DonutPanel stat={stat} base={base} onPeople={onPeople} />
    ) : (
      <OptionsPanel stat={stat} base={base} onPeople={onPeople} />
    )
  }
  return <OptionsPanel stat={stat} base={base} onPeople={onPeople} />
}
