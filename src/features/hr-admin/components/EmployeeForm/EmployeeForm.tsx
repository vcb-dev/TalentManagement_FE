import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Bell, Network, User } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { FormProvider, useWatch, type UseFormReturn } from 'react-hook-form'
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
} from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import type { CreateEmployeeForm } from '@/features/hr-admin/schemas'
import { useHrOrgSelectOptions } from '@/features/hr-admin/useHrOrgTree'

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
  const teamOptions =
    (departmentId && teamsByDept.get(departmentId)?.length
      ? teamsByDept.get(departmentId)
      : allTeams) ?? allTeams

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
                    label="Team chính"
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
                  <SelectController
                    control={control}
                    name="secondaryTeamId"
                    label="Team phụ (tùy chọn)"
                    labelClassName={labelClass}
                    triggerClassName={selectTriggerClass}
                  >
                    <SelectItem value="__none">-- Không gán --</SelectItem>
                    {allTeams.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectController>
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
                </div>
              </SectionCard>

              <SectionCard icon={Bell} title="Thông báo hệ thống" entranceIndex={2}>
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
