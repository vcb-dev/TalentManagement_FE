import { z } from 'zod'

export const createEmployeeSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  role: z.enum(['MEMBER', 'LEADER', 'MANAGER', 'HR_ADMIN', 'TEACHER', 'BOD']),
  departmentId: z.string().uuid(),
  teamId: z.string().uuid(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
})

/** Form đầy đủ (gửi API chỉ các trường trong CreateEmployeeInput + meta mock). */
export const createEmployeeFormSchema = createEmployeeSchema.extend({
  secondaryTeamId: z.union([z.literal(''), z.string().uuid()]).optional(),
  initialLevel: z.enum(['tap_su', 'biet_viec']).default('tap_su'),
  startDate: z.string().optional(),
  notifyEmail: z.boolean().default(true),
  notifyManager: z.boolean().default(true),
  assignGrader: z.boolean().default(false),
  graderScope: z.enum(['all', 'own_dept']).default('all'),
})

export type CreateEmployeeForm = z.infer<typeof createEmployeeFormSchema>

export const employeeApiSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['MEMBER', 'LEADER', 'MANAGER', 'HR_ADMIN', 'TEACHER', 'BOD']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PROBATION', 'RESERVED']),
  departmentId: z.string().uuid(),
  teamIds: z.array(z.string().uuid()),
  currentLevel: z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong']),
  currentStar: z.number().int().min(0).max(6),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const employeeListApiSchema = z.object({
  data: z.array(employeeApiSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})
