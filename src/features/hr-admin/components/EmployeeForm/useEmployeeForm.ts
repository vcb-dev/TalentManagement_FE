import { useCreateEmployee, useDirectManagerOptions } from '@/features/hr-admin/hooks'
import { DEFAULT_DEPARTMENT_ID, DEFAULT_TEAM_ID } from '@/features/hr-admin/hrOrgOptions'
import { directManagerIdToStoredName } from '@/features/hr-admin/directManagerOptions'
import { createEmployeeFormSchema, type CreateEmployeeForm } from '@/features/hr-admin/schemas'
import { useZodForm } from '@/lib/forms/useZodForm'
import type { CreateEmployeeInput } from '@/types/api'
import type { EmployeeEntity } from '@/features/hr-admin/api'

/** Field hồ sơ mở rộng (text tự do) — đưa vào payload khi có giá trị, bỏ qua directManager (xử lý riêng). */
const EXTENDED_PROFILE_FIELDS = [
  'jobTitle',
  'teamPosition',
  'workplaceBranch',
  'displayName',
  'gender',
  'facebookUrl',
  'addressCurrent',
  'addressHousehold',
  'educationLevel',
  'schoolName',
  'hometownDetail',
  'identityDocumentInfo',
  'maritalStatus',
  'ethnicity',
  'religion',
  'insuranceBookNumber',
  'childrenInfo',
  'emergencyContact1',
  'emergencyContact2',
  'fatherGuardianContact',
  'motherGuardianContact',
  'familyNotes',
  'bankAccountInfo',
  'vehicleInfo',
  'managerBlockCode',
  'attachmentIdFront',
  'attachmentIdBack',
  'policyAcknowledgement',
  'profileReviewDate',
  'cvAttachmentRef',
  'notes',
] as const satisfies ReadonlyArray<keyof CreateEmployeeForm & keyof CreateEmployeeInput>

function toApiPayload(
  values: CreateEmployeeForm,
  managers: Pick<EmployeeEntity, 'id' | 'name'>[]
): CreateEmployeeInput {
  const payload: CreateEmployeeInput = {
    name: values.name.trim(),
    email: values.email.trim(),
    role: values.role,
    departmentId: values.departmentId,
    teamId: values.teamId,
    initialLevel: values.initialLevel,
    notifyEmail: values.notifyEmail,
  }
  const phone = values.phone?.trim()
  if (phone) payload.phone = phone
  const birth = values.birthDate?.trim()
  if (birth) payload.birthDate = birth
  const start = values.startDate?.trim()
  if (start) payload.startDate = start
  const extras = (values.extraTeamIds ?? []).filter((id) => id !== values.teamId)
  if (extras.length > 0) payload.extraTeamIds = extras

  for (const key of EXTENDED_PROFILE_FIELDS) {
    const value = values[key]?.trim()
    if (value) payload[key] = value
  }

  const directManagerName = directManagerIdToStoredName(values.directManager ?? '', managers)
  if (directManagerName) payload.directManager = directManagerName

  return payload
}

export function useEmployeeForm(onSuccess?: () => void) {
  const form = useZodForm({
    schema: createEmployeeFormSchema,
    defaultValues: {
      name: '',
      email: '',
      role: 'MEMBER',
      departmentId: DEFAULT_DEPARTMENT_ID,
      teamId: DEFAULT_TEAM_ID,
      phone: '',
      birthDate: '',
      extraTeamIds: [],
      initialLevel: 'tap_su',
      startDate: '',
      notifyEmail: true,
      jobTitle: '',
      teamPosition: '',
      workplaceBranch: '',
      directManager: '',
      displayName: '',
      gender: '',
      facebookUrl: '',
      addressCurrent: '',
      addressHousehold: '',
      educationLevel: '',
      schoolName: '',
      hometownDetail: '',
      identityDocumentInfo: '',
      maritalStatus: '',
      ethnicity: '',
      religion: '',
      insuranceBookNumber: '',
      childrenInfo: '',
      emergencyContact1: '',
      emergencyContact2: '',
      fatherGuardianContact: '',
      motherGuardianContact: '',
      familyNotes: '',
      bankAccountInfo: '',
      vehicleInfo: '',
      managerBlockCode: '',
      attachmentIdFront: '',
      attachmentIdBack: '',
      policyAcknowledgement: '',
      profileReviewDate: '',
      cvAttachmentRef: '',
      notes: '',
    },
  })

  const create = useCreateEmployee()
  const { data: directManagersData } = useDirectManagerOptions()
  const managers = directManagersData?.data ?? []

  const onSubmit = (values: CreateEmployeeForm) => {
    const input = toApiPayload(values, managers)
    create.mutate(
      {
        input,
        meta: {
          initialLevel: values.initialLevel,
        },
      },
      { onSuccess: () => onSuccess?.() }
    )
  }

  return { form, onSubmit, isSubmitting: create.isPending }
}
