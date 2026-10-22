import { useEffect, useId, useMemo, useRef, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FormProvider, useForm, useWatch, type Control } from 'react-hook-form'
import { toast } from 'sonner'
import { Building2, RefreshCw, Upload } from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { type PatchMeUserBody, usePatchMeUser, useUploadMePortrait } from '@/features/profile/hooks'
import { profileApi } from '@/features/profile/api'
import { organizationApi } from '@/features/organization/api'
import {
  EmployeeExtraTeamsField,
  extraTeamIdsEqual,
} from '@/features/hr-admin/components/EmployeeExtraTeamsField'
import { MyCvUploadField } from '@/features/hr-admin/components/CvAttachmentField'
import { EmployeeCardColorLabel } from '@/features/hr-admin/components/EmployeeCard'
import { employeeCardStatusLabel } from '@/features/hr-admin/employeeCard'
import { MyIdCardPhotoUploadField } from '@/features/hr-admin/components/IdCardPhotoField'
import {
  FieldLabel,
  ProfileDateField,
  ProfileDetailSection,
  ProfileDetailsCard,
  ProfileFieldGrid,
  ProfileFieldGroup,
  ProfileHeroCard,
  ProfileInputField,
  ProfileReadonlyField,
  ProfileSelectField,
  ProfileStickyActionBar,
  ProfileTextareaField,
  profileFieldBoxClass,
  profilePrimaryActionClass,
} from '@/features/hr-admin/components/HrEmployeeProfile/profileFormLayout'
import {
  IDENTITY_NUMBER_MESSAGE,
  IDENTITY_NUMBER_PATTERN,
  compactIdentityNumber,
} from '@/features/hr-admin/schemas'
import type { MyProfilePage } from '@/features/profile/types'
import {
  formatUserDateForReadonlyDisplay,
  parseStoredDateToInputValue,
} from '@/features/profile/profileDateUtils'
import type {
  MeUserDisplayKey,
  MeUserPatchKey,
  MeUserSelf,
} from '@/features/profile/userSelf.types'
import { ME_USER_PATCH_KEYS } from '@/features/profile/userSelf.types'
import {
  USER_SELF_FORM_SECTIONS,
  USER_WORK_ORG_READONLY_KEYS,
  employeeCodeInputRequiredMessage,
  isDateFormField,
  isEmployeeCodeInputField,
  roleMayHaveNoTeam,
  type UserSelfFieldSpec,
} from '@/features/profile/userSelfFormLayout'

import { teamLeaderDisplayName } from '@/features/hr-admin/teamLeaderOptions'

export interface MyProfileScreenProps {
  page: MyProfilePage | undefined
  isLoading: boolean
}

/** Chỉ HR sửa. */
const SELF_READONLY_KEYS: ReadonlySet<MeUserDisplayKey> = new Set<MeUserDisplayKey>([
  ...USER_WORK_ORG_READONLY_KEYS,
  'employeeIdentifier',
  'directManager',
  'teamLeaderUserId',
  'email',
  'profileReviewDate',
  'employeeCardStatus',
  'employeeCardColorId',
])

/** Lưu qua endpoint riêng — không gửi trong PATCH hồ sơ. */
const UPLOAD_MANAGED_KEYS: ReadonlySet<MeUserPatchKey> = new Set<MeUserPatchKey>([
  'portraitRef',
  'attachmentIdFront',
  'attachmentIdBack',
  'cvAttachmentRef',
])

function isSelfReadonly(key: MeUserDisplayKey): boolean {
  return SELF_READONLY_KEYS.has(key)
}

