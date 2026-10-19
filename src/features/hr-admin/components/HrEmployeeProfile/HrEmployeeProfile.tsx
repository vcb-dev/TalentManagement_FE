import { FormProvider, useForm, useWatch, type Control } from 'react-hook-form'

import type { EmployeeEntity } from '@/features/hr-admin/api'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DateController,
  InputController,
  SelectController,
  TextareaController,
} from '@/components/ui/form-controllers'
import { Input } from '@/components/ui/input'
import { SelectGroup, SelectItem, SelectLabel } from '@/components/ui/select'
import { organizationApi } from '@/features/organization/api'
import { profileApi } from '@/features/profile/api'
import { useUploadMePortrait } from '@/features/profile/hooks'
import {
  formatUserDateForReadonlyDisplay,
  parseStoredDateToInputValue,
} from '@/features/profile/profileDateUtils'
import { type MeUserDisplayKey, type MeUserSelf } from '@/features/profile/userSelf.types'
import {
  employeeCodeInputRequiredMessage,
  isDateFormField,
  isEmployeeCodeInputField,
  isWorkOrgReadonlyField,
  roleMayHaveNoTeam,
  USER_SELF_FORM_SECTIONS,
  type UserSelfFieldSpec,
} from '@/features/profile/userSelfFormLayout'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/axios'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import type { PatchEmployeeInput } from '@/types/api'
import type { Role } from '@/types/auth'
import { useQuery } from '@tanstack/react-query'
import { Building2, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  buildDirectManagerSelectOptions,
  directManagerIdToStoredName,
  resolveDirectManagerFormValue,
  type DirectManagerOption,
} from '../../directManagerOptions'
import {
  useAnyActionPending,
  useDeactivateEmployee,
  useDirectManagerOptions,
  useEmployee,
  useTeamLeaderOptions,
  useUpdateEmployee,
  useUpdateEmployeeById,
} from '../../hooks'
import {
  buildTeamLeaderOptionGroups,
  TEAM_LEADER_NONE,
  type TeamLeaderOptionGroup,
} from '../../teamLeaderOptions'
import {
  IDENTITY_NUMBER_MESSAGE,
  IDENTITY_NUMBER_PATTERN,
  compactIdentityNumber,
} from '../../schemas'
import { teamPositionOptions } from '../../teamPositionOptions'
import { EMPLOYEE_PATCH_KEYS, type EditEmployeeBody, type EmployeePatchKey } from '../../types'
import { EMPLOYEE_CARD_STATUSES, EMPLOYEE_CARD_STATUS_LABEL } from '../../employeeCard'
import { EmployeeCardColorField } from '../EmployeeCard'
import { EmployeeExtraTeamsField, extraTeamIdsEqual } from '../EmployeeExtraTeamsField'
import { EmployeeProjectsCard } from '../EmployeeProjects'
import { EmployeeOrderNumberField } from './EmployeeOrderNumberField'
import { CvUploadField } from '../CvAttachmentField'
import { IdCardPhotoUploadField } from '../IdCardPhotoField'
import { LoginEmailHint } from '../LoginEmailHint'
import { LOGIN_EMAIL_FORMAT } from '../../loginEmail'
import { levelPillText } from '../HrEmployeeList/employeeListUtils'
import { EmployeeLoginCredentialCard } from './EmployeeLoginCredentialCard'
import { OrgChangeHistory } from './OrgChangeHistory'
import {
  FieldLabel,
  ProfileDetailSection,
  ProfileDetailsCard,
  ProfileFieldGrid,
  ProfileFieldGroup,
  ProfileHeroCard,
  ProfilePageShell,
  ProfileStickyActionBar,
  fieldControlClass,
  inputEditable,
  profilePrimaryActionClass,
} from './profileFormLayout'
export interface HrEmployeeProfileProps {
  employee: IHrEmployeeProfileState
  /** Mặc định mở tab khi vào từ URL `?mode=edit`. */
  initialTab?: number
}
export type IHrEmployeeProfileState = MeUserSelf

type EmploymentStatusUi = 'working' | 'resigned' | 'transferred'

const EMPLOYMENT_STATUS_OPTIONS: { value: EmploymentStatusUi; label: string }[] = [
  { value: 'working', label: 'Đang làm việc' },
  { value: 'transferred', label: 'Điều chuyển' },
  { value: 'resigned', label: 'Đã nghỉ' },
]

