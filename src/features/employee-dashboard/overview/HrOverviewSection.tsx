import { useMemo, useState } from 'react'
import type { OverviewSummary } from '@/features/dashboard/api'
import { usePermission } from '@/hooks/usePermission'
import { HIRE_COLOR, LEAVE_COLOR, MonthlyFlowChart } from './MonthlyFlowChart'
import {
  contractParts,
  formatCount,
  genderParts,
  monthInPeriod,
  pct,
  periodLabel,
  topWithOther,
  type OverviewPeriod,
  type RankedRow,
} from './overviewModel'
import {
  BucketColumns,
  ChoiceChips,
  MiniColumns,
  OverviewCard,
  OverviewMoreLink,
  RankedBars,
  SectionTitle,
  SplitBar,
  SplitLegend,
  StatTile,
  type OverviewLink,
} from './OverviewParts'

const ACTIVE_HINT =
  'Nhân sự có trạng thái Đang làm việc (không tính đã nghỉ, thử việc chờ, bảo lưu, điều chuyển). Mọi biểu đồ cơ cấu bên dưới chỉ tính nhóm này, tại thời điểm hiện tại.'
const FLOW_HINT =
  'Vào làm: theo ngày vào làm. Nghỉ việc: theo ngày nghỉ trên hồ sơ (hoặc dữ liệu đồng bộ Lark); người đã nghỉ mà chưa có ngày nghỉ thì không xếp được vào tháng nào.'

type Hr = OverviewSummary['hr']

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  )
}

