import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckboxController } from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
import { EmployeeExtraTeamsField } from '@/features/hr-admin/components/EmployeeExtraTeamsField'
import { ProjectFormDialog } from '@/features/hr-admin/components/EmployeeProjects'
import { levelPillText } from '@/features/hr-admin/components/HrEmployeeList/employeeListUtils'
import {
  FieldLabel,
  ProfileCard,
  ProfileDateField,
  ProfileDetailSection,
  ProfileDetailsCard,
  ProfileFieldGrid,
  ProfileFieldGroup,
  ProfileHeroCard,
  ProfileInputField,
  ProfilePageShell,
  ProfileSelectField,
  ProfileStickyActionBar,
  ProfileTextareaField,
  profileFieldBoxClass,
  profilePrimaryActionClass,
} from '@/features/hr-admin/components/HrEmployeeProfile/profileFormLayout'
import { CvPickerField } from '@/features/hr-admin/components/CvAttachmentField'
import { IdCardPhotoPickerField } from '@/features/hr-admin/components/IdCardPhotoField'
import { LoginEmailHint } from '@/features/hr-admin/components/LoginEmailHint'
import { buildDirectManagerSelectOptions } from '@/features/hr-admin/directManagerOptions'
import { useAnyActionPending, useDirectManagerOptions } from '@/features/hr-admin/hooks'
import { useProjects } from '@/features/hr-admin/projectHooks'
import type { CreateEmployeeForm } from '@/features/hr-admin/schemas'
import { teamPositionOptions } from '@/features/hr-admin/teamPositionOptions'
import { useHrOrgSelectOptions } from '@/features/hr-admin/useHrOrgTree'
import { profileApi } from '@/features/profile/api'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Building2, FolderKanban, KeyRound, Plus, RefreshCw, UserRound } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { FormProvider, useWatch, type Control, type UseFormReturn } from 'react-hook-form'

const ROLE_OPTIONS: { value: CreateEmployeeForm['role']; label: string }[] = [
  { value: 'MEMBER', label: 'Nhân viên' },
  { value: 'LEADER', label: 'Leader' },
  { value: 'MANAGER', label: 'Quản lý' },
  { value: 'HR', label: 'HR' },
  { value: 'BOD', label: 'BOD' },
]

const LEVEL_OPTIONS: { value: CreateEmployeeForm['initialLevel']; label: string }[] = [
  { value: 'tap_su', label: 'Tập sự (mặc định)' },
  { value: 'biet_viec', label: 'Biết việc' },
]

export interface EmployeeFormProps {
  form: UseFormReturn<CreateEmployeeForm>
  onSubmit: (values: CreateEmployeeForm) => void
  isSubmitting?: boolean
}

