import type { MeUserDisplayKey } from '@/features/profile/userSelf.types'

export type UserSelfFieldSpec = {
  key: MeUserDisplayKey
  label: string
  multiline?: boolean
  kind?:
    | 'portrait'
    | 'division-select'
    | 'team-select'
    | 'position-select'
    | 'job-title-select'
    | 'card-status-select'
    | 'card-color-select'
    | 'team-leader-select'
}

/** Các mục ngày chỉnh sửa được — `<input type="date">` (`startDateWork` chỉ đọc, không nằm đây). */
export const USER_DATE_FIELD_KEYS = [
  'birthDate',
  'profileReviewDate',
  'leaveDateWork',
] as const satisfies readonly MeUserDisplayKey[]

export function isDateFormField(key: MeUserDisplayKey): boolean {
  return (USER_DATE_FIELD_KEYS as readonly string[]).includes(key)
}

/** Công việc & tổ chức — chỉ HR sửa. */
export const USER_WORK_ORG_READONLY_KEYS = [
  'startDateWork',
  'employeeCodePrimary',
  'managerBlockCode',
  'teamPosition',
] as const satisfies readonly MeUserDisplayKey[]

export function isWorkOrgReadonlyField(key: MeUserDisplayKey): boolean {
  return (USER_WORK_ORG_READONLY_KEYS as readonly string[]).includes(key)
}

/** Khớp `EMPLOYEE_CODE_INPUT_LABELS` ở BE. */
export const EMPLOYEE_CODE_INPUT_KEYS = [
  'managerBlockCode',
  'startDateWork',
  'birthDate',
  'teamId',
  'hometownDetail',
] as const satisfies readonly MeUserDisplayKey[]

export function isEmployeeCodeInputField(key: MeUserDisplayKey): boolean {
  return (EMPLOYEE_CODE_INPUT_KEYS as readonly string[]).includes(key)
}

export function roleMayHaveNoTeam(role: string | null | undefined): boolean {
  return role === 'MANAGER' || role === 'BOD'
}

export function employeeCodeInputRequiredMessage(label: string): string {
  return `${label} là bắt buộc (dùng để sinh mã nhân viên)`
}

/** Dùng chung cho "Hồ sơ của tôi" và hồ sơ HR — thứ tự field khớp `EmployeeForm`. */
export const USER_SELF_FORM_SECTIONS: { title: string; fields: UserSelfFieldSpec[] }[] = [
  {
    title: 'Công việc & tổ chức',
    fields: [
      { key: 'divisionId', label: 'Phòng ban', kind: 'division-select' },
      { key: 'teamId', label: 'Nhóm (theo phòng ban)', kind: 'team-select' },
      { key: 'jobTitle', label: 'Vị trí chuyên môn', kind: 'job-title-select' },
      { key: 'startDateWork', label: 'Ngày bắt đầu làm việc' },
      { key: 'employeeCodePrimary', label: 'Mã nhân viên' },
      { key: 'employeeIdentifier', label: 'Mã định danh NV' },
      { key: 'teamPosition', label: 'Loại hợp đồng / vị trí' },
      { key: 'directManager', label: 'Quản lý trực tiếp' },
      { key: 'teamLeaderUserId', label: 'Trưởng nhóm phụ trách', kind: 'team-leader-select' },
      { key: 'workplaceBranch', label: 'Chi nhánh / nơi làm việc' },
      { key: 'employeeCardStatus', label: 'Tình trạng cấp thẻ', kind: 'card-status-select' },
      { key: 'employeeCardColorId', label: 'Màu thẻ', kind: 'card-color-select' },
      { key: 'managerBlockCode', label: 'Mã khối theo quản lý' },
    ],
  },
  {
    title: 'Nhân thân & liên hệ',
    fields: [
      { key: 'fullNameLegal', label: 'Họ và tên' },
      { key: 'displayName', label: 'Tên hiển thị' },
      { key: 'gender', label: 'Giới tính' },
      { key: 'birthDate', label: 'Ngày sinh' },
      { key: 'phonePrimary', label: 'Điện thoại chính' },
      { key: 'portraitRef', label: 'Ảnh đại diện', kind: 'portrait' },
      { key: 'email', label: 'Email đăng nhập (Google)' },
      { key: 'facebookUrl', label: 'Facebook' },
    ],
  },
  {
    title: 'Địa chỉ & học vấn',
    fields: [
      { key: 'addressCurrent', label: 'Địa chỉ hiện tại', multiline: true },
      { key: 'addressHousehold', label: 'Địa chỉ hộ khẩu', multiline: true },
      { key: 'educationLevel', label: 'Trình độ học vấn' },
      { key: 'schoolName', label: 'Trường / đơn vị đào tạo' },
      { key: 'hometownDetail', label: 'Quê quán / quê hương' },
    ],
  },
  {
    title: 'Giấy tờ & nhân khẩu',
    fields: [
      { key: 'identityNumber', label: 'Mã định danh (số CCCD)' },
      {
        key: 'identityDocumentInfo',
        label: 'Thông tin CCCD/CMND (ngày - tháng - năm cấp, nơi cấp)',
        multiline: true,
      },
      { key: 'attachmentIdFront', label: 'Ảnh CCCD mặt trước' },
      { key: 'attachmentIdBack', label: 'Ảnh CCCD mặt sau' },
      { key: 'maritalStatus', label: 'Tình trạng hôn nhân' },
      { key: 'ethnicity', label: 'Dân tộc' },
      { key: 'religion', label: 'Tôn giáo' },
      { key: 'insuranceBookNumber', label: 'Số sổ bảo hiểm' },
    ],
  },
  {
    title: 'Gia đình & liên hệ khẩn cấp',
    fields: [
      { key: 'childrenInfo', label: 'Thông tin con cái', multiline: true },
      { key: 'emergencyContact1', label: 'Liên hệ khẩn cấp 1', multiline: true },
      { key: 'emergencyContact2', label: 'Liên hệ khẩn cấp 2', multiline: true },
      { key: 'fatherGuardianContact', label: 'Liên hệ người giám hộ (cha)' },
      { key: 'motherGuardianContact', label: 'Liên hệ người giám hộ (mẹ)' },
      { key: 'familyNotes', label: 'Ghi chú gia đình', multiline: true },
    ],
  },
  {
    title: 'Khác',
    fields: [
      { key: 'bankAccountInfo', label: 'Thông tin tài khoản ngân hàng', multiline: true },
      { key: 'vehicleInfo', label: 'Phương tiện (Biển số xe - Hãng xe - Màu xe)' },
      { key: 'policyAcknowledgement', label: 'Xác nhận chính sách', multiline: true },
      { key: 'profileReviewDate', label: 'Ngày rà soát hồ sơ' },
      { key: 'cvAttachmentRef', label: 'CV' },
      { key: 'notes', label: 'Ghi chú', multiline: true },
    ],
  },
]