export function HrOverviewSection({ hr, period }: { hr: Hr; period: OverviewPeriod }) {
  const { canId } = usePermission()
  const canOpenList = canId('hr.employees.view') || canId('manager.team.view')
  const [groupBy, setGroupBy] = useState<'division' | 'team'>('division')

  const label = periodLabel(period)
  const single = period.startMonth === period.endMonth
  const highlight = hr.monthly.map((m) => monthInPeriod(m.year, m.month, period))
  const avg = (field: 'newHires' | 'leaves') =>
    Math.round(hr.monthly.reduce((sum, m) => sum + m[field], 0) / Math.max(1, hr.monthly.length))
  const probation = hr.byTeamPosition.find((r) => r.label === 'Full-time thử việc')?.count ?? 0
  const partTime = hr.byTeamPosition.find((r) => r.label === 'Part-time')?.count ?? 0

  // Danh sách nhân sự chỉ lọc được một tháng vào làm / nghỉ việc → chỉ gắn link khi kỳ là một tháng.
  const listLink = (search: Record<string, unknown>): OverviewLink | undefined =>
    canOpenList ? { to: '/hr-admin', search: { page: 1, ...search } } : undefined

  const contract = useMemo(() => contractParts(hr.byTeamPosition), [hr.byTeamPosition])
  const gender = useMemo(() => genderParts(hr.byGender), [hr.byGender])
  const rankedRows = useMemo<RankedRow[]>(() => {
    if (groupBy === 'division') {
      return hr.byDivision.map((d) => ({ key: d.id ?? 'none', label: d.name, count: d.count }))
    }
    return topWithOther(
      hr.byTeam.map((t) => ({
        key: t.id ?? 'none',
        label: t.name,
        sublabel: t.divisionName,
        count: t.count,
        teamId: t.id ?? undefined,
      })),
      6,
      'team'
    )
  }, [groupBy, hr.byDivision, hr.byTeam])

  return (
    <section className="space-y-3" aria-labelledby="overview-hr">
      <SectionTitle
        id="overview-hr"
        title="Nhân sự"
        meta={`Vào làm, nghỉ việc theo kỳ ${label} · cơ cấu tính tại hôm nay`}
        action={
          canOpenList ? (
            <OverviewMoreLink link={{ to: '/hr-admin', search: { page: 1 } }}>
              Danh sách nhân sự
            </OverviewMoreLink>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Đang làm việc"
          hint={ACTIVE_HINT}
          value={formatCount(hr.active)}
          sub={`trên ${formatCount(hr.totalProfiles)} hồ sơ (gồm đã nghỉ)`}
          link={listLink({})}
        />
        <StatTile
          label={`Vào làm · ${label}`}
          value={formatCount(hr.newHires)}
          sub={`Trung bình ${avg('newHires')} người/tháng`}
          link={
            single
              ? listLink({ status: 'all', startMonth: period.startMonth, startYear: period.year })
              : undefined
          }
          footer={
            <MiniColumns
              values={hr.monthly.map((m) => m.newHires)}
              highlight={highlight}
              color={HIRE_COLOR}
              label="Số người vào làm 12 tháng gần nhất"
            />
          }
        />
        <StatTile
          label={`Nghỉ việc · ${label}`}
          hint={FLOW_HINT}
          value={formatCount(hr.leaves)}
          sub={`Trung bình ${avg('leaves')} người/tháng`}
          link={
            single
              ? listLink({
                  status: 'inactive',
                  leaveMonth: period.startMonth,
                  leaveYear: period.year,
                })
              : undefined
          }
          footer={
            <MiniColumns
              values={hr.monthly.map((m) => m.leaves)}
              highlight={highlight}
              color={LEAVE_COLOR}
              label="Số người nghỉ việc 12 tháng gần nhất"
            />
          }
        />
        <StatTile
          label="Thử việc · Part-time"
          value={`${formatCount(probation)} · ${formatCount(partTime)}`}
          sub={`${pct(probation + partTime, hr.active) ?? 0}% người đang làm việc`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <OverviewCard
          className="lg:col-span-2"
          title="Biến động nhân sự 12 tháng"
          hint={FLOW_HINT}
          meta={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <LegendDot color={HIRE_COLOR} label="Vào làm" />
              <LegendDot color={LEAVE_COLOR} label="Nghỉ việc" />
              <span>Cột đậm là tháng thuộc kỳ đang xem</span>
            </span>
          }
        >
          <MonthlyFlowChart months={hr.monthly} period={period} />
          {hr.leftWithoutDate > 0 ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>
                {formatCount(hr.leftWithoutDate)} người đã nghỉ chưa có ngày nghỉ nên không có trong
                biểu đồ.
              </span>
              {canOpenList ? (
                <OverviewMoreLink
                  link={{ to: '/hr-admin', search: { page: 1, status: 'inactive' } }}
                >
                  Bổ sung
                </OverviewMoreLink>
              ) : null}
            </p>
          ) : null}
        </OverviewCard>

        <OverviewCard
          title="Phân bổ nhân sự"
          meta="Người đang làm việc"
          action={
            <ChoiceChips
              label="Xem theo"
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: 'division', label: 'Khối' },
                { value: 'team', label: 'Team' },
              ]}
            />
          }
        >
          <div className="-mx-2">
            <RankedBars
              rows={rankedRows}
              total={hr.active}
              linkFor={(row) =>
                row.teamId && canOpenList
                  ? { to: '/hr-admin', search: { page: 1, teamId: row.teamId } }
                  : null
              }
            />
          </div>
        </OverviewCard>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <OverviewCard title="Loại hợp đồng & giới tính" meta="Người đang làm việc">
          <SplitBar parts={contract} total={hr.active} label="Loại hợp đồng" />
          <SplitLegend parts={contract} total={hr.active} />
          <div className="mt-5 border-t border-border/70 pt-4">
            <SplitBar parts={gender} total={hr.active} label="Giới tính" />
            <SplitLegend parts={gender} total={hr.active} />
          </div>
        </OverviewCard>
        <OverviewCard
          title="Thâm niên"
          meta={
            hr.tenureMissing > 0
              ? `Tính tới hôm nay · ${hr.tenureMissing} người chưa có ngày vào làm`
              : 'Tính tới hôm nay'
          }
        >
          <BucketColumns buckets={hr.byTenure} label="Thâm niên" />
        </OverviewCard>
        <OverviewCard
          title="Độ tuổi"
          meta={
            hr.ageMissing > 0 ? `${hr.ageMissing} người chưa có ngày sinh` : 'Tuổi tròn tới hôm nay'
          }
        >
          <BucketColumns buckets={hr.byAge} label="Độ tuổi" />
        </OverviewCard>
      </div>
    </section>
  )
}
