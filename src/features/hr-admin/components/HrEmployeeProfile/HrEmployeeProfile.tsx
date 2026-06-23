import { FormProvider, useForm, useWatch, type Control } from 'react-hook-form'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { useAuthStore } from '@/stores/auth.store'
import { useUploadMePortrait } from '@/features/profile/hooks'
import { useQuery } from '@tanstack/react-query'
import { organizationApi } from '@/features/organization/api'
import { type MeUserDisplayKey, type MeUserSelf } from '@/features/profile/userSelf.types'
import {
  isDateFormField,
  isWorkOrgReadonlyField,
  USER_SELF_FORM_SECTIONS,
  type UserSelfFieldSpec,
} from '@/features/profile/userSelfFormLayout'
import {
  formatUserDateForReadonlyDisplay,
  parseStoredDateToInputValue,
} from '@/features/profile/profileDateUtils'
import { useId, useEffect, useMemo, useState } from 'react'
import { profileApi } from '@/features/profile/api'
import { toast } from 'sonner'
import type { MyProfilePage } from '@/features/profile/types'
import { getApiErrorMessage } from '@/lib/axios'
import { EmployeeExtraTeamsField, extraTeamIdsEqual } from '../EmployeeExtraTeamsField'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { Building2, RefreshCw, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DateController,
  InputController,
  SelectController,
  TextareaController,
} from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { FormSection } from '@/components/shared/FormSection'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { usePermission } from '@/hooks/usePermission'
import {
  useDeactivateEmployee,
  useEmployee,
  useUpdateEmployee,
  useUpdateEmployeeById,
} from '../../hooks'
import { EMPLOYEE_PATCH_KEYS, type EditEmployeeBody, type EmployeePatchKey } from '../../types'
export interface HrEmployeeProfileProps {
  employee: EmployeeEntity
  /** Mặc định mở tab khi vào từ URL `?mode=edit`. */
  initialTab?: number
}
export type IHrEmployeeProfileState = MeUserSelf

type EmploymentStatusUi = 'working' | 'resigned'

const EMPLOYMENT_STATUS_OPTIONS: { value: EmploymentStatusUi; label: string }[] = [
  { value: 'working', label: 'Đang làm việc' },
  { value: 'resigned', label: 'Đã nghỉ' },
]

type EditRecord = Record<EmployeePatchKey, string> & {
  extraTeamIds: string[]
  employmentStatusUi: EmploymentStatusUi
}

const fieldStackGap = 'gap-1'
const fieldBoxClass = ''

const inputEditable =
  'border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10'

const fieldControlClass =
  'h-10 w-full rounded-xl border px-3 py-2 leading-snug outline-none transition-all'

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5">
      <span className="h-3 w-0.5 rounded-full bg-slate-300" aria-hidden />
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{children}</span>
    </span>
  )
}

function emptyEditRecord(): EditRecord {
  return {
    ...(Object.fromEntries(EMPLOYEE_PATCH_KEYS.map((k) => [k, ''])) as Record<
      EmployeePatchKey,
      string
    >),
    extraTeamIds: [],
    employmentStatusUi: 'working',
  }
}

function resolveEmploymentStatusUi(
  employee: IHrEmployeeProfileState,
  summaryStatus?: EmployeeEntity['status']
): EmploymentStatusUi {
  const inactive = summaryStatus
    ? summaryStatus === 'INACTIVE'
    : isEmploymentInactive(employee.employmentStatus)
  return inactive ? 'resigned' : 'working'
}

function canManageEmploymentStatusRole(role: string | null | undefined): boolean {
  return role === 'MANAGER' || role === 'HR'
}

function isEmploymentInactive(employmentStatus: string | null | undefined): boolean {
  const raw = (employmentStatus ?? '').trim()
  if (!raw) return false
  const upper = raw.toUpperCase()
  if (upper === 'INACTIVE' || upper === 'TERMINATED') return true
  const folded = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
  return /thoi viec|nghi viec|da nghi|inactive|ngung hoat dong|sa thai/.test(folded)
}

function EmploymentStatusField({ control }: { control: Control<EditRecord> }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/30',
        fieldStackGap
      )}
    >
      <SelectController
        control={control}
        name="employmentStatusUi"
        label="Tình trạng làm việc"
        placeholder="Chọn tình trạng"
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>Tình trạng làm việc</FieldLabel>}
      >
        {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectController>
    </div>
  )
}

