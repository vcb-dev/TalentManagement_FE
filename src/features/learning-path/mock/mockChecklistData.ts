import type { checklistResponseSchema, submissionApiSchema } from '@/features/learning-path/schemas'
import type { z } from 'zod'

type ChecklistResponse = z.infer<typeof checklistResponseSchema>
type Submission = z.infer<typeof submissionApiSchema>

/** UUID cố định cho mock checklist (đủ 5 nhiệm vụ như 05_NV_Checklist.html). */
const I = {
  a: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001',
  b: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002',
  c: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003',
  d: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0004',
  e: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0005',
}

export const MOCK_CHECKLIST_DEFAULT: ChecklistResponse = {
  items: [
    { id: I.a, title: 'Đọc tài liệu quy trình vận hành', order: 1 },
    { id: I.b, title: 'Hoàn thành bài kiểm tra kiến thức nền', order: 2 },
    { id: I.c, title: 'Thực hiện dự án thực tế (mini-project)', order: 3 },
    { id: I.d, title: 'Trình bày kết quả trước team', order: 4 },
    { id: I.e, title: 'Viết báo cáo tổng kết + đóng góp ý kiến', order: 5 },
  ],
  completedIds: [I.a, I.b],
}

export const MOCK_SUBMISSIONS_STAR_5: Submission[] = [
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
    starId: '5',
    status: 'ACCEPTED',
    fileName: 'bai_kiem_tra.pdf',
    createdAt: '2026-03-18T10:00:00.000Z',
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002',
    starId: '5',
    status: 'ACCEPTED',
    fileName: 'tai_lieu_quy_trinh.docx',
    createdAt: '2026-03-15T08:30:00.000Z',
  },
]

export function getMockChecklist(_levelId: string, _starId: string): ChecklistResponse {
  return MOCK_CHECKLIST_DEFAULT
}

export function getMockSubmissions(starId: string): Submission[] {
  if (starId === '5') return MOCK_SUBMISSIONS_STAR_5
  return []
}
