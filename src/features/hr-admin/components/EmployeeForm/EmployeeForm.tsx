import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Controller, FormProvider, type UseFormReturn } from 'react-hook-form'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import type { CreateEmployeeForm } from '@/features/hr-admin/schemas'
import { HR_DEPARTMENT_OPTIONS, HR_TEAM_OPTIONS } from '@/features/hr-admin/hrOrgOptions'

const ROLE_OPTIONS: { value: CreateEmployeeForm['role']; label: string }[] = [
  { value: 'MEMBER', label: 'Nhân viên' },
  { value: 'MANAGER', label: 'Quản lý' },
  { value: 'HR_ADMIN', label: 'HR' },
  { value: 'TEACHER', label: 'Người chấm thi' },
  { value: 'BOD', label: 'BOD' },
]

const LEVEL_OPTIONS: { value: CreateEmployeeForm['initialLevel']; label: string }[] = [
  { value: 'tap_su', label: 'Tập sự (mặc định)' },
  { value: 'biet_viec', label: 'Biết việc' },
]

const inputClass =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'

const labelClass = 'text-xs font-semibold text-muted-foreground'

export interface EmployeeFormProps {
  form: UseFormReturn<CreateEmployeeForm>
  onSubmit: (values: CreateEmployeeForm) => void
  isSubmitting?: boolean
}

export function EmployeeForm({ form, onSubmit, isSubmitting }: EmployeeFormProps) {
  const navigate = useNavigate()
  const { register, handleSubmit, control, formState } = form
  const assignGrader = form.watch('assignGrader')

  return (
    <FormProvider {...form}>
      <form
        className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="page-toolbar-flat">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              className="whitespace-nowrap rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => void navigate({ to: '/hr-admin', search: { page: 1 } })}
            >
              ← Quay lại
            </button>
            <span className="text-base font-semibold tracking-tight text-foreground">Thêm nhân sự mới</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="whitespace-nowrap rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => void navigate({ to: '/hr-admin', search: { page: 1 } })}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="whitespace-nowrap rounded-lg border border-button bg-button px-3.5 py-1.5 text-xs font-medium text-button-foreground transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Đang tạo…' : 'Tạo tài khoản'}
            </button>
          </div>
        </div>

        <div className="page-shell">
          <div className="mx-auto max-w-4xl space-y-3.5">
            <Card title="Thông tin cơ bản" entranceIndex={0}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Họ và tên *" error={formState.errors.name?.message}>
                  <input className={inputClass} placeholder="Nhập họ và tên..." {...register('name')} />
                </Field>
                <Field label="Email công ty *" error={formState.errors.email?.message}>
                  <input
                    className={inputClass}
                    type="email"
                    autoComplete="off"
                    placeholder="ten@vcb.com"
                    {...register('email')}
                  />
                </Field>
                <Field label="Số điện thoại" error={formState.errors.phone?.message}>
                  <input className={inputClass} placeholder="09xx xxx xxx" {...register('phone')} />
                </Field>
                <Field label="Ngày sinh" error={formState.errors.birthDate?.message}>
                  <input className={inputClass} type="date" {...register('birthDate')} />
                </Field>
              </div>
            </Card>

            <Card title="Phân công tổ chức" entranceIndex={1}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Role *" error={formState.errors.role?.message}>
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className={inputClass}>
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
                      <select {...field} className={inputClass}>
                        {HR_DEPARTMENT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </Field>
                <Field label="Team chính *" error={formState.errors.teamId?.message}>
                  <Controller
                    name="teamId"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className={inputClass}>
                        {HR_TEAM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </Field>
                <Field label="Team phụ (tùy chọn)" error={formState.errors.secondaryTeamId?.message}>
                  <Controller
                    name="secondaryTeamId"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className={inputClass}>
                        <option value="">-- Không gán --</option>
                        {HR_TEAM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </Field>
                <Field label="Ngày bắt đầu" error={formState.errors.startDate?.message}>
                  <input className={inputClass} type="date" {...register('startDate')} />
                </Field>
                <Field label="Cấp độ ban đầu" error={formState.errors.initialLevel?.message}>
                  <Controller
                    name="initialLevel"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className={inputClass}>
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
            </Card>

            <Card title="Thông báo hệ thống" entranceIndex={2}>
              <div className="space-y-2 text-xs text-[#3D5066]">
                <label className="flex cursor-pointer items-start gap-2">
                  <Controller
                    name="notifyEmail"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <span>Gửi email thông tin đăng nhập tới nhân viên sau khi tạo</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                  <Controller
                    name="notifyManager"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <span>Thông báo Manager phòng ban về nhân viên mới</span>
                </label>
              </div>
            </Card>

            <Card
              entranceIndex={3}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  Chỉ định chấm thi (tùy chọn)
                  <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-normal text-[#92400E]">
                    Không phải role cố định
                  </span>
                </span>
              }
            >
              <div
                className="mb-3 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-2 text-xs text-primary"
                role="note"
              >
                Người chấm thi là vai trò <b>Teacher</b> (hoặc tài khoản được Manager chỉ định tạm theo từng kỳ
                thi). Quyền chấm gắn với kỳ thi, không phải gán vĩnh viễn trên hồ sơ nếu không có role Teacher.
              </div>
              <label className="mb-3 flex cursor-pointer items-start gap-2 text-xs text-[#3D5066]">
                <Controller
                  name="assignGrader"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <span>Chỉ định nhân viên này làm người chấm thi ngay khi tạo tài khoản</span>
              </label>
              <div className={cn(!assignGrader && 'pointer-events-none opacity-40')}>
                <div className={labelClass}>Phạm vi chấm thi (nếu được chỉ định)</div>
                <Controller
                  name="graderScope"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className={cn(inputClass, 'mt-1')} disabled={!assignGrader}>
                      <option value="all">Tất cả lớp (không giới hạn phòng ban)</option>
                      <option value="own_dept">Chỉ phòng ban của mình</option>
                    </select>
                  )}
                />
              </div>
            </Card>

            <p className="pb-4 text-center text-xs text-muted-foreground">
              Cần quay về danh sách?{' '}
              <Link to="/hr-admin" search={{ page: 1 }} className="font-semibold text-primary hover:underline">
                Danh sách nhân sự
              </Link>
            </p>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}

function Card({
  title,
  children,
  entranceIndex,
}: {
  title: ReactNode
  children: ReactNode
  entranceIndex?: number
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/90 bg-card shadow-[var(--shadow-card)]',
        entranceIndex !== undefined && CARD_ENTRANCE_HOVER
      )}
      style={entranceIndex !== undefined ? staggerStyle(entranceIndex) : undefined}
    >
      <div className="card-section-header">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
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
    <div className="flex flex-col gap-1">
      <div className={labelClass}>{label}</div>
      {children}
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  )
}
