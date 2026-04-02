export type GraderExamRowStatus = 'pending' | 'grading' | 'done'

export interface GraderExamRow {
  examId: string
  employeeId: string
  examineeName: string
  examineeMeta: string
  initials: string
  avatarClass: string
  levelBadge: string
  levelKey: 'all' | 'tap_su' | 'biet_viec' | 'duoc_viec' | 'dong_gop'
  className: string
  submittedAt: string
  status: GraderExamRowStatus
}

/** Dữ liệu demo — 06_ChamThi_DSKyThi.html */
export const MOCK_GRADER_EXAM_ROWS: GraderExamRow[] = [
  {
    examId: 'e1000000-0000-4000-8000-000000000001',
    employeeId: '10000000-0000-4000-8000-000000000004',
    examineeName: 'Phạm Hùng',
    examineeMeta: 'Sản xuất · Member',
    initials: 'PH',
    avatarClass: 'bg-[#FEF3C7] text-[#92400E]',
    levelBadge: 'Tập sự → Biết việc',
    levelKey: 'tap_su',
    className: 'Lớp T3-01',
    submittedAt: '28/03/2026',
    status: 'pending',
  },
  {
    examId: 'e1000000-0000-4000-8000-000000000002',
    employeeId: '10000000-0000-4000-8000-000000000002',
    examineeName: 'Trần Linh',
    examineeMeta: 'Marketing · Member',
    initials: 'TL',
    avatarClass: 'bg-[#DCFCE7] text-[#166534]',
    levelBadge: 'Biết việc Sao 2',
    levelKey: 'biet_viec',
    className: 'Lớp BV-02',
    submittedAt: '25/03/2026',
    status: 'pending',
  },
  {
    examId: 'e1000000-0000-4000-8000-000000000003',
    employeeId: '10000000-0000-4000-8000-000000000001',
    examineeName: 'Nguyễn Thành',
    examineeMeta: 'Kinh doanh · Leader',
    initials: 'NT',
    avatarClass: 'bg-primary/10 text-primary',
    levelBadge: 'Được việc Sao 4',
    levelKey: 'duoc_viec',
    className: 'Lớp DV-01',
    submittedAt: '20/03/2026',
    status: 'grading',
  },
  {
    examId: 'e1000000-0000-4000-8000-000000000004',
    employeeId: 'f0000000-0000-4000-8000-000000000001',
    examineeName: 'Minh Hương',
    examineeMeta: 'Marketing · Member',
    initials: 'MH',
    avatarClass: 'bg-[#F5F3FF] text-[#3730A3]',
    levelBadge: 'Tập sự → Biết việc',
    levelKey: 'tap_su',
    className: 'Lớp T3-01',
    submittedAt: '27/03/2026',
    status: 'pending',
  },
  {
    examId: 'e1000000-0000-4000-8000-000000000005',
    employeeId: 'f0000000-0000-4000-8000-000000000002',
    examineeName: 'Hà Thanh',
    examineeMeta: 'Hậu cần · Member',
    initials: 'HT',
    avatarClass: 'bg-[#FEE2E2] text-[#991B1B]',
    levelBadge: 'Biết việc Sao 3',
    levelKey: 'biet_viec',
    className: 'Lớp BV-01',
    submittedAt: '15/03/2026',
    status: 'done',
  },
]

export function countPendingGrader(rows: GraderExamRow[]): number {
  return rows.filter((r) => r.status === 'pending' || r.status === 'grading').length
}

export function findGraderExamRow(examId: string, employeeId: string): GraderExamRow | undefined {
  return MOCK_GRADER_EXAM_ROWS.find((r) => r.examId === examId && r.employeeId === employeeId)
}