function ProfileActionButtons({
  isInactive,
  canDeactivate,
  canReactivate,
  showEmploymentStatusActions,
  isSaving,
  patchPending,
  onDeactivate,
  onReactivate,
  onSave,
}: {
  isInactive: boolean
  canDeactivate: boolean
  canReactivate: boolean
  showEmploymentStatusActions: boolean
  isSaving: boolean
  patchPending: boolean
  onDeactivate: () => void
  onReactivate: () => void
  onSave: () => void
}) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      {!showEmploymentStatusActions && isInactive && canReactivate ? (
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onReactivate}
          className="h-12 w-full rounded-2xl border-primary/30 bg-primary/10 px-6 text-sm font-bold text-primary hover:bg-primary/15 sm:w-auto sm:min-w-[180px]"
        >
          Kích hoạt lại
        </Button>
      ) : null}
      {!showEmploymentStatusActions && !isInactive && canDeactivate ? (
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onDeactivate}
          className="h-12 w-full rounded-2xl border-destructive/40 bg-destructive/10 px-6 text-sm font-bold text-destructive hover:bg-destructive/15 sm:w-auto sm:min-w-[180px]"
        >
          Hủy hoạt động
        </Button>
      ) : null}
      <Button
        type="button"
        disabled={isSaving}
        onClick={onSave}
        className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:min-w-[220px] sm:px-8"
      >
        {patchPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
        {patchPending ? 'Đang lưu…' : 'Lưu thay đổi'}
      </Button>
    </div>
  )
}

const Form = FormProvider

function userToEdit(u: IHrEmployeeProfileState): EditRecord {
  const r = emptyEditRecord()
  for (const k of EMPLOYEE_PATCH_KEYS) {
    if (isDateFormField(k)) {
      r[k] = parseStoredDateToInputValue(u[k])
    } else {
      r[k] = u[k] == null ? '' : String(u[k])
    }
  }
  if (!r.displayName && u.fullNameLegal) {
    r.displayName = u.fullNameLegal
  }
  r.extraTeamIds = u.extraTeamIds ?? u.teamIds?.slice(1) ?? []
  r.employmentStatusUi = resolveEmploymentStatusUi(u)
  return r
}

function mapCurrentTitleToLevelId(
  title: string
): 'tap_su' | 'biet_viec' | 'duoc_viec' | 'dong_gop_ket_qua' | 'tuong' {
  const normalized = title.trim().toLowerCase()
  if (normalized.includes('tập sự') || normalized.includes('tap su')) return 'tap_su'
  if (normalized.includes('biết việc') || normalized.includes('biet viec')) return 'biet_viec'
  if (normalized.includes('được việc') || normalized.includes('duoc viec')) return 'duoc_viec'
  if (normalized.includes('đóng góp') || normalized.includes('dong gop')) return 'dong_gop_ket_qua'
  if (normalized.includes('tướng') || normalized.includes('tuong')) return 'tuong'
  return 'biet_viec'
}

function toPatch(edit: EditRecord, original: IHrEmployeeProfileState): EditEmployeeBody {
  const nz = (s: string) => (s.trim() === '' ? null : s.trim())
  const body = {} as EditEmployeeBody
  for (const k of EMPLOYEE_PATCH_KEYS) {
    body[k] = nz(edit[k] ?? '')
  }
  const origExtras = original.extraTeamIds ?? original.teamIds?.slice(1) ?? []
  if (!extraTeamIdsEqual(edit.extraTeamIds ?? [], origExtras)) {
    body.extraTeamIds = edit.extraTeamIds ?? []
  }
  return body
}

function workOrgReadonlyValue(employee: IHrEmployeeProfileState, key: MeUserDisplayKey): string {
  if (key === 'startDateWork') return formatUserDateForReadonlyDisplay(employee.startDateWork)
  const v = employee[key]
  return v == null ? '—' : String(v)
}

const teamPositionOptions = [
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Full-time thử việc', label: 'Full-time thử việc' },
  { value: 'Full-time chính thức', label: 'Full-time chính thức' },
  { value: 'Thực tập sinh', label: 'Thực tập sinh' },
  { value: 'Trưởng nhóm', label: 'Trưởng nhóm' },
]

