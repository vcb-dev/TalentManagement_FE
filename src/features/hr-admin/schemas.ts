import { z } from 'zod'
import type { Role } from '@/types/auth'

const apiRoleSchema = z
  .enum(['MEMBER', 'LEADER', 'MANAGER', 'HR', 'TEACHER', 'BOD'])
  .transform((role) => role as Role)

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Rỗng = không nhập; có giá trị thì YYYY-MM-DD và parse được. */
export const optionalDateString = z
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

/** Trường hồ sơ mở rộng dạng text tự do — rỗng = không nhập, không validate định dạng. */
const optionalProfileString = z.string().transform((s) => s.trim())

/** Khớp `normalizeIdentityNumber` ở BE. */
export const IDENTITY_NUMBER_PATTERN = /^(\d{12}|\d{9})$/
export const IDENTITY_NUMBER_MESSAGE = 'Mã định danh gồm 12 chữ số (CCCD) hoặc 9 chữ số (CMND)'
export function compactIdentityNumber(raw: string): string {
  return raw.replace(/[\s.-]/g, '')
}
const optionalIdentityNumberString = z
  .string()
  .transform(compactIdentityNumber)
  .refine((s) => s.length === 0 || IDENTITY_NUMBER_PATTERN.test(s), {
    message: IDENTITY_NUMBER_MESSAGE,
  })

/** Khớp `normalizeEmployeeIdentifier` ở BE. */
export const EMPLOYEE_IDENTIFIER_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,31}$/
export const EMPLOYEE_IDENTIFIER_MESSAGE =
  'Mã định danh NV chỉ gồm chữ, số, dấu chấm, gạch (tối đa 32 ký tự)'
export function compactEmployeeIdentifier(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}
const optionalEmployeeIdentifierString = z
  .string()
  .transform(compactEmployeeIdentifier)
  .refine((s) => s.length === 0 || EMPLOYEE_IDENTIFIER_PATTERN.test(s), {
    message: EMPLOYEE_IDENTIFIER_MESSAGE,
  })

const optionalFile = z.custom<File | null>((v) => v === null || v instanceof File)

/** Khớp `normalizeManualEmployeeCode` ở BE. */
export const EMPLOYEE_CODE_PATTERN = /^\d{11,12}$/

/**
 * Bốn field dưới đây là đầu vào của công thức sinh "mã nhân viên" (mã khối + tháng/năm vào làm
 * + năm sinh + mã tỉnh theo quê quán + STT nhóm). Backend từ chối tạo tài khoản khi thiếu,
 * nên bắt buộc ngay trên form để HR thấy lỗi tại chỗ thay vì nhận lỗi từ server.
 */
const requiredProfileString = (message: string) =>
  optionalProfileString.pipe(z.string().min(1, message))
const requiredDateString = (message: string) => optionalDateString.pipe(z.string().min(1, message))
const requiredBirthDateString = optionalBirthDateString.pipe(z.string().min(1, 'Chọn ngày sinh'))

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
  /** Bắt buộc trừ BOD — kiểm tra ở `createEmployeeFormSchema`. */
  teamId: z.string().transform((s) => s.trim()),
  phone: optionalPhoneString,
  birthDate: requiredBirthDateString,
  // Phân công tổ chức (mở rộng)
  employeeIdentifier: optionalEmployeeIdentifierString.default(''),
  jobTitle: optionalProfileString.default(''),
  teamPosition: optionalProfileString.default(''),
  workplaceBranch: optionalProfileString.default(''),
  directManager: optionalProfileString.default(''),
  // Nhân thân & liên hệ
  displayName: optionalProfileString.default(''),
  gender: optionalProfileString.default(''),
  facebookUrl: optionalProfileString.default(''),
  // Địa chỉ & học vấn
  addressCurrent: optionalProfileString.default(''),
  addressHousehold: optionalProfileString.default(''),
  educationLevel: optionalProfileString.default(''),
  schoolName: optionalProfileString.default(''),
  hometownDetail: requiredProfileString('Nhập quê quán (dùng để lấy mã tỉnh)'),
  // Giấy tờ & nhân khẩu
  identityNumber: optionalIdentityNumberString.default(''),
  identityDocumentInfo: optionalProfileString.default(''),
  maritalStatus: optionalProfileString.default(''),
  ethnicity: optionalProfileString.default(''),
  religion: optionalProfileString.default(''),
  insuranceBookNumber: optionalProfileString.default(''),
  // Gia đình & liên hệ khẩn cấp
  childrenInfo: optionalProfileString.default(''),
  emergencyContact1: optionalProfileString.default(''),
  emergencyContact2: optionalProfileString.default(''),
  fatherGuardianContact: optionalProfileString.default(''),
  motherGuardianContact: optionalProfileString.default(''),
  familyNotes: optionalProfileString.default(''),
  // Khác
  bankAccountInfo: optionalProfileString.default(''),
  vehicleInfo: optionalProfileString.default(''),
  managerBlockCode: requiredProfileString('Nhập mã khối theo quản lý'),
  policyAcknowledgement: optionalProfileString.default(''),
  profileReviewDate: optionalDateString.default(''),
  notes: optionalProfileString.default(''),
})

