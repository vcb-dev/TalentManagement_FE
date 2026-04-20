import type {
  ChangeEvent,
  ComponentProps,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'
import type { Control, FieldPath, FieldValues, RegisterOptions } from 'react-hook-form'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker, type LockToMonth } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type LabeledControllerProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>
  name: TName
  label: string
  required?: boolean
  rules?: RegisterOptions<TFieldValues, TName>
  /** `FormItem` (layout / spacing). */
  className?: string
  /** `FormLabel` bổ sung class (ví dụ uppercase, sr-only). */
  labelClassName?: string
}

export function InputController<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  required,
  rules,
  className,
  labelClassName,
  inputClassName,
  startSlot,
  endSlot,
  wrapperClassName,
  valueMode = 'default',
  ...inputProps
}: LabeledControllerProps<TFieldValues, TName> &
  InputHTMLAttributes<HTMLInputElement> & {
    inputClassName?: string
    startSlot?: ReactNode
    endSlot?: ReactNode
    wrapperClassName?: string
    /** `number`: map `input[type=number]` sang số (rỗng → `NaN` để Zod báo lỗi). */
    valueMode?: 'default' | 'number'
  }) {
  const { className: nativeInputClassName, ...restInputProps } =
    inputProps as InputHTMLAttributes<HTMLInputElement>
  const mergedInputClassName = cn(nativeInputClassName, inputClassName)

  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => {
        const numberValue =
          valueMode === 'number'
            ? fieldValueToNumberInput(field.value as number | string | null | undefined)
            : null
        const numberOnChange =
          valueMode === 'number'
            ? (e: ChangeEvent<HTMLInputElement>) =>
                field.onChange(
                  e.target.value === '' || Number.isNaN(e.target.valueAsNumber)
                    ? Number.NaN
                    : e.target.valueAsNumber
                )
            : null

        return (
          <FormItem className={className}>
            <FormLabel className={labelClassName}>
              {label} {required ? <span className="text-destructive">*</span> : null}
            </FormLabel>
            {!startSlot && !endSlot ? (
              <FormControl>
                <Input
                  {...restInputProps}
                  {...field}
                  value={
                    valueMode === 'number' ? (numberValue as string | number) : (field.value ?? '')
                  }
                  onChange={valueMode === 'number' ? numberOnChange! : field.onChange}
                  className={mergedInputClassName}
                />
              </FormControl>
            ) : (
              <div className={cn('relative', wrapperClassName)}>
                {startSlot ? (
                  <span className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2">
                    {startSlot}
                  </span>
                ) : null}
                <FormControl>
                  <Input
                    {...restInputProps}
                    {...field}
                    value={
                      valueMode === 'number'
                        ? (numberValue as string | number)
                        : (field.value ?? '')
                    }
                    onChange={valueMode === 'number' ? numberOnChange! : field.onChange}
                    className={cn(mergedInputClassName, startSlot && 'pl-11', endSlot && 'pr-11')}
                  />
                </FormControl>
                {endSlot ? (
                  <span className="absolute right-2 top-1/2 z-[1] -translate-y-1/2">{endSlot}</span>
                ) : null}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

function fieldValueToNumberInput(v: number | string | null | undefined) {
  if (v === '' || v === null || v === undefined) return ''
  if (typeof v === 'number' && Number.isNaN(v)) return ''
  return String(v)
}

/** Input + `FormMessage`, không label (ô tìm kiếm, field array, v.v.). Cần bọc `Form` / `FormProvider` từ `react-hook-form`. */
export function InputFieldController<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  rules,
  className,
  startSlot,
  endSlot,
  wrapperClassName,
  inputClassName,
  ...inputProps
}: {
  control: Control<TFieldValues>
  name: TName
  rules?: RegisterOptions<TFieldValues, TName>
  className?: string
  startSlot?: ReactNode
  endSlot?: ReactNode
  wrapperClassName?: string
  inputClassName?: string
} & InputHTMLAttributes<HTMLInputElement>) {
  const { className: inputNativeClassName, ...restInputProps } =
    inputProps as InputHTMLAttributes<HTMLInputElement>
  const mergedInputClass = cn(inputNativeClassName, inputClassName)

  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <FormItem className={cn('space-y-0', className)}>
          {!startSlot && !endSlot ? (
            <FormControl>
              <Input
                {...restInputProps}
                {...field}
                value={field.value ?? ''}
                className={mergedInputClass}
              />
            </FormControl>
          ) : (
            <div className={cn('relative', wrapperClassName)}>
              {startSlot ? (
                <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2">
                  {startSlot}
                </span>
              ) : null}
              <FormControl>
                <Input
                  {...restInputProps}
                  {...field}
                  value={field.value ?? ''}
                  className={cn(mergedInputClass, startSlot && 'pl-9', endSlot && 'pr-10')}
                />
              </FormControl>
              {endSlot ? (
                <span className="absolute right-2 top-1/2 z-[1] -translate-y-1/2">{endSlot}</span>
              ) : null}
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function TextareaController<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  required,
  rules,
  className,
  labelClassName,
  textareaClassName,
  ...textareaProps
}: LabeledControllerProps<TFieldValues, TName> &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { textareaClassName?: string }) {
  const { className: nativeTextareaClassName, ...restTextareaProps } =
    textareaProps as TextareaHTMLAttributes<HTMLTextAreaElement>

  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className={labelClassName}>
            {label} {required ? <span className="text-destructive">*</span> : null}
          </FormLabel>
          <FormControl>
            <Textarea
              className={cn(textareaClassName, nativeTextareaClassName)}
              {...restTextareaProps}
              {...field}
              value={(field.value as string | undefined) ?? ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function SelectController<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  required,
  rules,
  className,
  labelClassName,
  triggerClassName,
  children,
  placeholder,
  ...selectProps
}: LabeledControllerProps<TFieldValues, TName> &
  Omit<ComponentProps<typeof Select>, 'onValueChange' | 'value' | 'defaultValue'> & {
    children: React.ReactNode
    placeholder?: string
    /** Class cho `SelectTrigger` (khác `className` của `FormItem`). */
    triggerClassName?: string
  }) {
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className={labelClassName}>
            {label} {required ? <span className="text-destructive">*</span> : null}
          </FormLabel>
          <FormControl>
            <Select
              {...selectProps}
              value={field.value == null || field.value === '' ? '__none' : String(field.value)}
              onValueChange={(nextValue) => {
                if (nextValue === '__none') {
                  field.onChange('')
                  return
                }
                if (typeof field.value === 'number') {
                  field.onChange(Number(nextValue))
                  return
                }
                field.onChange(nextValue)
              }}
            >
              <SelectTrigger className={cn('w-full', triggerClassName)}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>{children}</SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function DateController<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  required,
  rules,
  className,
  labelClassName,
  datePickerClassName,
  min,
  max,
  disabled,
  placeholder,
  lockToMonth,
}: LabeledControllerProps<TFieldValues, TName> & {
  min?: string
  max?: string
  disabled?: boolean
  placeholder?: string
  datePickerClassName?: string
  lockToMonth?: LockToMonth
}) {
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className={labelClassName}>
            {label} {required ? <span className="text-destructive">*</span> : null}
          </FormLabel>
          <FormControl>
            <DatePicker
              value={(field.value as string | undefined) ?? ''}
              onChange={field.onChange}
              min={min}
              max={max}
              disabled={disabled}
              placeholder={placeholder}
              className={datePickerClassName}
              lockToMonth={lockToMonth}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function CheckboxController<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  rules,
  className,
  labelClassName,
  description,
  checkboxClassName,
}: LabeledControllerProps<TFieldValues, TName> & {
  description?: ReactNode
  checkboxClassName?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <FormItem
          className={cn(
            'flex flex-row items-start gap-4 space-y-0 rounded-lg p-4 transition-colors hover:bg-muted/50',
            className
          )}
        >
          <FormControl>
            <Checkbox
              className={cn('mt-0.5', checkboxClassName)}
              checked={Boolean(field.value)}
              onCheckedChange={(v) => field.onChange(v === true)}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          </FormControl>
          <div className="min-w-0 flex-1 space-y-1 leading-none">
            <FormLabel
              className={cn('!mt-0 cursor-pointer font-semibold text-foreground', labelClassName)}
            >
              {label}
            </FormLabel>
            {description ? (
              <FormDescription className="pt-0.5">{description}</FormDescription>
            ) : null}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

type RadioOption = {
  value: string
  label: ReactNode
  description?: ReactNode
  optionClassName?: string
  indicatorClassName?: string
}

export function RadioGroupController<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  required,
  rules,
  className,
  labelClassName,
  options,
  radioGroupClassName,
}: LabeledControllerProps<TFieldValues, TName> & {
  options: RadioOption[]
  radioGroupClassName?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => {
        const selected = (field.value as string | undefined) ?? ''
        return (
          <FormItem className={className}>
            <FormLabel className={labelClassName}>
              {label} {required ? <span className="text-destructive">*</span> : null}
            </FormLabel>
            <FormControl>
              <RadioGroup
                value={selected}
                onValueChange={(value) => field.onChange(value)}
                onBlur={field.onBlur}
                name={field.name}
                className={radioGroupClassName}
              >
                {options.map((opt) => {
                  const itemId = `${field.name}-${opt.value}`
                  const active = selected === opt.value
                  return (
                    <label
                      key={opt.value}
                      htmlFor={itemId}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-3 transition-colors',
                        active && 'border-primary/35 bg-primary/5',
                        opt.optionClassName
                      )}
                    >
                      <RadioGroupItem
                        id={itemId}
                        value={opt.value}
                        className={cn('mt-0.5', opt.indicatorClassName)}
                      />
                      <div className="min-w-0 flex-1">
                        <div>{opt.label}</div>
                        {opt.description ? (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {opt.description}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  )
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
