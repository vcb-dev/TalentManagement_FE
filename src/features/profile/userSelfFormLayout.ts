import type { MeUserDisplayKey } from '@/features/profile/userSelf.types'

export type UserSelfFieldSpec = {
  key: MeUserDisplayKey
  label: string
  multiline?: boolean
  kind?: 'portrait' | 'division-select' | 'position-select'
}

/** Các mục ngày chỉnh sửa được — `<input type="date">` (`startDateWork` chỉ đọc, không nằm đây). */
export const USER_DATE_FIELD_KEYS = [
  'birthDate',
  'profileReviewDate',
] as const satisfies readonly MeUserDisplayKey[]

export function isDateFormField(key: MeUserDisplayKey): boolean {
  return (USER_DATE_FIELD_KEYS as readonly string[]).includes(key)
}

/** Công việc & tổ chức — chỉ xem, không PATCH / chỉnh trên form. */
export const USER_WORK_ORG_READONLY_KEYS = [
  'employmentStatus',
  'startDateWork',
  'employeeCodePrimary',
  'hrOfficerName',
] as const satisfies readonly MeUserDisplayKey[]

export function isWorkOrgReadonlyField(key: MeUserDisplayKey): boolean {
  return (USER_WORK_ORG_READONLY_KEYS as readonly string[]).includes(key)
}

export const USER_SELF_FORM_SECTIONS: { title: string; fields: UserSelfFieldSpec[] }[] = [
  {
    title: 'Công việc & tổ chức',
    fields: [
      { key: 'divisionId', label: 'Phòng ban', kind: 'division-select' },
      { key: 'jobTitle', label: 'Vị trí chuyên môn' },
      { key: 'teamPosition', label: 'Vị trí', kind: 'position-select' },
      { key: 'startDateWork', label: 'Ngày bắt đầu làm việc' },
      { key: 'employmentStatus', label: 'Tình trạng làm việc' },
      { key: 'employeeCodePrimary', label: 'Mã nhân viên' },
      { key: 'contractType', label: 'Loại hợp đồng / vị trí' },
      { key: 'directManager', label: 'Quản lý trực tiếp' },
      { key: 'workplaceBranch', label: 'Chi nhánh / nơi làm việc' },
      { key: 'hrOfficerName', label: 'Cán bộ HR phụ trách' },
    ],
  },
  {
    title: 'Nhân thân & liên hệ',
    fields: [
      { key: 'displayName', label: 'Tên hiển thị' },
      { key: 'gender', label: 'Giới tính' },
      { key: 'birthDate', label: 'Ngày sinh' },
      { key: 'phonePrimary', label: 'Điện thoại chính' },
      { key: 'portraitRef', label: 'Ảnh đại diện', kind: 'portrait' },
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
      { key: 'identityDocumentInfo', label: 'Thông tin CCCD/CMND', multiline: true },
      { key: 'maritalStatus', label: 'Tình trạng hôn nhân' },
      { key: 'ethnicity', label: 'Dân tộc' },
      { key: 'religion', label: 'Tôn giáo' },
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
      { key: 'vehicleInfo', label: 'Phương tiện' },
      { key: 'attachmentIdFront', label: 'Đính kèm mặt trước (ref)' },
      { key: 'attachmentIdBack', label: 'Đính kèm mặt sau (ref)' },
      { key: 'policyAcknowledgement', label: 'Xác nhận chính sách', multiline: true },
      { key: 'profileReviewDate', label: 'Ngày rà soát hồ sơ' },
      { key: 'cvAttachmentRef', label: 'Tham chiếu CV' },
      { key: 'notes', label: 'Ghi chú', multiline: true },
    ],
  },
]
