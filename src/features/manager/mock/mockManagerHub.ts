/** Dữ liệu demo — luồng Quản lý (chia lớp, lịch thi, bài tập, duyệt bài). */

import type { LevelCode } from '@/lib/constants'

export type ManagerClassCardVariant = 'indigo' | 'emerald' | 'amber'

export type ManagerClassRow = {
  id: string
  name: string
  levelLabel: string
  memberCount: number
  examLabel: string
  /** Ngày hiển thị dòng “Kỳ thi dự kiến” */
  examDateShort: string
  /** Tiến độ học 0–100 */
  progressPercent: number
  /** Màu gradient header thẻ lớp */
  cardVariant: ManagerClassCardVariant
  status: 'open' | 'full' | 'closed'
  updatedAt: string
}

export const MOCK_MANAGER_CLASSES: ManagerClassRow[] = [
  {
    id: 'cls-01',
    name: 'Tập sự — Đợt Q1/2026',
    levelLabel: 'Tập sự → Biết việc',
    memberCount: 12,
    examLabel: 'Kỳ thi Tập sự — 15/04/2026',
    examDateShort: '15/04/2026',
    progressPercent: 75,
    cardVariant: 'indigo',
    status: 'open',
    updatedAt: '28/03/2026',
  },
  {
    id: 'cls-02',
    name: 'Biết việc — Nhóm A',
    levelLabel: 'Biết việc',
    memberCount: 8,
    examLabel: 'Kỳ giữa kỳ — 22/04/2026',
    examDateShort: '22/05/2026',
    progressPercent: 40,
    cardVariant: 'emerald',
    status: 'open',
    updatedAt: '27/03/2026',
  },
  {
    id: 'cls-03',
    name: 'Được việc — Nâng cao',
    levelLabel: 'Được việc',
    memberCount: 6,
    examLabel: '—',
    examDateShort: '10/06/2026',
    progressPercent: 100,
    cardVariant: 'amber',
    status: 'full',
    updatedAt: '20/03/2026',
  },
]

export type ManagerExamRow = {
  id: string
  title: string
  windowLabel: string
  levelLabel: string
  graderName: string
  state: 'draft' | 'scheduled' | 'grading' | 'done'
}

export const MOCK_MANAGER_EXAMS: ManagerExamRow[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    title: 'Tập sự → Biết việc · Đợt 1',
    windowLabel: '12/04/2026 08:00 — 12:00',
    levelLabel: 'Tập sự',
    graderName: 'Phạm Người Chấm',
    state: 'scheduled',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    title: 'Biết việc — Kiểm tra giữa kỳ',
    windowLabel: '22/04/2026 14:00 — 17:00',
    levelLabel: 'Biết việc',
    graderName: '— (chưa gán)',
    state: 'draft',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    title: 'Được việc — Thi nâng bậc',
    windowLabel: '05/03/2026 (đã qua)',
    levelLabel: 'Được việc',
    graderName: 'Phạm Người Chấm',
    state: 'grading',
  },
]

export type ManagerExerciseItem = {
  id: string
  order: number
  title: string
  requiresEvidence: boolean
  lockedUntilPrev: boolean
}

export const MOCK_EXERCISES_BY_LEVEL: Partial<Record<LevelCode, Record<number, ManagerExerciseItem[]>>> = {
  tap_su: {
    1: [
      { id: 'e1', order: 1, title: 'Làm quen quy trình nội bộ', requiresEvidence: true, lockedUntilPrev: false },
      { id: 'e2', order: 2, title: 'Hoàn thành shadowing 3 buổi', requiresEvidence: true, lockedUntilPrev: true },
    ],
    2: [{ id: 'e3', order: 1, title: 'Bài case mini theo hướng dẫn', requiresEvidence: true, lockedUntilPrev: false }],
  },
  biet_viec: {
    1: [
      {
        id: 'e4',
        order: 1,
        title: 'Hoàn thành checklist onboarding nâng cao',
        requiresEvidence: true,
        lockedUntilPrev: false,
      },
    ],
  },
}

export type ManagerReviewRow = {
  id: string
  employeeName: string
  examTitle: string
  /** Lộ trình / khóa (hiển thị dòng thứ hai cạnh icon GraduationCap) — giống mockup HTML */
  cohortLabel?: string
  teacherName: string
  gradedAt: string
  summary: string
  outcomeLabel: 'Đạt' | 'Bảo lưu' | 'Chờ học lại' | 'Chưa đủ'
  state: 'pending' | 'approved' | 'redo'
}

export const MOCK_REVIEW_QUEUE: ManagerReviewRow[] = [
  {
    id: 'rv-1',
    employeeName: 'Trần Linh',
    examTitle: 'Biết việc — Sao 6',
    cohortLabel: 'Tập sự — Mục 3',
    teacherName: 'Phạm Người Chấm',
    gradedAt: '23/03/2026 14:20',
    summary: '6/6 mục đạt. Nhận xét: trình bày tốt, cần củng cố báo cáo.',
    outcomeLabel: 'Đạt',
    state: 'pending',
  },
  {
    id: 'rv-2',
    employeeName: 'Quang Đạt',
    examTitle: 'Nghiệp vụ — Sao 4',
    cohortLabel: 'Học việc — Mục 2',
    teacherName: 'Nguyễn Minh Tú',
    gradedAt: '22/03/2026 10:15',
    summary: '4/5 mục đạt. Học viên nắm chắc kiến thức cơ bản nhưng cần thêm thời gian thực hành phần mềm quản lý kho.',
    outcomeLabel: 'Bảo lưu',
    state: 'pending',
  },
  {
    id: 'rv-3',
    employeeName: 'Minh Hương',
    examTitle: 'Chuyên gia — Sao 6',
    cohortLabel: 'Nâng cao — Mục 5',
    teacherName: 'Trần Hoàng Oanh',
    gradedAt: '21/03/2026 16:50',
    summary: 'Hoàn thành xuất sắc tất cả các module. Khả năng tư duy logic và giải quyết vấn đề vượt kỳ vọng. Sẵn sàng thăng cấp.',
    outcomeLabel: 'Đạt',
    state: 'approved',
  },
]
