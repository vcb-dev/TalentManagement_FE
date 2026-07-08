import { z } from 'zod'

export const examSummaryApiSchema = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid().optional(),
  scheduleId: z.string().uuid().optional(),
  title: z.string(),
  scheduledAt: z.string().datetime({ offset: true }),
  status: z.enum(['UPCOMING', 'IN_PROGRESS', 'COMPLETED']),
  hasQuestions: z.boolean().optional(),
  score: z.number().nullable().optional(),
  outcome: z.string().nullable().optional(),
  submissionId: z.string().uuid().optional(),
})

export type ExamScheduleRow = z.infer<typeof examSummaryApiSchema>

export const examListApiSchema = z.object({
  data: z.array(examSummaryApiSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export const examResultApiSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  employeeId: z.string().uuid(),
  result: z.enum(['DAT', 'BAO_LUU', 'CHO_HOC_LAI', 'CHIA_TAY']),
  classifiedAt: z.string().datetime({ offset: true }),
})

export const gradeFormSchema = z.object({
  score: z.number().min(0).max(100),
  note: z.string().optional(),
})

export const examSubmissionApiSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  teamGroup: z.string().nullable().optional(),
  classId: z.string().nullable().optional(),
  scheduleId: z.string().nullable().optional(),
  answers: z.any().optional(),
  grades: z.any().optional(),
  totalScore: z.number().nullable().optional(),
  status: z.enum(['started', 'pending', 'grading', 'done']),
  outcome: z.enum(['DAT', 'BAO_LUU', 'CHO_HOC_LAI', 'CHIA_TAY']).nullable().optional(),
  graderNote: z.string().nullable().optional(),
  gradedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  learningClass: z
    .object({
      name: z.string(),
      examQuestions: z.any().nullable().optional(),
    })
    .nullable()
    .optional(),
  schedule: z
    .object({
      topic: z.string(),
      dateIso: z.string().optional(),
      startTime: z.string().optional(),
      examQuestions: z.any().nullable().optional(),
    })
    .nullable()
    .optional(),
  /** Đề gán ngẫu nhiên (lớp Editor) — có khi lịch thi dùng ExamPaper thay vì examQuestions JSON cũ. */
  examPaper: z
    .object({
      id: z.string().uuid(),
      code: z.string(),
      title: z.string(),
      questions: z.array(
        z.object({
          id: z.string().uuid(),
          type: z.enum(['mcq', 'essay']),
          stem: z.string(),
          options: z.array(z.string()).nullable().optional(),
          points: z.number().int(),
          criteriaWeights: z
            .object({
              ly_thuyet: z.number().int(),
              thuc_te: z.number().int(),
              trinh_bay: z.number().int(),
            })
            .nullable()
            .optional(),
          sortOrder: z.number().int(),
        })
      ),
    })
    .nullable()
    .optional(),
})
