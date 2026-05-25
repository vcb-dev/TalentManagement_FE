import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function avatarGradient(name: string) {
  const palettes = [
    'from-violet-500 via-purple-500 to-fuchsia-500',
    'from-sky-500 via-blue-500 to-indigo-600',
    'from-emerald-500 via-teal-500 to-cyan-600',
    'from-rose-500 via-pink-500 to-orange-400',
    'from-amber-500 via-orange-500 to-red-500',
  ]
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length
  return palettes[idx]
}

export function CskhPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative -m-5 min-h-[calc(100vh-3.5rem)] overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-100/50 pb-8 md:-m-6 lg:-m-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden opacity-60">
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-fuchsia-300/25 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-40 w-96 -translate-x-1/2 rounded-full bg-sky-200/30 blur-3xl" />
      </div>
      <div className="page-shell relative space-y-5 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}

export function CskhHero({
  title,
  subtitle,
  badge,
  stats,
}: {
  title: string
  subtitle: string
  badge?: ReactNode
  stats?: ReactNode
}) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 px-5 py-6 shadow-lg shadow-indigo-100/50 backdrop-blur-xl sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-400/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-2 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600/80">
              Facebook Messenger
            </span>
            {badge}
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            <span className="bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-600 bg-clip-text text-transparent">
              {title}
            </span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            {subtitle}
          </p>
        </div>
        {stats ? <div className="flex shrink-0 flex-wrap gap-2">{stats}</div> : null}
      </div>
    </header>
  )
}

export function CskhStatPill({
  label,
  value,
  tone = 'default',
  hint,
}: {
  label: string
  value: string | number
  tone?: 'default' | 'live' | 'warn'
  hint?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-2.5 text-center shadow-sm backdrop-blur-sm min-w-[5.5rem]',
        tone === 'live' && 'border-emerald-200/80 bg-emerald-50/90',
        tone === 'warn' && 'border-amber-200/80 bg-amber-50/90',
        tone === 'default' && 'border-indigo-100/80 bg-white/90'
      )}
    >
      <p
        className={cn(
          'text-lg font-bold tabular-nums',
          tone === 'live' && 'text-emerald-700',
          tone === 'warn' && 'text-amber-700',
          tone === 'default' && 'text-indigo-700'
        )}
      >
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {hint ? <p className="mt-0.5 text-[10px] leading-tight text-slate-400">{hint}</p> : null}
    </div>
  )
}

export function CskhTokenStat({
  model,
  totalTokens,
  promptTokens,
  completionTokens,
  perAuditAvg,
  running,
}: {
  model?: string
  totalTokens?: number
  promptTokens?: number
  completionTokens?: number
  perAuditAvg?: number
  running?: boolean
}) {
  const hasData = totalTokens != null && totalTokens > 0
  return (
    <div
      className={cn(
        'min-w-[8.5rem] rounded-xl border px-4 py-2.5 shadow-sm backdrop-blur-sm',
        running ? 'border-violet-200/80 bg-violet-50/90' : 'border-indigo-100/80 bg-white/90'
      )}
    >
      <p
        className={cn(
          'text-lg font-bold tabular-nums',
          running ? 'text-violet-700' : 'text-indigo-700'
        )}
      >
        {hasData ? totalTokens.toLocaleString('vi-VN') : '—'}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Token {model ? `· ${model}` : ''}
      </p>
      {hasData ? (
        <p className="mt-0.5 text-[10px] leading-snug text-slate-400">
          In {(promptTokens ?? 0).toLocaleString('vi-VN')} · Out{' '}
          {(completionTokens ?? 0).toLocaleString('vi-VN')}
          {perAuditAvg ? (
            <>
              <br />~{perAuditAvg.toLocaleString('vi-VN')}/hội thoại
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-0.5 text-[10px] text-slate-400">Chạy audit để xem</p>
      )}
    </div>
  )
}

export function CskhTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; icon: ReactNode; busy?: boolean }>
  active: string
  onChange: (id: string) => void
}) {
  return (
    <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/70 bg-white/60 p-1.5 shadow-md shadow-indigo-100/40 backdrop-blur-xl">
      {tabs.map(({ id, label, icon, busy }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex min-w-[7.5rem] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
              isActive
                ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-300/40'
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
            )}
          >
            {icon}
            {label}
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin opacity-80" /> : null}
          </button>
        )
      })}
    </nav>
  )
}

export function CskhGlassPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-xl shadow-indigo-100/40 backdrop-blur-xl',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CskhToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/80 via-white/50 to-violet-50/80 px-4 py-3 sm:px-5">
      {children}
    </div>
  )
}

export function MessengerWorkspace({
  sidebar,
  main,
  aside,
  className,
}: {
  sidebar: ReactNode
  main: ReactNode
  aside?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-[min(760px,calc(100vh-240px))] min-h-[540px] overflow-hidden',
        className
      )}
    >
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-indigo-100/60 bg-gradient-to-b from-slate-50/90 to-indigo-50/40 lg:w-[300px]">
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-indigo-50/50 via-[#eef2ff] to-violet-50/60">
        {main}
      </div>
      {aside ? (
        <aside className="hidden w-[300px] shrink-0 border-l border-indigo-100/60 bg-gradient-to-b from-white to-violet-50/50 lg:flex lg:flex-col xl:w-[320px]">
          {aside}
        </aside>
      ) : null}
    </div>
  )
}

export function MessengerSidebarHeader({
  title,
  action,
  search,
}: {
  title: string
  action?: ReactNode
  search?: ReactNode
}) {
  return (
    <div className="space-y-2.5 border-b border-indigo-100/60 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-600">{title}</p>
        {action}
      </div>
      {search}
    </div>
  )
}

export function CskhEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-100 via-violet-100 to-fuchsia-100 p-6 shadow-inner">
        {icon}
      </div>
      <div className="max-w-xs space-y-1">
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function CskhLoading({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-indigo-300/30" />
        <Loader2 className="relative h-8 w-8 animate-spin text-indigo-500" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function ChatThreadHeader({
  name,
  subtitle,
  badge,
  avatarLetter,
}: {
  name: string
  subtitle: string
  badge?: ReactNode
  avatarLetter: string
}) {
  return (
    <header className="flex items-center gap-3 border-b border-white/50 bg-white/75 px-4 py-3.5 backdrop-blur-md">
      <div
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white shadow-md ring-2 ring-white/80',
          avatarGradient(name)
        )}
      >
        {avatarLetter}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      {badge}
    </header>
  )
}