/** Form đầy đủ (gửi API chỉ các trường trong CreateEmployeeInput + meta mock). */
export const createEmployeeFormSchema = createEmployeeSchema
  .extend({
    extraTeamIds: z.array(z.string().uuid()).default([]),
    startDate: requiredDateString('Chọn ngày bắt đầu làm việc'),
    leaveDate: optionalDateString.default(''),
    projectIds: z.array(z.string().uuid()).default([]),
    idCardFrontFile: optionalFile.default(null),
    idCardBackFile: optionalFile.default(null),
    cvFile: optionalFile.default(null),
    /** Chỉ BOD. */
    employeeCodePrimary: z
      .string()
      .transform((s) => s.replace(/\s+/g, ''))
      .default(''),
    /** Nhập đủ cả hai hoặc bỏ trống. */
    loginUsername: optionalProfileString.pipe(z.string().max(128, 'Username quá dài')).default(''),
    loginPassword: z.string().max(128, 'Mật khẩu quá dài').default(''),
    initialLevel: z.enum(['tap_su', 'biet_viec']).default('tap_su'),
    notifyEmail: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'BOD') {
      if (!data.employeeCodePrimary) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nhập mã nhân viên cho BOD',
          path: ['employeeCodePrimary'],
        })
      } else if (!EMPLOYEE_CODE_PATTERN.test(data.employeeCodePrimary)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mã nhân viên gồm 11–12 chữ số (vd. 10219942500)',
          path: ['employeeCodePrimary'],
        })
      }
    } else if (!z.string().uuid().safeParse(data.teamId).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Chọn nhóm hợp lệ',
        path: ['teamId'],
      })
    }
    if (data.loginUsername && !data.loginPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nhập mật khẩu cho username này',
        path: ['loginPassword'],
      })
    }
    if (data.loginPassword && !data.loginUsername) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nhập username đi kèm mật khẩu',
        path: ['loginUsername'],
      })
    }
    if (data.loginPassword && data.loginPassword.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mật khẩu cần ít nhất 8 ký tự',
        path: ['loginPassword'],
      })
    }
    if (data.extraTeamIds.includes(data.teamId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nhóm bổ sung phải khác nhóm theo phòng ban',
        path: ['extraTeamIds'],
      })
    }
    if (data.leaveDate && data.startDate && data.leaveDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ngày nghỉ việc không được trước ngày bắt đầu',
        path: ['leaveDate'],
      })
    }
  })

export type CreateEmployeeForm = z.infer<typeof createEmployeeFormSchema>

export const createProjectFormSchema = z
  .object({
    name: z
      .string()
      .transform((s) => s.trim().replace(/\s+/g, ' '))
      .pipe(z.string().min(2, 'Tên dự án cần ít nhất 2 ký tự').max(200, 'Tên dự án quá dài')),
    description: optionalProfileString.pipe(z.string().max(2000, 'Mô tả quá dài')),
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).default('ACTIVE'),
    startDate: optionalDateString,
    endDate: optionalDateString,
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: 'Ngày kết thúc không được trước ngày bắt đầu',
    path: ['endDate'],
  })

export type CreateProjectForm = z.infer<typeof createProjectFormSchema>

export const projectMembershipFormSchema = z
  .object({
    projectId: z.string().uuid('Chọn dự án'),
    roleInProject: optionalProfileString.pipe(z.string().max(200, 'Vai trò quá dài')),
    joinedAt: optionalDateString,
    leftAt: optionalDateString,
    note: optionalProfileString.pipe(z.string().max(2000, 'Ghi chú quá dài')),
  })
  .refine((d) => !d.joinedAt || !d.leftAt || d.leftAt >= d.joinedAt, {
    message: 'Ngày rời dự án không được trước ngày tham gia',
    path: ['leftAt'],
  })

export type ProjectMembershipForm = z.infer<typeof projectMembershipFormSchema>

/** Response GET/PATCH employees: dữ liệu đồng bộ cũ có thể thiếu email hoặc không theo RFC. */
const employeeDirectoryEmailSchema = z.string().max(320)

export const employeeApiSchema = z.object({
  id: z.string().uuid(),
  employeeCodePrimary: z.string().nullable().optional(),
  name: z.string(),
  email: employeeDirectoryEmailSchema,
  role: apiRoleSchema,
  status: z.enum(['ACTIVE', 'INACTIVE', 'PROBATION', 'RESERVED', 'TRANSFERRED']),
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
  directManager: z.string().nullable().optional(),
  /** Mã định danh NV do HR cấp, vd. A755. */
  employeeIdentifier: z.string().nullable().optional(),
  employeeCardStatus: z
    .enum(['NOT_ISSUED', 'TEMP_CARD_ISSUED', 'PHOTO_CARD_ISSUED'])
    .nullable()
    .optional(),
  employeeCardColorId: z.string().nullable().optional(),
})

export const employeeListApiSchema = z.object({
  data: z.array(employeeApiSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
  /** Đếm theo status trên toàn bộ tập đã lọc (không chỉ trang hiện tại). */
  statusCounts: z
    .object({
      ACTIVE: z.number(),
      INACTIVE: z.number(),
      PROBATION: z.number(),
      RESERVED: z.number(),
      TRANSFERRED: z.number(),
    })
    .optional(),
})

/** GET /employees/export — dòng xuất Excel (kèm trường hồ sơ không có trong danh sách). */
export const employeeExportRowSchema = z.object({
  id: z.string(),
  employeeIdentifier: z.string().nullable(),
  name: z.string(),
  birthDate: z.string().nullable(),
  birthPlace: z.string().nullable(),
  addressHousehold: z.string().nullable(),
  addressCurrent: z.string().nullable(),
  identityDocument: z.string().nullable(),
  educationLevel: z.string().nullable(),
  phone: z.string().nullable(),
  teamNames: z.array(z.string()),
  jobTitle: z.string().nullable(),
  startDate: z.string().nullable(),
})

export const employeeExportApiSchema = z.object({
  data: z.array(employeeExportRowSchema),
})
