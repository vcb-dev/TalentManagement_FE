import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  Bell,
  Contact,
  FileText,
  Info,
  MapPin,
  Network,
  User,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { FormProvider, useWatch, type UseFormReturn } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import {
  CheckboxController,
  DateController,
  InputController,
  SelectController,
  TextareaController,
} from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import type { CreateEmployeeForm } from '@/features/hr-admin/schemas'
import { EmployeeExtraTeamsField } from '@/features/hr-admin/components/EmployeeExtraTeamsField'
import { useHrOrgSelectOptions } from '@/features/hr-admin/useHrOrgTree'
import { useDirectManagerOptions } from '@/features/hr-admin/hooks'
import { buildDirectManagerSelectOptions } from '@/features/hr-admin/directManagerOptions'
import { teamPositionOptions } from '@/features/hr-admin/teamPositionOptions'
import { profileApi } from '@/features/profile/api'

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

const selectTriggerClass =
  'flex h-12 w-full cursor-pointer rounded-lg border-0 bg-muted/40 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-[box-shadow] focus:ring-2 focus:ring-primary/20'

const inputFieldClass =
  'h-12 rounded-lg border-0 bg-muted/40 px-4 py-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20'

const labelClass = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground'

export interface EmployeeFormProps {
  form: UseFormReturn<CreateEmployeeForm>
  onSubmit: (values: CreateEmployeeForm) => void
  isSubmitting?: boolean
}

