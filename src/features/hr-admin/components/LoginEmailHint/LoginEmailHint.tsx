import { checkLoginEmail } from '@/features/hr-admin/loginEmail'
import { cn } from '@/lib/utils'
import { AlertTriangle, Info, XCircle } from 'lucide-react'

const TONE_STYLE = {
  info: { icon: Info, className: 'text-slate-500' },
  warn: { icon: AlertTriangle, className: 'text-amber-600 dark:text-amber-400' },
  error: { icon: XCircle, className: 'text-destructive' },
} as const

export function LoginEmailHint({
  email,
  className,
}: {
  email: string | null | undefined
  className?: string
}) {
  const { tone, message } = checkLoginEmail(email)
  const { icon: Icon, className: toneClass } = TONE_STYLE[tone]
  return (
    <p className={cn('flex items-start gap-1.5 text-xs leading-relaxed', toneClass, className)}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  )
}