const ROLE_OPTIONS = Object.keys(ROLE_LABEL_VI) as Role[]

/** `role` được khai báo `string` (khớp `EmployeePatchKey`) — BE bỏ qua field này ở PATCH hr/:id,
 * đổi role thực tế đi qua `useUpdateEmployee` (PATCH /employees/:id), xem `onSaveProfile`. */
type EditRecord = Record<EmployeePatchKey, string> & {
  extraTeamIds: string[]
  employmentStatusUi: EmploymentStatusUi
}

/** Tải lên qua endpoint riêng — không gửi trong PATCH để khỏi ghi đè file vừa tải bằng giá trị cũ. */
const UPLOAD_MANAGED_KEYS: ReadonlySet<EmployeePatchKey> = new Set([
  'attachmentIdFront',
  'attachmentIdBack',
  'cvAttachmentRef',
])

/** Field chỉ HR thấy (ngày nghỉ việc) chèn vào layout dùng chung với "Hồ sơ của tôi". */
const HR_FORM_SECTIONS = USER_SELF_FORM_SECTIONS.map((section) => ({
  ...section,
  fields: section.fields.flatMap((field): UserSelfFieldSpec[] =>
    field.key === 'startDateWork'
      ? [field, { key: 'leaveDateWork', label: 'Ngày nghỉ việc' }]
      : [field]
  ),
}))

const fieldStackGap = 'gap-1'
const fieldBoxClass = ''

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
  if (summaryStatus) {
    if (summaryStatus === 'INACTIVE') return 'resigned'
    if (summaryStatus === 'TRANSFERRED') return 'transferred'
    return 'working'
  }
  if (isEmploymentTransferred(employee.employmentStatus)) return 'transferred'
  if (isEmploymentInactive(employee.employmentStatus)) return 'resigned'
  return 'working'
}

function canManageEmploymentStatusRole(role: string | null | undefined): boolean {
  return role === 'MANAGER' || role === 'HR'
}

function foldEmploymentStatusText(employmentStatus: string | null | undefined): string {
  return (employmentStatus ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
}

function isEmploymentInactive(employmentStatus: string | null | undefined): boolean {
  const raw = (employmentStatus ?? '').trim()
  if (!raw) return false
  const upper = raw.toUpperCase()
  if (upper === 'INACTIVE' || upper === 'TERMINATED') return true
  return /thoi viec|nghi viec|da nghi|inactive|ngung hoat dong|sa thai/.test(
    foldEmploymentStatusText(raw)
  )
}

function isEmploymentTransferred(employmentStatus: string | null | undefined): boolean {
  const raw = (employmentStatus ?? '').trim()
  if (!raw) return false
  if (raw.toUpperCase() === 'TRANSFERRED') return true
  return /dieu chuyen|transferred/.test(foldEmploymentStatusText(raw))
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

function RoleField({ control }: { control: Control<EditRecord> }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/30',
        fieldStackGap
      )}
    >
      <SelectController
        control={control}
        name="role"
        label="Vai trò hệ thống"
        placeholder="Chọn vai trò"
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>Vai trò hệ thống</FieldLabel>}
      >
        {ROLE_OPTIONS.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABEL_VI[r]}
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
        className={profilePrimaryActionClass}
      >
        {patchPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
        {patchPending ? 'Đang lưu…' : 'Lưu thay đổi'}
      </Button>
    </div>
  )
}

const Form = FormProvider

function userToEdit(
  u: IHrEmployeeProfileState,
  managers: Pick<EmployeeEntity, 'id' | 'name'>[] = []
): EditRecord {
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
  const resolvedManager = resolveDirectManagerFormValue(u.directManager, managers)
  r.directManager = resolvedManager === '__none' ? '' : resolvedManager
  r.extraTeamIds = u.extraTeamIds ?? u.teamIds?.slice(1) ?? []
  r.employmentStatusUi = resolveEmploymentStatusUi(u)
  r.role = toDisplayRole(u.role)
  return r
}

function toDisplayRole(role: string | null | undefined): Role {
  const value = role ?? 'MEMBER'
  if (value in ROLE_LABEL_VI) return value as Role
  return 'MEMBER'
}

