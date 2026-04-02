import type { BodDashboardPage } from '@/features/bod/types'

/** Dữ liệu demo — 11_BOD_Dashboard.html */
export const MOCK_BOD_DASHBOARD_PAGE: BodDashboardPage = {
  monthLabel: '3/2026',
  stats: {
    totalHeadcount: 48,
    totalDeltaLabel: '+3 T3',
    goldTierPct: 46,
    goldDeltaLabel: '↑ 4% tháng này',
    diamondCount: 3,
    diamondSubLabel: 'Top tier',
    resignations: 1,
    turnoverLabel: 'Turnover 2.1%',
    reserveCount: 5,
    reserveSubLabel: 'Cần theo dõi',
  },
  levelRows: [
    { label: 'Tập sự', count: 8, pctLabel: '16.7%', barPct: 17, barTone: 'gray' },
    { label: 'Biết việc', count: 18, pctLabel: '37.5%', barPct: 37, barTone: 'indigo' },
    { label: 'Được việc', count: 12, pctLabel: '25%', barPct: 25, barTone: 'teal' },
    { label: 'Đóng góp kết quả', count: 7, pctLabel: '14.6%', barPct: 15, barTone: 'amber' },
    { label: 'Tướng', count: 3, pctLabel: '6.3%', barPct: 6, barTone: 'red' },
  ],
  hrMovement: [
    { label: 'Tuyển mới', badge: '+3', badgeTone: 'green' },
    { label: 'Nghỉ việc', badge: '-1', badgeTone: 'red' },
    { label: 'Thăng cấp độ', badge: '+5', badgeTone: 'blue' },
    { label: 'Bảo lưu mới', badge: '+2', badgeTone: 'amber' },
    { label: 'Chia tay', badge: '0', badgeTone: 'gray' },
  ],
  deptAlerts: [
    {
      title: 'Hậu cần — Chậm nhất',
      body: 'Tỉ lệ Được việc+ chỉ 20% · 3 người bảo lưu',
      tone: 'danger',
    },
    {
      title: 'Marketing — Cần theo dõi',
      body: 'Turnover cao · 2 nghỉ trong 3 tháng',
      tone: 'warning',
    },
    {
      title: 'Kinh doanh — Tốt nhất',
      body: 'Tỉ lệ Được việc+ cao nhất: 62%',
      tone: 'success',
    },
  ],
}
