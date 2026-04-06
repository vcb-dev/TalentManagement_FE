import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Award, Eye, EyeOff, KeyRound, Lock, Mail, Trophy } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { loginRequestSchema } from '@/features/auth/schemas'
import { useLogin } from '@/features/auth/hooks'
import { defaultPathForRole } from '@/lib/routeGuards'
import { MOCK_ACCOUNT_LIST, MOCK_PASSWORD } from '@/features/auth/mock/mockAccounts'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/_auth/login')({
  validateSearch: (raw) => loginSearchSchema.parse(raw),
  beforeLoad: () => {
    const { accessToken, user } = useAuthStore.getState()
    if (accessToken) {
      const target = defaultPathForRole(user?.role)
      if (user?.role === 'HR_ADMIN') throw redirect({ to: '/hr-admin', search: { page: 1 } })
      throw redirect({ to: target })
    }
  },
  component: LoginPage,
})

type LoginForm = z.infer<typeof loginRequestSchema>

/** Tránh open redirect; chỉ cho path nội bộ (pathname bắt đầu bằng `/`, không phải `//...`). */
function isSafeInternalRedirect(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://')
}

function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const search = Route.useSearch()
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  })
  const mockApi = isMockApiEnabled()

  const appName = import.meta.env.VITE_APP_NAME ?? 'VCB HRM'

  return (
    <div className="login-page-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 text-sm leading-relaxed text-gray-900">
      <div className="relative z-0 flex w-full max-w-[420px] flex-col items-stretch">
        <div
          className={cn(
            'rounded-[12px] bg-white p-10 shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
            'border border-black/[0.04]'
          )}
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-sm">
              <Award className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="text-[26px] font-bold leading-tight tracking-tight text-gray-900">
              {appName}
            </div>
            <div className="mt-1.5 text-[13px] font-normal text-gray-600">
              Quản trị Hiệu suất Ưu tú
            </div>
          </div>

          <form
            className="space-y-0"
            onSubmit={form.handleSubmit((v) =>
              login.mutate(v, {
                onSuccess: () => {
                  if (search.redirect && isSafeInternalRedirect(search.redirect)) {
                    void navigate({ href: search.redirect })
                    return
                  }
                  const role = useAuthStore.getState().user?.role
                  if (role === 'HR_ADMIN') void navigate({ to: '/hr-admin', search: { page: 1 } })
                  else void navigate({ to: defaultPathForRole(role) })
                },
              })
            )}
          >
            <div className="mb-4">
              <label
                htmlFor="email"
                className="mb-2 block text-[11px] font-semibold tracking-wide text-gray-500"
              >
                ĐỊA CHỈ EMAIL
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@vcb.com.vn"
                  className={cn(
                    'h-12 w-full rounded-lg border border-[#e0e0e0] bg-white py-3 pl-11 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 placeholder:text-[13px]',
                    'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25',
                    form.formState.errors.email && 'border-red-400'
                  )}
                  {...form.register('email')}
                />
              </div>
              {form.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="mb-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="text-[11px] font-semibold tracking-wide text-gray-500"
                >
                  MẬT KHẨU
                </label>
                <a
                  href="#"
                  className="text-xs font-medium text-primary hover:opacity-90"
                  onClick={(e) => e.preventDefault()}
                >
                  Chính sách bảo mật
                </a>
              </div>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    'h-12 w-full rounded-lg border border-[#e0e0e0] bg-white py-3 pl-11 pr-11 text-sm text-gray-900 outline-none placeholder:text-gray-400',
                    'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25',
                    form.formState.errors.password && 'border-red-400'
                  )}
                  {...form.register('password')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="mt-5 h-12 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-[0.96] disabled:pointer-events-none disabled:opacity-50"
            >
              {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>

          {mockApi ? (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                Tài khoản demo (mock)
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">
                Mật khẩu chung:{' '}
                <code className="rounded-md bg-primary/5 px-1.5 py-0.5 font-mono text-[11px] text-primary ring-1 ring-primary/15">
                  {MOCK_PASSWORD}
                </code>
                . Chọn một dòng để điền email và mật khẩu.
              </p>
              <ul
                className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-0.5 [-webkit-overflow-scrolling:touch]"
                aria-label="Danh sách tài khoản thử"
              >
                {MOCK_ACCOUNT_LIST.map((acc) => (
                  <li key={acc.email}>
                    <button
                      type="button"
                      className={cn(
                        'w-full rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-2.5 text-left text-xs transition-colors',
                        'hover:border-primary/35 hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25'
                      )}
                      onClick={() => {
                        form.setValue('email', acc.email, { shouldValidate: true })
                        form.setValue('password', MOCK_PASSWORD, { shouldValidate: true })
                      }}
                    >
                      <span className="font-mono text-[11px] font-semibold text-gray-900 sm:text-xs">
                        {acc.email}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-gray-500 sm:text-[11px]">
                        <span className="font-medium text-primary/90">{ROLE_LABEL_VI[acc.role]}</span>
                        {' — '}
                        {acc.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="pointer-events-none fixed bottom-4 right-4 z-10 max-w-[min(calc(100vw-2rem),260px)] rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:bottom-6 sm:right-6 sm:px-4 sm:py-3"
        style={{ borderRadius: 12 }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Trophy className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[9px] font-semibold tracking-wide text-gray-500">
              THÀNH TÍCH GẦN ĐÂY
            </p>
            <p className="mt-0.5 text-sm font-bold leading-snug text-gray-900">
              Top 5 Cụm Hiệu suất
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