function toPatch(
  edit: EditRecord,
  original: IHrEmployeeProfileState,
  managers: Pick<EmployeeEntity, 'id' | 'name'>[]
): EditEmployeeBody {
  const nz = (s: string) => (s.trim() === '' ? null : s.trim())
  const body = {} as EditEmployeeBody
  for (const k of EMPLOYEE_PATCH_KEYS) {
    if (UPLOAD_MANAGED_KEYS.has(k)) continue
    body[k] =
      k === 'directManager'
        ? directManagerIdToStoredName(edit.directManager, managers)
        : k === 'teamLeaderUserId' && edit[k] === TEAM_LEADER_NONE
          ? null
          : nz(edit[k] ?? '')
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

function employeeCodeInputRules(required: boolean, label: string) {
  if (!required) return undefined
  return {
    validate: (v: unknown) =>
      String(v ?? '').trim() !== '' || employeeCodeInputRequiredMessage(label),
  }
}

function ProfileReadonlyInfo({
  name,
  label,
  value,
  control,
  required = false,
}: {
  name: EmployeePatchKey
  label: string
  value: string
  control: ReturnType<typeof useForm<EditRecord>>['control']
  required?: boolean
}) {
  const rules = employeeCodeInputRules(required, label)
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
          rules={rules}
          type="text"
          autoComplete="off"
          className={cn('space-y-1.5', fieldBoxClass)}
          labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
          inputClassName={cn(fieldControlClass, inputEditable)}
          customLabel={<FieldLabel required={required}>{label}</FieldLabel>}
        />
      )}
    </div>
  )
}

