import type { ApprovalsPage } from '@/features/manager/types'

/** Dữ liệu demo — 10_MGR_DuyetThang.html */
export const MOCK_APPROVALS_PAGE: ApprovalsPage = {
  pendingCount: 2,
  promotions: [
    {
      id: 'p1000000-0000-4000-8000-000000000001',
      initials: 'TL',
      avatarClass: 'bg-[#DCFCE7] text-[#166534]',
      name: 'Trần Linh',
      description: 'Biết việc Sao 6 → Được việc · Đã chấm 6/6 mục · 22/03/2026',
      badges: [
        { label: '6/6 mục đạt', tone: 'success' },
        { label: 'Lần đầu đăng ký', tone: 'neutral' },
      ],
      state: 'actionable',
      highlighted: true,
    },
    {
      id: 'p1000000-0000-4000-8000-000000000002',
      initials: 'NT',
      avatarClass: 'bg-primary/10 text-primary',
      name: 'Nguyễn Thành',
      description: 'Được việc Sao 4 đăng ký thi · Đang chấm · ĐK: 20/03/2026',
      badges: [{ label: 'Đang chấm', tone: 'warning' }],
      state: 'waiting',
      stateLabel: 'Chờ chấm xong',
    },
  ],
  graderReviews: [
    {
      id: 'g1000000-0000-4000-8000-000000000001',
      employeeName: 'Phạm Hùng',
      detail: 'Tập sự Mục 2',
      graderVerdict: 'pass',
    },
    {
      id: 'g1000000-0000-4000-8000-000000000002',
      employeeName: 'Minh Hương',
      detail: 'Tập sự Mục 1',
      graderVerdict: 'pass',
    },
    {
      id: 'g1000000-0000-4000-8000-000000000003',
      employeeName: 'Quang Đạt',
      detail: 'Tập sự Mục 3',
      graderVerdict: 'fail',
    },
  ],
}
