import { z } from 'zod'

export const editorClassListItemApiSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.string(),
  teamId: z.string().uuid().nullable(),
  teamName: z.string().nullable(),
  teacherUserId: z.string().uuid().nullable(),
  teacherName: z.string().nullable(),
  memberCount: z.number().int(),
  latestExamSchedule: z
    .object({
      id: z.string().uuid(),
      dateIso: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      examStatus: z.string().nullable(),
      examTeacherUser: z
        .object({ id: z.string().uuid(), fullNameLegal: z.string().nullable() })
        .nullable(),
    })
    .nullable(),
})

export const editorClassSyncReportApiSchema = z.object({
  dryRun: z.boolean(),
  teams: z.array(
    z.object({
      teamId: z.string().uuid(),
      teamName: z.string(),
      classId: z.string().uuid().nullable(),
      className: z.string(),
      action: z.enum(['created', 'updated', 'unchanged']),
      teacherName: z.string().nullable(),
      addedMembers: z.number().int(),
      removedMembers: z.number().int(),
      pendingUnderOneMonth: z.array(z.string()),
    })
  ),
  closedOrphanClasses: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  totalEditors: z.number().int(),
})

export const bulkExamScheduleResultApiSchema = z.object({
  dryRun: z.boolean(),
  dateIso: z.string(),
  paperCodes: z.array(z.string()),
  classes: z.array(
    z.object({
      classId: z.string().uuid(),
      className: z.string(),
      scheduleId: z.string().uuid().nullable(),
      graderUserId: z.string().uuid().nullable(),
      graderName: z.string().nullable(),
      paperCount: z.number().int(),
      skipped: z.boolean(),
      skipReason: z.string().optional(),
    })
  ),
  createdCount: z.number().int(),
  skippedCount: z.number().int(),
})
