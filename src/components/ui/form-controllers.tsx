import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { Control, FieldPath, FieldValues, RegisterOptions } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type BaseControllerProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>
  name: TName
  label: string
  required?: boolean
  rules?: RegisterOptions<TFieldValues, TName>
  className?: string
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
  ...inputProps
}: BaseControllerProps<TFieldValues, TName> & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label} {required ? <span className="text-destructive">*</span> : null}
          </FormLabel>
          <FormControl>
            <Input {...inputProps} {...field} value={field.value ?? ''} />
          </FormControl>
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
  textareaClassName,
  ...textareaProps
}: BaseControllerProps<TFieldValues, TName> &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { textareaClassName?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label} {required ? <span className="text-destructive">*</span> : null}
          </FormLabel>
          <FormControl>
            <textarea
              className={cn(
                'flex min-h-[96px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                textareaClassName
              )}
              {...textareaProps}
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
  children,
  ...selectProps
}: BaseControllerProps<TFieldValues, TName> &
  SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label} {required ? <span className="text-destructive">*</span> : null}
          </FormLabel>
          <FormControl>
            <select
              className={cn(
                'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                className
              )}
              {...selectProps}
              {...field}
            >
              {children}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
