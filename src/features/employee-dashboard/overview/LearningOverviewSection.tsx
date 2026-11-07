import { Link } from '@tanstack/react-router'
import { ClipboardCheck, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { OverviewSummary } from '@/features/dashboard/api'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'
import {
  agendaDayLabel,
  agendaTimeLabel,
  attendanceMarked,
  attendanceRate,
  examParts,
  formatCount,
  formatDateVi,
  formatPct,
  passRate,
  pct,
  periodLabel,
  type OverviewPeriod,
} from './overviewModel'
import {
  ChoiceChips,
  Meter,
  OverviewCard,
  OverviewMoreLink,
  SectionTitle,
  SplitBar,
  StatTile,
  type OverviewLink,
} from './OverviewParts'

type Learning = OverviewSummary['learning']
type ClassRow = Learning['classRows'][number]
type AgendaRow = Learning['agenda'][number]

const LEARNERS_HINT =
  'Mỗi người tính một lần dù học nhiều lớp. Tỷ lệ = học viên đang làm việc / tổng người đang làm việc.'
const ATTENDANCE_HINT =
  'Có mặt (gồm đi muộn) trên tổng lượt đã điểm danh, của các buổi học đã diễn ra trong kỳ.'
const EXAM_HINT =
  'Bài nộp vào các lịch thi trong kỳ. Tỷ lệ đạt chỉ tính bài đã có kết quả, không tính bài đang chờ chấm.'
const CLASSES_HINT =
  'Lớp có thời gian hoạt động giao với kỳ (kể cả lớp đã đóng). Lớp chưa nhập ngày bắt đầu dùng ngày tạo lớp; không có ngày kết thúc nghĩa là lớp vẫn tiếp tục.'

const INITIAL_ROWS = 8

function classTypeLabel(row: ClassRow): string {
  if (row.kind === 'EDITOR') return 'Editor'
  return row.isKnowledgeWork ? 'Tri thức' : 'Lớp khác'
}

function classPeriod(row: ClassRow): string {
  return row.endDate
    ? `${formatDateVi(row.startDate)} – ${formatDateVi(row.endDate)}`
    : `từ ${formatDateVi(row.startDate)}`
}

const EXAM_LEGEND = examParts({ passed: 1, retake: 1, other: 0, waiting: 1, submitted: 3 })

function ExamCell({ row }: { row: ClassRow }) {
  const r = row.results
  if (r.submitted === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="min-w-0">
      <SplitBar
        parts={examParts(r)}
        total={r.submitted}
        label={`Kết quả thi ${row.name}`}
        className="h-2"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{r.passed}</span>/
        <span className="tabular-nums">{r.submitted}</span> đạt
        {r.waiting > 0 ? <span> · {r.waiting} chờ chấm</span> : null}
      </p>
    </div>
  )
}

function SessionsCell({ row }: { row: ClassRow }) {
  const { held, total } = row.sessions
  if (total === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="min-w-0">
      <p className="text-sm tabular-nums text-foreground">
        <span className="font-semibold">{held}</span>
        <span className="text-muted-foreground">/{total}</span>
      </p>
      <div className="mt-1 h-1.5 w-full max-w-20 rounded-full bg-button/12">
        <div
          className="h-full rounded-full bg-button"
          style={{ width: `${pct(held, total) ?? 0}%` }}
        />
      </div>
    </div>
  )
}

function ClassesCard({ rows, canOpen }: { rows: ClassRow[]; canOpen: boolean }) {
  const [filter, setFilter] = useState<'all' | 'knowledge' | 'other'>('all')
  const [expanded, setExpanded] = useState(false)
  const knowledge = rows.filter((r) => r.isKnowledgeWork).length
  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        filter === 'all' ? true : filter === 'knowledge' ? r.isKnowledgeWork : !r.isKnowledgeWork
      ),
    [rows, filter]
  )
  const shown = expanded ? filtered : filtered.slice(0, INITIAL_ROWS)
  const maxMembers = Math.max(1, ...rows.map((r) => r.memberCount))

  return (
    <OverviewCard
      className="lg:col-span-2"
      title="Lớp học trong kỳ"
      hint={CLASSES_HINT}
      meta="Học viên, buổi học và kết quả thi lũy kế từ khi mở lớp"
      action={
        <ChoiceChips
          label="Loại lớp"
          value={filter}
          onChange={(v) => {
            setFilter(v)
            setExpanded(false)
          }}
          options={[
            { value: 'all', label: `Tất cả ${rows.length}` },
            { value: 'knowledge', label: `Tri thức ${knowledge}` },
            { value: 'other', label: `Khác ${rows.length - knowledge}` },
          ]}
        />
      }
    >
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
          Không có lớp nào hoạt động trong kỳ này.
        </p>
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/80 text-xs text-muted-foreground">
                  <th className="px-4 pb-2 font-medium sm:px-5">Lớp</th>
                  <th className="w-28 px-3 pb-2 font-medium">Học viên</th>
                  <th className="w-24 px-3 pb-2 font-medium">Buổi học</th>
                  <th className="w-24 px-3 pb-2 font-medium">Chuyên cần</th>
                  <th className="w-40 px-4 pb-2 font-medium sm:pr-5">Kết quả thi</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 last:border-0 align-top">
                    <td className="px-4 py-2.5 sm:px-5">
                      <p className="flex items-center gap-2 font-medium text-foreground">
                        <span className="truncate">{row.name}</span>
                        {row.status === 'closed' ? (
                          <span className="shrink-0 rounded bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">
                            Đã đóng
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {classTypeLabel(row)} · {row.teacherName ?? 'Chưa có giảng viên'} ·{' '}
                        {classPeriod(row)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {row.memberCount}
                      </p>
                      <div className="mt-1 h-1.5 w-full max-w-20 rounded-full bg-muted/70">
                        <div
                          className="h-full rounded-full bg-button/70"
                          style={{ width: `${(row.memberCount / maxMembers) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <SessionsCell row={row} />
                    </td>
                    <td className="px-3 py-2.5 text-sm tabular-nums text-foreground">
                      {attendanceMarked(row.attendance) > 0 ? (
                        <span title={`${attendanceMarked(row.attendance)} lượt điểm danh`}>
                          {formatPct(attendanceRate(row.attendance))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 sm:pr-5">
                      <ExamCell row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {filtered.length > INITIAL_ROWS ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-medium text-button underline-offset-4 hover:underline"
              >
                {expanded ? 'Thu gọn' : `Xem thêm ${filtered.length - INITIAL_ROWS} lớp`}
              </button>
            ) : null}
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              Kết quả thi:
              {EXAM_LEGEND.map((p) => (
                <span key={p.key} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: p.color }} />
                  {p.label}
                </span>
              ))}
            </span>
            <span className="flex-1" />
            {canOpen ? (
              <OverviewMoreLink link={{ to: '/manager/classes' }}>Quản lý lớp học</OverviewMoreLink>
            ) : null}
          </div>
        </>
      )}
    </OverviewCard>
  )
}

function AgendaItem({ item, today }: { item: AgendaRow; today: string }) {
  const [, m, d] = item.dateIso.split('-')
  const isToday = item.dateIso === today
  return (
    <li className="flex gap-3 py-2">
      <div
        className={cn(
          'flex w-11 shrink-0 flex-col items-center rounded-lg border py-1 leading-none',
          isToday ? 'border-button/50 bg-button/8' : 'border-border/80'
        )}
      >
        <span className="text-base font-semibold tabular-nums text-foreground">{d}</span>
        <span className="mt-0.5 text-[10px] text-muted-foreground">
          {agendaDayLabel(item.dateIso, today) === 'Hôm nay' ? 'Nay' : `T${Number(m)}`}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <span className="truncate" title={item.topic}>
            {item.topic}
          </span>
          {item.isExam ? (
            <span className="shrink-0 rounded bg-warning-muted px-1.5 py-px text-[11px] font-medium text-warning dark:bg-warning/15">
              Thi
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground" title={item.className}>
          {agendaDayLabel(item.dateIso, today)} · {agendaTimeLabel(item.startTime, item.endTime)} ·{' '}
          {item.className}
        </p>
      </div>
    </li>
  )
}

function AgendaCard({
  agenda,
  today,
  canOpen,
}: {
  agenda: AgendaRow[]
  today: string
  canOpen: boolean
}) {
  const upcoming = agenda.filter((a) => a.dateIso >= today)
  const recent = agenda
    .filter((a) => a.dateIso < today)
    .reverse()
    .slice(0, 5)
  return (
    <OverviewCard title="Lịch học & thi" meta="14 ngày trước và sau hôm nay">
      <p className="text-xs font-medium text-muted-foreground">Sắp tới</p>
      {upcoming.length === 0 ? (
        <p className="mt-2 rounded-lg bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
          Chưa có buổi học hay lịch thi nào trong 14 ngày tới.
          {canOpen ? (
            <>
              {' '}
              <Link
                to="/manager/classes"
                className="font-medium text-button underline-offset-4 hover:underline"
              >
                Xếp lịch
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {upcoming.map((a) => (
            <AgendaItem key={a.id} item={a} today={today} />
          ))}
        </ul>
      )}
      {recent.length > 0 ? (
        <>
          <p className="mt-4 text-xs font-medium text-muted-foreground">Đã diễn ra</p>
          <ul className="divide-y divide-border/60">
            {recent.map((a) => (
              <AgendaItem key={a.id} item={a} today={today} />
            ))}
          </ul>
        </>
      ) : null}
    </OverviewCard>
  )
}

function BacklogChip({
  icon: Icon,
  count,
  label,
  link,
}: {
  icon: typeof ClipboardCheck
  count: number
  label: string
  link?: OverviewLink
}) {
  const inner = (
    <>
      <Icon className="size-3.5 text-warning" aria-hidden />
      <span className="font-semibold tabular-nums text-foreground">{formatCount(count)}</span>
      <span className="text-muted-foreground">{label}</span>
    </>
  )
  const cls =
    'inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-muted/60 px-3 py-1 text-xs dark:bg-warning/10'
  return link ? (
    <Link
      to={link.to}
      search={link.search}
      className={cn(cls, 'transition-colors hover:border-warning/60')}
    >
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  )
}

export function LearningOverviewSection({
  learning,
  activeStaff,
  period,
  today,
}: {
  learning: Learning
  activeStaff: number
  period: OverviewPeriod
  today: string
}) {
  const { canId } = usePermission()
  const canOpenClasses = canId('manager.classes') || canId('hr.classes.view')
  const canGrade = canId('teacher.grade')
  const label = periodLabel(period)
  const { classes, attendance, exams, backlog } = learning
  const coverage = pct(learning.activeLearners, activeStaff)
  const marked = attendanceMarked(attendance)
  const examRate = passRate(exams)

  return (
    <section className="space-y-3" aria-labelledby="overview-learning">
      <SectionTitle
        id="overview-learning"
        title="Lớp học"
        meta={`Lớp hoạt động, chuyên cần và kết quả thi trong kỳ ${label}`}
        action={
          backlog.gradingWaiting > 0 || backlog.registrationsPending > 0 ? (
            <div className="flex flex-wrap items-center gap-2" aria-label="Cần xử lý">
              {backlog.gradingWaiting > 0 ? (
                <BacklogChip
                  icon={ClipboardCheck}
                  count={backlog.gradingWaiting}
                  label="bài chờ chấm"
                  link={canGrade ? { to: '/manager/grading' } : undefined}
                />
              ) : null}
              {backlog.registrationsPending > 0 ? (
                <BacklogChip
                  icon={UserPlus}
                  count={backlog.registrationsPending}
                  label="đơn đăng ký lớp chờ duyệt"
                  link={canOpenClasses ? { to: '/manager/classes' } : undefined}
                />
              ) : null}
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Lớp đang hoạt động"
          hint={CLASSES_HINT}
          value={formatCount(classes.total)}
          sub={
            <>
              {classes.knowledge} tri thức · {classes.other} lớp khác
              {classes.closed > 0 ? ` · ${classes.closed} đã đóng` : ''}
            </>
          }
          link={canOpenClasses ? { to: '/manager/classes' } : undefined}
        />
        <StatTile
          label="Học viên"
          hint={LEARNERS_HINT}
          value={formatCount(learning.learners)}
          sub={`${formatPct(coverage)} nhân sự đang làm việc · ${formatCount(learning.enrollments)} lượt ghi danh`}
          footer={<Meter value={coverage} label="Tỷ lệ nhân sự đang đi học" />}
        />
        <StatTile
          label="Chuyên cần"
          hint={ATTENDANCE_HINT}
          value={marked > 0 ? formatPct(attendanceRate(attendance)) : '—'}
          sub={
            marked > 0
              ? `${learning.sessions.held} buổi đã học · ${formatCount(marked)} lượt điểm danh${attendance.absent > 0 ? ` · ${attendance.absent} vắng` : ''}`
              : learning.sessions.total > 0
                ? `${learning.sessions.total} buổi trong kỳ, chưa có điểm danh`
                : 'Không có buổi học nào trong kỳ'
          }
        />
        <StatTile
          label="Tỷ lệ đạt"
          hint={EXAM_HINT}
          value={formatPct(examRate)}
          sub={
            exams.submitted > 0
              ? `${exams.submitted} bài · ${exams.passed} đạt · ${exams.retake} học lại${exams.waiting > 0 ? ` · ${exams.waiting} chờ chấm` : ''}`
              : exams.schedules > 0
                ? `${exams.schedules} lịch thi, chưa có bài nộp`
                : 'Không có lịch thi trong kỳ'
          }
          footer={
            exams.submitted > 0 ? (
              <SplitBar
                parts={examParts(exams)}
                total={exams.submitted}
                label="Kết quả bài thi trong kỳ"
              />
            ) : undefined
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ClassesCard rows={learning.classRows} canOpen={canOpenClasses} />
        <AgendaCard agenda={learning.agenda} today={today} canOpen={canOpenClasses} />
      </div>
    </section>
  )
}
