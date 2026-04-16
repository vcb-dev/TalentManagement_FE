import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Bell, Network, User } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Controller, FormProvider, useWatch, type UseFormReturn } from 'react-hook-form'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

/** Same surface as Input (Lumina); native select only. */
const selectClass =
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
  const { register, handleSubmit, control, formState } = form
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
                <button
                  type="button"
                  className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/90"
                  onClick={() =>
                    void navigate({ to: '/hr-admin', search: { page: 1, pageSize: 15 } })
                  }
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  Quay lại
                </button>
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
                  <Field label="Họ và tên *" error={formState.errors.name?.message}>
                    <Input
                      className={inputFieldClass}
                      placeholder="Nhập họ và tên..."
                      {...register('name')}
                    />
                  </Field>
                  <Field label="Email công ty *" error={formState.errors.email?.message}>
                    <Input
                      className={inputFieldClass}
                      type="email"
                      autoComplete="off"
                      placeholder="ten@vcb.com"
                      {...register('email')}
                    />
                  </Field>
                  <Field label="Số điện thoại" error={formState.errors.phone?.message}>
                    <Input
                      className={inputFieldClass}
                      placeholder="09xx xxx xxx"
                      {...register('phone')}
                    />
                  </Field>
                  <Field label="Ngày sinh" error={formState.errors.birthDate?.message}>
                    <Input className={inputFieldClass} type="date" {...register('birthDate')} />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard icon={Network} title="Phân công tổ chức" entranceIndex={1}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Role *" error={formState.errors.role?.message}>
                    <Controller
                      name="role"
                      control={control}
                      render={({ field }) => (
                        <select {...field} className={selectClass}>
                          {ROLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </Field>
                  <Field label="Phòng ban *" error={formState.errors.departmentId?.message}>
                    <Controller
                      name="departmentId"
                      control={control}
                      render={({ field }) => (
                        <select {...field} className={selectClass}>
                          {departments.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </Field>
                  <Field label="Ngày bắt đầu" error={formState.errors.startDate?.message}>
                    <Input className={inputFieldClass} type="date" {...register('startDate')} />
                  </Field>
                  <Field label="Team chính *" error={formState.errors.teamId?.message}>
                    <Controller
                      name="teamId"
                      control={control}
                      render={({ field }) => (
                        <select {...field} className={selectClass}>
                          {teamOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </Field>
                  <Field
                    label="Team phụ (tùy chọn)"
                    error={formState.errors.secondaryTeamId?.message}
                  >
                    <Controller
                      name="secondaryTeamId"
                      control={control}
                      render={({ field }) => (
                        <select {...field} className={selectClass}>
                          <option value="">-- Không gán --</option>
                          {allTeams.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </Field>
                  <Field label="Cấp độ ban đầu" error={formState.errors.initialLevel?.message}>
                    <Controller
                      name="initialLevel"
                      control={control}
                      render={({ field }) => (
                        <select {...field} className={selectClass}>
                          {LEVEL_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard icon={Bell} title="Thông báo hệ thống" entranceIndex={2}>
                <div className="space-y-4">
                  <label className="group flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-colors hover:bg-muted/50">
                    <Controller
                      name="notifyEmail"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/40"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Gửi email thông tin đăng nhập
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tự động gửi thông tin đăng nhập tới nhân viên sau khi tạo tài khoản.
                      </p>
                    </div>
                  </label>
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
              <Button type="submit" size="lg" disabled={isSubmitting}>
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

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={labelClass}>{label}</div>
      {children}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  )
}
