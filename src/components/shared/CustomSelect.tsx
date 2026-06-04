import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface CustomSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
  triggerClassName?: string
}

export const CustomSelect = ({
  value,
  onValueChange,
  options,
  placeholder = 'Chọn một mục...',
  label,
  className,
  disabled,
  triggerClassName,
}: CustomSelectProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block ml-1">
          {label}
        </label>
      )}
      <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <Select.Trigger
          className={cn(
            'flex items-center justify-between w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-600 focus:bg-white hover:bg-slate-100/50',
            triggerClassName,
            !value && 'text-slate-400 font-medium'
          )}
        >
          <Select.Value placeholder={placeholder} />
          <Select.Icon>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-100 z-[10000] animate-in fade-in zoom-in duration-200"
            position="popper"
            sideOffset={8}
          >
            <Select.ScrollUpButton className="flex items-center justify-center h-8 bg-white text-slate-700 cursor-default">
              <ChevronUp className="h-4 w-4" />
            </Select.ScrollUpButton>

            <Select.Viewport className="p-2">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex items-center px-8 py-3 text-sm font-bold text-slate-700 rounded-xl cursor-default outline-none transition-colors focus:bg-indigo-50 focus:text-indigo-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2 inline-flex items-center justify-center">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>

            <Select.ScrollDownButton className="flex items-center justify-center h-8 bg-white text-slate-700 cursor-default">
              <ChevronDown className="h-4 w-4" />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}
