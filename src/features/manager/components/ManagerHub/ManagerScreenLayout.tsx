import type { ReactNode } from 'react'
import { ManagerHubNav } from './ManagerHubNav'

export interface ManagerScreenLayoutProps {
  title: string
  subtitle?: string
  toolbarExtra?: ReactNode
  children: ReactNode
}

/** Khung chung màn Quản lý: toolbar gradient + nav hub + page-shell. */
export function ManagerScreenLayout({ title, subtitle, toolbarExtra, children }: ManagerScreenLayoutProps) {
  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="page-toolbar-gradient">
        <div
          className="pointer-events-none absolute inset-0 opacity-25 motion-safe:animate-[dash-shimmer_10s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            background:
              'linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 90%)',
            backgroundSize: '200% 100%',
          }}
        />
        <div className="relative text-base font-semibold tracking-tight md:text-lg">
          <span className="bg-gradient-to-r from-primary via-teal-700 to-violet-700 bg-clip-text text-transparent">
            {title}
          </span>
        </div>
        {subtitle ? (
          <p className="relative mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
        {toolbarExtra ? <div className="relative mt-2 flex flex-wrap gap-2">{toolbarExtra}</div> : null}
      </div>
      <ManagerHubNav />
      <div className="page-shell">{children}</div>
    </div>
  )
}
