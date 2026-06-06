/**
 * Luồng KPI/OKR — Phòng Kinh doanh (Leader → Member).
 * Kiểm tra logic thuần (không cần browser) cho các quyết định hiển thị / chốt / tổng hợp.
 */
import { describe, it, expect } from 'vitest'
import type { PerformanceAssignment } from '../api'
import {
  isCatalogEnabledDepartment,
  isTrafficTeam,
  shouldShowAssignmentForMember,
} from '../catalogHelpers'
import {
  ASSIGN_TABLE_HEAD,
  PLANNING_ASSIGN_TABLE_HEAD,
} from '../components/kpiAssignmentTableShared'
import {
  isKinhDoanhResultsCloseWindowOpen,
  resolveKinhDoanhResultsCloseWindowForTeam,
} from '../kpiPeriodLimits'

function row(partial: Partial<PerformanceAssignment>): PerformanceAssignment {
  return {
    id: '1',
    teamId: 'team-kd',
    year: 2026,
    month: 6,
    assigneeUserId: 'member-1',
    kind: 'KPI',
    content: 'x',
    priority: 1,
    createdAt: '',
    updatedAt: '',
    ...partial,
  } as PerformanceAssignment
}

/** Đồng bộ KpiOkrWorkspace.visibleAssignmentsThisMonth */
function filterVisibleAssignments(
  rows: PerformanceAssignment[],
  opts: { isKinhDoanhTeam: boolean; isMemberView: boolean; userId?: string }
): PerformanceAssignment[] {
  const passes = (r: PerformanceAssignment) =>
    !opts.isKinhDoanhTeam || shouldShowAssignmentForMember(r)
  if (opts.isMemberView) {
    const selfId = opts.userId?.trim()
    if (!selfId) return []
    return rows.filter((r) => r.assigneeUserId === selfId && passes(r))
  }
  if (opts.isKinhDoanhTeam) return rows.filter(shouldShowAssignmentForMember)
  return rows
}

/** Đồng bộ AssignmentTableSingleUser.tableHeads (results, kinh doanh) */
function resultsTableHeads(hideManagerEvalColumn: boolean, hideRowSave = true): string[] {
  let base = [...ASSIGN_TABLE_HEAD]
  if (hideManagerEvalColumn) base = base.filter((h) => h !== 'Đánh giá Manager')
  if (hideRowSave) base = base.filter((h) => h !== 'Thao tác')
  return base
}

/** Đồng bộ MonthlyReportScreen.okCount */
function countOkForReport(
  assignments: PerformanceAssignment[],
  hideManagerEvalColumn: boolean
): number {
  return assignments.filter((x) => {
    const status = hideManagerEvalColumn
      ? (x.managerEvalStatus ?? '')
      : (x.finalEvalStatus ?? x.managerEvalStatus ?? '')
    return status.trim().toUpperCase() === 'OK'
  }).length
}

const KINH_DOANH_DEPT = {
  id: 'div-kd',
  name: 'Phòng Kinh doanh',
  code: 'KD',
  teams: [{ id: 'team-kd', name: 'Team A' }],
}

const SAMPLE_ROWS: PerformanceAssignment[] = [
  row({
    id: 'a1',
    priority: 1,
    category: 'KPI_BONUS',
    content: 'Số đơn chốt',
    assigneeUserId: 'm1',
  }),
  row({
    id: 'a2',
    priority: 1,
    category: 'PERFORMANCE_BONUS',
    content: 'Thưởng mốc cá nhân',
    assigneeUserId: 'm1',
  }),
  row({
    id: 'a3',
    priority: 1,
    category: 'PERFORMANCE_BONUS',
    content: 'Chiết khấu hoa hồng',
    assigneeUserId: 'm1',
  }),
  row({
    id: 'a4',
    priority: 2,
    category: 'KPI_BONUS',
    content: 'Cross sale',
    assigneeUserId: 'm1',
  }),
  row({ id: 'a5', priority: 3, category: 'KPI_BONUS', content: 'P3 item', assigneeUserId: 'm1' }),
  row({
    id: 'a6',
    priority: 3,
    category: 'BENEFIT',
    content: 'Nghỉ phép',
    assigneeUserId: 'm1',
  }),
  row({
    id: 'a7',
    priority: 1,
    category: 'KPI_BONUS',
    content: 'Số đơn chốt',
    assigneeUserId: 'm2',
  }),
]