function readonlyValue(u: MeUserSelf, key: MeUserDisplayKey): ReactNode {
  if (key === 'employeeCardStatus') return employeeCardStatusLabel(u.employeeCardStatus)
  if (key === 'employeeCardColorId') {
    return u.employeeCardColor ? <EmployeeCardColorLabel color={u.employeeCardColor} /> : ''
  }
  if (key === 'teamLeaderUserId') return teamLeaderDisplayName(u.teamLeader)
  if (key === 'startDateWork' || key === 'profileReviewDate') {
    return formatUserDateForReadonlyDisplay(u[key])
  }
  const v = u[key]
  return v == null ? '' : String(v)
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

type EditRecord = Record<MeUserPatchKey, string> & { extraTeamIds: string[] }

function userToEdit(u: MeUserSelf): EditRecord {
  const r = {
    ...(Object.fromEntries(ME_USER_PATCH_KEYS.map((k) => [k, ''])) as Record<
      MeUserPatchKey,
      string
    >),
    extraTeamIds: u.extraTeamIds ?? u.teamIds?.slice(1) ?? [],
  }
  for (const k of ME_USER_PATCH_KEYS) {
    r[k] = isDateFormField(k) ? parseStoredDateToInputValue(u[k]) : u[k] == null ? '' : String(u[k])
  }
  return r
}

/** Chỉ gửi field đã đổi — tránh ghi đè giá trị cũ không parse được (vd. ngày lạ từ Lark). */
function toPatch(edit: EditRecord, initial: EditRecord): PatchMeUserBody {
  const body: PatchMeUserBody = {}
  for (const k of ME_USER_PATCH_KEYS) {
    if (isSelfReadonly(k) || UPLOAD_MANAGED_KEYS.has(k)) continue
    const next = (edit[k] ?? '').trim()
    if (next === (initial[k] ?? '').trim()) continue
    body[k] = next === '' ? null : next
  }
  if (!extraTeamIdsEqual(edit.extraTeamIds ?? [], initial.extraTeamIds)) {
    body.extraTeamIds = edit.extraTeamIds ?? []
  }
  return body
}

function validatePhone(v: string): true | string {
  const s = v.trim()
  if (!s) return true
  const digits = s.replace(/\D/g, '').length
  return (digits >= 8 && digits <= 15) || 'Số điện thoại cần 8–15 chữ số'
}

function validateBirthDate(v: string): true | string {
  if (!v) return true
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return new Date(`${v}T12:00:00`) <= end || 'Ngày sinh không được sau hôm nay'
}

function validateIdentityNumber(v: string): true | string {
  const compact = compactIdentityNumber(v)
  return !compact || IDENTITY_NUMBER_PATTERN.test(compact) || IDENTITY_NUMBER_MESSAGE
}

type FieldCtx = {
  u: MeUserSelf
  control: Control<EditRecord>
  divisions: Array<{ value: string; label: string }>
  teams: Array<{ value: string; label: string }>
  jobTitles: Array<{ value: string; label: string }>
}

function renderField(field: UserSelfFieldSpec, ctx: FieldCtx): ReactNode {
  const { u, control, divisions, teams, jobTitles } = ctx

  if (field.kind === 'portrait') return null

  if (isSelfReadonly(field.key)) {
    return (
      <ProfileReadonlyField
        key={field.key}
        label={field.label}
        value={readonlyValue(u, field.key)}
      />
    )
  }

  if (field.key === 'attachmentIdFront' || field.key === 'attachmentIdBack') {
    return (
      <div key={field.key} className={profileFieldBoxClass}>
        <MyIdCardPhotoUploadField
          field={field.key}
          label={<FieldLabel>{field.label}</FieldLabel>}
          objectPath={u[field.key]}
        />
      </div>
    )
  }

  if (field.key === 'cvAttachmentRef') {
    return (
      <div key={field.key} className={profileFieldBoxClass}>
        <MyCvUploadField
          label={<FieldLabel>{field.label}</FieldLabel>}
          objectPath={u.cvAttachmentRef}
        />
      </div>
    )
  }

  const key = field.key as MeUserPatchKey

  /** Chỉ chặn xoá trống; hồ sơ cũ đang trống vẫn lưu được các field khác. */
  const required =
    isEmployeeCodeInputField(field.key) && !(field.key === 'teamId' && roleMayHaveNoTeam(u.role))
  const keepFilled = (v: string) =>
    !required ||
    String(v ?? '').trim() !== '' ||
    String(u[field.key] ?? '').trim() === '' ||
    employeeCodeInputRequiredMessage(field.label)

  if (field.kind === 'division-select' || field.kind === 'team-select') {
    const options = field.kind === 'division-select' ? divisions : teams
    return (
      <ProfileSelectField
        key={key}
        control={control}
        name={key}
        label={field.label}
        required={required}
        rules={required ? { validate: keepFilled } : undefined}
        placeholder={field.kind === 'division-select' ? 'Chọn phòng ban' : 'Chọn nhóm'}
      >
        <SelectItem value="__none">Chưa chọn</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </ProfileSelectField>
    )
  }

  if (field.kind === 'job-title-select') {
    return (
      <ProfileSelectField
        key={key}
        control={control}
        name={key}
        label={field.label}
        placeholder="Chọn vị trí chuyên môn"
      >
        {jobTitles.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </ProfileSelectField>
    )
  }

  if (isDateFormField(field.key)) {
    return (
      <ProfileDateField
        key={key}
        control={control}
        name={key}
        label={field.label}
        required={required}
        rules={
          key === 'birthDate'
            ? { validate: { notFuture: validateBirthDate, keepFilled } }
            : undefined
        }
      />
    )
  }

  if (field.multiline) {
    return <ProfileTextareaField key={key} control={control} name={key} label={field.label} />
  }

  if (key === 'identityNumber') {
    return (
      <ProfileInputField
        key={key}
        control={control}
        name={key}
        label={field.label}
        rules={{ validate: validateIdentityNumber }}
        inputMode="numeric"
        placeholder="12 chữ số trên CCCD"
      />
    )
  }

  if (key === 'phonePrimary') {
    return (
      <ProfileInputField
        key={key}
        control={control}
        name={key}
        label={field.label}
        rules={{ validate: validatePhone }}
        inputMode="tel"
        placeholder="09xx xxx xxx"
      />
    )
  }

  if (key === 'fullNameLegal') {
    return (
      <ProfileInputField
        key={key}
        control={control}
        name={key}
        label={field.label}
        placeholder="Nhập họ và tên…"
        rules={{
          validate: (v) => {
            const s = v.trim()
            if (!s) return u.fullNameLegal?.trim() ? 'Họ và tên không được để trống' : true
            return s.length >= 2 || 'Họ tên cần ít nhất 2 ký tự'
          },
        }}
      />
    )
  }

  return (
    <ProfileInputField
      key={key}
      control={control}
      name={key}
      label={field.label}
      required={required}
      rules={required ? { validate: keepFilled } : undefined}
    />
  )
}

function ProfileIdentityCard({
  control,
  u,
  role,
  currentLevelTitle,
  departmentName,
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
  departmentName: string
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
            <span>{departmentName}</span>
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

function MyProfileScreenLoaded({ page, u }: { page: MyProfilePage; u: MeUserSelf }) {
  const user = useAuthStore((s) => s.user)
  const formId = useId()
  const avatarUploadInputId = useId()
  const { mutate: patchUser, isPending: patchPending } = usePatchMeUser()
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
  const { data: jobTitlesData } = useQuery({
    queryKey: ['profile', 'job-titles'],
    queryFn: () => profileApi.getJobTitles(),
  })

  const initialValues = useMemo(() => userToEdit(u), [u])
  const form = useForm<EditRecord>({ defaultValues: initialValues })
  const { control, handleSubmit, getValues, setValue } = form
  const selectedTeamId = useWatch({ control, name: 'teamId' }) ?? ''
  const selectedDivisionId = useWatch({ control, name: 'divisionId' }) ?? ''

  const divisions = useMemo(
    () => divisionsList.map((d) => ({ value: d.id, label: d.name })),
    [divisionsList]
  )
  const teams = useMemo(() => {
    const divisionId = selectedDivisionId.trim()
    return teamsList
      .filter((t) => !divisionId || t.teamGroupId === divisionId)
      .map((t) => ({ value: t.id, label: t.name }))
  }, [teamsList, selectedDivisionId])
  const allTeamOptions = useMemo(
    () => teamsList.map((t) => ({ value: t.id, label: t.name })),
    [teamsList]
  )
  const jobTitles = useMemo(() => jobTitlesData ?? [], [jobTitlesData])

  const prevDivisionIdRef = useRef(selectedDivisionId)
  useEffect(() => {
    if (prevDivisionIdRef.current === selectedDivisionId) return
    prevDivisionIdRef.current = selectedDivisionId
    const teamId = getValues('teamId')
    if (teamId && teamsList.length > 0 && !teams.some((t) => t.value === teamId)) {
      setValue('teamId', '', { shouldDirty: true })
    }
  }, [selectedDivisionId, teams, teamsList.length, getValues, setValue])

  const departmentName =
    divisions.find((d) => d.value === selectedDivisionId)?.label ??
    (u.departmentName?.trim() || '—')

  const role = user?.role ?? 'MEMBER'
  const currentLevelId = mapCurrentTitleToLevelId(page.currentLevel.title)
  const onPortraitFile = (file: File) => {
    uploadPortrait(file, {
      onSuccess: (res) => {
        toast.success('Đã cập nhật ảnh đại diện')
        setValue('portraitRef', res.portraitRef)
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

  const [workSection, ...detailSections] = USER_SELF_FORM_SECTIONS
  const workReadonlyFields = workSection!.fields.filter((f) => isSelfReadonly(f.key))
  const workEditableFields = workSection!.fields.filter((f) => !isSelfReadonly(f.key))

  const onSubmit = handleSubmit(
    (values) => {
      const body = toPatch(values, initialValues)
      if (Object.keys(body).length === 0) {
        toast.info('Chưa có thay đổi nào để lưu')
        return
      }
      patchUser(body, {
        onSuccess: () => {
          form.reset(values)
          toast.success('Đã lưu hồ sơ')
          if (user) {
            const primary = values.teamId?.trim() || null
            const teamIds = primary
              ? [primary, ...(values.extraTeamIds ?? []).filter((id) => id !== primary)]
              : [...(values.extraTeamIds ?? [])]
            useAuthStore.getState().setUser({
              ...user,
              name: values.displayName.trim() || values.fullNameLegal.trim() || user.name,
              teamIds,
            })
          }
        },
        onError: (err) => toast.error(getApiErrorMessage(err) || 'Không lưu được. Thử lại sau.'),
      })
    },
    () => toast.error('Vui lòng kiểm tra lại các trường được đánh dấu')
  )

  const fieldCtx: FieldCtx = { u, control, divisions, teams, jobTitles }

  return (
    <FormProvider {...form}>
      <form id={formId} onSubmit={onSubmit} noValidate>
        <div
          className="relative -m-5 min-h-[calc(100vh-3rem)] bg-slate-50/50 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-6 text-foreground md:-m-6 md:pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:-m-8 dark:bg-slate-950"
          data-current-level-id={currentLevelId}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-20 -top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute bottom-8 left-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
          </div>

          <div className="mx-auto w-full px-4 md:px-6">
            <div className="mb-4 border-none bg-[#005236] p-8 text-white rounded-3xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col gap-4">
                <div className="min-w-0">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
                    Hồ sơ cá nhân
                  </h1>
                  <p className="text-blue-50/80 max-w-2xl font-medium">
                    Cập nhật thông tin cá nhân của bạn. Các mục do HR quản lý chỉ hiển thị để xem.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <ProfileHeroCard>
                <ProfileIdentityCard
                  control={control}
                  u={u}
                  role={role}
                  currentLevelTitle={page.currentLevel.title}
                  departmentName={departmentName}
                  portraitUploading={portraitUploading}
                  avatarUploadInputId={avatarUploadInputId}
                  onPortraitFile={onPortraitFile}
                  fallbackUserName={user?.name ?? ''}
                  fallbackUserEmail={user?.email ?? ''}
                />
              </ProfileHeroCard>

              <ProfileDetailsCard>
                <ProfileDetailSection title={workSection!.title} index={0}>
                  <ProfileFieldGroup caption="Thông tin do HR quản lý (chỉ xem)" tone="primary">
                    {workReadonlyFields.map((f) => renderField(f, fieldCtx))}
                  </ProfileFieldGroup>
                  <ProfileFieldGroup caption="Thông tin có thể cập nhật" divided>
                    {workEditableFields.map((f) => renderField(f, fieldCtx))}
                    <div className="sm:col-span-2">
                      <EmployeeExtraTeamsField
                        control={control}
                        name="extraTeamIds"
                        primaryTeamId={selectedTeamId}
                        allTeams={allTeamOptions}
                      />
                    </div>
                  </ProfileFieldGroup>
                </ProfileDetailSection>

                {detailSections.map((section, idx) => (
                  <ProfileDetailSection key={section.title} title={section.title} index={idx + 1}>
                    <ProfileFieldGrid>
                      {section.fields.map((f) => renderField(f, fieldCtx))}
                    </ProfileFieldGrid>
                  </ProfileDetailSection>
                ))}
              </ProfileDetailsCard>
            </div>
          </div>
        </div>
      </form>

      <ProfileStickyActionBar ariaLabel="Lưu hồ sơ">
        <div className="flex w-full justify-stretch sm:justify-end">
          {/* Portal nằm ngoài <form> — gắn nút bằng thuộc tính `form`. */}
          <Button
            type="submit"
            form={formId}
            disabled={patchPending}
            className={profilePrimaryActionClass}
          >
            {patchPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            {patchPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </div>
      </ProfileStickyActionBar>
    </FormProvider>
  )
}

export function MyProfileScreen({ page, isLoading }: MyProfileScreenProps) {
  const u = page?.userRecord

  if (isLoading || !page || !u) {
    return (
      <div className="-m-5 flex min-h-[calc(100vh-3rem)] items-center justify-center bg-slate-50/50 p-8 text-muted-foreground md:-m-6 lg:-m-8">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
            <span className="font-bold tracking-wide text-xs uppercase">Đang tải hồ sơ…</span>
          </div>
        ) : (
          'Không có dữ liệu'
        )}
      </div>
    )
  }

  return <MyProfileScreenLoaded key={`${u.id}-${u.updatedAt}`} page={page} u={u} />
}
