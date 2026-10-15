import {
  useCreateEmployee,
  useDirectManagerOptions,
  useUploadAttachment,
} from '@/features/hr-admin/hooks'
import { DEFAULT_DEPARTMENT_ID, DEFAULT_TEAM_ID } from '@/features/hr-admin/hrOrgOptions'
import { directManagerIdToStoredName } from '@/features/hr-admin/directManagerOptions'
import { createEmployeeFormSchema, type CreateEmployeeForm } from '@/features/hr-admin/schemas'
import { getApiErrorMessage } from '@/lib/axios'
import { useZodForm } from '@/lib/forms/useZodForm'
import type { CreateEmployeeInput } from '@/types/api'
import type { EmployeeEntity, PrivateDocField } from '@/features/hr-admin/api'
import { useState } from 'react'
import { toast } from 'sonner'

/** Field hồ sơ mở rộng (text tự do) — đưa vào payload khi có giá trị, bỏ qua directManager (xử lý riêng). */
const EXTENDED_PROFILE_FIELDS = [
  'employeeIdentifier',
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
  'identityNumber',
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
  'policyAcknowledgement',
  'profileReviewDate',
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
    initialLevel: values.initialLevel,
    notifyEmail: values.notifyEmail,
  }
  const isBod = values.role === 'BOD'
  if (isBod) payload.employeeCodePrimary = values.employeeCodePrimary
  else if (values.teamId) payload.teamId = values.teamId
  const phone = values.phone?.trim()
  if (phone) payload.phone = phone
  const birth = values.birthDate?.trim()
  if (birth) payload.birthDate = birth
  const start = values.startDate?.trim()
  if (start) payload.startDate = start
  const leave = values.leaveDate?.trim()
  if (leave) payload.leaveDate = leave
  const extras = isBod ? [] : (values.extraTeamIds ?? []).filter((id) => id !== values.teamId)
  if (extras.length > 0) payload.extraTeamIds = extras
  if (values.projectIds.length > 0) payload.projectIds = values.projectIds
  if (values.loginUsername) {
    payload.loginUsername = values.loginUsername
    payload.loginPassword = values.loginPassword
  }

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
      leaveDate: '',
      projectIds: [],
      idCardFrontFile: null,
      idCardBackFile: null,
      cvFile: null,
      employeeCodePrimary: '',
      loginUsername: '',
      loginPassword: '',
      notifyEmail: true,
      employeeIdentifier: '',
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
      identityNumber: '',
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
      policyAcknowledgement: '',
      profileReviewDate: '',
      notes: '',
    },
  })

  const create = useCreateEmployee()
  const uploadAttachment = useUploadAttachment()
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const { data: directManagersData } = useDirectManagerOptions()
  const managers = directManagersData?.data ?? []

  /** Cần id nhân sự nên tải sau khi tạo; lỗi không chặn vì tài khoản đã tạo xong. */
  const uploadFiles = async (employeeId: string, values: CreateEmployeeForm) => {
    const candidates: Array<[PrivateDocField, File | null, string]> = [
      ['attachmentIdFront', values.idCardFrontFile, 'ảnh CCCD mặt trước'],
      ['attachmentIdBack', values.idCardBackFile, 'ảnh CCCD mặt sau'],
      ['cvAttachmentRef', values.cvFile, 'CV'],
    ]
    const jobs = candidates.filter(
      (job): job is [PrivateDocField, File, string] => job[1] instanceof File
    )
    if (jobs.length === 0) return
    setUploadingFiles(true)
    const failed: string[] = []
    try {
      for (const [field, file, label] of jobs) {
        try {
          await uploadAttachment.mutateAsync({ id: employeeId, field, file })
        } catch (err) {
          failed.push(`${label}: ${getApiErrorMessage(err)}`)
        }
      }
    } finally {
      setUploadingFiles(false)
    }
    if (failed.length > 0) {
      toast.error(
        `Đã tạo nhân sự nhưng chưa lưu được ${failed.join('; ')} — hãy tải lại trong hồ sơ nhân sự.`
      )
    }
  }

  const onSubmit = (values: CreateEmployeeForm) => {
    const input = toApiPayload(values, managers)
    create.mutate(
      {
        input,
        meta: {
          initialLevel: values.initialLevel,
        },
      },
      {
        onSuccess: async (row) => {
          await uploadFiles(row.id, values)
          onSuccess?.()
        },
      }
    )
  }

  return { form, onSubmit, isSubmitting: create.isPending || uploadingFiles }
}
