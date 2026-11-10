import { useMemo, useState } from 'react'
import type { OverviewHrFilter, OverviewSummary } from '@/features/dashboard/api'
import { usePermission } from '@/hooks/usePermission'
import { HeadcountTrendChart, HIRE_COLOR, LEAVE_COLOR } from './HeadcountTrendChart'
import { OverviewDonut } from './OverviewDonut'
import { OverviewHrFilters } from './OverviewHrFilters'
import {
  contractParts,
  formatCount,
  formatPct,
  formatRate,
  genderParts,
  monthInPeriod,
  pct,
  periodLabel,
  periodNewHireRate,
  roleParts,
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
  'Nhân sự có trạng thái Đang làm việc (không tính đã nghỉ, thử việc chờ, bảo lưu, điều chuyển), theo các bộ lọc khối / team, loại hợp đồng, cấp độ, chức vụ.'
const LEAVE_HINT =
  'Theo ngày nghỉ trên hồ sơ (hoặc dữ liệu đồng bộ Lark); người đã nghỉ mà chưa có ngày nghỉ thì không xếp được vào tháng nào.'
const RATE_HINT =
  'Số người vào làm trong kỳ (theo ngày vào làm) chia cho số nhân sự đang làm việc ở cuối kỳ (kỳ chưa hết thì tính tới hôm nay).'
const TREND_HINT =
  'Số nhân sự: người đang làm việc tại cuối mỗi tháng, dựng lại từ ngày vào làm và ngày nghỉ (tháng đang chạy tính tới hôm nay). Tỷ lệ nhân sự mới = số vào làm trong tháng ÷ số nhân sự cuối tháng. Không áp bộ lọc trạng thái.'
const PROJECT_HINT =
  'Dự án đang tham gia: chưa rời dự án và dự án chưa kết thúc. Một người ở nhiều dự án được tính ở mỗi dự án.'
const ROLE_HINT =
  'Vai trò hiển thị trên thẻ ở Danh sách nhân sự, xếp từ Ban lãnh đạo xuống Nhân viên; Nhân sự (HR) tính là Nhân viên. Số ở giữa là tổng số người.'

type Hr = OverviewSummary['hr']

/** Phần cơ cấu tính trên nhóm nào (theo bộ lọc trạng thái). */
function structureMeta(status: OverviewHrFilter['status']): string {
  switch (status) {
    case 'active':
      return 'Người đang làm việc'
    case 'inactive':
      return 'Người đã nghỉ'
    case 'transferred':
      return 'Người điều chuyển'
    case 'reserved':
      return 'Người bảo lưu'
    case 'probation':
      return 'Người thử việc (chờ)'
    case 'all':
      return 'Mọi hồ sơ'
  }
}

export function HrOverviewSection({
  hr,
  period,
  filter,
  onFilterChange,
}: {
  hr: Hr
  period: OverviewPeriod
  /** Bộ lọc đang chọn (có thể đi trước `hr.filter` trong lúc tải). */
  filter: OverviewHrFilter
  onFilterChange: (next: OverviewHrFilter) => void
}) {
  const { canId } = usePermission()
  const canOpenList = canId('hr.employees.view') || canId('manager.team.view')
  const [groupBy, setGroupBy] = useState<'division' | 'team' | 'project'>('division')

  const label = periodLabel(period)
  const single = period.startMonth === period.endMonth
  const highlight = hr.monthly.map((m) => monthInPeriod(m.year, m.month, period))
  const avgLeaves = Math.round(
    hr.monthly.reduce((sum, m) => sum + m.leaves, 0) / Math.max(1, hr.monthly.length)
  )
  const periodRate = periodNewHireRate(hr.monthly, period)
  const structure = structureMeta(hr.filter.status)
  const structureTotal = hr.structureTotal

  // Danh sách nhân sự lọc được team + một tháng vào làm / nghỉ việc → link mang theo team đang lọc.
  const teamSearch = hr.filter.teamId ? { teamId: hr.filter.teamId } : {}
  const listLink = (search: Record<string, unknown>): OverviewLink | undefined =>
    canOpenList ? { to: '/hr-admin', search: { page: 1, ...teamSearch, ...search } } : undefined

  const contract = useMemo(() => contractParts(hr.byContract), [hr.byContract])
  const gender = useMemo(() => genderParts(hr.byGender), [hr.byGender])
  const role = useMemo(() => roleParts(hr.byRole), [hr.byRole])
  const rankedRows = useMemo<RankedRow[]>(() => {
    if (groupBy === 'division') {
      return hr.byDivision.map((d) => ({ key: d.id ?? 'none', label: d.name, count: d.count }))
    }
    if (groupBy === 'project') {
      // "Chưa có dự án" ghi riêng dưới danh sách — để làm cột thì cột dự án bị ép quá ngắn.
      return topWithOther(
        hr.byProject.flatMap((p) => (p.id ? [{ key: p.id, label: p.name, count: p.count }] : [])),
        6,
        'dự án'
      )
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
  }, [groupBy, hr.byDivision, hr.byTeam, hr.byProject])
  const noProject = hr.byProject.find((p) => p.id === null)?.count ?? 0

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

      <OverviewHrFilters
        value={filter}
        onChange={onFilterChange}
        options={hr.filterOptions}
        statusCounts={hr.byStatus}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Đang làm việc"
          hint={ACTIVE_HINT}
          value={formatCount(hr.active)}
          sub={`trên ${formatCount(hr.totalProfiles)} hồ sơ (gồm đã nghỉ)`}
          link={listLink({})}
        />
        <StatTile
          label={`Nhân sự mới · ${label}`}
          hint={RATE_HINT}
          value={formatRate(periodRate.rate)}
          sub={
            periodRate.headcount === null
              ? 'Kỳ chưa bắt đầu'
              : `${formatCount(periodRate.newHires)} mới / ${formatCount(periodRate.headcount)} nhân sự`
          }
          link={
            single
              ? listLink({ status: 'all', startMonth: period.startMonth, startYear: period.year })
              : undefined
          }
          footer={
            <MiniColumns
              values={hr.monthly.map((m) =>
                m.headcount ? Math.round((m.newHires / m.headcount) * 1000) / 10 : 0
              )}
              highlight={highlight}
              color={HIRE_COLOR}
              label="Tỷ lệ nhân sự mới 12 tháng gần nhất"
            />
          }
        />
        <StatTile
          label={`Nghỉ việc · ${label}`}
          hint={LEAVE_HINT}
          value={formatCount(hr.leaves)}
          sub={`Trung bình ${avgLeaves} người/tháng`}
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
      </div>

      <OverviewCard
        title="Tăng trưởng nhân sự 12 tháng"
        hint={TREND_HINT}
        meta="Di chuột từng tháng để xem chi tiết · nền xám là các tháng thuộc kỳ đang xem"
      >
        <HeadcountTrendChart months={hr.monthly} period={period} />
        {hr.leftWithoutDate > 0 ? (
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <span>
              {formatCount(hr.leftWithoutDate)} người đã nghỉ chưa có ngày nghỉ nên không tính vào
              số nhân sự các tháng trước.
            </span>
            {canOpenList ? (
              <OverviewMoreLink
                link={{ to: '/hr-admin', search: { page: 1, ...teamSearch, status: 'inactive' } }}
              >
                Bổ sung
              </OverviewMoreLink>
            ) : null}
          </p>
        ) : null}
      </OverviewCard>

      <div className="grid gap-3 md:grid-cols-2">
        <OverviewCard
          title="Trạng thái nhân viên"
          meta={`${structure} · theo loại hợp đồng`}
          hint="Chức danh ghi ở cột Loại hợp đồng (Trưởng nhóm, Quản lý, BOD, Chuyên gia) gom vào Quản lý & chuyên gia."
        >
          <div className="flex flex-1 items-center">
            <OverviewDonut
              parts={contract}
              total={structureTotal}
              label="Trạng thái nhân viên"
              centerValue={formatCount(structureTotal)}
              centerCaption="người"
            />
          </div>
        </OverviewCard>

        <OverviewCard title="Chức vụ" meta={structure} hint={ROLE_HINT}>
          <div className="flex flex-1 items-center">
            <OverviewDonut
              parts={role}
              total={structureTotal}
              label="Chức vụ"
              centerValue={formatCount(structureTotal)}
              centerCaption="người"
            />
          </div>
        </OverviewCard>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <OverviewCard
          title="Phân bổ nhân sự"
          meta={structure}
          hint={groupBy === 'project' ? PROJECT_HINT : undefined}
          action={
            <ChoiceChips
              label="Xem theo"
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: 'division', label: 'Khối' },
                { value: 'team', label: 'Team' },
                { value: 'project', label: 'Dự án' },
              ]}
            />
          }
        >
          {groupBy === 'project' && rankedRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Chưa có ai tham gia dự án.
            </p>
          ) : (
            <div className="-mx-2">
              <RankedBars
                rows={rankedRows}
                total={structureTotal}
                linkFor={(row) =>
                  row.teamId && canOpenList
                    ? { to: '/hr-admin', search: { page: 1, teamId: row.teamId } }
                    : null
                }
              />
            </div>
          )}
          {groupBy === 'project' && noProject > 0 && rankedRows.length > 0 ? (
            <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              {formatCount(noProject)} người ({formatPct(pct(noProject, structureTotal))}) chưa tham
              gia dự án nào.
            </p>
          ) : null}
        </OverviewCard>
        <OverviewCard
          title="Thâm niên"
          meta={
            hr.tenureMissing > 0
              ? `${structure} · ${hr.tenureMissing} người thiếu ngày vào làm / nghỉ`
              : hr.filter.status === 'inactive' || hr.filter.status === 'all'
                ? `${structure} · người đã nghỉ tính tới ngày nghỉ`
                : `${structure} · tính tới hôm nay`
          }
        >
          <BucketColumns buckets={hr.byTenure} label="Thâm niên" />
        </OverviewCard>
        <OverviewCard
          title="Độ tuổi & giới tính"
          className="md:col-span-2 xl:col-span-1"
          meta={
            hr.ageMissing > 0
              ? `${structure} · ${hr.ageMissing} người chưa có ngày sinh`
              : `${structure} · tuổi tròn tới hôm nay`
          }
        >
          <BucketColumns buckets={hr.byAge} label="Độ tuổi" />
          <div className="mt-4 border-t border-border/70 pt-4">
            <SplitBar parts={gender} total={structureTotal} label="Giới tính" />
            <SplitLegend parts={gender} total={structureTotal} />
          </div>
        </OverviewCard>
      </div>
    </section>
  )
}
