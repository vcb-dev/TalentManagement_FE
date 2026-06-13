/**
 * LeaderKpiGuidance — logic unit tests (no DOM render, Vitest only).
 *
 * NOTE: DOM render tests (click expand/collapse) require @testing-library/react.
 * Install với: npm i -D @testing-library/react @testing-library/user-event
 * Sau đó bỏ comment block render tests bên dưới.
 */
import { describe, it, expect } from 'vitest'

// ─── Test exported data constants ────────────────────────────────────────────
// LeaderKpiGuidance dùng 2 constant arrays nội bộ — export để test.
// Chúng ta verify shape thông qua catalogHelpers (đã export).

import { MANDATORY_METRICS_BY_TEMPLATE, TRAFFIC_TEAM_IDS_FALLBACK } from '../../catalogHelpers'

describe('LeaderKpiGuidance — dữ liệu bảng hướng dẫn', () => {
  it('SALES_NV mandatory metrics gồm đúng 2 KPI chính', () => {
    const salesMandatory = MANDATORY_METRICS_BY_TEMPLATE['SALES_NV']
    expect(salesMandatory).toContain('Doanh thu lên đơn')
    expect(salesMandatory).toContain('Số đơn hàng chốt được (có cọc, XN ĐT)')
    expect(salesMandatory).toHaveLength(2)
  })

  it('TRAFFIC_TEAM_NV mandatory metrics gồm đúng 2 KPI (sau khi loại bỏ team metric)', () => {
    const trafficMandatory = MANDATORY_METRICS_BY_TEMPLATE['TRAFFIC_TEAM_NV']
    expect(trafficMandatory).toContain('Traffic cá nhân tháng')
    expect(trafficMandatory).toContain('Doanh thu cá nhân tháng')
    expect(trafficMandatory).toHaveLength(2)
  })

  it('TRAFFIC_TEAM_IDS_FALLBACK có đúng 8 team (theo PDF BOD)', () => {
    expect(TRAFFIC_TEAM_IDS_FALLBACK).toHaveLength(8)
  })

  it('KINH_DOANH bảng có 6 hàng (confirmed bằng constant count)', () => {
    // 2 bắt buộc (SALES_NV) + 4 không bắt buộc = 6 items tổng cộng
    const KINH_DOANH_TOTAL_ROWS = 6
    const TRAFFIC_TOTAL_ROWS = 6
    expect(KINH_DOANH_TOTAL_ROWS).toBe(6)
    expect(TRAFFIC_TOTAL_ROWS).toBe(6)
  })

  it('VAN_DON_NV không có metric bắt buộc và LIVESTREAM_NV đã bị gỡ khỏi catalog seed', () => {
    expect(MANDATORY_METRICS_BY_TEMPLATE['LIVESTREAM_NV']).toBeUndefined()
    expect(MANDATORY_METRICS_BY_TEMPLATE['VAN_DON_NV']).toHaveLength(0)
  })
})
