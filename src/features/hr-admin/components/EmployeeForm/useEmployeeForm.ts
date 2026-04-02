import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { useCreateEmployee } from '@/features/hr-admin/hooks'
import { DEFAULT_DEPARTMENT_ID, DEFAULT_TEAM_ID } from '@/features/hr-admin/hrOrgOptions'
import { createEmployeeFormSchema, type CreateEmployeeForm } from '@/features/hr-admin/schemas'
import type { CreateEmployeeInput } from '@/types/api'

function toApiPayload(values: CreateEmployeeForm): CreateEmployeeInput {
  const payload: CreateEmployeeInput = {
    name: values.name.trim(),
    email: values.email.trim(),
    role: values.role,
    departmentId: values.departmentId,
    teamId: values.teamId,
  }
  const phone = values.phone?.trim()
  if (phone) payload.phone = phone
  const birth = values.birthDate?.trim()
  if (birth) payload.birthDate = birth
  return payload
}

export function useEmployeeForm(onSuccess?: () => void) {
  const form = useForm<CreateEmployeeForm>({
    resolver: zodResolver(createEmployeeFormSchema) as Resolver<CreateEmployeeForm>,
    defaultValues: {
      name: '',
      email: '',
      role: 'MEMBER',
      departmentId: DEFAULT_DEPARTMENT_ID,
      teamId: DEFAULT_TEAM_ID,
      phone: '',
      birthDate: '',
      secondaryTeamId: '',
      initialLevel: 'tap_su',
      startDate: '',
      notifyEmail: true,
      notifyManager: true,
      assignGrader: false,
      graderScope: 'all',
    },
  })

  const create = useCreateEmployee()

  const onSubmit = (values: CreateEmployeeForm) => {
    const input = toApiPayload(values)
    const sec = values.secondaryTeamId?.trim()
    create.mutate(
      {
        input,
        meta: {
          initialLevel: values.initialLevel,
          secondaryTeamId: sec && sec.length === 36 ? sec : undefined,
        },
      },
      { onSuccess: () => onSuccess?.() }
    )
  }

  return { form, onSubmit, isSubmitting: create.isPending }
}
