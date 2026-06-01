/** Khớp JSON `GET /me/user` (bảng `users`, không có raw_data). */
export interface MeUserSelf {
  id: string
  larkRecordId: string
  email: string | null
  createdAt: string
  updatedAt: string
  lastSyncedAt: string | null
  startDateWork: string | null
  employmentStatus: string | null
  fullNameLegal: string | null
  displayName: string | null
  employeeCodePrimary: string | null
  employeeCodeSecondary: string | null
  contractType: string | null
  jobTitle: string | null
  teamGroup: string | null
  departmentName: string | null
  divisionId: string | null
  directManager: string | null
  portraitRef: string | null
  gender: string | null
  birthDate: string | null
  phonePrimary: string | null
  phoneSecondary: string | null
  workplaceBranch: string | null
  educationLevel: string | null
  addressCurrent: string | null
  addressHousehold: string | null
  identityDocumentInfo: string | null
  maritalStatus: string | null
  childrenInfo: string | null
  emergencyContact1: string | null
  emergencyContact2: string | null
  schoolName: string | null
  bankAccountInfo: string | null
  vehicleInfo: string | null
  hometownDetail: string | null
  ethnicity: string | null
  religion: string | null
  familyNotes: string | null
  fatherGuardianContact: string | null
  motherGuardianContact: string | null
  attachmentIdFront: string | null
  attachmentIdBack: string | null
  policyAcknowledgement: string | null
  hrOfficerName: string | null
  facebookUrl: string | null
  socialNickname: string | null
  profileReviewDate: string | null
  cvAttachmentRef: string | null
  notes: string | null
  teamPosition: string | null
  currentLearningClassName: string | null
}

/** Khớp `USER_SELF_PATCH_KEYS` trên BE. */
export const ME_USER_PATCH_KEYS = [
  'fullNameLegal',
  'displayName',
  'contractType',
  'jobTitle',
  'directManager',
  'portraitRef',
  'gender',
  'birthDate',
  'phonePrimary',
  'workplaceBranch',
  'educationLevel',
  'addressCurrent',
  'addressHousehold',
  'identityDocumentInfo',
  'maritalStatus',
  'childrenInfo',
  'emergencyContact1',
  'emergencyContact2',
  'schoolName',
  'bankAccountInfo',
  'vehicleInfo',
  'hometownDetail',
  'ethnicity',
  'religion',
  'familyNotes',
  'fatherGuardianContact',
  'motherGuardianContact',
  'attachmentIdFront',
  'attachmentIdBack',
  'policyAcknowledgement',
  'facebookUrl',
  'profileReviewDate',
  'cvAttachmentRef',
  'notes',
  'divisionId',
] as const

export type MeUserPatchKey = (typeof ME_USER_PATCH_KEYS)[number]

export type MeUserDisplayKey = Exclude<
  keyof MeUserSelf,
  'id' | 'larkRecordId' | 'email' | 'createdAt' | 'updatedAt' | 'lastSyncedAt'
>
