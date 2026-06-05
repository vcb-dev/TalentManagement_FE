import { useCreateEmployee } from '@/features/hr-admin/hooks'
import { DEFAULT_DEPARTMENT_ID, DEFAULT_TEAM_ID } from '@/features/hr-admin/hrOrgOptions'
import { createEmployeeFormSchema, type CreateEmployeeForm } from '@/features/hr-admin/schemas'
import { useZodForm } from '@/lib/forms/useZodForm'
import type { CreateEmployeeInput } from '@/types/api'

function toApiPayload(values: CreateEmployeeForm): CreateEmployeeInput {
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
    },
  })

  const create = useCreateEmployee()

  const onSubmit = (values: CreateEmployeeForm) => {
    const input = toApiPayload(values)
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
