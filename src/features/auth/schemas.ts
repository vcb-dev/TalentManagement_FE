import { z } from 'zod'
import type { Role, StaffLevel } from '@/types/auth'

const roleSchema = z
  .enum(['MEMBER', 'LEADER', 'MANAGER', 'HR', 'TEACHER', 'BOD'])
  .transform((role) => role as Role)
const staffLevelSchema = z.enum(['PROBATION', 'PROFICIENT', 'GENERAL', 'UNKNOWN'])

const permissionSchema = z.object({
  action: z.enum(['view', 'create', 'edit', 'deactivate', 'grade', 'approve', 'classify']),
  resource: z.enum([
    'employee',
    'exam',
    'promotion',
    'team',
    'department',
    'radar_chart',
    'checklist',
    'submission',
    'kpi',
    'okr',
    'monthly_report',
  ]),
})

export const userSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: roleSchema,
  roles: z.array(roleSchema).optional(),
  permissions: z.array(permissionSchema),
  permissionIds: z.array(z.string()).optional(),
  dataScopeFlags: z.record(z.string(), z.boolean()).optional(),
  departmentId: z.string().uuid(),
  teamIds: z.array(z.string().uuid()),
  /** BE có thể bỏ qua hoặc null khi chưa có phân loại staff — chuẩn hóa UNKNOWN */
  staffLevel: staffLevelSchema.nullish().transform((v): StaffLevel => (v == null ? 'UNKNOWN' : v)),
})

export const meResponseSchema = z.object({
  user: userSessionSchema,
  /** Có khi mock hoặc tương lai trả JWT trong body; session thật dùng cookie httpOnly. */
  accessToken: z.string().min(1).optional(),
})

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>
