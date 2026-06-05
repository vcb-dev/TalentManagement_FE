import { z } from 'zod'
import type { Role } from '@/types/auth'

const apiRoleSchema = z
  .enum(['MEMBER', 'LEADER', 'MANAGER', 'HR', 'TEACHER', 'BOD'])
  .transform((role) => role as Role)

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Rỗng = không nhập; có giá trị thì YYYY-MM-DD và parse được. */
const optionalDateString = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length === 0 || ISO_DATE.test(s), { message: 'Định dạng ngày không hợp lệ' })
  .refine((s) => s.length === 0 || !Number.isNaN(Date.parse(`${s}T12:00:00`)), {
    message: 'Ngày không hợp lệ',
  })

const optionalBirthDateString = optionalDateString.refine(
  (s) => {
    if (s.length === 0) return true
    const d = new Date(`${s}T12:00:00`)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return d <= end
  },
  { message: 'Ngày sinh không được sau hôm nay' }
)

/** Rỗng = không nhập; có giá trị thì 8–15 chữ số (bỏ ký tự không phải số khi đếm). */
const optionalPhoneString = z
  .string()
  .transform((s) => s.trim())
  .refine(
    (s) => {
      if (s.length === 0) return true
      const digits = s.replace(/\D/g, '')
      return digits.length >= 8 && digits.length <= 15
    },
    { message: 'Số điện thoại cần 8–15 chữ số' }
  )

export const createEmployeeSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(2, 'Họ tên cần ít nhất 2 ký tự').max(200, 'Họ tên quá dài')),
  email: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, 'Nhập email').email('Email không hợp lệ').max(320, 'Email quá dài')),
  /** Không gán TEACHER từ màn tạo nhân sự (quản lý chấm thi ở luồng khác). */
  role: z.enum(['MEMBER', 'LEADER', 'MANAGER', 'HR', 'BOD'], {
    errorMap: () => ({ message: 'Role không hợp lệ' }),
  }),
  departmentId: z.string().uuid('Chọn phòng ban hợp lệ'),
  teamId: z.string().uuid('Chọn nhóm hợp lệ'),
  phone: optionalPhoneString,
  birthDate: optionalBirthDateString,
})

/** Form đầy đủ (gửi API chỉ các trường trong CreateEmployeeInput + meta mock). */
export const createEmployeeFormSchema = createEmployeeSchema
  .extend({
    extraTeamIds: z.array(z.string().uuid()).default([]),
    startDate: optionalDateString,
    initialLevel: z.enum(['tap_su', 'biet_viec']).default('tap_su'),
    notifyEmail: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.extraTeamIds.includes(data.teamId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nhóm bổ sung phải khác nhóm theo phòng ban',
        path: ['extraTeamIds'],
      })
    }
  })

export type CreateEmployeeForm = z.infer<typeof createEmployeeFormSchema>

/** Response GET/PATCH employees: synced email may be non-RFC; create form still uses strict email. */
const employeeDirectoryEmailSchema = z.string().min(1).max(320)

export const employeeApiSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: employeeDirectoryEmailSchema,
  role: apiRoleSchema,
  status: z.enum(['ACTIVE', 'INACTIVE', 'PROBATION', 'RESERVED']),
  departmentId: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length === 0 || z.string().uuid().safeParse(s).success, {
      message: 'departmentId không hợp lệ',
    }),
  departmentName: z.string().nullable().optional(),
  teamIds: z.array(z.string().uuid()),
  teamNames: z.array(z.string()).optional().default([]),
  currentLevel: z.enum(['tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong']),
  currentStar: z.number().int().min(0).max(6),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  phone: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
})

export const employeeListApiSchema = z.object({
  data: z.array(employeeApiSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})