function NewEmployeeIdentityCard({
  control,
  departmentName,
}: {
  control: Control<CreateEmployeeForm>
  departmentName: string
}) {
  const [name, displayName, email, role, initialLevel] = useWatch({
    control,
    name: ['name', 'displayName', 'email', 'role', 'initialLevel'],
  })
  const typedName = displayName?.trim() || name?.trim() || ''
  const shownName = typedName || 'Nhân sự mới'
  const initials = typedName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(-2)
    .toUpperCase()

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-gradient-to-br from-game-soft to-[hsl(248_90%_92%)] text-3xl font-bold text-game-soft-foreground shadow-xl md:h-28 md:w-28 dark:border-slate-800">
        {initials || <UserRound className="h-10 w-10" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {shownName}
          </h2>
          <p className="text-sm font-medium text-slate-500">
            {email?.trim() || 'Chưa nhập email đăng nhập'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="h-6 border-indigo-400/30 bg-indigo-500/10 px-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300"
          >
            {ROLE_LABEL_VI[role] ?? role}
          </Badge>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Building2 className="h-3 w-3" />
            <span>{departmentName}</span>
          </div>
          <Badge
            variant="outline"
            className="h-6 border-fuchsia-400/30 bg-fuchsia-500/10 px-2 text-xs font-semibold uppercase tracking-wide text-fuchsia-600 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/30 dark:text-fuchsia-300"
          >
            Cấp độ: {levelPillText(initialLevel)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Ảnh đại diện và tài khoản đăng nhập cập nhật trong hồ sơ sau khi tạo.
        </p>
      </div>
    </div>
  )
}

export function EmployeeForm({ form, onSubmit, isSubmitting }: EmployeeFormProps) {
  const navigate = useNavigate()
  const formId = useId()
  const anyActionPending = useAnyActionPending()
  const { handleSubmit, control, setValue, getValues } = form
  const { departments, teamsByDept, allTeams } = useHrOrgSelectOptions()
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const { data: projects } = useProjects()
  const projectOptions = useMemo(
    () =>
      (projects ?? [])
        .filter((p) => p.status !== 'COMPLETED')
        .map((p) => ({ value: p.id, label: p.name })),
    [projects]
  )
  const departmentId = useWatch({ control, name: 'departmentId' })
  const teamId = useWatch({ control, name: 'teamId' })
  const email = useWatch({ control, name: 'email' })
  const isBod = useWatch({ control, name: 'role' }) === 'BOD'
  useEffect(() => {
    if (!isBod) return
    setValue('teamId', '')
    setValue('extraTeamIds', [])
  }, [isBod, setValue])
  const teamOptions =
    (departmentId && teamsByDept.get(departmentId)?.length
      ? teamsByDept.get(departmentId)
      : allTeams) ?? allTeams
  const departmentName = departments.find((d) => d.value === departmentId)?.label ?? '—'

  const { data: directManagersData } = useDirectManagerOptions()
  const managers = useMemo(() => directManagersData?.data ?? [], [directManagersData])
  const directManagerOptions = useMemo(
    () => buildDirectManagerSelectOptions(managers, '', ''),
    [managers]
  )
  const { data: jobTitlesData } = useQuery({
    queryKey: ['profile', 'job-titles'],
    queryFn: () => profileApi.getJobTitles(),
  })
  const jobTitles = jobTitlesData ?? []

  const backToList = () => void navigate({ to: '/hr-admin', search: { page: 1, pageSize: 15 } })

  return (
    <FormProvider {...form}>
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate>
        <ProfilePageShell current="Thêm nhân sự mới">
          <ProfileHeroCard>
            <NewEmployeeIdentityCard control={control} departmentName={departmentName} />
          </ProfileHeroCard>

          <ProfileCard
            icon={<FolderKanban className="h-5 w-5" aria-hidden />}
            title="Dự án tham gia"
            description="Ngày tham gia mặc định là ngày bắt đầu làm việc; sửa chi tiết sau trong hồ sơ."
            action={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setCreateProjectOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Thêm dự án mới
              </Button>
            }
          >
            <EmployeeExtraTeamsField
              control={control}
              name="projectIds"
              primaryTeamId=""
              allTeams={projectOptions}
              label="Dự án được gán"
              description=""
              pickPlaceholder="Chọn dự án để gán"
              addLabel="Gán dự án"
              emptyText="Chưa gán dự án nào."
            />
          </ProfileCard>

          <ProfileCard
            icon={<KeyRound className="h-5 w-5" aria-hidden />}
            title="Tài khoản đăng nhập"
            description="Mặc định nhân sự đăng nhập bằng Google với email bên dưới. Chỉ đặt username + mật khẩu nếu người này không dùng Google."
          >
            <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
              <ProfileInputField
                control={control}
                name="loginUsername"
                label="Username"
                placeholder="Bỏ trống nếu dùng Google"
                autoComplete="off"
              />
              <ProfileInputField
                control={control}
                name="loginPassword"
                label="Mật khẩu"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Mật khẩu không được gửi qua email — HR tự báo cho nhân sự. Có thể đổi sau trong hồ sơ.
            </p>
          </ProfileCard>

          <ProfileDetailsCard>
            <ProfileDetailSection title="Công việc & tổ chức" index={0}>
              <ProfileFieldGroup caption="Vai trò & thời gian làm việc" tone="primary">
                <ProfileSelectField control={control} name="role" label="Vai trò hệ thống" required>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </ProfileSelectField>
                <ProfileSelectField control={control} name="initialLevel" label="Cấp độ ban đầu">
                  {LEVEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </ProfileSelectField>
                <ProfileDateField
                  control={control}
                  name="startDate"
                  label="Ngày bắt đầu làm việc"
                  required
                />
                <ProfileDateField control={control} name="leaveDate" label="Ngày nghỉ việc" />
                <ProfileInputField
                  control={control}
                  name="managerBlockCode"
                  label="Mã khối theo quản lý"
                  required
                />
                {isBod ? (
                  <div className="space-y-1">
                    <ProfileInputField
                      control={control}
                      name="employeeCodePrimary"
                      label="Mã nhân viên"
                      required
                      inputMode="numeric"
                      placeholder="VD: 10219942500"
                    />
                    <p className="px-1 text-xs text-muted-foreground">
                      BOD không thuộc nhóm nên mã không tự sinh — nhập theo công thức, STT nhóm dùng
                      00.
                    </p>
                  </div>
                ) : (
                  <div className={profileFieldBoxClass}>
                    <FieldLabel>Mã nhân viên</FieldLabel>
                    <p className="text-sm text-slate-500">
                      Tự sinh khi tạo — từ mã khối, ngày vào làm, năm sinh, quê quán và nhóm.
                    </p>
                  </div>
                )}
                <ProfileInputField
                  control={control}
                  name="employeeIdentifier"
                  label="Mã định danh NV"
                  placeholder="VD: A755"
                  autoComplete="off"
                />
              </ProfileFieldGroup>

              <ProfileFieldGroup caption="Phân công tổ chức" divided>
                <ProfileSelectField
                  control={control}
                  name="departmentId"
                  label="Phòng ban"
                  required
                >
                  {departments.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </ProfileSelectField>
                {isBod ? (
                  <div className={profileFieldBoxClass}>
                    <FieldLabel>Nhóm (theo phòng ban)</FieldLabel>
                    <p className="text-sm text-slate-500">BOD không thuộc nhóm nào.</p>
                  </div>
                ) : (
                  <ProfileSelectField
                    control={control}
                    name="teamId"
                    label="Nhóm (theo phòng ban)"
                    required
                  >
                    {teamOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </ProfileSelectField>
                )}
                <ProfileSelectField
                  control={control}
                  name="jobTitle"
                  label="Vị trí chuyên môn"
                  placeholder="Chọn vị trí chuyên môn"
                >
                  {jobTitles.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </ProfileSelectField>
                <ProfileSelectField
                  control={control}
                  name="teamPosition"
                  label="Loại hợp đồng / vị trí"
                  placeholder="Chọn loại hợp đồng / vị trí"
                >
                  {teamPositionOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </ProfileSelectField>
                <ProfileSelectField
                  control={control}
                  name="directManager"
                  label="Quản lý trực tiếp"
                  placeholder="Chọn quản lý trực tiếp"
                >
                  <SelectItem value="__none">Chưa chọn</SelectItem>
                  {directManagerOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </ProfileSelectField>
                <ProfileInputField
                  control={control}
                  name="workplaceBranch"
                  label="Chi nhánh / nơi làm việc"
                />
                {isBod ? null : (
                  <div className="sm:col-span-2">
                    <EmployeeExtraTeamsField
                      control={control}
                      name="extraTeamIds"
                      primaryTeamId={teamId ?? ''}
                      allTeams={allTeams}
                    />
                  </div>
                )}
              </ProfileFieldGroup>
            </ProfileDetailSection>

            <ProfileDetailSection title="Nhân thân & liên hệ" index={1}>
              <ProfileFieldGrid>
                <ProfileInputField
                  control={control}
                  name="name"
                  label="Họ và tên"
                  required
                  placeholder="Nhập họ và tên…"
                />
                <ProfileInputField control={control} name="displayName" label="Tên hiển thị" />
                <ProfileInputField control={control} name="gender" label="Giới tính" />
                <ProfileDateField control={control} name="birthDate" label="Ngày sinh" required />
                <ProfileInputField
                  control={control}
                  name="phone"
                  label="Điện thoại chính"
                  inputMode="tel"
                  placeholder="09xx xxx xxx"
                />
                <div className="space-y-1.5">
                  <ProfileInputField
                    control={control}
                    name="email"
                    label="Email đăng nhập (Google)"
                    required
                    type="email"
                    placeholder="ten.nhan.vien@gmail.com"
                  />
                  <LoginEmailHint email={email} />
                </div>
                <ProfileInputField control={control} name="facebookUrl" label="Facebook" />
              </ProfileFieldGrid>
            </ProfileDetailSection>

            <ProfileDetailSection title="Địa chỉ & học vấn" index={2}>
              <ProfileFieldGrid>
                <ProfileTextareaField
                  control={control}
                  name="addressCurrent"
                  label="Địa chỉ hiện tại"
                />
                <ProfileTextareaField
                  control={control}
                  name="addressHousehold"
                  label="Địa chỉ hộ khẩu"
                />
                <ProfileInputField
                  control={control}
                  name="educationLevel"
                  label="Trình độ học vấn"
                />
                <ProfileInputField
                  control={control}
                  name="schoolName"
                  label="Trường / đơn vị đào tạo"
                />
                <ProfileInputField
                  control={control}
                  name="hometownDetail"
                  label="Quê quán / quê hương"
                  required
                />
              </ProfileFieldGrid>
            </ProfileDetailSection>

            <ProfileDetailSection title="Giấy tờ & nhân khẩu" index={3}>
              <ProfileFieldGrid>
                <ProfileInputField
                  control={control}
                  name="identityNumber"
                  label="Mã định danh (số CCCD)"
                  inputMode="numeric"
                  placeholder="12 chữ số trên CCCD"
                />
                <ProfileTextareaField
                  control={control}
                  name="identityDocumentInfo"
                  label="Thông tin CCCD/CMND"
                />
                <div className={profileFieldBoxClass}>
                  <IdCardPhotoPickerField
                    control={control}
                    name="idCardFrontFile"
                    label={<FieldLabel>Ảnh CCCD mặt trước</FieldLabel>}
                  />
                </div>
                <div className={profileFieldBoxClass}>
                  <IdCardPhotoPickerField
                    control={control}
                    name="idCardBackFile"
                    label={<FieldLabel>Ảnh CCCD mặt sau</FieldLabel>}
                  />
                </div>
                <ProfileInputField
                  control={control}
                  name="maritalStatus"
                  label="Tình trạng hôn nhân"
                />
                <ProfileInputField control={control} name="ethnicity" label="Dân tộc" />
                <ProfileInputField control={control} name="religion" label="Tôn giáo" />
                <ProfileInputField
                  control={control}
                  name="insuranceBookNumber"
                  label="Số sổ bảo hiểm"
                />
              </ProfileFieldGrid>
            </ProfileDetailSection>

            <ProfileDetailSection title="Gia đình & liên hệ khẩn cấp" index={4}>
              <ProfileFieldGrid>
                <ProfileTextareaField
                  control={control}
                  name="childrenInfo"
                  label="Thông tin con cái"
                />
                <ProfileTextareaField
                  control={control}
                  name="emergencyContact1"
                  label="Liên hệ khẩn cấp 1"
                />
                <ProfileTextareaField
                  control={control}
                  name="emergencyContact2"
                  label="Liên hệ khẩn cấp 2"
                />
                <ProfileInputField
                  control={control}
                  name="fatherGuardianContact"
                  label="Liên hệ người giám hộ (cha)"
                />
                <ProfileInputField
                  control={control}
                  name="motherGuardianContact"
                  label="Liên hệ người giám hộ (mẹ)"
                />
                <ProfileTextareaField
                  control={control}
                  name="familyNotes"
                  label="Ghi chú gia đình"
                />
              </ProfileFieldGrid>
            </ProfileDetailSection>

            <ProfileDetailSection title="Khác" index={5}>
              <ProfileFieldGrid>
                <ProfileTextareaField
                  control={control}
                  name="bankAccountInfo"
                  label="Thông tin tài khoản ngân hàng"
                />
                <ProfileInputField control={control} name="vehicleInfo" label="Phương tiện" />
                <ProfileTextareaField
                  control={control}
                  name="policyAcknowledgement"
                  label="Xác nhận chính sách"
                />
                <ProfileDateField
                  control={control}
                  name="profileReviewDate"
                  label="Ngày rà soát hồ sơ"
                />
                <div className={profileFieldBoxClass}>
                  <CvPickerField
                    control={control}
                    name="cvFile"
                    label={<FieldLabel>CV</FieldLabel>}
                  />
                </div>
                <ProfileTextareaField control={control} name="notes" label="Ghi chú" />
              </ProfileFieldGrid>
            </ProfileDetailSection>
          </ProfileDetailsCard>
          {/* Chừa chỗ cho thanh thao tác (mobile 2 hàng). */}
          <div className="h-12 sm:hidden" aria-hidden />
        </ProfilePageShell>
      </form>

      <ProfileStickyActionBar ariaLabel="Thao tác tạo nhân sự">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CheckboxController
            control={control}
            name="notifyEmail"
            label="Gửi email thông tin đăng nhập cho nhân viên"
            className="items-center p-2"
            labelClassName="text-sm font-semibold normal-case tracking-normal text-foreground"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-12 shrink-0 rounded-2xl px-6 text-muted-foreground hover:text-foreground"
              onClick={backToList}
            >
              Hủy
            </Button>
            {/* Portal nằm ngoài <form> — gắn nút bằng thuộc tính `form`. */}
            <Button
              type="submit"
              form={formId}
              disabled={isSubmitting || anyActionPending}
              className={profilePrimaryActionClass}
            >
              {isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Đang tạo…' : 'Tạo tài khoản'}
            </Button>
          </div>
        </div>
      </ProfileStickyActionBar>

      <ProjectFormDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onCreated={(project) =>
          setValue('projectIds', [...(getValues('projectIds') ?? []), project.id], {
            shouldDirty: true,
          })
        }
      />
    </FormProvider>
  )
}
