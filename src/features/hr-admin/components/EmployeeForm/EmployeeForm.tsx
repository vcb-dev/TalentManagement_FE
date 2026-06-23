import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Bell, Network, User } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { FormProvider, useWatch, type UseFormReturn } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormSection } from '@/components/shared/FormSection'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CheckboxController,
  DateController,
  InputController,
  SelectController,
} from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { CreateEmployeeForm } from '@/features/hr-admin/schemas'
import { EmployeeExtraTeamsField } from '@/features/hr-admin/components/EmployeeExtraTeamsField'
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

const fieldClass = 'min-h-10 rounded-md border-border bg-background text-sm shadow-sm'
const labelClass = 'text-sm font-semibold text-foreground'
const helperClass = 'text-xs text-muted-foreground'

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

  return (
    <FormProvider {...form}>
      <form className="page-shell" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-8">
          <PageHeader
            title="Thêm nhân sự mới"
            description="Điền thông tin để tạo tài khoản nhân sự mới trong hệ thống."
            gradientTitle
            surface
            variant="flat"
            onBack={() => void navigate({ to: '/hr-admin', search: { page: 1, pageSize: 15 } })}
            className="border-0 pb-0"
          />

          <div className="grid grid-cols-1 gap-6">
            <FormSectionCard icon={User} title="Thông tin cơ bản" entranceIndex={0}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <InputController
                  control={control}
                  name="name"
                  label="Họ và tên"
                  required
                  labelClassName={labelClass}
                  inputClassName={fieldClass}
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
                  inputClassName={fieldClass}
                  placeholder="ten@vcb.com"
                />
                <InputController
                  control={control}
                  name="phone"
                  label="Số điện thoại"
                  labelClassName={labelClass}
                  inputClassName={fieldClass}
                  placeholder="09xx xxx xxx"
                />
                <DateController
                  control={control}
                  name="birthDate"
                  label="Ngày sinh"
                  labelClassName={labelClass}
                  datePickerClassName={fieldClass}
                />
              </div>
            </FormSectionCard>

            <FormSectionCard icon={Network} title="Phân công tổ chức" entranceIndex={1}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <SelectController
                  control={control}
                  name="role"
                  label="Role"
                  required
                  labelClassName={labelClass}
                  triggerClassName={fieldClass}
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
                  triggerClassName={fieldClass}
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
                  datePickerClassName={fieldClass}
                />
                <SelectController
                  control={control}
                  name="teamId"
                  label="Nhóm (theo phòng ban)"
                  required
                  labelClassName={labelClass}
                  triggerClassName={fieldClass}
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
                  triggerClassName={fieldClass}
                >
                  {LEVEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectController>
              </div>
            </FormSectionCard>

            <FormSectionCard icon={Bell} title="Thông báo hệ thống" entranceIndex={2}>
              <CheckboxController
                control={control}
                name="notifyEmail"
                label="Gửi email thông tin đăng nhập"
                className="group cursor-pointer hover:bg-muted/50"
                labelClassName="text-sm font-semibold normal-case tracking-normal text-foreground"
                description="Tự động gửi thông tin đăng nhập tới nhân viên sau khi tạo tài khoản."
              />
            </FormSectionCard>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => void navigate({ to: '/hr-admin', search: { page: 1, pageSize: 15 } })}
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
      </form>
    </FormProvider>
  )
}

function FormSectionCard({
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
    <Card
      className={cn(
        'border-border bg-card shadow-[var(--shadow-card)]',
        entranceIndex !== undefined &&
          'transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]'
      )}
      style={
        entranceIndex !== undefined ? { animationDelay: `${entranceIndex * 70}ms` } : undefined
      }
    >
      <CardContent className="p-6 md:p-8">
        <FormSection
          title={typeof title === 'string' ? title : String(title)}
          icon={<Icon className="h-5 w-5" aria-hidden />}
          className="border-0 pb-0"
        >
          {children}
        </FormSection>
      </CardContent>
    </Card>
  )
}