/** Chỉ chặn khi HR đổi sang email sai định dạng — email cũ hỏng mà không đổi vẫn lưu được. */
function LoginEmailField({
  control,
  label,
  originalEmail,
}: {
  control: Control<EditRecord>
  label: string
  originalEmail: string | null
}) {
  const email = useWatch({ control, name: 'email' })
  return (
    <div className="space-y-1.5">
      <InputController
        control={control}
        name="email"
        label={label}
        type="email"
        autoComplete="off"
        rules={{
          validate: (v) => {
            const next = String(v ?? '').trim()
            if (next === (originalEmail ?? '').trim()) return true
            if (!next) return 'Email đăng nhập không được để trống'
            return LOGIN_EMAIL_FORMAT.test(next) || 'Email không đúng định dạng'
          },
        }}
        className="space-y-1.5"
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        inputClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>{label}</FieldLabel>}
      />
      <LoginEmailHint email={email} />
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
    directManagerOptions?: DirectManagerOption[]
    teamLeaderGroups?: TeamLeaderOptionGroup[]
    canEdit: boolean
    teamOptional: boolean
  }
) {
  const {
    employee,
    control,
    divisions,
    teams,
    positions,
    jobTitles,
    directManagerOptions,
    teamLeaderGroups,
    canEdit,
    teamOptional,
  } = ctx

  if (field.kind === 'portrait') {
    return null
  }

  const required = isEmployeeCodeInputField(field.key) && !(field.key === 'teamId' && teamOptional)
  const requiredRules = employeeCodeInputRules(required, field.label)

  if (field.key === 'directManager') {
    return (
      <SelectController
        key={field.key}
        control={control}
        name="directManager"
        label={field.label}
        placeholder="Chọn quản lý trực tiếp"
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      >
        <SelectItem value="__none">Chưa chọn</SelectItem>
        {(directManagerOptions ?? []).map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectController>
    )
  }

  if (field.kind === 'team-leader-select') {
    return (
      <SelectController
        key={field.key}
        control={control}
        name="teamLeaderUserId"
        label={field.label}
        placeholder="Chọn trưởng nhóm phụ trách"
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      >
        <SelectItem value={TEAM_LEADER_NONE}>Chưa chọn</SelectItem>
        {(teamLeaderGroups ?? []).map((g) => (
          <SelectGroup key={g.label}>
            <SelectLabel className="text-xs text-muted-foreground">{g.label}</SelectLabel>
            {g.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectController>
    )
  }

  if (field.key === 'attachmentIdFront' || field.key === 'attachmentIdBack') {
    return (
      <div
        key={field.key}
        className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/30"
      >
        <IdCardPhotoUploadField
          employeeId={employee.id}
          field={field.key}
          label={<FieldLabel>{field.label}</FieldLabel>}
          objectPath={employee[field.key]}
          canEdit={canEdit}
        />
      </div>
    )
  }

  if (field.key === 'email') {
    return (
      <LoginEmailField
        key={field.key}
        control={control}
        label={field.label}
        originalEmail={employee.email}
      />
    )
  }

  if (field.key === 'identityNumber') {
    return (
      <InputController
        key={field.key}
        control={control}
        name="identityNumber"
        label={field.label}
        rules={{
          validate: (v) => {
            const compact = compactIdentityNumber(String(v ?? ''))
            return !compact || IDENTITY_NUMBER_PATTERN.test(compact) || IDENTITY_NUMBER_MESSAGE
          },
        }}
        inputMode="numeric"
        autoComplete="off"
        placeholder="12 chữ số trên CCCD"
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        inputClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      />
    )
  }

  if (field.key === 'cvAttachmentRef') {
    return (
      <div
        key={field.key}
        className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/30"
      >
        <CvUploadField
          employeeId={employee.id}
          label={<FieldLabel>{field.label}</FieldLabel>}
          objectPath={employee.cvAttachmentRef}
          canEdit={canEdit}
        />
      </div>
    )
  }

  if (isWorkOrgReadonlyField(field.key)) {
    return (
      <ProfileReadonlyInfo
        name={field.key as EmployeePatchKey}
        key={field.key}
        label={field.label}
        value={workOrgReadonlyValue(employee, field.key)}
        control={control}
        required={required}
      />
    )
  }

  const key = field.key as EmployeePatchKey

  if (field.kind === 'card-status-select') {
    return (
      <SelectController
        key={field.key}
        control={control}
        name={key}
        label={field.label}
        placeholder="Chọn tình trạng cấp thẻ"
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      >
        <SelectItem value="__none">Chưa cập nhật</SelectItem>
        {EMPLOYEE_CARD_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {EMPLOYEE_CARD_STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectController>
    )
  }

  if (field.kind === 'card-color-select') {
    return (
      <EmployeeCardColorField
        key={field.key}
        control={control}
        name={key}
        label={field.label}
        savedColor={employee.employeeCardColor}
        canManage={canEdit}
      />
    )
  }

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
        rules={requiredRules}
        placeholder="Chọn nhóm"
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        triggerClassName={cn(fieldControlClass, inputEditable)}
        customLabel={<FieldLabel required={required}>{field.label}</FieldLabel>}
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
        rules={requiredRules}
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        datePickerClassName={cn(fieldControlClass, '[color-scheme:light]', inputEditable)}
        customLabel={<FieldLabel required={required}>{field.label}</FieldLabel>}
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
      rules={requiredRules}
      type="text"
      autoComplete="off"
      className={cn('space-y-1.5', fieldBoxClass)}
      labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
      inputClassName={cn(fieldControlClass, inputEditable)}
      customLabel={<FieldLabel required={required}>{field.label}</FieldLabel>}
    />
  )
}

function ProfileIdentityCard({
  control,
  u,
  role,
  currentLevelTitle,
  departmentDisplayName,
  portraitUploading,
  uploadDisabled = false,
  avatarUploadInputId,
  onPortraitFile,
  fallbackUserName,
  fallbackUserEmail,
}: {
  control: Control<EditRecord>
  u: MeUserSelf
  role: Role
  currentLevelTitle: string
  departmentDisplayName: string
  portraitUploading: boolean
  /** Khoá nút upload khi có thao tác khác đang chạy (không hiện overlay loading trên avatar). */
  uploadDisabled?: boolean
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
            disabled={portraitUploading || uploadDisabled}
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
              (portraitUploading || uploadDisabled) && 'pointer-events-none opacity-50'
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
            <span>{departmentDisplayName}</span>
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

export function HrEmployeeProfile({ employee }: HrEmployeeProfileProps) {
  const viewer = useAuthStore((s) => s.user)
  const { canId } = usePermission()
  const canDeactivate = canId('hr.employees.deactivate') || canId('hr.employees.edit')
  const canReactivate = canId('hr.employees.edit')
  const canEditEmployee = canId('hr.employees.edit')
  const canEditLoginCredential = canEditEmployee
  const canEditRole = canEditEmployee
  const { mutate: patchUser, isPending: patchPending } = useUpdateEmployeeById()
  const { data: employeeSummary, isLoading: summaryLoading } = useEmployee(employee.id)
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
  const { data: directManagersData } = useDirectManagerOptions()
  const managers = useMemo(() => directManagersData?.data ?? [], [directManagersData])
  const directManagerOptions = useMemo(
    () => buildDirectManagerSelectOptions(managers, employee.id, employee.directManager),
    [managers, employee.id, employee.directManager]
  )
  const { data: teamLeadersData } = useTeamLeaderOptions()
  const teamLeaderGroups = useMemo(
    () =>
      buildTeamLeaderOptionGroups(teamLeadersData?.data ?? [], {
        employeeId: employee.id,
        employeeTeamName: employee.teamGroup,
        current: employee.teamLeader,
      }),
    [teamLeadersData, employee.id, employee.teamGroup, employee.teamLeader]
  )
  const form = useForm<EditRecord>({
    defaultValues: userToEdit(employee, managers),
  })
  const { control, handleSubmit, reset, setValue } = form
  const selectedTeamId = useWatch({ control, name: 'teamId' }) ?? ''
  const selectedDivisionId = useWatch({ control, name: 'divisionId' }) ?? ''
  const selectedRole = useWatch({ control, name: 'role' })
  const prevDivisionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevDivisionIdRef.current === null) {
      prevDivisionIdRef.current = selectedDivisionId
      return
    }
    if (prevDivisionIdRef.current !== selectedDivisionId) {
      setValue('teamId', '')
      setValue('extraTeamIds', [])
      prevDivisionIdRef.current = selectedDivisionId
    }
  }, [selectedDivisionId, setValue])

  useEffect(() => {
    reset({
      ...userToEdit(employee, managers),
      employmentStatusUi: resolveEmploymentStatusUi(employee, employeeSummary?.status),
      role: toDisplayRole(employeeSummary?.role ?? employee.role),
    })
    prevDivisionIdRef.current = employee.divisionId?.trim() ?? ''
  }, [employee, employeeSummary?.status, employeeSummary?.role, managers, reset])

  const divisions = useMemo(
    () => divisionsList.map((d) => ({ id: d.id, name: d.name })),
    [divisionsList]
  )
  const teams = useMemo(() => {
    const divisionId = selectedDivisionId.trim()
    const mapped = teamsList.map((t) => ({
      id: t.id,
      name: t.name,
      teamGroupId: t.teamGroupId,
    }))
    if (!divisionId) return mapped.map(({ id, name }) => ({ id, name }))
    return mapped.filter((t) => t.teamGroupId === divisionId).map(({ id, name }) => ({ id, name }))
  }, [teamsList, selectedDivisionId])
  const allTeamOptions = useMemo(
    () => teamsList.map((t) => ({ value: t.id, label: t.name })),
    [teamsList]
  )
  const departmentDisplayName = useMemo(() => {
    const divisionId = selectedDivisionId.trim()
    if (divisionId) {
      return divisions.find((d) => d.id === divisionId)?.name ?? '—'
    }
    return employee.departmentName?.trim() || '—'
  }, [selectedDivisionId, divisions, employee.departmentName])
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

  const canManageEmploymentStatus = canManageEmploymentStatusRole(viewer?.role)
  const employeeRole = toDisplayRole(employeeSummary?.role ?? employee.role)
  const currentLevelId = employeeSummary?.currentLevel ?? 'tap_su'
  const currentLevelTitle = employeeSummary
    ? levelPillText(employeeSummary.currentLevel)
    : summaryLoading
      ? '…'
      : '—'
  const onPortraitFile = (file: File) => {
    uploadPortrait(file, {
      onSuccess: (res) => {
        toast.success('Đã cập nhật ảnh đại diện')
        setValue('portraitRef', res.portraitRef)
        if (viewer) {
          useAuthStore.getState().setUser({
            ...viewer,
            portraitRef: res.portraitRef,
          })
        }
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    })
  }

  const workSection = HR_FORM_SECTIONS[0]!
  const isSyncedWorkField = (key: MeUserDisplayKey) =>
    isWorkOrgReadonlyField(key) || key === 'directManager' || key === 'teamLeaderUserId'
  const workReadonlyFields = workSection.fields.filter((field) => isSyncedWorkField(field.key))
  const workEditableFields = workSection.fields.filter((field) => !isSyncedWorkField(field.key))
  const detailSections = HR_FORM_SECTIONS.slice(1)
  const initialEmploymentStatusUi = resolveEmploymentStatusUi(employee, employeeSummary?.status)
  const onSaveProfile = handleSubmit((values) => {
    const profilePatch = toPatch(values, employee, managers) as unknown as IHrEmployeeProfileState
    const statusChanged =
      canManageEmploymentStatus && values.employmentStatusUi !== initialEmploymentStatusUi
    const roleChanged = canEditRole && values.role !== employeeRole

    const applyOrgChanges = () => {
      if (statusChanged && values.employmentStatusUi === 'resigned') {
        deactivate.mutate(employee.id)
      }
      const orgPatch: PatchEmployeeInput = {}
      if (statusChanged && values.employmentStatusUi !== 'resigned') {
        orgPatch.status = values.employmentStatusUi === 'transferred' ? 'TRANSFERRED' : 'ACTIVE'
      }
      if (roleChanged) {
        orgPatch.role = toDisplayRole(values.role)
      }
      if (Object.keys(orgPatch).length > 0) {
        updateEmployee.mutate({ id: employee.id, patch: orgPatch })
      }
    }

    patchUser({ id: employee.id, patch: profilePatch }, { onSuccess: applyOrgChanges })
  })

  const isInactive = employeeSummary
    ? employeeSummary.status === 'INACTIVE'
    : isEmploymentInactive(employee.employmentStatus)
  /** Khoá mọi nút hành động khi có bất kỳ thao tác nào đang chạy (lưu, upload ảnh, mở tài liệu…). */
  const anyActionPending = useAnyActionPending()
  const isSaving =
    patchPending || deactivate.isPending || updateEmployee.isPending || anyActionPending

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
    directManagerOptions,
    teamLeaderGroups,
    canEdit: canEditEmployee,
    teamOptional: roleMayHaveNoTeam(selectedRole),
  }
  const avatarUploadInputId = useId()
  return (
    <Form {...form}>
      <ProfilePageShell current={employee.fullNameLegal} data-current-level-id={currentLevelId}>
        <ProfileHeroCard>
          <ProfileIdentityCard
            control={control}
            u={employee}
            role={employeeRole}
            currentLevelTitle={currentLevelTitle}
            departmentDisplayName={departmentDisplayName}
            portraitUploading={portraitUploading}
            uploadDisabled={anyActionPending}
            avatarUploadInputId={avatarUploadInputId}
            onPortraitFile={onPortraitFile}
            fallbackUserName={employee.displayName ?? employee.fullNameLegal ?? ''}
            fallbackUserEmail={employee.email ?? ''}
          />
        </ProfileHeroCard>

        <EmployeeProjectsCard employeeId={employee.id} canEdit={canEditEmployee} />

        <EmployeeLoginCredentialCard employeeId={employee.id} canEdit={canEditLoginCredential} />

        <ProfileDetailsCard>
          <ProfileDetailSection title={workSection.title} index={0}>
            {workReadonlyFields.length > 0 ? (
              <ProfileFieldGroup caption="Thông tin đồng bộ" tone="primary">
                {workReadonlyFields.flatMap((f) =>
                  f.key === 'startDateWork'
                    ? [
                        renderField(f, fieldCtx),
                        <EmployeeOrderNumberField key="orderNumber" employeeId={employee.id} />,
                      ]
                    : [renderField(f, fieldCtx)]
                )}
                {canManageEmploymentStatus ? <EmploymentStatusField control={control} /> : null}
                {canEditRole ? <RoleField control={control} /> : null}
              </ProfileFieldGroup>
            ) : null}
            {workEditableFields.length > 0 ? (
              <ProfileFieldGroup caption="Thông tin có thể cập nhật" divided>
                {workEditableFields.map((f) => renderField(f, fieldCtx))}
                <div className="sm:col-span-2">
                  <EmployeeExtraTeamsField
                    control={control}
                    name="extraTeamIds"
                    primaryTeamId={selectedTeamId}
                    allTeams={allTeamOptions}
                  />
                  <OrgChangeHistory employeeId={employee.id} />
                </div>
              </ProfileFieldGroup>
            ) : null}
          </ProfileDetailSection>

          {detailSections.map((section, idx) => (
            <ProfileDetailSection key={section.title} title={section.title} index={idx + 1}>
              <ProfileFieldGrid>
                {section.fields.map((f) => renderField(f, fieldCtx))}
              </ProfileFieldGrid>
            </ProfileDetailSection>
          ))}
        </ProfileDetailsCard>
      </ProfilePageShell>

      <ProfileStickyActionBar ariaLabel="Thao tác hồ sơ">
        <ProfileActionButtons {...accountActions} />
      </ProfileStickyActionBar>

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