describe('Luồng KPI/OKR — Phòng Kinh doanh', () => {
  describe('1. Nhận diện phòng / team', () => {
    it('phòng Kinh doanh thuộc catalog khi có trong allowlist', () => {
      expect(isCatalogEnabledDepartment(KINH_DOANH_DEPT, ['div-kd'])).toBe(true)
      expect(isCatalogEnabledDepartment(KINH_DOANH_DEPT, ['other'])).toBe(false)
    })

    it('team Traffic trong KD vẫn là Traffic — không ẩn cột Manager', () => {
      expect(isTrafficTeam('team-kd', ['team-kd'], 'HuyK 1')).toBe(true)
      const hideManager = true && !isTrafficTeam('team-kd', ['team-kd'], 'HuyK 1')
      expect(hideManager).toBe(false)
    })

    it('team KD thường: ẩn cột Đánh giá Manager', () => {
      const hideManager = true && !isTrafficTeam('team-sales', [], 'Team Sales A')
      expect(hideManager).toBe(true)
    })
  })

  describe('2. Leader — bảng mục tiêu (planning)', () => {
    it('planning: 10 cột header, không lẫn cột Manager của results', () => {
      expect(PLANNING_ASSIGN_TABLE_HEAD).toHaveLength(10)
      expect(PLANNING_ASSIGN_TABLE_HEAD).toContain('Quản lý xét duyệt')
      expect(PLANNING_ASSIGN_TABLE_HEAD).toContain('Thao tác')
      expect(PLANNING_ASSIGN_TABLE_HEAD).not.toContain('Đánh giá Manager')
      expect(ASSIGN_TABLE_HEAD).toContain('Đánh giá Manager')
    })
  })

  describe('3. Leader — danh sách assignment', () => {
    it('ẩn P3 và BENEFIT cho mọi member trên team', () => {
      const visible = filterVisibleAssignments(SAMPLE_ROWS, {
        isKinhDoanhTeam: true,
        isMemberView: false,
      })
      expect(visible.map((r) => r.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a7'])
      expect(visible).toHaveLength(5)
    })

    it('bảng kết quả không có cột Manager và Thao tác', () => {
      const heads = resultsTableHeads(true)
      expect(heads).not.toContain('Đánh giá Manager')
      expect(heads).not.toContain('Thao tác')
      expect(heads).toContain('Đánh giá Leader')
    })
  })

  describe('4. Member — xem KPI cá nhân', () => {
    it('chỉ thấy assignment của mình, đã lọc P3/BENEFIT', () => {
      const visible = filterVisibleAssignments(SAMPLE_ROWS, {
        isKinhDoanhTeam: true,
        isMemberView: true,
        userId: 'm1',
      })
      expect(visible.map((r) => r.id)).toEqual(['a1', 'a2', 'a3', 'a4'])
    })

    it('member khác không thấy dòng của m1', () => {
      const visible = filterVisibleAssignments(SAMPLE_ROWS, {
        isKinhDoanhTeam: true,
        isMemberView: true,
        userId: 'm2',
      })
      expect(visible.map((r) => r.id)).toEqual(['a7'])
    })

    it('member không có assignment vẫn không thấy KPI người khác (MonthlyReport fallback)', () => {
      const visible = filterVisibleAssignments(SAMPLE_ROWS, {
        isKinhDoanhTeam: false,
        isMemberView: true,
        userId: 'm-empty',
      })
      expect(visible).toHaveLength(0)
    })
  })

  describe('5. Khung chốt KPI tháng', () => {
    it('T6/2026: mở từ 1/6 đến 5/7', () => {
      const bounds = resolveKinhDoanhResultsCloseWindowForTeam('team-kd', 2026, 6, [])
      expect(bounds).toEqual({ startDay: 1, endDay: 5 })
      const midJune = new Date(2026, 5, 15)
      expect(isKinhDoanhResultsCloseWindowOpen(2026, 6, bounds, midJune)).toBe(true)
    })

    it('ngoài khung chốt → read-only (leader không chốt được)', () => {
      const bounds = { startDay: 1, endDay: 5 }
      const afterClose = new Date(2026, 6, 10)
      const closeOpen = isKinhDoanhResultsCloseWindowOpen(2026, 6, bounds, afterClose)
      expect(closeOpen).toBe(false)
    })
  })

  describe('6. Gửi duyệt Traffic — validate gộp bản nháp', () => {
    it('đánh giá Leader trong draft được tính là đã chấm', () => {
      const rows = [
        row({
          id: 'r1',
          assigneeUserId: 'm1',
          managerEvalStatus: null,
        }),
        row({
          id: 'r2',
          assigneeUserId: 'm2',
          managerEvalStatus: 'OK',
        }),
      ]
      const drafts: Record<string, { managerEvalStatus?: string }> = {
        r1: { managerEvalStatus: 'OK' },
      }
      const complete = rows.every((a) => {
        const status = drafts[a.id]?.managerEvalStatus ?? a.managerEvalStatus ?? ''
        return status.trim().toUpperCase() === 'OK' || status.trim().toUpperCase() === 'NOT'
      })
      expect(complete).toBe(true)
    })
  })

  describe('7. Chốt & đánh giá Leader → báo cáo', () => {
    it('sau chốt OK 2 PERFORMANCE_BONUS: báo cáo đếm theo Leader (không Manager)', () => {
      const chotRows = SAMPLE_ROWS.filter((r) => ['a1', 'a2', 'a3', 'a4'].includes(r.id)).map(
        (r) => ({
          ...r,
          managerEvalStatus: r.id === 'a2' || r.id === 'a3' ? 'OK' : (r.managerEvalStatus ?? null),
          finalEvalStatus: null,
        })
      )
      const visible = filterVisibleAssignments(chotRows, {
        isKinhDoanhTeam: true,
        isMemberView: false,
      })
      const okCount = countOkForReport(visible, true)
      expect(okCount).toBe(2)
    })

    it('member đọc lại đánh giá Leader sau chốt (không có cột Manager)', () => {
      const memberRows = filterVisibleAssignments(
        [
          row({
            id: 'x1',
            assigneeUserId: 'm1',
            category: 'PERFORMANCE_BONUS',
            managerEvalStatus: 'OK',
            finalEvalStatus: null,
          }),
        ],
        { isKinhDoanhTeam: true, isMemberView: true, userId: 'm1' }
      )
      expect(memberRows[0]?.managerEvalStatus).toBe('OK')
      expect(memberRows[0]?.finalEvalStatus).toBeNull()
    })
  })
})
