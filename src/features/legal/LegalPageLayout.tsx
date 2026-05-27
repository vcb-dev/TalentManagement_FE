import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

const SITE_URL = 'https://talent.vienchibao.com'
const COMPANY = 'Công ty Viễn Chí Bảo'
const APP_NAME = 'Talent Management (VCB HRM)'

type LegalPageLayoutProps = {
  title: string
  updatedAt: string
  children: ReactNode
}

export function LegalPageLayout({ title, updatedAt, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{APP_NAME}</p>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          </div>
          <Link to="/" className="shrink-0 text-sm font-medium text-teal-700 hover:text-teal-800">
            Về trang chủ
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="mb-8 text-sm text-slate-500">
          {COMPANY} · Cập nhật lần cuối: {updatedAt} ·{' '}
          <a href={SITE_URL} className="text-teal-700 hover:underline">
            {SITE_URL.replace('https://', '')}
          </a>
        </p>

        <article className="space-y-4 text-[15px] leading-7 text-slate-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-800 [&_li]:ml-5 [&_li]:list-disc [&_p]:text-slate-700 [&_ul]:space-y-1 [&_a]:text-teal-700 [&_a]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:text-sm">
          {children}
        </article>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <p>
            Liên hệ:{' '}
            <a href="mailto:dev@vienchibao.com" className="text-teal-700 hover:underline">
              dev@vienchibao.com
            </a>
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/privacy" className="text-teal-700 hover:underline">
              Chính sách bảo mật
            </Link>
            <Link to="/terms" className="text-teal-700 hover:underline">
              Điều khoản sử dụng
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}

export { APP_NAME, COMPANY, SITE_URL }