function ProfileReadonlyInfo({
  name,
  label,
  value,
  control,
}: {
  name: EmployeePatchKey
  label: string
  value: string
  control: ReturnType<typeof useForm<EditRecord>>['control']
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/30',
        fieldStackGap
      )}
    >
      {name === 'teamPosition' ? (
        <SelectController
          key={name}
          control={control}
          name={name}
          label={label}
          placeholder="Chọn loại hợp đồng / vị trí"
          className={cn('space-y-1.5', fieldBoxClass)}
          labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
          triggerClassName={cn(fieldControlClass, inputEditable)}
          customLabel={<FieldLabel>{label}</FieldLabel>}
        >
          {teamPositionOptions?.map((j) => (
            <SelectItem key={j.value} value={j.value}>
              {j.label}
            </SelectItem>
          ))}
        </SelectController>
      ) : (
        <InputController
          control={control}
          value={value}
          name={name}
          label={label}
          type="text"
          autoComplete="off"
          className={cn('space-y-1.5', fieldBoxClass)}
          labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
          inputClassName={cn(fieldControlClass, inputEditable)}
          customLabel={<FieldLabel>{label}</FieldLabel>}
        />
      )}
    </div>
  )
}

function renderField(
  field: UserSelfFieldSpec,
  ctx: {
    employee: IHrEmployeeProfileState
    control: ReturnType<typeof useForm<EditRecord>>['control']
    divisions?: Array<{ id: string; name: string }>
    teams?: Array<{ id: string; name: string }>
    positions?: Array<{ value: string; label: string }>
    jobTitles?: Array<{ value: string; label: string }>
  }
) {
  const { employee, control, divisions, teams, positions, jobTitles } = ctx

  const forceReadonly = field.key === 'directManager'

  if (field.kind === 'portrait') {
    return null
  }

  if (isWorkOrgReadonlyField(field.key) || forceReadonly) {
    return (
      <ProfileReadonlyInfo
        name={field.key as EmployeePatchKey}
        key={field.key}
        label={field.label}
        value={workOrgReadonlyValue(employee, field.key)}
        control={control}
      />
    )
  }

  const key = field.key as EmployeePatchKey

  if (field.kind === 'division-select') {
    return (
      <SelectController
        key={field.key}
        control={control}
        name={key}
        label={field.label}
        placeholder="Chọn phòng ban"
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      >
        <SelectItem value="__none">Chưa chọn</SelectItem>
        {divisions?.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.name}
          </SelectItem>
        ))}
      </SelectController>
    )
  }

  if (field.kind === 'team-select') {
    return (
      <SelectController
        key={field.key}
        control={control}
        name={key}
        label={field.label}
        placeholder="Chọn nhóm"
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      >
        <SelectItem value="__none">Chưa chọn</SelectItem>
        {teams?.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectController>
    )
  }

  if (field.kind === 'position-select') {
    return (
      <SelectController
        key={field.key}
        control={control}
        name={key}
        label={field.label}
        placeholder={field.key === 'contractType' ? 'Chọn loại hợp đồng / vị trí' : 'Chọn vị trí'}
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      >
        <SelectItem value="__none">Chưa chọn</SelectItem>
        {positions?.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectController>
    )
  }

  if (field.kind === 'job-title-select') {
    return (
      <SelectController
        key={field.key}
        control={control}
        name={key}
        label={field.label}
        placeholder="Chọn vị trí chuyên môn"
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      >
        {jobTitles?.map((j) => (
          <SelectItem key={j.value} value={j.value}>
            {j.label}
          </SelectItem>
        ))}
      </SelectController>
    )
  }

  if (isDateFormField(field.key)) {
    return (
      <DateController
        key={field.key}
        control={control}
        name={key}
        label={field.label}
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        datePickerClassName={cn(fieldControlClass, '[color-scheme:light]', inputEditable)}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      />
    )
  }

  if (field.multiline) {
    return (
      <TextareaController
        key={field.key}
        control={control}
        name={key}
        label={field.label}
        className={cn('space-y-1.5 sm:col-span-2 lg:col-span-2', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        textareaClassName={cn(
          'min-h-[80px] w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10',
          inputEditable
        )}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      />
    )
  }
  return (
    <InputController
      key={field.key}
      control={control}
      name={key}
      label={field.label}
      type="text"
      autoComplete="off"
      className={cn('space-y-1.5', fieldBoxClass)}
      labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
      inputClassName={cn(fieldControlClass, inputEditable)}
      customLabel={<FieldLabel>{field.label}</FieldLabel>}
    />
  )
}

function ProfileIdentityCard({
  control,
  u,
  role,
  currentLevelTitle,
  portraitUploading,
  avatarUploadInputId,
  onPortraitFile,
  fallbackUserName,
  fallbackUserEmail,
}: {
  control: Control<EditRecord>
  u: MeUserSelf
  role: keyof typeof ROLE_LABEL_VI
  currentLevelTitle: string
  portraitUploading: boolean
  avatarUploadInputId: string
  onPortraitFile: (file: File) => void
  fallbackUserName: string
  fallbackUserEmail: string
}) {
  const watchedDisplayName = useWatch({ control, name: 'displayName' }) ?? ''
  const watchedFullNameLegal = useWatch({ control, name: 'fullNameLegal' }) ?? ''
  const portraitRef = useWatch({ control, name: 'portraitRef' }) ?? ''

  const displayName = useMemo(() => {
    const fromForm = watchedDisplayName.trim() || watchedFullNameLegal.trim()
    if (fromForm) return fromForm
    return u.displayName?.trim() || u.fullNameLegal?.trim() || fallbackUserName || 'Nhân viên'
  }, [fallbackUserName, u, watchedDisplayName, watchedFullNameLegal])

  const email = useMemo(() => {
    return u.email?.trim() || fallbackUserEmail || '—'
  }, [u, fallbackUserEmail])

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="relative shrink-0">
        <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-white shadow-xl md:h-28 md:w-28 dark:border-slate-800">
          <EmployeeAvatar
            name={displayName}
            photoUrl={resolvePublicAssetUrl(portraitRef)}
            className="h-full w-full object-cover text-2xl"
          />
          {portraitUploading && (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <RefreshCw className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <Input
            id={avatarUploadInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={portraitUploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onPortraitFile(f)
              e.target.value = ''
            }}
          />
          <label
            htmlFor={avatarUploadInputId}
            className={cn(
              'absolute bottom-1 right-1 z-[2] flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md ring-2 ring-white transition-transform hover:scale-110 hover:bg-primary/90 active:scale-95 dark:ring-slate-900',
              'md:bottom-1.5 md:right-1.5',
              portraitUploading && 'pointer-events-none opacity-50'
            )}
            aria-label="Tải ảnh đại diện"
          >
            <Upload className="h-4 w-4" strokeWidth={2.25} />
          </label>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {displayName}
          </h2>
          <p className="text-sm font-medium text-slate-500">{email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="h-6 border-indigo-400/30 bg-indigo-500/10 px-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300"
          >
            {ROLE_LABEL_VI[role]}
          </Badge>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Building2 className="h-3 w-3" />
            <span>{u.departmentName?.trim() || '—'}</span>
          </div>
          <Badge
            variant="outline"
            className="h-6 border-fuchsia-400/30 bg-fuchsia-500/10 px-2 text-xs font-semibold uppercase tracking-wide text-fuchsia-600 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/30 dark:text-fuchsia-300"
          >
            Cấp độ: {currentLevelTitle}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export function HrEmployeeProfile({
  employee,
  page,
}: {
  employee: IHrEmployeeProfileState
  page: MyProfilePage
}) {
  const user = useAuthStore((s) => s.user)
  const { canId } = usePermission()
  const canDeactivate = canId('hr.employees.deactivate') || canId('hr.employees.edit')
  const canReactivate = canId('hr.employees.edit')
  const { mutate: patchUser, isPending: patchPending } = useUpdateEmployeeById()
  const { data: employeeSummary } = useEmployee(employee.id)
  const deactivate = useDeactivateEmployee()
  const updateEmployee = useUpdateEmployee()
  const [confirmPending, setConfirmPending] = useState<'deactivate' | 'reactivate' | null>(null)
  const { mutate: uploadPortrait, isPending: portraitUploading } = useUploadMePortrait()
  const { data: divisionsList = [] } = useQuery({
    queryKey: ['organization', 'divisions-list'],
    queryFn: () => organizationApi.getDivisionsList(),
    staleTime: 60_000,
  })
  const { data: teamsList = [] } = useQuery({
    queryKey: ['organization', 'teams-list'],
    queryFn: () => organizationApi.getTeamsList(),
    staleTime: 60_000,
  })
  const form = useForm<EditRecord>({
    defaultValues: userToEdit(employee),
  })
  const { control, handleSubmit, reset } = form
  const selectedTeamId = useWatch({ control, name: 'teamId' }) ?? ''

  useEffect(() => {
    reset({
      ...userToEdit(employee),
      employmentStatusUi: resolveEmploymentStatusUi(employee, employeeSummary?.status),
    })
  }, [employee, employeeSummary?.status, reset])

  const divisions = useMemo(
    () => divisionsList.map((d) => ({ id: d.id, name: d.name })),
    [divisionsList]
  )
  // Hiển thị tất cả nhóm, không lọc theo phòng ban
  const teams = useMemo(() => teamsList.map((t) => ({ id: t.id, name: t.name })), [teamsList])
  const allTeamOptions = useMemo(
    () => teamsList.map((t) => ({ value: t.id, label: t.name })),
    [teamsList]
  )
  const { data: positionsData } = useQuery({
    queryKey: ['profile', 'positions'],
    queryFn: () => profileApi.getPositions(),
  })
  const positions = useMemo(() => positionsData ?? [], [positionsData])
  const { data: jobTitlesData } = useQuery({
    queryKey: ['profile', 'job-titles'],
    queryFn: () => profileApi.getJobTitles(),
  })
  const jobTitles = useMemo(() => jobTitlesData ?? [], [jobTitlesData])

  const role = user?.role ?? 'MEMBER'
  const canManageEmploymentStatus = canManageEmploymentStatusRole(role)
  const currentLevelId = mapCurrentTitleToLevelId(page.currentLevel.title)
  const onPortraitFile = (file: File) => {
    uploadPortrait(file, {
      onSuccess: (res) => {
        toast.success('Đã cập nhật ảnh đại diện')
        form.setValue('portraitRef', res.portraitRef)
        // Cập nhật vào auth store để Navbar thay đổi ngay
        if (user) {
          useAuthStore.getState().setUser({
            ...user,
            portraitRef: res.portraitRef,
          })
        }
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    })
  }

  const workSection = USER_SELF_FORM_SECTIONS[0]!
  const workReadonlyFields = workSection.fields.filter(
    (field) => isWorkOrgReadonlyField(field.key) || field.key === 'directManager'
  )
  const workEditableFields = workSection.fields.filter(
    (field) => !isWorkOrgReadonlyField(field.key) && field.key !== 'directManager'
  )
  const detailSections = USER_SELF_FORM_SECTIONS.slice(1).filter((s) => s.title.trim() !== 'Khác')
  const initialEmploymentStatusUi = resolveEmploymentStatusUi(employee, employeeSummary?.status)
  const onSaveProfile = handleSubmit((values) => {
    const profilePatch = toPatch(values, employee) as unknown as IHrEmployeeProfileState
    const statusChanged =
      canManageEmploymentStatus && values.employmentStatusUi !== initialEmploymentStatusUi

    const applyStatusChange = () => {
      if (!statusChanged) return
      if (values.employmentStatusUi === 'resigned') {
        deactivate.mutate(employee.id)
        return
      }
      updateEmployee.mutate({ id: employee.id, patch: { status: 'ACTIVE' } })
    }

    patchUser({ id: employee.id, patch: profilePatch }, { onSuccess: applyStatusChange })
  })

  const isInactive = employeeSummary
    ? employeeSummary.status === 'INACTIVE'
    : isEmploymentInactive(employee.employmentStatus)
  const isSaving = patchPending || deactivate.isPending || updateEmployee.isPending

  const handleConfirmPending = () => {
    if (!confirmPending) return
    if (confirmPending === 'deactivate') {
      deactivate.mutate(employee.id)
    } else {
      updateEmployee.mutate({ id: employee.id, patch: { status: 'ACTIVE' } })
    }
    setConfirmPending(null)
  }

  const accountActions = {
    isInactive,
    canDeactivate,
    canReactivate,
    showEmploymentStatusActions: canManageEmploymentStatus,
    isSaving,
    patchPending,
    onDeactivate: () => setConfirmPending('deactivate'),
    onReactivate: () => setConfirmPending('reactivate'),
    onSave: onSaveProfile,
  }

  const fieldCtx = {
    employee,
    control,
    divisions,
    teams,
    positions,
    jobTitles,
  }
  const avatarUploadInputId = useId()

  return (
    <Form {...form}>
      <div
        className="relative -m-5 min-h-[calc(100vh-3rem)] bg-slate-50/50 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-6 text-foreground md:-m-6 md:pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:-m-8 dark:bg-slate-950"
        data-current-level-id={currentLevelId}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-20 -top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-8 left-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6">
          <div className="mb-4 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Link
              to="/hr-admin"
              search={{ page: 1, pageSize: 15 }}
              className="font-semibold text-primary hover:underline"
            >
              ← Danh sách nhân sự
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-semibold text-foreground">{employee.fullNameLegal}</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 h-48 w-48 bg-primary/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                <div className="relative z-10">
                  <ProfileIdentityCard
                    control={control}
                    u={employee}
                    role={role}
                    currentLevelTitle={page.currentLevel.title}
                    portraitUploading={portraitUploading}
                    avatarUploadInputId={avatarUploadInputId}
                    onPortraitFile={onPortraitFile}
                    fallbackUserName={user?.name ?? ''}
                    fallbackUserEmail={user?.email ?? ''}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
                <FormSection title="Chi tiết hồ sơ" className="border-0 pb-0">
                  <div className="space-y-8">
                    <div className="rounded-2xl border border-slate-200 border-l-4 border-l-primary bg-white p-6 shadow-sm dark:border-slate-800 dark:border-l-primary dark:bg-slate-900/50">
                      <FormSection
                        title={workSection.title}
                        icon={<Building2 className="h-4 w-4" />}
                        className="border-0 pb-0"
                      >
                        {workReadonlyFields.length > 0 ? (
                          <div className="mb-8">
                            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-primary/50">
                              Thông tin đồng bộ
                            </p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              {workReadonlyFields.map((f) => renderField(f, fieldCtx))}
                              {canManageEmploymentStatus ? (
                                <EmploymentStatusField control={control} />
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        {workEditableFields.length > 0 ? (
                          <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
                            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Thông tin có thể cập nhật
                            </p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              {workEditableFields.map((f) => renderField(f, fieldCtx))}
                              <div className="sm:col-span-2">
                                <EmployeeExtraTeamsField
                                  control={control}
                                  name="extraTeamIds"
                                  primaryTeamId={selectedTeamId}
                                  allTeams={allTeamOptions}
                                />
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </FormSection>
                    </div>

                    {detailSections.map((section, idx) => (
                      <div
                        key={section.title}
                        className={cn(
                          'rounded-2xl border border-slate-200 border-l-4 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50',
                          idx % 3 === 0
                            ? 'border-l-indigo-500'
                            : idx % 3 === 1
                              ? 'border-l-violet-500'
                              : 'border-l-emerald-500'
                        )}
                      >
                        <FormSection title={section.title} className="border-0 pb-0">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {section.fields.map((f) => renderField(f, fieldCtx))}
                          </div>
                        </FormSection>
                      </div>
                    ))}
                  </div>
                </FormSection>
              </section>
            </div>
          </div>
        </div>
      </div>

      {typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-0 z-[60]"
              role="presentation"
            >
              <div
                className="pointer-events-auto border-t border-slate-200/90 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
                role="region"
                aria-label="Thao tác hồ sơ"
              >
                <div className="mx-auto flex w-full max-w-[1400px]">
                  <ProfileActionButtons {...accountActions} />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {!canManageEmploymentStatus ? (
        <ConfirmDialog
          open={confirmPending !== null}
          onOpenChange={(open) => {
            if (!open) setConfirmPending(null)
          }}
          title={
            confirmPending === 'deactivate' ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?'
          }
          description={
            confirmPending === 'deactivate'
              ? 'Nhân viên sẽ không thể đăng nhập sau khi bị vô hiệu hóa.'
              : 'Nhân viên sẽ được khôi phục quyền đăng nhập.'
          }
          confirmLabel={confirmPending === 'deactivate' ? 'Vô hiệu hóa' : 'Kích hoạt'}
          destructive={confirmPending === 'deactivate'}
          onConfirm={handleConfirmPending}
        />
      ) : null}
    </Form>
  )
}
