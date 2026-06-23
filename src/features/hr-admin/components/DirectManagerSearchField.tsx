import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { DirectManagerOption } from '@/features/hr-admin/directManagerOptions'
import { cn } from '@/lib/utils'

function foldSearchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

const DROPDOWN_BASE =
  'absolute z-popover mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-[var(--shadow-md)]'
const ITEM_BASE =
  'flex h-10 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-sm font-medium hover:bg-muted'
type DirectManagerSearchFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>
  name: TName
  label?: string
  placeholder?: string
  options: DirectManagerOption[]
  disabled?: boolean
  inputClassName?: string
}

/** Searchable picker — cùng pattern `search-dropdown-container` như ManagerClassesScreen / ManagerExamScheduleScreen. */
export function DirectManagerSearchField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label = 'Quản lý trực tiếp',
  placeholder = 'Gõ tên để tìm quản lý...',
  options,
  disabled,
  inputClassName,
}: DirectManagerSearchFieldProps<TFieldValues, TName>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const optionById = useMemo(() => new Map(options.map((o) => [o.value, o])), [options])

  const filteredOptions = useMemo(() => {
    const q = foldSearchText(query)
    if (!q) return options
    return options.filter((o) => {
      const haystack = foldSearchText(`${o.name} ${o.label}`)
      return haystack.includes(q)
    })
  }, [options, query])

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selected = optionById.get(String(field.value ?? ''))
        const displayValue =
          open || query.length > 0
            ? query
            : selected
              ? selected.name
              : field.value && field.value !== '__none'
                ? String(field.value)
                : ''

        const showDropdown = open && !disabled

        return (
          <FormItem className="search-dropdown-container relative">
            <FormLabel className="mb-1 block text-xs font-semibold text-muted-foreground">
              {label}
            </FormLabel>
            <FormControl>
              <Input
                className={cn(inputClassName, 'w-full')}
                placeholder={placeholder}
                disabled={disabled}
                value={displayValue}
                autoComplete="off"
                onChange={(e) => {
                  const next = e.target.value
                  setQuery(next)
                  setOpen(true)
                  if (!next.trim()) {
                    field.onChange('__none')
                  }
                }}
                onFocus={() => {
                  if (disabled) return
                  setOpen(true)
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    setOpen(false)
                    setQuery('')
                  }, 150)
                }}
              />
            </FormControl>
            {showDropdown ? (
              <div className={DROPDOWN_BASE}>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(ITEM_BASE, 'justify-between')}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    field.onChange('__none')
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  <span className="text-muted-foreground">Chưa chọn</span>
                  {field.value === '__none' || !field.value ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : null}
                </Button>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((o) => (
                    <Button
                      key={o.value}
                      type="button"
                      variant="ghost"
                      className={cn(ITEM_BASE, 'justify-between')}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        field.onChange(o.value)
                        setQuery('')
                        setOpen(false)
                      }}
                    >
                      <span className="min-w-0 truncate">{o.label}</span>
                      {field.value === o.value ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : null}
                    </Button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                    Không tìm thấy quản lý phù hợp
                  </p>
                )}
              </div>
            ) : null}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
