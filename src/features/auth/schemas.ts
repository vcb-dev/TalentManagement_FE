import { z } from 'zod'

const roleSchema = z.enum(['MEMBER', 'LEADER', 'MANAGER', 'HR_ADMIN', 'TEACHER', 'BOD'])

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
  permissions: z.array(permissionSchema),
  departmentId: z.string().uuid(),
  teamIds: z.array(z.string().uuid()),
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
