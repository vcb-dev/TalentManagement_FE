/** Khung dùng chung cho form hồ sơ nhân sự và form "Thêm nhân sự mới". */
import {
  DateController,
  InputController,
  SelectController,
  TextareaController,
} from '@/components/ui/form-controllers'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Control, FieldPath, FieldValues, RegisterOptions } from 'react-hook-form'

export const profileLabelClass = 'text-xs font-bold uppercase tracking-wider text-slate-500'

export const inputEditable =
  'border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10'

export const fieldControlClass =
  'h-10 w-full rounded-xl border px-3 py-2 leading-snug outline-none transition-all'

export const profileInputClass = cn(fieldControlClass, inputEditable)
export const profileDateClass = cn(fieldControlClass, '[color-scheme:light]', inputEditable)
export const profileTextareaClass = cn(
  'min-h-[80px] w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10',
  inputEditable
)
export const profileFieldBoxClass =
  'flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/30'
export const profileFullRowClass = 'sm:col-span-2 lg:col-span-2'

export function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5">
      <span className="h-3 w-0.5 rounded-full bg-slate-300" aria-hidden />
      <span className={profileLabelClass}>
        {children}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
    </span>
  )
}

export type SectionTitleVariant = 'primary' | 'indigo' | 'violet' | 'emerald'

export function SectionTitle({
  children,
  icon,
  variant = 'primary',
}: {
  children: string
  icon?: ReactNode
  variant?: SectionTitleVariant
}) {
  const configs = {
    primary: 'bg-primary/10 text-primary',
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  }
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg font-bold',
          configs[variant]
        )}
      >
        {icon || <Building2 className="h-4 w-4" />}
      </div>
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">
        {children}
      </h3>
    </div>
  )
}

export function ProfilePageShell({
  current,
  children,
  ...rest
}: { current: ReactNode; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className="relative -m-5 min-h-[calc(100vh-3rem)] bg-slate-50/50 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-6 text-foreground md:-m-6 md:pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:-m-8 dark:bg-slate-950"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 -top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-8 left-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full px-4 md:px-6">
        <div className="mb-4 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Link
            to="/hr-admin"
            search={{ page: 1, pageSize: 15 }}
            className="font-semibold text-primary hover:underline"
          >
            ← Danh sách nhân sự
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="font-semibold text-foreground">{current}</span>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function ProfileHeroCard({ children }: { children: ReactNode }) {
  return (
    <section className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute right-0 top-0 -mr-24 -mt-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </section>
  )
}

export function ProfileCard({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ProfileDetailsCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-primary to-violet-600" />
        <h2 className="text-xl font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">
          Chi tiết hồ sơ
        </h2>
      </div>
      <div className="space-y-8">{children}</div>
    </section>
  )
}

const DETAIL_BORDER = ['border-l-indigo-500', 'border-l-violet-500', 'border-l-emerald-500']
const DETAIL_TITLE_VARIANT: SectionTitleVariant[] = [
  'indigo',
  'violet',
  'emerald',
  'primary',
  'indigo',
]

/** `index` 0 dùng màu primary; các mục sau xoay vòng màu. */
export function ProfileDetailSection({
  title,
  index,
  children,
}: {
  title: string
  index: number
  children: ReactNode
}) {
  const i = index - 1
  const border =
    index === 0 ? 'border-l-primary dark:border-l-primary' : DETAIL_BORDER[i % DETAIL_BORDER.length]
  const variant = index === 0 ? 'primary' : DETAIL_TITLE_VARIANT[i % DETAIL_TITLE_VARIANT.length]
  return (
    <div
      className={cn(
        'rounded-2xl border border-l-4 border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50',
        border
      )}
    >
      <SectionTitle variant={variant}>{title}</SectionTitle>
      {children}
    </div>
  )
}

export function ProfileFieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
}

/** `divided` = có đường kẻ phía trên. */
export function ProfileFieldGroup({
  caption,
  tone = 'muted',
  divided = false,
  children,
}: {
  caption: string
  tone?: 'primary' | 'muted'
  divided?: boolean
  children: ReactNode
}) {
  return (
    <div className={divided ? 'border-t border-slate-100 pt-6 dark:border-slate-800' : 'mb-8'}>
      <p
        className={cn(
          'mb-4 text-xs font-semibold uppercase tracking-wide',
          tone === 'primary' ? 'text-primary/50' : 'text-slate-400'
        )}
      >
        {caption}
      </p>
      <ProfileFieldGrid>{children}</ProfileFieldGrid>
    </div>
  )
}

export function ProfileStickyActionBar({
  ariaLabel,
  children,
}: {
  ariaLabel: string
  children: ReactNode
}) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60]" role="presentation">
      <div
        className="pointer-events-auto border-t border-slate-200/90 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
        role="region"
        aria-label={ariaLabel}
      >
        <div className="mx-auto flex w-full max-w-[1400px]">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export const profilePrimaryActionClass =
  'h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:min-w-[220px] sm:px-8'

type ProfileFieldProps<T extends FieldValues, N extends FieldPath<T>> = {
  control: Control<T>
  name: N
  label: string
  required?: boolean
  className?: string
  rules?: RegisterOptions<T, N>
}

/** Cùng khung với field nhập để lưới không lệch. */
export function ProfileReadonlyField({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn(profileFieldBoxClass, className)}>
      <FieldLabel>{label}</FieldLabel>
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {value === '' || value == null ? '—' : value}
      </div>
    </div>
  )
}

export function ProfileInputField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  required,
  className,
  rules,
  ...inputProps
}: ProfileFieldProps<T, N> & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>) {
  return (
    <InputController
      control={control}
      name={name}
      label={label}
      rules={rules}
      type="text"
      autoComplete="off"
      {...inputProps}
      className={cn('space-y-1.5', className)}
      labelClassName={profileLabelClass}
      inputClassName={profileInputClass}
      customLabel={<FieldLabel required={required}>{label}</FieldLabel>}
    />
  )
}

export function ProfileDateField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  required,
  className,
  rules,
}: ProfileFieldProps<T, N>) {
  return (
    <DateController
      control={control}
      name={name}
      label={label}
      rules={rules}
      className={cn('space-y-1.5', className)}
      labelClassName={profileLabelClass}
      datePickerClassName={profileDateClass}
      customLabel={<FieldLabel required={required}>{label}</FieldLabel>}
    />
  )
}

export function ProfileTextareaField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  required,
  className,
}: ProfileFieldProps<T, N>) {
  return (
    <TextareaController
      control={control}
      name={name}
      label={label}
      className={cn('space-y-1.5', profileFullRowClass, className)}
      labelClassName={profileLabelClass}
      textareaClassName={profileTextareaClass}
      customLabel={<FieldLabel required={required}>{label}</FieldLabel>}
    />
  )
}

export function ProfileSelectField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  required,
  className,
  rules,
  placeholder,
  children,
}: ProfileFieldProps<T, N> & { placeholder?: string; children: ReactNode }) {
  return (
    <SelectController
      control={control}
      name={name}
      label={label}
      rules={rules}
      placeholder={placeholder}
      className={cn('space-y-1.5', className)}
      labelClassName={profileLabelClass}
      triggerClassName={profileInputClass}
      customLabel={<FieldLabel required={required}>{label}</FieldLabel>}
    >
      {children}
    </SelectController>
  )
}