export function EmployeeForm({ form, onSubmit, isSubmitting }: EmployeeFormProps) {
  const navigate = useNavigate()
  const { handleSubmit, control } = form
  const { departments, teamsByDept, allTeams } = useHrOrgSelectOptions()
  const departmentId = useWatch({ control, name: 'departmentId' })
  const teamId = useWatch({ control, name: 'teamId' })
  const teamOptions =
    (departmentId && teamsByDept.get(departmentId)?.length
      ? teamsByDept.get(departmentId)
      : allTeams) ?? allTeams

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

  return (
    <FormProvider {...form}>
      <form
        className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="page-shell">
          <div className="mx-auto max-w-[1400px] space-y-8 pb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
                <Button
                  type="button"
                  variant="ghost"
                  className="mb-4 h-auto justify-start gap-2 px-0 py-0 text-sm font-semibold text-primary hover:bg-transparent hover:text-primary/90"
                  onClick={() =>
                    void navigate({ to: '/hr-admin', search: { page: 1, pageSize: 15 } })
                  }
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  Quay lại
                </Button>
                <h1 className={PAGE_HEADER_TITLE}>
                  <span className={PAGE_HEADER_GRADIENT}>Thêm nhân sự mới</span>
                </h1>
                <p className={PAGE_HEADER_DESCRIPTION}>
                  Điền thông tin để tạo tài khoản nhân sự mới trong hệ thống.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <SectionCard icon={User} title="Thông tin cơ bản" entranceIndex={0}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <InputController
                    control={control}
                    name="name"
                    label="Họ và tên"
                    required
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                    placeholder="Nhập họ và tên..."
                  />
                  <InputController
                    control={control}
                    name="email"
                    label="Email công ty"
                    required
                    type="email"
                    autoComplete="off"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                    placeholder="ten@vcb.com"
                  />
                  <InputController
                    control={control}
                    name="phone"
                    label="Số điện thoại"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                    placeholder="09xx xxx xxx"
                  />
                  <DateController
                    control={control}
                    name="birthDate"
                    label="Ngày sinh"
                    labelClassName={labelClass}
                    datePickerClassName={inputFieldClass}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={Network} title="Phân công tổ chức" entranceIndex={1}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <SelectController
                    control={control}
                    name="role"
                    label="Role"
                    required
                    labelClassName={labelClass}
                    triggerClassName={selectTriggerClass}
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectController>
                  <SelectController
                    control={control}
                    name="departmentId"
                    label="Phòng ban"
                    required
                    labelClassName={labelClass}
                    triggerClassName={selectTriggerClass}
                  >
                    {departments.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectController>
                  <DateController
                    control={control}
                    name="startDate"
                    label="Ngày bắt đầu"
                    labelClassName={labelClass}
                    datePickerClassName={inputFieldClass}
                  />
                  <SelectController
                    control={control}
                    name="teamId"
                    label="Nhóm (theo phòng ban)"
                    required
                    labelClassName={labelClass}
                    triggerClassName={selectTriggerClass}
                  >
                    {teamOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectController>
                  <EmployeeExtraTeamsField
                    control={control}
                    name="extraTeamIds"
                    primaryTeamId={teamId ?? ''}
                    allTeams={allTeams}
                  />
                  <SelectController
                    control={control}
                    name="initialLevel"
                    label="Cấp độ ban đầu"
                    labelClassName={labelClass}
                    triggerClassName={selectTriggerClass}
                  >
                    {LEVEL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectController>
                  <SelectController
                    control={control}
                    name="jobTitle"
                    label="Vị trí chuyên môn"
                    placeholder="Chọn vị trí chuyên môn"
                    labelClassName={labelClass}
                    triggerClassName={selectTriggerClass}
                  >
                    {jobTitles.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectController>
                  <SelectController
                    control={control}
                    name="teamPosition"
                    label="Loại hợp đồng / vị trí"
                    placeholder="Chọn loại hợp đồng / vị trí"
                    labelClassName={labelClass}
                    triggerClassName={selectTriggerClass}
                  >
                    {teamPositionOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectController>
                  <SelectController
                    control={control}
                    name="directManager"
                    label="Quản lý trực tiếp"
                    placeholder="Chọn quản lý trực tiếp"
                    labelClassName={labelClass}
                    triggerClassName={selectTriggerClass}
                  >
                    <SelectItem value="__none">Chưa chọn</SelectItem>
                    {directManagerOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectController>
                  <InputController
                    control={control}
                    name="workplaceBranch"
                    label="Chi nhánh / nơi làm việc"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="managerBlockCode"
                    label="Mã khối theo quản lý"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={Contact} title="Nhân thân & liên hệ" entranceIndex={2}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <InputController
                    control={control}
                    name="displayName"
                    label="Tên hiển thị"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="gender"
                    label="Giới tính"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="facebookUrl"
                    label="Facebook"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={MapPin} title="Địa chỉ & học vấn" entranceIndex={3}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <TextareaController
                    control={control}
                    name="addressCurrent"
                    label="Địa chỉ hiện tại"
                    className="md:col-span-2 lg:col-span-1"
                    labelClassName={labelClass}
                    textareaClassName={inputFieldClass}
                  />
                  <TextareaController
                    control={control}
                    name="addressHousehold"
                    label="Địa chỉ hộ khẩu"
                    className="md:col-span-2 lg:col-span-1"
                    labelClassName={labelClass}
                    textareaClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="hometownDetail"
                    label="Quê quán / quê hương"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="educationLevel"
                    label="Trình độ học vấn"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="schoolName"
                    label="Trường / đơn vị đào tạo"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={FileText} title="Giấy tờ & nhân khẩu" entranceIndex={4}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <TextareaController
                    control={control}
                    name="identityDocumentInfo"
                    label="Thông tin CCCD/CMND"
                    className="md:col-span-2 lg:col-span-3"
                    labelClassName={labelClass}
                    textareaClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="maritalStatus"
                    label="Tình trạng hôn nhân"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="ethnicity"
                    label="Dân tộc"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="religion"
                    label="Tôn giáo"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="insuranceBookNumber"
                    label="Số sổ bảo hiểm"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={Users} title="Gia đình & liên hệ khẩn cấp" entranceIndex={5}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <TextareaController
                    control={control}
                    name="childrenInfo"
                    label="Thông tin con cái"
                    className="md:col-span-2 lg:col-span-3"
                    labelClassName={labelClass}
                    textareaClassName={inputFieldClass}
                  />
                  <TextareaController
                    control={control}
                    name="emergencyContact1"
                    label="Liên hệ khẩn cấp 1"
                    labelClassName={labelClass}
                    textareaClassName={inputFieldClass}
                  />
                  <TextareaController
                    control={control}
                    name="emergencyContact2"
                    label="Liên hệ khẩn cấp 2"
                    labelClassName={labelClass}
                    textareaClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="fatherGuardianContact"
                    label="Liên hệ người giám hộ (cha)"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="motherGuardianContact"
                    label="Liên hệ người giám hộ (mẹ)"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <TextareaController
                    control={control}
                    name="familyNotes"
                    label="Ghi chú gia đình"
                    labelClassName={labelClass}
                    textareaClassName={inputFieldClass}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={Info} title="Khác" entranceIndex={6}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <TextareaController
                    control={control}
                    name="bankAccountInfo"
                    label="Thông tin tài khoản ngân hàng"
                    labelClassName={labelClass}
                    textareaClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="vehicleInfo"
                    label="Phương tiện"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="attachmentIdFront"
                    label="Đính kèm mặt trước (ref)"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="attachmentIdBack"
                    label="Đính kèm mặt sau (ref)"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <InputController
                    control={control}
                    name="cvAttachmentRef"
                    label="Tham chiếu CV"
                    labelClassName={labelClass}
                    inputClassName={inputFieldClass}
                  />
                  <DateController
                    control={control}
                    name="profileReviewDate"
                    label="Ngày rà soát hồ sơ"
                    labelClassName={labelClass}
                    datePickerClassName={inputFieldClass}
                  />
                  <TextareaController
                    control={control}
                    name="policyAcknowledgement"
                    label="Xác nhận chính sách"
                    className="md:col-span-2 lg:col-span-3"
                    labelClassName={labelClass}
                    textareaClassName={inputFieldClass}
                  />
                  <TextareaController
                    control={control}
                    name="notes"
                    label="Ghi chú"
                    className="md:col-span-2 lg:col-span-3"
                    labelClassName={labelClass}
                    textareaClassName={inputFieldClass}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={Bell} title="Thông báo hệ thống" entranceIndex={7}>
                <div className="space-y-4">
                  <CheckboxController
                    control={control}
                    name="notifyEmail"
                    label="Gửi email thông tin đăng nhập"
                    className="group cursor-pointer hover:bg-muted/50"
                    labelClassName="text-sm font-semibold normal-case tracking-normal text-foreground"
                    description="Tự động gửi thông tin đăng nhập tới nhân viên sau khi tạo tài khoản."
                  />
                </div>
              </SectionCard>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-4 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={() =>
                  void navigate({ to: '/hr-admin', search: { page: 1, pageSize: 15 } })
                }
              >
                Hủy
              </Button>
              <Button type="submit" size="lg" loading={isSubmitting}>
                {isSubmitting ? 'Đang tạo…' : 'Tạo tài khoản'}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Cần quay về danh sách?{' '}
              <Link
                to="/hr-admin"
                search={{ page: 1, pageSize: 15 }}
                className="font-semibold text-primary hover:underline"
              >
                Danh sách nhân sự
              </Link>
            </p>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}

function SectionCard({
  icon: Icon,
  title,
  children,
  entranceIndex,
}: {
  icon: LucideIcon
  title: ReactNode
  children: ReactNode
  entranceIndex?: number
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border/90 bg-card p-6 shadow-[0px_4px_24px_rgba(30,27,75,0.02)] md:p-8',
        entranceIndex !== undefined && CARD_ENTRANCE_HOVER
      )}
      style={entranceIndex !== undefined ? staggerStyle(entranceIndex) : undefined}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5">
          <Icon className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  )
}
